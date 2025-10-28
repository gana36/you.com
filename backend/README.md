# Intent Detection API - Backend

FastAPI service that uses **Gemini 2.0 Flash** to detect user intent and extract entities from natural language queries about health insurance plans.

## Features

- **Intent Classification**: Identifies user intent from 6 predefined categories
- **Entity Extraction**: Extracts structured data (plan names, counties, ages, etc.)
- **Missing Entity Detection**: Flags ambiguous or missing information
- **Confidence Scoring**: Provides confidence levels for intent detection
- **Gemini 2.0 Flash**: Leverages Google's latest AI model for accurate NLU

## Valid Intents

- `PlanInfo` - Information about a specific health insurance plan
- `CoverageDetail` - Details about plan coverage
- `ProviderNetwork` - Questions about doctors/hospitals in network
- `Comparison` - Comparing multiple plans
- `FAQ` - General health insurance questions
- `News` - Recent updates about plans/insurers

## Valid Entities

- `plan_name` - Health insurance plan name (e.g., "Molina Silver")
- `insurer` - Insurance company (e.g., "Aetna", "UnitedHealthcare")
- `county` - County name (e.g., "Broward", "Miami-Dade")
- `year` - Plan year (e.g., "2024", "2025")
- `age` - Person's age (e.g., "43", "65")
- `coverage_item` - Specific coverage (e.g., "dental", "prescription drugs")
- `provider_name` - Doctor/hospital name (e.g., "Dr. Smith")

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Gemini API Key

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Run the Server

```bash
uvicorn main:app --reload
```

Server will start at `http://localhost:8000`

## API Usage

### Endpoint: `POST /detect_intent_entities`

**Request:**

```json
{
  "query": "Tell me about Molina Silver plan in Broward county for a 43 year old"
}
```

**Response:**

```json
{
  "intent": "PlanInfo",
  "entities": {
    "plan_name": "Molina Silver",
    "county": "Broward",
    "age": "43"
  },
  "missing": ["year", "insurer"],
  "confidence": 0.95
}
```

### Example with cURL

```bash
curl -X POST "http://localhost:8000/detect_intent_entities" \
  -H "Content-Type: application/json" \
  -d '{"query": "Does Aetna Gold cover dental in Miami-Dade?"}'
```

### Example with Python

```python
import requests

response = requests.post(
    "http://localhost:8000/detect_intent_entities",
    json={"query": "Compare Molina Silver and Aetna Gold plans for 2025"}
)

result = response.json()
print(f"Intent: {result['intent']}")
print(f"Entities: {result['entities']}")
print(f"Missing: {result['missing']}")
```

## Testing

Run the test suite:

```bash
python test_examples.py
```

This will test various query types and show entity extraction results.

## API Documentation

Once the server is running, visit:

- **Interactive API docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

## Example Queries

| Query | Expected Intent | Key Entities |
|-------|----------------|--------------|
| "Tell me about Molina Silver in Broward" | PlanInfo | plan_name, county |
| "Does Aetna cover dental?" | CoverageDetail | insurer, coverage_item |
| "Is Dr. Smith in UnitedHealthcare network?" | ProviderNetwork | provider_name, insurer |
| "Compare Molina and Aetna plans" | Comparison | Multiple insurers |
| "What's the difference between HMO and PPO?" | FAQ | None |
| "Latest updates for Humana 2025 plans" | News | insurer, year |

## Response Fields

- **intent** (string): The detected user intent
- **entities** (object): Dictionary of extracted entities with their values
- **missing** (array): List of entity types that are missing or ambiguous
- **confidence** (float, optional): Confidence score from 0.0 to 1.0

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `500` - Server error (API key not configured, Gemini API failure, etc.)

Error response format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

## Environment Variables

- `GEMINI_API_KEY` (required) - Your Google Gemini API key

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Gemini 2.0 Flash** - Google's latest AI model
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server
