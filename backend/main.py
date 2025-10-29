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

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Insurance Assistant API", version="2.0.0")

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

# Define valid intents
VALID_INTENTS = [
    "PlanInfo",
    "CoverageDetail",
    "ProviderNetwork",
    "Comparison",
    "FAQ",
    "News"
]

# Define valid entity types
VALID_ENTITIES = [
    "plan_name",
    "insurer",
    "county",
    "year",
    "age",
    "coverage_item",
    "subtype",
    "provider_name",
    "specialty",
    "features",
    "topic",
    "state",
    "income",
    "family_size",
    "zip_code"
]

# Define required entities for insurance search (varies by intent)
REQUIRED_ENTITIES_BY_INTENT = {
    "PlanInfo": ["plan_name", "insurer", "year", "county", "age"],
    "CoverageDetail": ["plan_name", "insurer", "year", "county", "coverage_item", "subtype"],
    "ProviderNetwork": ["provider_name", "specialty", "county", "plan_name", "insurer"],
    "Comparison": ["plan_name", "insurer", "year", "county"],  # age and features are optional
    "FAQ": ["topic"],  # state/local context is optional
    "News": ["topic", "year"]  # insurer/plan_name and state are optional but at least one should be provided
}


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
            "stage": "initial"  # initial, collecting, searching, complete
        }

    # Update last activity
    sessions[session_id]["last_activity"] = datetime.now()
    return session_id, sessions[session_id]


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
        "query": enhanced_query
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Extract and format results from You.com response
        results = []

        # You.com API returns: {'results': {'web': [...], 'news': [...]}, 'metadata': {...}}
        web_results = data.get("results", {}).get("web", [])

        for hit in web_results[:10]:
            results.append({
                "title": hit.get("title", ""),
                "description": hit.get("description", ""),
                "url": hit.get("url", ""),
                "snippets": hit.get("snippets", [])
            })

        return results

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"You.com API error: {str(e)}")


def determine_next_question(collected_entities: Dict[str, Any], intent: str) -> Optional[str]:
    """Determine what information to ask for next based on intent."""
    # Get required entities for this intent
    required = REQUIRED_ENTITIES_BY_INTENT.get(intent, [])

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

    questions = {
        "age": "To help you find the best insurance options, could you please tell me your age?",
        "income": "Great! Now, could you share your approximate annual income? This helps us find plans that fit your budget.",
        "county": "Perfect! Which county do you live in? This will help us find plans available in your area.",
        "plan_name": "Which insurance plan are you interested in? (e.g., Molina Silver 1 HMO, Aetna Gold)",
        "insurer": "Which insurance company or insurer are you asking about? (e.g., Molina, Aetna, UnitedHealthcare)",
        "year": "Which year are you interested in? (e.g., 2024, 2025)",
        "coverage_item": "Which coverage item would you like to know about? (e.g., dental, vision, prescription drugs)",
        "subtype": "Could you specify the subtype or specific aspect of this coverage you're interested in?",
        "provider_name": "Which doctor or healthcare provider are you asking about?",
        "specialty": "What medical specialty are you looking for? (e.g., cardiology, pediatrics, dermatology)",
        "features": "Which features or aspects would you like to compare? (e.g., premiums, deductibles, coverage)",
        "topic": "What specific topic or question do you have about health insurance?",
        "state": "Which state are you located in?",
        "family_size": "How many people will be covered under this insurance plan?",
        "zip_code": "What's your zip code?"
    }

    return questions.get(next_entity, f"Could you please provide: {next_entity}?")


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
- coverage_item: Specific coverage type (e.g., "dental", "vision", "prescription drugs", "mental health")
- subtype: Subtype or specific aspect of coverage (e.g., "preventive care", "specialist visits")
- provider_name: Name of doctor or hospital (e.g., "Dr. Smith", "Memorial Hospital")
- specialty: Medical specialty (e.g., "cardiology", "pediatrics", "dermatology")
- features: Plan features to compare (e.g., "premiums", "deductibles", "copays")
- topic: Topic or subject matter (e.g., "open enrollment", "subsidies", "qualifying life events")
- state: State name (e.g., "Florida", "Texas", "California")
- income: Annual income (number only, extract just the number without $ or commas)

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
        print(f"Detected intent: {intent}")
        print(f"Extracted entities: {new_entities}")

        # Update session intent if not set
        if not session["intent"]:
            session["intent"] = intent

        # Merge new entities with collected ones
        for key, value in new_entities.items():
            if key in VALID_ENTITIES and value:
                session["collected_entities"][key] = value

        # Check if we have all required information based on intent
        required_for_intent = REQUIRED_ENTITIES_BY_INTENT.get(intent, [])
        missing_entities = []
        for entity in required_for_intent:
            if entity not in session["collected_entities"] or not session["collected_entities"][entity]:
                missing_entities.append(entity)

        # DEBUG: Log required entities check
        print(f"Required entities for {intent}: {required_for_intent}")
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
            next_question = determine_next_question(session["collected_entities"], intent)

            # DEBUG: Log question generation
            print(f"Next question: {next_question}")

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
                search_results = search_with_you_api(original_query, session["collected_entities"], intent)
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
