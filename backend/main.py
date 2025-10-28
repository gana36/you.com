from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Intent Detection API", version="1.0.0")

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
    "provider_name"
]


class QueryRequest(BaseModel):
    query: str = Field(..., description="User's natural language question")


class IntentResponse(BaseModel):
    intent: str = Field(..., description="Detected user intent")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities")
    missing: List[str] = Field(default_factory=list, description="Missing or ambiguous entities")
    confidence: Optional[float] = Field(None, description="Confidence score for intent detection")


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
- plan_name: Name of the health insurance plan (e.g., "Molina Silver", "Aetna Gold")
- insurer: Insurance company name (e.g., "Molina", "Aetna", "UnitedHealthcare")
- county: County name (e.g., "Broward", "Miami-Dade")
- year: Year of the plan (e.g., "2024", "2025")
- age: Age of the person (e.g., "43", "65")
- coverage_item: Specific coverage item (e.g., "dental", "vision", "prescription drugs")
- provider_name: Name of a doctor or hospital (e.g., "Dr. Smith", "Memorial Hospital")

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
    return {
        "status": "healthy" if api_key_configured else "degraded",
        "gemini_api_configured": api_key_configured,
        "message": "Ready" if api_key_configured else "GEMINI_API_KEY not configured"
    }
