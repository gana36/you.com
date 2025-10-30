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
from pathlib import Path

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


class ConversationResponse(BaseModel):
    session_id: str = Field(..., description="Session ID for this conversation")
    response: str = Field(..., description="Assistant's response")
    requires_input: bool = Field(default=False, description="Whether additional input is needed")
    next_question: Optional[str] = Field(None, description="Next question to ask user")
    collected_entities: Dict[str, Any] = Field(default_factory=dict, description="Entities collected so far")
    search_results: Optional[List[Dict[str, Any]]] = Field(None, description="Search results if query is complete")
    status: str = Field(default="in_progress", description="Status: in_progress, searching, complete")


def create_prompt(query: str) -> str:
    """Create a structured prompt for Gemini to detect intent and extract entities."""
    prompt = f"""You are an AI assistant that analyzes user queries about health insurance plans.

Your task is to:
1. Identify the user's main intent from this list: {', '.join(VALID_INTENTS)}
2. Extract relevant entities from the query

**Valid Intents:**
- PlanInfo: User wants information about a specific health insurance plan
- CoverageDetail: User wants details about what a plan covers
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
- coverage_item: Specific coverage type (e.g., "dental", "vision", "prescription drugs", "mental health")
- subtype: Subtype or specific aspect of coverage (e.g., "preventive care", "specialist visits")
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


def search_with_you_api(query: str, entities: Dict[str, Any], intent: str = "PlanInfo") -> List[Dict[str, Any]]:
    """Search using You.com API with collected user information."""
    you_api_key = os.getenv("you_api")

    if not you_api_key:
        raise HTTPException(status_code=500, detail="You.com API key not configured")

    # Build enhanced query with user context
    # Only add personal info for intents that need it (PlanInfo, Comparison)
    enhanced_query = query

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


def load_datasets() -> Dict[str, List[Dict[str, Any]]]:
    """Load all datasets from the datasets directory."""
    datasets_dir = Path(__file__).parent / "datasets"
    datasets = {}
    
    try:
        # Load CMS API data
        cms_path = datasets_dir / "cms_api.json"
        if cms_path.exists():
            with open(cms_path, 'r') as f:
                datasets['cms'] = json.load(f)
        
        # Load policy data
        policy_path = datasets_dir / "policy_data.json"
        if policy_path.exists():
            with open(policy_path, 'r') as f:
                datasets['policy'] = json.load(f)
        
        # Load provider data
        provider_path = datasets_dir / "provider_data.json"
        if provider_path.exists():
            with open(provider_path, 'r') as f:
                datasets['provider'] = json.load(f)
    except Exception as e:
        print(f"Error loading datasets: {str(e)}")
    
    return datasets


def search_datasets(query: str, entities: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Search through local datasets for relevant information with fuzzy matching."""
    datasets = load_datasets()
    results = []
    
    # Extract search criteria from entities and query
    query_lower = query.lower()
    plan_name = entities.get('plan_name', '').lower() if entities.get('plan_name') else None
    insurer = entities.get('insurer', '').lower() if entities.get('insurer') else None
    provider_name = entities.get('provider_name', '').lower() if entities.get('provider_name') else None
    specialty = entities.get('specialty', '').lower() if entities.get('specialty') else None
    coverage_item = entities.get('coverage_item', '').lower() if entities.get('coverage_item') else None
    state = entities.get('state', '').lower() if entities.get('state') else None
    county = entities.get('county', '').lower() if entities.get('county') else None
    
    # Detect keywords from query for better matching
    keywords = {
        'florida': 'FL',
        'blue': 'blue',
        'molina': 'molina',
        'united': 'united',
        'aetna': 'aetna',
        'silver': 'silver',
        'gold': 'gold',
        'bronze': 'bronze',
        'platinum': 'platinum',
        'hmo': 'hmo',
        'ppo': 'ppo',
        'dental': 'dental',
        'vision': 'vision',
        'prescription': 'prescription',
        'mental health': 'mental health',
        'maternity': 'maternity'
    }
    
    detected_keywords = {k: v for k, v in keywords.items() if k in query_lower}
    
    # Search CMS data - prioritize this as it has detailed pricing
    for item in datasets.get('cms', []):
        score = 0
        match_reasons = []
        
        # Exact entity matches
        if plan_name and plan_name in item.get('plan_marketing_name', '').lower():
            score += 10
            match_reasons.append(f"Plan name match")
        if insurer and insurer in item.get('issuer_name', '').lower():
            score += 8
            match_reasons.append(f"Insurer match")
        if state and state.lower() == item.get('state', '').lower():
            score += 5
            match_reasons.append(f"State match")
            
        # Keyword matches from query
        for keyword, value in detected_keywords.items():
            if value.lower() in item.get('plan_marketing_name', '').lower():
                score += 3
            if value.lower() in item.get('issuer_name', '').lower():
                score += 3
            if value.lower() == item.get('metal_level', '').lower():
                score += 4
            if value.lower() == item.get('plan_type', '').lower():
                score += 4
        
        # If no specific criteria, match Florida plans (default)
        if not plan_name and not insurer and item.get('state') == 'FL':
            score += 2
        
        if score > 0:
            results.append({
                'source': 'CMS Marketplace Data',
                'type': 'plan',
                'title': item.get('plan_marketing_name', 'Unknown Plan'),
                'description': f"{item.get('issuer_name')} - {item.get('metal_level')} {item.get('plan_type')} plan for {item.get('year')}",
                'data': item,
                'score': score,
                'match_reasons': match_reasons,
                'url': item.get('official_source') or item.get('data_source_url')
            })
    
    # Search policy data - has detailed coverage info
    for item in datasets.get('policy', []):
        score = 0
        match_reasons = []
        
        if plan_name and plan_name in item.get('plan_name', '').lower():
            score += 10
            match_reasons.append(f"Plan name match")
        if insurer and insurer in item.get('insurer', '').lower():
            score += 8
            match_reasons.append(f"Insurer match")
        if coverage_item:
            coverage_list = ' '.join(item.get('coverage', [])).lower()
            if coverage_item in coverage_list:
                score += 7
                match_reasons.append(f"Coverage match: {coverage_item}")
        if state and state.lower() == item.get('state', '').lower():
            score += 5
            match_reasons.append(f"State match")
            
        # Keyword matches
        for keyword, value in detected_keywords.items():
            if value.lower() in item.get('plan_name', '').lower():
                score += 3
            if value.lower() in item.get('insurer', '').lower():
                score += 3
            coverage_list = ' '.join(item.get('coverage', [])).lower()
            if value.lower() in coverage_list:
                score += 4
                
        # Default Florida plans
        if not plan_name and not insurer and item.get('state') == 'FL':
            score += 2
        
        if score > 0:
            results.append({
                'source': 'Policy Document',
                'type': 'coverage',
                'title': item.get('plan_name', 'Unknown Plan'),
                'description': item.get('text_chunk', ''),
                'data': item,
                'score': score,
                'match_reasons': match_reasons,
                'url': item.get('sbc_url')
            })
    
    # Search provider data
    for item in datasets.get('provider', []):
        score = 0
        match_reasons = []
        
        if provider_name and provider_name in item.get('provider_name', '').lower():
            score += 10
            match_reasons.append(f"Provider name match")
        if specialty and specialty in item.get('specialty', '').lower():
            score += 8
            match_reasons.append(f"Specialty match")
        if insurer:
            networks = item.get('plan_networks', [])
            for net in networks:
                if insurer in net.get('issuer_name', '').lower():
                    score += 6
                    match_reasons.append(f"In-network for {insurer}")
                    break
        
        # Keyword matches
        for keyword, value in detected_keywords.items():
            if value.lower() in item.get('specialty', '').lower():
                score += 3
        
        if score > 0:
            results.append({
                'source': 'Provider Network',
                'type': 'provider',
                'title': f"{item.get('provider_name')} - {item.get('specialty')}",
                'description': f"{item.get('provider_type')} accepting new patients: {item.get('accepting_new_patients')}",
                'data': item,
                'score': score,
                'match_reasons': match_reasons
            })
    
    # Sort by score (highest first)
    results.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    return results


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
    llm_model = genai.GenerativeModel('gemini-2.0-flash') if use_dynamic_questions else None
    
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
        model = genai.GenerativeModel('gemini-2.0-flash')
        
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
        model = genai.GenerativeModel('gemini-2.0-flash')
        
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
        model = genai.GenerativeModel('gemini-2.0-flash')
        
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
        model = genai.GenerativeModel('gemini-2.0-flash')
        
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


@app.post("/search-general")
async def search_general(request: dict):
    """
    Search and summarize results for General intent queries.
    Combines dataset search with You.com API search and uses Gemini to synthesize.
    
    Args:
        request: Dictionary with query and entities
        
    Returns:
        Combined and summarized results with sources
    """
    query = request.get("query", "")
    entities = request.get("entities", {})
    
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        # Search datasets
        print(f"DEBUG: Searching datasets for: {query}")
        dataset_results = search_datasets(query, entities)
        print(f"DEBUG: Found {len(dataset_results)} dataset results")
        
        # Search You.com API
        print(f"DEBUG: Searching You.com API for: {query}")
        api_results = search_with_you_api(query, entities, intent="General")
        print(f"DEBUG: Found {len(api_results)} API results")
        
        # Combine results
        all_results = {
            'dataset_results': dataset_results[:5],  # Top 5 from datasets
            'api_results': api_results[:5]  # Top 5 from API
        }
        
        # Prepare context for Gemini
        context_parts = []
        sources = []
        
        # Add dataset results to context with RICH details
        context_parts.append("=== OFFICIAL DATASET RESULTS (CMS & Policy Documents) ===")
        for idx, result in enumerate(dataset_results[:8]):  # Increased to 8 for more data
            context_parts.append(f"\n--- Dataset Source {idx + 1}: {result['title']} ---")
            context_parts.append(f"Type: {result['type']}")
            context_parts.append(f"Source: {result['source']}")
            context_parts.append(f"Match Score: {result.get('score', 0)}")
            
            # Add detailed data based on type
            data = result.get('data', {})
            if result['type'] == 'plan':
                # CMS data - show ALL pricing tiers and details
                context_parts.append(f"\n📋 PLAN DETAILS:")
                context_parts.append(f"  - Insurer: {data.get('issuer_name', 'N/A')}")
                context_parts.append(f"  - Plan Type: {data.get('plan_type', 'N/A')}")
                context_parts.append(f"  - Metal Level: {data.get('metal_level', 'N/A')}")
                context_parts.append(f"  - Year: {data.get('year', 'N/A')}")
                context_parts.append(f"  - State: {data.get('state', 'N/A')}")
                context_parts.append(f"\n💰 MONTHLY PREMIUMS BY AGE:")
                context_parts.append(f"  - Age 21: ${data.get('monthly_premium_adult_21', 'N/A')}")
                context_parts.append(f"  - Age 27: ${data.get('monthly_premium_adult_27', 'N/A')}")
                context_parts.append(f"  - Age 30: ${data.get('monthly_premium_adult_30', 'N/A')}")
                context_parts.append(f"  - Age 40: ${data.get('monthly_premium_adult_40', 'N/A')}")
                context_parts.append(f"  - Age 50: ${data.get('monthly_premium_adult_50', 'N/A')}")
                context_parts.append(f"  - Age 60: ${data.get('monthly_premium_adult_60', 'N/A')}")
                context_parts.append(f"\n🏥 COST SHARING:")
                context_parts.append(f"  - Individual Deductible: ${data.get('deductible_individual_in_network', 'N/A')}")
                context_parts.append(f"  - Family Deductible: ${data.get('deductible_family_in_network', 'N/A')}")
                context_parts.append(f"  - Individual Out-of-Pocket Max: ${data.get('out_of_pocket_max_individual_in_network', 'N/A')}")
                context_parts.append(f"  - Family Out-of-Pocket Max: ${data.get('out_of_pocket_max_family_in_network', 'N/A')}")
                context_parts.append(f"  - PCP Visit Copay: ${data.get('pcp_office_visit_copay', 'N/A')}")
                context_parts.append(f"  - Specialist Visit Copay: ${data.get('specialist_office_visit_copay', 'N/A')}")
                context_parts.append(f"\n📄 Official Source: {data.get('official_source', data.get('data_source_url', 'N/A'))}")
                
            elif result['type'] == 'coverage':
                # Policy data - show detailed coverage and copays
                context_parts.append(f"\n📋 COVERAGE DETAILS:")
                context_parts.append(f"  - Insurer: {data.get('insurer', 'N/A')}")
                context_parts.append(f"  - Plan Type: {data.get('plan_type', 'N/A')}")
                context_parts.append(f"  - Metal Tier: {data.get('metal_tier', 'N/A')}")
                context_parts.append(f"  - Coverage Year: {data.get('coverage_year', 'N/A')}")
                
                coverage_list = data.get('coverage', [])
                if coverage_list:
                    context_parts.append(f"\n✅ COVERED SERVICES ({len(coverage_list)} services):")
                    context_parts.append(f"  {', '.join(coverage_list)}")
                
                context_parts.append(f"\n💰 COSTS:")
                context_parts.append(f"  - Individual Deductible: ${data.get('deductible_individual', 'N/A')}")
                context_parts.append(f"  - Family Deductible: ${data.get('deductible_family', 'N/A')}")
                context_parts.append(f"  - Out-of-Pocket Max (Individual): ${data.get('out_of_pocket_max_individual', 'N/A')}")
                context_parts.append(f"  - Out-of-Pocket Max (Family): ${data.get('out_of_pocket_max_family', 'N/A')}")
                context_parts.append(f"  - Average Premium (age 40): ${data.get('premium_avg_40yr', 'N/A')}")
                
                context_parts.append(f"\n🏥 COPAYS:")
                context_parts.append(f"  - Primary Care: ${data.get('copay_pcp', 'N/A')}")
                context_parts.append(f"  - Specialist: ${data.get('copay_specialist', 'N/A')}")
                context_parts.append(f"  - Emergency Room: ${data.get('copay_er', 'N/A')}")
                context_parts.append(f"  - Urgent Care: ${data.get('copay_urgent_care', 'N/A')}")
                context_parts.append(f"  - Generic Rx: ${data.get('copay_generic_rx', 'N/A')}")
                context_parts.append(f"  - Preferred Brand Rx: ${data.get('copay_preferred_brand_rx', 'N/A')}")
                context_parts.append(f"  - Coinsurance Rate: {data.get('coinsurance_rate', 'N/A')}")
                
                context_parts.append(f"\n📝 PLAN SUMMARY:")
                context_parts.append(f"  {data.get('text_chunk', 'N/A')}")
                context_parts.append(f"\n📄 Official SBC: {data.get('sbc_url', 'N/A')}")
                
            elif result['type'] == 'provider':
                location = data.get('location', {})
                context_parts.append(f"\n👨‍⚕️ PROVIDER INFO:")
                context_parts.append(f"  - Specialty: {data.get('specialty', 'N/A')}")
                context_parts.append(f"  - Location: {location.get('city', 'N/A')}, {location.get('state', 'N/A')}")
                context_parts.append(f"  - Address: {location.get('address_line1', 'N/A')}")
                context_parts.append(f"  - Accepting New Patients: {data.get('accepting_new_patients', 'N/A')}")
                context_parts.append(f"  - Telehealth Available: {data.get('telehealth_available', 'N/A')}")
                
                networks = data.get('plan_networks', [])
                if networks:
                    context_parts.append(f"\n🏥 IN-NETWORK FOR {len(networks)} PLANS:")
                    for net in networks[:3]:
                        context_parts.append(f"  - {net.get('plan_name', 'N/A')} ({net.get('issuer_name', 'N/A')})")
            
            sources.append({
                'title': result['title'],
                'source': result['source'],
                'type': 'dataset',
                'url': result.get('url')  # Include URL from dataset if available
            })
        
        # Add API results to context
        context_parts.append("\n\n=== WEB SEARCH RESULTS ===")
        for idx, result in enumerate(api_results[:5]):
            context_parts.append(f"\nWeb Source {idx + 1}: {result['title']}")
            context_parts.append(f"Description: {result['description']}")
            if result.get('snippets'):
                context_parts.append("Key excerpts:")
                for snippet in result['snippets'][:2]:
                    context_parts.append(f"  - {snippet}")
            
            sources.append({
                'title': result['title'],
                'url': result.get('url', ''),
                'source': 'Web',
                'type': 'api'
            })
        
        combined_context = "\n".join(context_parts)
        
        # Use Gemini to synthesize comprehensive answer
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""You are a health insurance expert. Based on the official CMS data, policy documents, and web sources below, create a comprehensive answer to: "{query}"

Search Results:
{combined_context}

IMPORTANT INSTRUCTIONS:
1. PRIORITIZE the official dataset results (CMS & Policy Documents) - they contain verified pricing, coverage, and plan details
2. Use SPECIFIC NUMBERS from the data: premiums by age, deductibles, copays, out-of-pocket maximums
3. Mention plan names, insurers, and metal levels when discussing specific plans
4. Include coverage details (what services are covered) when relevant
5. Combine dataset facts with web context for a complete answer

Format your response as JSON:
{{
  "summary": "2-3 paragraph comprehensive answer with SPECIFIC DATA (prices, plan names, coverage details, copays, etc.)",
  "key_findings": [
    "Finding with specific numbers/details from datasets",
    "Another finding with concrete data",
    "3-5 total findings with real numbers"
  ],
  "recommendations": "Actionable next steps based on the data"
}}

Example of good summary: "The Florida Blue myBlue Silver HMO 2025 plan costs $450/month for a 40-year-old, with a low $100 individual deductible and $1,800 out-of-pocket maximum. Primary care visits are just $5 copay..."

Make it data-rich and specific!
"""
        
        print(f"DEBUG: Synthesizing answer with Gemini")
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Parse JSON response
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        synthesized_data = json.loads(response_text.strip())
        
        print(f"DEBUG: Successfully synthesized answer")
        
        return {
            "status": "success",
            "query": query,
            "summary": synthesized_data.get("summary", ""),
            "key_findings": synthesized_data.get("key_findings", []),
            "recommendations": synthesized_data.get("recommendations", ""),
            "sources": sources,
            "raw_results": all_results
        }
        
    except json.JSONDecodeError as e:
        print(f"DEBUG: JSON parse error: {str(e)}")
        # Fallback: return raw results
        return {
            "status": "partial",
            "query": query,
            "summary": "Found relevant information from multiple sources.",
            "key_findings": [],
            "recommendations": "",
            "sources": sources,
            "raw_results": all_results
        }
    except Exception as e:
        print(f"DEBUG: Error in search-general: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing search: {str(e)}")


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

    # Add user query to conversation history
    session["conversation_history"].append({
        "role": "user",
        "content": request.query,
        "timestamp": datetime.now().isoformat()
    })

    # Only clear entities if we completed a previous query (stage was "complete")
    # If stage is "collecting", we're still answering questions for the same intent, so keep entities/intent
    if session["stage"] == "complete":
        print(f"DEBUG: Previous query complete, clearing entities for new query")
        print(f"DEBUG: Old entities: {session['collected_entities']}")
        print(f"DEBUG: Old intent: {session['intent']}")
        session["collected_entities"] = {}
        session["intent"] = None
        session["stage"] = "initial"
        print(f"DEBUG: Entities cleared, ready for new query")
    elif session["stage"] == "initial":
        # For truly new sessions, just ensure stage is initial
        pass
    # If stage is "collecting" or "searching", don't clear - we're continuing the same query

    try:
        # Pre-filter: Quick keyword-based intent detection for obvious cases
        query_lower = request.query.lower()
        pre_detected_intent = None

        if any(word in query_lower for word in ['news', 'latest', 'update', 'recent', "what's new", 'breaking']):
            pre_detected_intent = "News"
        elif any(phrase in query_lower for phrase in ['what is', 'explain', 'define', 'how does', 'tell me about', 'what are']):
            pre_detected_intent = "FAQ"

        # Use Gemini to extract entities from the current query
        model = genai.GenerativeModel('gemini-2.0-flash')

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
- FAQ: User has a general question or wants explanation (keywords: what is, explain, define, how does, tell me about)
- News: User wants latest news, updates, or recent information (keywords: news, latest, update, recent, what's new)
- General: User wants to find information about insurance plans, coverage, providers, or comparisons (anything else)

Then extract relevant entities ONLY if they are EXPLICITLY mentioned:
- plan_name: Specific insurance plan name (e.g., "Molina Silver 1 HMO", "Aetna Gold")
- insurer: Insurance company name (e.g., "Molina", "Aetna", "UnitedHealthcare", "Blue Cross", "Florida Blue")
- year: Year of coverage (e.g., "2024", "2025")
- county: County name (NOT state names - only specific counties like "Miami-Dade", "Broward", "Leon")
- age: User's age (number only, not generic references like "my age")
- coverage_item: Specific coverage type (e.g., "dental", "vision", "prescription drugs", "mental health")
- provider_name: Name of doctor or hospital (e.g., "Dr. Smith", "Memorial Hospital", "Dr. Garcia")
- specialty: Medical specialty (e.g., "cardiology", "pediatrics", "dermatology", "family medicine")
- topic: Topic or subject matter for FAQ or News. 
  * For FAQ: Extract ONLY the concept name, not question words. "what is coinsurance?" → "coinsurance", "explain deductible" → "deductible"
  * For News: Extract the news topic/focus. "Florida health insurance news" → "health insurance", "ACA subsidy updates" → "ACA subsidies", "Medicare changes" → "Medicare"
  * Examples: "coinsurance", "deductible", "copay", "HMO", "PPO", "open enrollment", "subsidies", "Medicare", "Medicaid"
- state: State name (e.g., "Florida", "Texas", "California")

IMPORTANT FOR FAQ: Extract ONLY the topic name, NOT question words like "what is", "explain", "tell me about", etc!

Return JSON only:
{{
  "entities": {{"entity_name": "value", ...}},
  "intent": "one of: General, FAQ, News"
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

        # Only update intent if we're not already collecting for an intent
        # This preserves intent when user is answering entity collection questions
        if session["stage"] != "collecting" or not session["intent"]:
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
                        status="collecting"
                    )
                else:
                    # No reusable entities, just clear and continue
                    print(f"DEBUG: No reusable entities found, clearing old entities")
                    session["collected_entities"] = {}
            
            session["intent"] = intent
            print(f"DEBUG: Updated session intent to: {intent}")
        else:
            print(f"DEBUG: Keeping existing intent '{session['intent']}' (ignoring detected '{intent}' during collection)")

        # Merge new entities with collected ones
        # Also handle entity mapping for different intents
        for key, value in new_entities.items():
            if key in VALID_ENTITIES and value:
                # Special handling for News intent: always ask for topic, don't auto-extract
                if intent == "News" and key == "topic":
                    print(f"DEBUG: Skipping auto-extracted topic for News intent - will ask user")
                    continue
                print(f"DEBUG: Setting entity {key} = {value}")
                session["collected_entities"][key] = value
        
        print(f"DEBUG: Collected entities AFTER merge: {session['collected_entities']}")

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
                status="collecting"
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
                print(f"DEBUG: Calling You.com API with query='{original_query}', intent='{intent}'")
                search_results = search_with_you_api(original_query, session["collected_entities"], intent)
                print(f"DEBUG: You.com API returned {len(search_results)} results")
                session["stage"] = "complete"

                # Generate summary response based on intent
                if intent in ["News", "FAQ"]:
                    summary = f"I found {len(search_results)} results for you:"
                else:
                    # For PlanInfo, Comparison, etc. show collected info
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
                    status="complete"
                )

            except Exception as e:
                error_msg = f"I encountered an error while searching: {str(e)}"
                return ConversationResponse(
                    session_id=session_id,
                    response=error_msg,
                    requires_input=False,
                    collected_entities=session["collected_entities"],
                    status="error"
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
