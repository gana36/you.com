from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import google.generativeai as genai
import os
import json
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
import requests
from config.intent_manager import get_config_manager

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Insurance Assistant API", version="2.0.0")

# Initialize dynamic configuration manager
config_manager = get_config_manager()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (use Redis in production)
sessions: Dict[str, Dict[str, Any]] = {}
SESSION_TIMEOUT = timedelta(hours=1)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Get valid intents and entities from configuration (dynamic)
VALID_INTENTS = config_manager.get_valid_intents()
VALID_ENTITIES = config_manager.get_valid_entities()

# Get required entities mapping (now dynamic, loaded from config)
REQUIRED_ENTITIES_BY_INTENT = config_manager.get_all_required_entities_by_intent()


class QueryRequest(BaseModel):
    query: str = Field(..., description="User's natural language question")


class IntentResponse(BaseModel):
    intent: str = Field(..., description="Detected user intent")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities")
    missing: List[str] = Field(default_factory=list, description="Missing or ambiguous entities")
    confidence: Optional[float] = Field(None, description="Confidence score for intent detection")


class ConversationRequest(BaseModel):
    session_id: Optional[str] = Field(None, description="Session ID for continuing conversation")
    query: str = Field(..., description="User's message")
    intelligent_mode: bool = Field(default=True, description="Whether to persist entities across messages")


class ConversationResponse(BaseModel):
    session_id: str = Field(..., description="Session ID for this conversation")
    response: str = Field(..., description="Assistant's response")
    requires_input: bool = Field(default=False, description="Whether additional input is needed")
    next_question: Optional[str] = Field(None, description="Next question to ask user")
    collected_entities: Dict[str, Any] = Field(default_factory=dict, description="Entities collected so far")
    search_results: Optional[List[Dict[str, Any]]] = Field(None, description="Search results if query is complete")
    status: str = Field(default="in_progress", description="Status: in_progress, searching, complete")
    intent: Optional[str] = Field(None, description="Detected intent of the user's query")


def create_prompt(query: str) -> str:
    """Create a structured prompt for Gemini to detect intent and extract entities."""
    prompt = f"""You are an AI assistant that analyzes user queries about health insurance plans.

Your task is to:
1. Identify the user's main intent from this list: {', '.join(VALID_INTENTS)}
2. Extract relevant entities from the query

**Valid Intents:**
- PlanInfo: User wants general information about a health insurance plan (e.g., "Tell me about Molina Silver")
- CoverageDetail: User wants details about specific coverage aspects like deductibles, copays, what's covered (e.g., "What's the deductible?", "Does it cover dental?")
- ProviderNetwork: User wants to know about doctors/hospitals in a plan's network
- Comparison: User wants to compare multiple plans
- FAQ: User has a general question about health insurance
- News: User wants recent news or updates about plans/insurers

**Valid Entities to Extract:**
- plan_name: Name of the health insurance plan (e.g., "Molina Silver 1 HMO", "Aetna Gold")
- insurer: Insurance company name (e.g., "Molina", "Aetna", "UnitedHealthcare", "Blue Cross")
- year: Year of coverage (e.g., "2024", "2025")
- county: County name (e.g., "Broward", "Miami-Dade", "Leon")
- age: Age of the person (e.g., "43", "65")
- coverage_item: Specific coverage type or cost aspect (e.g., "dental", "vision", "prescription drugs", "mental health", "deductible", "copay", "coinsurance", "out of pocket maximum")
- subtype: Subtype or specific aspect of coverage (e.g., "preventive care", "specialist visits", "emergency room")
- provider_name: Name of a doctor or hospital (e.g., "Dr. Smith", "Memorial Hospital")
- specialty: Medical specialty (e.g., "cardiology", "pediatrics", "dermatology")
- features: Plan features to compare (e.g., "premiums", "deductibles", "copays")
- topic: Topic or subject matter (e.g., "open enrollment", "subsidies", "qualifying life events")
- state: State name (e.g., "Florida", "Texas", "California")
- income: Annual income (number only)

**User Query:** "{query}"

**Instructions:**
1. Analyze the query and determine the most appropriate intent
2. Extract all mentioned entities with their values
3. Identify which standard entities are missing or ambiguous
4. Provide a confidence score (0.0 to 1.0) for your intent classification

**Response Format (JSON only, no markdown):**
{{
  "intent": "<one of the valid intents>",
  "entities": {{
    "<entity_name>": "<extracted_value>",
    ...
  }},
  "missing": ["<entity1>", "<entity2>", ...],
  "confidence": <0.0 to 1.0>
}}

Return ONLY the JSON object, no additional text or markdown formatting."""
    
    return prompt


def get_or_create_session(session_id: Optional[str] = None) -> tuple[str, Dict[str, Any]]:
    """Get existing session or create a new one."""
    # Check if we have a valid existing session
    if session_id and session_id in sessions:
        session = sessions[session_id]
        # Check if session is expired
        if datetime.now() - session["last_activity"] > SESSION_TIMEOUT:
            del sessions[session_id]
            session_id = None
    elif session_id:
        # Session ID was provided but doesn't exist (maybe server restarted)
        # Treat as new session
        session_id = None

    # Create new session if needed
    if not session_id:
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "id": session_id,
            "created_at": datetime.now(),
            "last_activity": datetime.now(),
            "collected_entities": {},
            "conversation_history": [],
            "intent": None,
            "stage": "initial",  # initial, collecting, confirming_entities, searching, complete
            "pending_entity_confirmation": None
        }

    # Update last activity
    sessions[session_id]["last_activity"] = datetime.now()
    return session_id, sessions[session_id]


def get_article_content(url: str) -> Optional[str]:
    """Fetch full article content using You.com Contents API."""
    you_api_key = os.getenv("you_api")
    
    if not you_api_key:
        return None
    
    contents_url = "https://api.ydc-index.io/v1/contents"
    
    headers = {
        "X-API-Key": you_api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "url": url,
        "content_types": ["markdown"]
    }
    
    try:
        print(f"DEBUG: Fetching article content for: {url}")
        response = requests.post(contents_url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        # Extract markdown content
        markdown_content = data.get("markdown", "")
        print(f"DEBUG: Retrieved {len(markdown_content)} characters of content")
        return markdown_content if markdown_content else None
        
    except Exception as e:
        print(f"DEBUG: Error fetching article content: {str(e)}")
        return None


def build_query_from_entities(entities: Dict[str, Any], intent: str) -> str:
    """Build a dynamic search query based on current entities and intent."""
    query_parts = []

    if intent == "PlanInfo":
        # Build: "Find [plan_name] from [insurer] in [county] for [age] year old"
        if entities.get("plan_name"):
            query_parts.append(f"Find {entities['plan_name']}")
        elif entities.get("insurer"):
            query_parts.append(f"Find insurance plans from {entities['insurer']}")
        else:
            query_parts.append("Find insurance plans")

    elif intent == "Comparison":
        # Build: "Compare [plan_name1] vs [plan_name2]"
        plan_names = entities.get("plan_name", [])
        if isinstance(plan_names, list) and len(plan_names) > 1:
            query_parts.append(f"Compare {' vs '.join(plan_names)}")
        else:
            query_parts.append("Compare insurance plans")

    elif intent == "CoverageDetail":
        # Build: "What does [plan_name] cover for [coverage_item]"
        if entities.get("plan_name") and entities.get("coverage_item"):
            query_parts.append(f"What does {entities['plan_name']} cover for {entities['coverage_item']}")
        elif entities.get("coverage_item"):
            query_parts.append(f"Coverage details for {entities['coverage_item']}")
        else:
            query_parts.append("Coverage details")

    elif intent == "ProviderNetwork":
        # Build: "Find [provider_name] or [specialty] providers in [county]"
        if entities.get("provider_name"):
            query_parts.append(f"Find {entities['provider_name']}")
        elif entities.get("specialty"):
            query_parts.append(f"Find {entities['specialty']} providers")
        else:
            query_parts.append("Find healthcare providers")

    elif intent == "FAQ":
        query_parts.append(f"About {entities.get('topic', 'health insurance')}")

    elif intent == "News":
        query_parts.append(f"News about {entities.get('topic', 'health insurance')}")

    return " ".join(query_parts) if query_parts else "health insurance"


def search_with_you_api(query: str, entities: Dict[str, Any], intent: str = "PlanInfo") -> List[Dict[str, Any]]:
    """Search using You.com API with collected user information."""
    you_api_key = os.getenv("you_api")

    if not you_api_key:
        raise HTTPException(status_code=500, detail="You.com API key not configured")

    # Build enhanced query with user context
    # If we have collected entities, rebuild query dynamically instead of using original query
    if entities and any(entities.values()):
        enhanced_query = build_query_from_entities(entities, intent)
        print(f"DEBUG: Built dynamic query from entities: '{enhanced_query}'")
    else:
        enhanced_query = query
        print(f"DEBUG: Using original query: '{enhanced_query}'")

    if intent in ["PlanInfo", "Comparison", "ProviderNetwork"]:
        if entities.get("age"):
            enhanced_query += f" for {entities['age']} year old"
        if entities.get("income"):
            enhanced_query += f" with annual income ${entities['income']}"
        if entities.get("county"):
            enhanced_query += f" in {entities['county']} county"

    # You.com API endpoint (correct format: GET request with query params)
    url = "https://api.ydc-index.io/v1/search"

    headers = {
        "X-API-Key": you_api_key
    }

    params = {
        "query": enhanced_query,
        "count": 10  # Number of results
    }

    try:
        print(f"DEBUG: Calling You.com API: {url}")
        print(f"DEBUG: Query: {enhanced_query}")
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Extract and format results from You.com response
        results = []

        # You.com API returns: {'results': {'web': [...], 'news': [...]}, 'metadata': {...}}
        web_results = data.get("results", {}).get("web", [])
        print(f"DEBUG: You.com returned {len(web_results)} web results")

        for hit in web_results[:10]:
            results.append({
                "title": hit.get("title", ""),
                "description": hit.get("description", ""),
                "url": hit.get("url", ""),
                "snippets": hit.get("snippets", []),
                "thumbnail_url": hit.get("thumbnail_url"),
                "page_age": hit.get("page_age"),
                "authors": hit.get("authors", [])
            })

        return results

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"You.com API error: {str(e)}")


def determine_next_question(
    collected_entities: Dict[str, Any], 
    intent: str,
    conversation_context: Optional[Dict[str, Any]] = None,
    use_dynamic_questions: bool = False
) -> Optional[str]:
    """
    Determine what information to ask for next based on intent.
    Now uses dynamic configuration instead of hardcoded values.
    
    Args:
        collected_entities: Entities already collected
        intent: Current intent
        conversation_context: Optional conversation context for dynamic question generation
        use_dynamic_questions: Whether to use LLM for dynamic question generation
    """
    # Get required entities for this intent from config
    required = config_manager.get_required_entities(intent)

    if not required:
        return None  # No entities needed for this intent

    # Check what's still missing
    missing = []
    for entity in required:
        if entity not in collected_entities or not collected_entities[entity]:
            missing.append(entity)

    if not missing:
        return None  # We have everything we need

    # Ask for entities in order
    next_entity = missing[0]
    
    # Build context for dynamic question generation
    context = {
        "intent": intent,
        "collected_entities": collected_entities,
        "conversation_history": conversation_context.get("conversation_history", []) if conversation_context else []
    }
    
    # Get question from config manager (with optional LLM generation)
    llm_model = genai.GenerativeModel('gemini-2.0-flash-exp') if use_dynamic_questions else None
    
    return config_manager.get_entity_question(
        entity=next_entity,
        context=context,
        use_llm=use_dynamic_questions,
        llm_model=llm_model
    )


def generate_acknowledgment(entity_name: str, entity_value: Any, collected_count: int) -> str:
    """Generate a natural acknowledgment after collecting an entity."""
    acknowledgments = {
        "age": [
            f"Thank you! I found quite a few insurance options for someone who is {entity_value} years old.",
            f"Excellent! There are several plans available for your age group ({entity_value}).",
        ],
        "income": [
            f"Perfect! Based on an income of ${entity_value}, I can see there are multiple affordable options.",
            f"Great! With that income level, you may qualify for some excellent plans.",
        ],
        "county": [
            f"Wonderful! {entity_value} county has many insurance providers to choose from.",
            f"Thanks! There are several quality insurance plans available in {entity_value} county.",
        ],
        "plan_name": [
            f"Got it! Looking into {entity_value} for you.",
            f"Perfect! Let me find details about {entity_value}.",
        ],
        "insurer": [
            f"Great! I'll search for plans from {entity_value}.",
            f"Understood! Looking at {entity_value}'s offerings.",
        ],
        "year": [
            f"Perfect! I'll focus on {entity_value} plans.",
            f"Got it! Searching for {entity_value} coverage options.",
        ],
        "provider_name": [
            f"Thank you! Looking up information for {entity_value}.",
            f"Got it! Checking network coverage for {entity_value}.",
        ],
        "specialty": [
            f"Perfect! Searching for {entity_value} providers.",
            f"Understood! Finding {entity_value} specialists for you.",
        ],
        "topic": [
            f"Great question about {entity_value}! Let me help you with that.",
            f"I understand you want to know about {entity_value}.",
        ]
    }

    ack_list = acknowledgments.get(entity_name, [f"Got it, {entity_name}: {entity_value}"])
    return ack_list[collected_count % len(ack_list)]


@app.post("/detect_intent_entities", response_model=IntentResponse)
async def detect_intent_entities(request: QueryRequest):
    """
    Detect user intent and extract entities from a natural language query.
    
    Args:
        request: QueryRequest containing the user's query
        
    Returns:
        IntentResponse with detected intent, extracted entities, and missing entities
        
    Raises:
        HTTPException: If API key is not configured or Gemini API fails
    """
    # Check if API key is configured
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable not set"
        )
    
    try:
        # Initialize Gemini model (2.0 Flash)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Create prompt
        prompt = create_prompt(request.query)
        
        # Generate response
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,  # Low temperature for more consistent results
                top_p=0.95,
                top_k=40,
                max_output_tokens=1024,
            )
        )
        
        # Extract and parse JSON response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()
        
        # Parse JSON
        result = json.loads(response_text)
        
        # Validate intent
        if result.get("intent") not in VALID_INTENTS:
            raise ValueError(f"Invalid intent: {result.get('intent')}")
        
        # Filter entities to only include valid ones
        entities = result.get("entities", {})
        filtered_entities = {k: v for k, v in entities.items() if k in VALID_ENTITIES}
        
        # Ensure missing is a list
        missing = result.get("missing", [])
        if not isinstance(missing, list):
            missing = []
        
        # Create response
        return IntentResponse(
            intent=result["intent"],
            entities=filtered_entities,
            missing=missing,
            confidence=result.get("confidence")
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse Gemini response as JSON: {str(e)}\nResponse: {response_text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Intent Detection API",
        "valid_intents": VALID_INTENTS,
        "valid_entities": VALID_ENTITIES
    }


@app.get("/health")
async def health_check():
    """Detailed health check including API key configuration."""
    api_key_configured = bool(os.getenv("GEMINI_API_KEY"))
    you_api_configured = bool(os.getenv("you_api"))
    return {
        "status": "healthy" if (api_key_configured and you_api_configured) else "degraded",
        "gemini_api_configured": api_key_configured,
        "you_api_configured": you_api_configured,
        "message": "Ready" if (api_key_configured and you_api_configured) else "API keys not configured"
    }


@app.get("/config")
async def get_configuration():
    """
    Get the current intent and entity configuration.
    Returns frontend-friendly configuration.
    """
    try:
        frontend_config = config_manager.export_config_for_frontend()
        return {
            "status": "success",
            "config": frontend_config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading configuration: {str(e)}")


@app.post("/config/reload")
async def reload_configuration():
    """
    Reload configuration from file.
    Useful for updating configuration without restarting the server.
    """
    try:
        config_manager.reload_config()
        
        # Update global variables
        global VALID_INTENTS, VALID_ENTITIES, REQUIRED_ENTITIES_BY_INTENT
        VALID_INTENTS = config_manager.get_valid_intents()
        VALID_ENTITIES = config_manager.get_valid_entities()
        REQUIRED_ENTITIES_BY_INTENT = config_manager.get_all_required_entities_by_intent()
        
        return {
            "status": "success",
            "message": "Configuration reloaded successfully",
            "intents": VALID_INTENTS,
            "entities": VALID_ENTITIES
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reloading configuration: {str(e)}")


@app.post("/brief-faq")
async def get_brief_faq_answer(request: dict):
    """
    Get a clean, brief answer for FAQ card display (1-2 sentences).
    
    Args:
        request: Dictionary with topic and search results
        
    Returns:
        Clean brief definition for card display
    """
    topic = request.get("topic", "")
    search_results = request.get("search_results", [])
    
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    
    try:
        # Combine top search results
        context_parts = []
        for result in search_results[:3]:
            context_parts.append(result.get("description", ""))
            if result.get("snippets"):
                context_parts.extend(result["snippets"][:2])
        
        combined_context = "\n".join(filter(None, context_parts))
        
        # Use Gemini to extract clean brief answer
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Based on these search results about "{topic}", write a clean, brief definition (2-3 sentences maximum).

Search results:
{combined_context}

Requirements:
- Remove any marketing language or calls to action
- Remove meta descriptions like "Learn about..." 
- Just provide the core definition/explanation
- Make it clear and easy to understand
- 2-3 sentences maximum

Return ONLY the clean definition text, nothing else.
"""
        
        print(f"DEBUG: Getting brief FAQ answer for: {topic}")
        response = model.generate_content(prompt)
        brief_answer = response.text.strip()
        
        # Clean up any quotes or extra formatting
        brief_answer = brief_answer.strip('"').strip("'").strip()
        
        print(f"DEBUG: Brief answer: {brief_answer[:100]}...")
        
        return {
            "status": "success",
            "brief_answer": brief_answer
        }
        
    except Exception as e:
        print(f"DEBUG: Error getting brief FAQ: {str(e)}")
        # Fallback to first result description
        fallback = search_results[0].get("description", "") if search_results else ""
        return {
            "status": "partial",
            "brief_answer": fallback
        }


@app.post("/synthesize-faq")
async def synthesize_faq_answer(request: dict):
    """
    Use Gemini to synthesize a comprehensive FAQ answer from search results.
    
    Args:
        request: Dictionary with topic and search results
        
    Returns:
        Comprehensive FAQ answer with definition, explanation, examples, and sources
    """
    topic = request.get("topic", "")
    search_results = request.get("search_results", [])
    
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    
    try:
        # Combine search results into context
        context_parts = []
        sources = []
        
        for idx, result in enumerate(search_results[:5]):  # Use top 5 results
            title = result.get("title", "")
            description = result.get("description", "")
            snippets = result.get("snippets", [])
            url = result.get("url", "")
            
            context_parts.append(f"Source {idx + 1}: {title}")
            context_parts.append(f"URL: {url}")
            context_parts.append(f"Summary: {description}")
            if snippets:
                context_parts.append("Key excerpts:")
                for snippet in snippets[:3]:
                    context_parts.append(f"  - {snippet}")
            context_parts.append("")
            
            sources.append({
                "title": title,
                "url": url,
                "source": result.get("name", "Web")
            })
        
        combined_context = "\n".join(context_parts)
        
        # Use Gemini to create comprehensive FAQ answer
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""You are a health insurance expert. Based on the search results below, create a comprehensive, easy-to-understand answer about "{topic}".

Search Results:
{combined_context}

Please provide:
1. A clear, concise definition (1-2 sentences)
2. A detailed explanation (2-3 paragraphs) that helps someone understand the concept thoroughly
3. A real-world example that illustrates how it works
4. 3-4 key points or important things to know

Format your response as JSON:
{{
  "definition": "Clear one-sentence definition...",
  "explanation": "Detailed explanation with paragraphs...",
  "example": "Real-world example showing how this works in practice...",
  "key_points": [
    "Important point 1",
    "Important point 2",
    "Important point 3"
  ],
  "related_topics": ["Related topic 1", "Related topic 2"]
}}

Make it conversational, helpful, and avoid jargon. Focus on practical understanding.
"""
        
        print(f"DEBUG: Synthesizing FAQ answer for: {topic}")
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Parse JSON response
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        faq_data = json.loads(response_text.strip())
        
        print(f"DEBUG: Successfully synthesized FAQ answer")
        
        return {
            "status": "success",
            "topic": topic,
            "definition": faq_data.get("definition", ""),
            "explanation": faq_data.get("explanation", ""),
            "example": faq_data.get("example", ""),
            "key_points": faq_data.get("key_points", []),
            "related_topics": faq_data.get("related_topics", []),
            "sources": sources
        }
        
    except json.JSONDecodeError as e:
        print(f"DEBUG: JSON parse error: {str(e)}")
        # Fallback
        return {
            "status": "partial",
            "topic": topic,
            "definition": search_results[0].get("description", "") if search_results else "",
            "explanation": "",
            "example": "",
            "key_points": [],
            "related_topics": [],
            "sources": sources
        }
    except Exception as e:
        print(f"DEBUG: Error synthesizing FAQ: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error synthesizing FAQ: {str(e)}")


@app.post("/enhance-article")
async def enhance_article_content(request: dict):
    """
    Use Gemini to enhance and summarize article information.
    Takes existing data (title, description, snippets) and creates a comprehensive summary.
    
    Args:
        request: Dictionary with article data
        
    Returns:
        Enhanced article content with summary, key points, and insights
    """
    title = request.get("title", "")
    description = request.get("description", "")
    snippets = request.get("snippets", [])
    source = request.get("source", "")
    
    if not title and not description:
        raise HTTPException(status_code=400, detail="Title or description required")
    
    try:
        # Combine all available information
        article_info = f"""
Title: {title}

Description: {description}

Source: {source}

Key Excerpts:
{chr(10).join(f'- {snippet}' for snippet in snippets if snippet)}
"""
        
        # Use Gemini to create enhanced content
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Based on the following article information, create a comprehensive, well-structured summary.

{article_info}

Please provide:
1. A concise but informative summary (2-3 paragraphs) that captures the main points
2. Key takeaways (3-5 bullet points)
3. Important insights or implications

Format your response as JSON:
{{
  "summary": "comprehensive summary text...",
  "key_points": ["point 1", "point 2", "point 3"],
  "insights": "additional insights or context..."
}}

Make it informative, well-written, and easy to understand. Focus on the most important information.
"""
        
        print(f"DEBUG: Enhancing article with Gemini: {title[:50]}...")
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Parse JSON response
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        enhanced_data = json.loads(response_text.strip())
        
        print(f"DEBUG: Successfully enhanced article")
        
        return {
            "status": "success",
            "summary": enhanced_data.get("summary", ""),
            "key_points": enhanced_data.get("key_points", []),
            "insights": enhanced_data.get("insights", ""),
            "original_snippets": snippets
        }
        
    except json.JSONDecodeError as e:
        print(f"DEBUG: JSON parse error: {str(e)}")
        # Fallback: return original content
        return {
            "status": "partial",
            "summary": description,
            "key_points": snippets[:3] if snippets else [],
            "insights": "",
            "original_snippets": snippets
        }
    except Exception as e:
        print(f"DEBUG: Error enhancing article: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error enhancing article: {str(e)}")


def synthesize_answer_from_search(
    query: str,
    intent: str,
    search_results: List[Dict[str, Any]],
    collected_entities: Dict[str, Any]
) -> str:
    """
    Use Gemini to synthesize a clean answer from You.com search results.
    Extracts information from snippets, titles, and descriptions.
    """
    if not search_results:
        return "I couldn't find specific information about your query. Please try asking with more details."

    # Extract all snippets and descriptions
    context_parts = []
    for idx, result in enumerate(search_results[:5]):  # Use top 5 results
        title = result.get('title', '')
        description = result.get('description', '')
        snippets = result.get('snippets', [])

        context_parts.append(f"Source {idx+1}: {title}")
        if description:
            context_parts.append(f"Description: {description}")
        if snippets:
            for snippet in snippets[:2]:  # Top 2 snippets per source
                context_parts.append(f"- {snippet}")
        context_parts.append("")  # Blank line between sources

    context_text = "\n".join(context_parts)

    # Build synthesis prompt based on intent
    if intent == "PlanInfo":
        prompt = f"""Based on the search results below, provide a comprehensive answer about the health insurance plan.

User's question: {query}

Collected information:
- Plan: {collected_entities.get('plan_name', 'N/A')}
- Insurer: {collected_entities.get('insurer', 'N/A')}
- Year: {collected_entities.get('year', 'N/A')}
- County: {collected_entities.get('county', 'N/A')}
- Age: {collected_entities.get('age', 'N/A')}

Search Results:
{context_text}

Provide a clear, concise answer (2-4 paragraphs) about this plan. Include:
- Key benefits and coverage
- Cost information (premium, deductible, out-of-pocket max)
- Network type (HMO/PPO/etc)
- Any notable features

Format your answer naturally. Don't use bullet points. Be direct and informative."""

    elif intent == "CoverageDetail":
        prompt = f"""Based on the search results below, answer the specific coverage question.

User's question: {query}

Collected information:
- Plan: {collected_entities.get('plan_name', 'N/A')}
- Insurer: {collected_entities.get('insurer', 'N/A')}
- Coverage item: {collected_entities.get('coverage_item', 'N/A')}
- Year: {collected_entities.get('year', 'N/A')}

Search Results:
{context_text}

Provide a focused answer (1-3 paragraphs) about the specific coverage question. Include:
- Whether it's covered
- Any copays, coinsurance, or deductibles that apply
- Limitations or requirements
- Specific dollar amounts if available

Format your answer naturally. Don't use bullet points. Be direct and specific."""

    else:
        # Fallback
        prompt = f"""Based on the search results below, answer this health insurance question: {query}

Search Results:
{context_text}

Provide a clear, helpful answer in 2-3 paragraphs."""

    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                max_output_tokens=1024,
            )
        )

        answer = response.text.strip()
        print(f"DEBUG: Synthesized answer length: {len(answer)} characters")
        return answer

    except Exception as e:
        print(f"ERROR: Failed to synthesize answer: {str(e)}")
        # Fallback: return first few snippets
        fallback_snippets = []
        for result in search_results[:3]:
            if result.get('snippets'):
                fallback_snippets.extend(result['snippets'][:2])

        if fallback_snippets:
            return "Here's what I found:\n\n" + "\n\n".join(fallback_snippets[:3])
        else:
            return f"I found {len(search_results)} results but couldn't extract detailed information. Please try rephrasing your question."


def is_insurance_related_query(query: str) -> bool:
    """
    Smart guardrail to check if query is related to health insurance.
    Returns True if relevant, False if off-topic or spam.
    """
    query_lower = query.lower().strip()

    # Empty or too short queries
    if len(query_lower) < 2:
        return False

    # Pure numbers are OK (age, year, income during collection)
    if query_lower.isdigit():
        return True

    # Single character responses
    if len(query_lower) == 1:
        return False

    # Common greetings and off-topic phrases - reject immediately
    off_topic_patterns = [
        'hello', 'hi', 'hey', 'sup', 'yo',
        'thanks', 'thank you', 'thx',
        'bye', 'goodbye', 'see you', 'later',
        'how are you', 'whats up', "what's up",
        'who are you', 'what is your name', 'tell me about yourself',
        'weather', 'temperature', 'forecast',
        'sports', 'game', 'score', 'match',
        'movie', 'film', 'show', 'netflix',
        'recipe', 'food', 'cook', 'restaurant',
        'music', 'song', 'album', 'artist',
        'joke', 'funny', 'laugh', 'humor'
    ]

    for pattern in off_topic_patterns:
        if pattern in query_lower:
            # Make sure it's not part of a larger insurance question
            # e.g., "hello, I need insurance" should pass
            words = query_lower.split()
            if len(words) <= 2 or (pattern in words and len(words) <= 3):
                return False

    # Insurance-specific keywords (strong signals)
    insurance_keywords = [
        'insurance', 'plan', 'coverage', 'deductible', 'copay', 'coinsurance',
        'premium', 'out of pocket', 'oop', 'max', 'limit',
        'provider', 'network', 'doctor', 'physician', 'hospital', 'clinic',
        'benefits', 'policy', 'claim', 'enroll', 'enrollment',
        'aetna', 'molina', 'unitedhealth', 'united', 'cigna', 'humana',
        'blue cross', 'bcbs', 'anthem', 'kaiser',
        'hmo', 'ppo', 'epo', 'pos',
        'aca', 'obamacare', 'medicaid', 'medicare', 'chip',
        'subsidy', 'tax credit', 'marketplace',
        'specialist', 'prescription', 'drug', 'rx', 'pharmacy',
        'mental health', 'therapy', 'counseling',
        'vision', 'dental', 'eye', 'tooth', 'glasses',
        'preventive', 'checkup', 'screening', 'vaccine',
        'emergency', 'urgent care', 'er',
        'in-network', 'out-of-network', 'out of network',
        'qualify', 'eligible', 'eligibility',
        'compare', 'comparison', 'versus', 'vs',
        'county', 'state', 'florida', 'miami', 'broward', 'leon'
    ]

    has_insurance_keyword = any(keyword in query_lower for keyword in insurance_keywords)

    # If has clear insurance keywords, it's valid
    if has_insurance_keyword:
        return True

    # Health-related terms (weaker signals, need more context)
    health_keywords = [
        'health', 'medical', 'healthcare', 'care',
        'covered', 'cover', 'covers',
        'cost', 'price', 'expense', 'fee', 'charge', 'pay', 'afford',
        'find', 'search', 'looking', 'need', 'want', 'get',
        'best', 'cheapest', 'affordable', 'lowest',
        'help', 'question', 'information', 'details'
    ]

    has_health_keyword = any(keyword in query_lower for keyword in health_keywords)

    # Health keywords + reasonable length = probably relevant
    if has_health_keyword and len(query_lower.split()) >= 3:
        return True

    # If no keywords but longer phrase (5+ words), give benefit of doubt
    if len(query_lower.split()) >= 5:
        return True

    # Single word with no context = not relevant
    if len(query_lower.split()) == 1:
        return False

    # Default: reject if we can't determine relevance
    return False


@app.post("/chat", response_model=ConversationResponse)
async def chat(request: ConversationRequest):
    """
    Main conversational endpoint with progressive information gathering.

    This endpoint:
    1. Detects user intent and extracts entities
    2. Progressively asks for missing information (age, income, county)
    3. Provides acknowledgments after each piece of information
    4. Performs You.com search when all required info is collected

    Args:
        request: ConversationRequest with optional session_id and user query

    Returns:
        ConversationResponse with next steps, collected data, or search results
    """
    # Get or create session
    session_id, session = get_or_create_session(request.session_id)

    # GUARDRAIL: Check if query is insurance-related (unless we're in the middle of collecting)
    # During collection, user might just provide numbers/single words which are valid
    if session["stage"] != "collecting" and not is_insurance_related_query(request.query):
        print(f"DEBUG: Query rejected as off-topic or too vague: '{request.query}'")
        return ConversationResponse(
            session_id=session_id,
            response="I can only help with health insurance-related questions.",
            requires_input=False,
            next_question=None,
            collected_entities=session["collected_entities"],
            status="collecting",
            intent=session.get("intent")
        )

    # Add user query to conversation history
    session["conversation_history"].append({
        "role": "user",
        "content": request.query,
        "timestamp": datetime.now().isoformat()
    })

    # Entity clearing logic based on intelligent_mode setting
    if not request.intelligent_mode:
        # Intelligent Mode OFF: Clear entities, but ONLY after completing a query
        # During entity collection (stage == "collecting"), keep entities/intent to maintain conversation flow
        if session["stage"] == "complete":
            print(f"DEBUG: Intelligent mode OFF - previous query complete, clearing entities for new query")
            print(f"DEBUG: Old entities: {session['collected_entities']}")
            session["collected_entities"] = {}
            session["intent"] = None
            session["stage"] = "initial"
        elif session["stage"] == "collecting":
            print(f"DEBUG: Intelligent mode OFF but still collecting - PRESERVING entities during collection")
            print(f"DEBUG: Current entities: {session['collected_entities']}")
            print(f"DEBUG: Current intent: {session['intent']}")
            # Keep collecting - don't clear entities or intent while in the middle of collecting
        else:
            # Initial stage with no entities collected yet
            pass
    else:
        # Intelligent Mode ON: Keep reusing entities across messages (never clear)
        print(f"DEBUG: Intelligent mode ON - PRESERVING entities for reuse")
        print(f"DEBUG: Current entities: {session['collected_entities']}")
        print(f"DEBUG: Current intent: {session['intent']}")
        print(f"DEBUG: Current stage: {session['stage']}")
        # Don't clear anything - keep entities and intent for reuse in subsequent messages
        # But DO reset stage to initial if we just completed a search
        if session["stage"] == "complete":
            session["stage"] = "initial"
            print(f"DEBUG: Reset stage from complete to initial for next query")

    try:
        # Pre-filter: Quick keyword-based intent detection for obvious cases
        query_lower = request.query.lower()
        pre_detected_intent = None

        if any(word in query_lower for word in ['news', 'latest', 'update', 'recent', "what's new", 'breaking']):
            pre_detected_intent = "News"
        elif any(phrase in query_lower for phrase in ['what is', 'explain', 'define', 'how does', 'tell me about', 'what are']):
            pre_detected_intent = "FAQ"

        # Use Gemini to extract entities from the current query
        model = genai.GenerativeModel('gemini-2.0-flash-exp')

        # Create a context-aware prompt that includes conversation history
        context = ""
        if session["collected_entities"]:
            context = f"\n\nAlready collected information: {json.dumps(session['collected_entities'])}"

        # If we pre-detected an intent, bias Gemini toward it
        intent_hint = f"\n\nHINT: This looks like a {pre_detected_intent} query based on keywords." if pre_detected_intent else ""

        # Check if we're in the middle of collecting a specific entity
        required_for_current_intent = REQUIRED_ENTITIES_BY_INTENT.get(session.get("intent", ""), [])
        currently_asking_for = None
        for entity in required_for_current_intent:
            if entity not in session["collected_entities"]:
                currently_asking_for = entity
                break

        asking_hint = ""
        if currently_asking_for:
            asking_hint = f"\n\nIMPORTANT: We are currently asking the user for their '{currently_asking_for}'. If the user's message contains ONLY a number or simple value, interpret it as the {currently_asking_for}."

        extraction_prompt = f"""Analyze this user query: "{request.query}"{context}{intent_hint}{asking_hint}

First, determine the PRIMARY INTENT:
- PlanInfo: User wants to find or learn about insurance plans for themselves or a specific plan
- CoverageDetail: User asks what a specific plan covers (keywords: does it cover, coverage for, included, benefits)
- ProviderNetwork: User asks about doctors or hospitals (keywords: doctor, hospital, provider, network, physician)
- Comparison: User wants to compare multiple plans (keywords: compare, vs, versus, difference between)
- FAQ: User has a general question or wants explanation (keywords: what is, explain, define, how does, tell me about)
- News: User wants latest news, updates, or recent information (keywords: news, latest, update, recent, what's new)

Then extract relevant entities ONLY if they are EXPLICITLY mentioned:
- plan_name: Specific insurance plan name (e.g., "Molina Silver 1 HMO", "Aetna Gold")
- insurer: Insurance company name (e.g., "Molina", "Aetna", "UnitedHealthcare", "Blue Cross")
- year: Year of coverage (e.g., "2024", "2025")
- county: County name (NOT state names - only specific counties like "Miami-Dade", "Broward", "Leon")
- age: User's age (number only, not generic references like "my age")
- coverage_item: Specific coverage type or cost aspect (e.g., "dental", "vision", "prescription drugs", "mental health", "deductible", "copay", "coinsurance", "out of pocket")
- subtype: Subtype or specific aspect of coverage (e.g., "preventive care", "specialist visits")
- provider_name: Name of doctor or hospital (e.g., "Dr. Smith", "Memorial Hospital")
- specialty: Medical specialty (e.g., "cardiology", "pediatrics", "dermatology")
- features: Plan features to compare (e.g., "premiums", "deductibles", "copays")
- topic: Topic or subject matter for FAQ or News (use ONLY for FAQ/News intent, NOT for coverage cost aspects).
  * For FAQ: Extract ONLY the concept name, not question words. "what is HMO?" → "HMO", "explain open enrollment" → "open enrollment"
  * For News: Extract the news topic/focus. "Florida health insurance news" → "health insurance", "ACA subsidy updates" → "ACA subsidies"
  * Examples: "HMO", "PPO", "open enrollment", "subsidies", "Medicare", "Medicaid", "qualifying life events"
- state: State name (e.g., "Florida", "Texas", "California")
- income: Annual income (number only, extract just the number without $ or commas)

IMPORTANT FOR FAQ: Extract ONLY the topic name, NOT question words like "what is", "explain", "tell me about", etc!
IMPORTANT: Do NOT extract entities if user is just asking about news or general information without specific details!

Return JSON only:
{{
  "entities": {{"entity_name": "value", ...}},
  "intent": "one of: PlanInfo, CoverageDetail, ProviderNetwork, Comparison, FAQ, News"
}}"""

        response = model.generate_content(
            extraction_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=512,
            )
        )

        # Parse response
        response_text = response.text.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()

        extracted = json.loads(response_text)
        new_entities = extracted.get("entities", {})
        intent = extracted.get("intent", "FAQ")

        # DEBUG: Log intent and entities
        print(f"\n=== DEBUG: Intent Detection ===")
        print(f"User query: {request.query}")
        print(f"Detected intent: {intent}")
        print(f"Extracted entities: {new_entities}")
        print(f"Current session intent: {session['intent']}")
        print(f"Current session stage: {session['stage']}")
        print(f"Current collected entities BEFORE merge: {session['collected_entities']}")

        # Only update intent if we're starting fresh (no current intent)
        # NEVER override an existing intent during the collecting stage
        # This preserves intent when user is answering entity collection questions
        if session["stage"] == "collecting" and session["intent"]:
            # We're in the middle of collecting - PRESERVE the existing intent
            print(f"DEBUG: Preserving existing intent '{session['intent']}' during collection (ignoring Gemini-detected '{intent}')")
        else:
            # We're starting a new query or have no intent yet
            # If intent changed from previous and we have old entities, ask user if they want to keep them
            if session["intent"] and session["intent"] != intent and session["collected_entities"]:
                print(f"DEBUG: Intent changed from '{session['intent']}' to '{intent}'")
                print(f"DEBUG: Found existing entities: {session['collected_entities']}")

                # Check if any of the old entities are relevant to the new intent
                required_for_new_intent = REQUIRED_ENTITIES_BY_INTENT.get(intent, [])
                reusable_entities = {k: v for k, v in session["collected_entities"].items() if k in required_for_new_intent}

                if reusable_entities:
                    print(f"DEBUG: Found reusable entities for new intent: {reusable_entities}")

                    # Create a friendly confirmation message
                    entity_descriptions = []
                    for key, value in reusable_entities.items():
                        entity_descriptions.append(f"{key.replace('_', ' ')}: '{value}'")

                    confirmation_msg = f"I see you were asking about {', '.join(entity_descriptions)}. Would you like me to use this for your {intent.lower()} query, or would you prefer to start fresh?"

                    # Store in a special flag so we can handle the response
                    session["pending_entity_confirmation"] = {
                        "new_intent": intent,
                        "reusable_entities": reusable_entities,
                        "confirmation_msg": confirmation_msg
                    }
                    session["stage"] = "confirming_entities"

                    return ConversationResponse(
                        session_id=session_id,
                        response=confirmation_msg,
                        requires_input=True,
                        next_question=confirmation_msg,
                        collected_entities=session["collected_entities"],
                        status="collecting",
                        intent=session["intent"]
                    )
                else:
                    # No reusable entities, just clear and continue
                    print(f"DEBUG: No reusable entities found, clearing old entities")
                    session["collected_entities"] = {}

            session["intent"] = intent
            print(f"DEBUG: Updated session intent to: {intent}")

        # Merge new entities with collected ones
        # Also handle entity mapping for different intents
        for key, value in new_entities.items():
            if key in VALID_ENTITIES and value:
                print(f"DEBUG: Setting entity {key} = {value}")
                session["collected_entities"][key] = value
        
        print(f"DEBUG: Collected entities AFTER merge: {session['collected_entities']}")

        # Special mapping: for CoverageDetail, "features" should map to "coverage_item"
        if session["intent"] == "CoverageDetail" and "features" in new_entities and "coverage_item" not in new_entities:
            session["collected_entities"]["coverage_item"] = new_entities["features"]
            print(f"DEBUG: Mapped features '{new_entities['features']}' to coverage_item for CoverageDetail intent")

        # Check if we have all required information based on SESSION intent (not newly detected)
        # This ensures we use the correct intent during entity collection
        required_for_intent = REQUIRED_ENTITIES_BY_INTENT.get(session["intent"], [])
        missing_entities = []
        for entity in required_for_intent:
            if entity not in session["collected_entities"] or not session["collected_entities"][entity]:
                missing_entities.append(entity)

        # DEBUG: Log required entities check
        print(f"Required entities for {session['intent']}: {required_for_intent}")
        print(f"Collected entities: {session['collected_entities']}")
        print(f"Missing entities: {missing_entities}")
        print(f"Session stage: {session['stage']}")

        # Determine response based on what we have
        if missing_entities and session["stage"] != "complete":
            # We need more information
            session["stage"] = "collecting"

            # Generate acknowledgment if we just collected something
            response_text = ""
            if new_entities:
                last_entity = list(new_entities.keys())[-1]
                if last_entity in session["collected_entities"]:
                    response_text = generate_acknowledgment(
                        last_entity,
                        session["collected_entities"][last_entity],
                        len(session["collected_entities"])
                    )

            # Ask for next missing entity
            # Pass conversation context for dynamic contextual question generation
            print(f"DEBUG: Checking what's still missing...")
            print(f"DEBUG: Intent: {intent}")
            print(f"DEBUG: Collected entities: {session['collected_entities']}")
            print(f"DEBUG: Required for this intent: {config_manager.get_required_entities(intent)}")
            
            next_question = determine_next_question(
                collected_entities=session["collected_entities"],
                intent=intent,
                conversation_context=session,
                use_dynamic_questions=True  # Enabled for contextual, agentic questions
            )

            # DEBUG: Log question generation
            print(f"DEBUG: Next question determined: {next_question}")

            if response_text and next_question:
                full_response = f"{response_text}\n\n{next_question}"
            elif next_question:
                full_response = next_question
            else:
                full_response = response_text or "I'm gathering information to help you find the best insurance options."

            session["conversation_history"].append({
                "role": "assistant",
                "content": full_response,
                "timestamp": datetime.now().isoformat()
            })

            response_obj = ConversationResponse(
                session_id=session_id,
                response=full_response,
                requires_input=True,
                next_question=next_question,
                collected_entities=session["collected_entities"],
                status="collecting",
                intent=session["intent"]
            )

            # DEBUG: Log response being sent
            print(f"Returning response: requires_input=True, next_question={next_question}")

            return response_obj

        else:
            # We have all required information, perform search
            session["stage"] = "searching"

            # Build search query
            original_query = session["conversation_history"][0]["content"]

            # Generate final acknowledgment
            acknowledgment = "Perfect! I now have all the information I need. Let me search for the best insurance options for you..."

            session["conversation_history"].append({
                "role": "assistant",
                "content": acknowledgment,
                "timestamp": datetime.now().isoformat()
            })

            # Perform You.com search
            try:
                print(f"DEBUG: Calling You.com API with query='{original_query}', intent='{session['intent']}'")
                search_results = search_with_you_api(original_query, session["collected_entities"], session["intent"])
                print(f"DEBUG: You.com API returned {len(search_results)} results")
                session["stage"] = "complete"

                # Generate summary response based on intent
                if session["intent"] in ["PlanInfo", "CoverageDetail"]:
                    # Synthesize answer from search snippets using Gemini
                    print(f"DEBUG: Synthesizing answer from {len(search_results)} search results for {session['intent']}")
                    summary = synthesize_answer_from_search(
                        query=original_query,
                        intent=session["intent"],
                        search_results=search_results,
                        collected_entities=session['collected_entities']
                    )
                elif session["intent"] in ["News", "FAQ"]:
                    summary = f"I found {len(search_results)} results for you:"
                else:
                    # For Comparison, ProviderNetwork etc. show collected info
                    profile_parts = []
                    if session['collected_entities'].get('age'):
                        profile_parts.append(f"Age: {session['collected_entities'].get('age')}")
                    if session['collected_entities'].get('income'):
                        profile_parts.append(f"Income: ${session['collected_entities'].get('income')}")
                    if session['collected_entities'].get('county'):
                        profile_parts.append(f"County: {session['collected_entities'].get('county')}")

                    if profile_parts:
                        summary = f"Based on your profile ({', '.join(profile_parts)}), I found {len(search_results)} insurance options for you:"
                    else:
                        summary = f"I found {len(search_results)} insurance options for you:"

                session["conversation_history"].append({
                    "role": "assistant",
                    "content": summary,
                    "timestamp": datetime.now().isoformat(),
                    "search_results": search_results
                })

                return ConversationResponse(
                    session_id=session_id,
                    response=summary,
                    requires_input=False,
                    next_question=None,
                    collected_entities=session["collected_entities"],
                    search_results=search_results,
                    status="complete",
                    intent=session["intent"]
                )

            except Exception as e:
                error_msg = f"I encountered an error while searching: {str(e)}"
                return ConversationResponse(
                    session_id=session_id,
                    response=error_msg,
                    requires_input=False,
                    collected_entities=session["collected_entities"],
                    status="error",
                    intent=session["intent"]
                )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing conversation: {str(e)}"
        )


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session details."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    return sessions[session_id]


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session deleted"}
    raise HTTPException(status_code=404, detail="Session not found")
