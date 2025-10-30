# Health Insurance AI Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0+-blue.svg)](https://reactjs.org/)

An intelligent, conversational AI assistant for health insurance plan search, comparison, and provider lookup. Built with FastAPI, Google Gemini AI, and React, this system provides transparent multi-step reasoning and verified data from official sources.

## Tech Stack

**Backend:**
- FastAPI - Modern Python web framework
- Google Gemini 2.0 Flash - Intent detection and entity extraction
- You.com Search API - Real-time web and news search
- Python 3.8+ - Core language

**Frontend:**
- React 18 - UI framework
- TypeScript - Type-safe development
- Tailwind CSS - Styling
- Vite - Build tool and dev server

**Data Sources:**
- CMS/Healthcare.gov API - Official marketplace plan data
- Policy SBC Documents - Detailed coverage information
- Provider Network APIs - Doctor and hospital data

## Features

### Intelligent Conversation
- **Intent Detection**: Automatically classifies user queries (Plan Info, Comparison, Coverage Details, Provider Search, FAQ, News)
- **Progressive Entity Collection**: Asks one clarifying question at a time for natural conversation flow
- **Context-Aware**: Maintains conversation history and adapts to user responses
- **Multi-Source Search**: Combines local datasets with You.com API for comprehensive results

### Agentic UI
- **Transparent Thinking**: Shows AI reasoning process in real-time
- **Query Construction**: Displays how search queries are being built
- **Source Verification**: All results include verified source badges with URLs
- **Interactive Entity Collection**: Inline forms for missing information

### Rich Data Sources
- **CMS Marketplace Data**: Official pricing and plan details from Healthcare.gov
- **Policy Documents**: Detailed coverage information from insurer SBCs
- **Provider Networks**: Doctor and hospital network information
- **Real-time Web Search**: Latest news and updates via You.com API

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chat UI      │  │ Thinking     │  │ Results      │      │
│  │ Component    │  │ Display      │  │ Cards        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────────┐
│                  Backend (FastAPI)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Intent Detection & Entity Extraction         │  │
│  │              (Google Gemini 2.0 Flash)               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Dataset Search Engine                   │  │
│  │  • Fuzzy Matching  • Keyword Detection               │  │
│  │  • Score-based Ranking  • Multi-source Aggregation   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 Data Sources                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ CMS API  │  │ Policy   │  │ Provider │           │  │
│  │  │ Data     │  │ Docs     │  │ Network  │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## How Dataset Search Works

### Overview

The dataset search system uses a **multi-stage, score-based ranking algorithm** that combines exact matching, fuzzy keyword detection, and entity-based filtering to find the most relevant health insurance information.

### Search Process

#### 1. **Data Loading** (`load_datasets()`)

The system loads three JSON datasets at runtime:

```python
datasets/
├── cms_api.json        # 13 plans - Official CMS marketplace data
├── policy_data.json    # 13 plans - Detailed coverage from SBCs  
└── provider_data.json  # 5 providers - Doctor/hospital networks
```

**Data Sources:**
- **CMS API Data**: Plan IDs, pricing by age, deductibles, copays, metal levels
- **Policy Documents**: Coverage arrays, text descriptions, coinsurance rates
- **Provider Network**: Doctor specialties, locations, plan networks, quality metrics

#### 2. **Entity Extraction**

Google Gemini extracts structured entities from natural language:

```javascript
User: "Show me Florida Blue silver plans"

↓ Gemini Extraction ↓

{
  "intent": "PlanInfo",
  "entities": {
    "insurer": "Florida Blue",
    "metal_level": "Silver",
    "state": "FL"
  }
}
```

#### 3. **Keyword Detection**

The search engine detects keywords from the raw query:

```python
keywords = {
    'florida': 'FL',
    'blue': 'blue',
    'molina': 'molina',
    'silver': 'silver',
    'gold': 'gold',
    'dental': 'dental',
    'mental health': 'mental health',
    # ... more keywords
}
```

#### 4. **Score-Based Ranking**

Each dataset item receives a relevance score based on matches:

**CMS Data Scoring:**
```python
+10 points: Exact plan name match
+8 points:  Exact insurer match
+5 points:  State match
+4 points:  Metal level or plan type match
+3 points:  Keyword in plan name or insurer
+2 points:  Default Florida plan (if no specific criteria)
```

**Policy Data Scoring:**
```python
+10 points: Plan name match
+8 points:  Insurer match
+7 points:  Coverage item match (e.g., "dental" in coverage array)
+5 points:  State match
+4 points:  Keyword in coverage list
+3 points:  Keyword in plan name/insurer
```

**Provider Data Scoring:**
```python
+10 points: Provider name match
+8 points:  Specialty match
+6 points:  In-network for specified insurer
+3 points:  Keyword in specialty
```

#### 5. **Example Search Flow**

**Query:** "I need a Molina silver plan with mental health coverage"

**Step 1 - Entity Extraction:**
```json
{
  "insurer": "Molina",
  "metal_level": "Silver",
  "coverage_item": "mental health"
}
```

**Step 2 - Keyword Detection:**
```python
detected_keywords = {
  'molina': 'molina',
  'silver': 'silver',
  'mental health': 'mental health'
}
```

**Step 3 - Scoring (for Molina Silver 1 HMO):**
```python
CMS Data:
  +8 (insurer "Molina" match)
  +4 (metal_level "Silver" match)
  = 12 points

Policy Data:
  +8 (insurer match)
  +7 ("mental health" in coverage array)
  +4 ("silver" in plan name)
  = 19 points ← HIGHEST SCORE
```

**Step 4 - Result:**
```json
{
  "source": "Policy Document",
  "type": "coverage",
  "title": "Molina Marketplace Silver 1 HMO 2025",
  "description": "Exceptional value with $0 copays...",
  "score": 19,
  "match_reasons": [
    "Insurer match",
    "Coverage match: mental health"
  ],
  "url": "https://www.molinamarketplace.com/..."
}
```

#### 6. **Multi-Source Aggregation**

Results from all three datasets are:
1. **Combined** into a single array
2. **Sorted** by score (highest first)
3. **Deduplicated** by plan_id when applicable
4. **Limited** to top N results (typically 5-10)

### Search Algorithm Advantages

✅ **Fuzzy Matching**: Works even with typos or partial names  
✅ **Multi-Criteria**: Combines multiple signals for better relevance  
✅ **Transparent**: Score and match reasons shown to users  
✅ **Extensible**: Easy to add new datasets or scoring rules  
✅ **Fast**: In-memory search with no database overhead  

## You.com API Integration

### Overview

The system integrates with **You.com Search API** to provide real-time web search results for queries that require current information, news, or data beyond the local datasets.

### API Details

**Endpoint Used:** `https://api.ydc-index.io/v1/search`  
**Method:** GET  
**Authentication:** API Key via `X-API-Key` header

### Features

- **Web Search**: Returns up to 10 relevant web results
- **News Search**: Access to latest news articles (available in API response)
- **Rich Metadata**: Includes snippets, thumbnails, page age, and authors
- **Context Enhancement**: Automatically enriches queries with user entities (age, income, county)

### Implementation

Located in `backend/main.py` - `search_with_you_api()` function:

```python
def search_with_you_api(query: str, entities: Dict[str, Any], intent: str = "PlanInfo"):
    """Search using You.com API with collected user information."""
    
    # Build enhanced query with user context
    enhanced_query = query
    if intent in ["PlanInfo", "Comparison", "ProviderNetwork"]:
        if entities.get("age"):
            enhanced_query += f" for {entities['age']} year old"
        if entities.get("income"):
            enhanced_query += f" with annual income ${entities['income']}"
        if entities.get("county"):
            enhanced_query += f" in {entities['county']} county"
    
    # API request
    url = "https://api.ydc-index.io/v1/search"
    headers = {"X-API-Key": you_api_key}
    params = {"query": enhanced_query, "count": 10}
    
    response = requests.get(url, headers=headers, params=params, timeout=10)
    data = response.json()
    
    # Extract web results
    web_results = data.get("results", {}).get("web", [])
```

### Response Format

The You.com API returns structured data:

```json
{
  "results": {
    "web": [
      {
        "title": "Plan Title",
        "description": "Plan description...",
        "url": "https://example.com/plan",
        "snippets": ["Relevant text snippet..."],
        "thumbnail_url": "https://example.com/thumb.jpg",
        "page_age": "2024-01-15",
        "authors": ["Author Name"]
      }
    ],
    "news": [...]
  },
  "metadata": {...}
}
```

### Use Cases

1. **General Queries**: FAQ-type questions about health insurance
2. **News Updates**: Latest changes to ACA, open enrollment dates
3. **Plan Updates**: Recent plan modifications not in local datasets
4. **Supplemental Information**: Additional context for plan comparisons

### Query Enhancement

The system automatically enhances queries with user context:

**Original Query:** "affordable health plans"

**Enhanced Query:** "affordable health plans for 43 year old with annual income $45000 in Broward county"

This provides more personalized and relevant search results.

### Configuration

Add your You.com API key to `.env`:

```bash
you_api=your_you_api_key_here
```

**Note:** The You.com API integration is optional. If no API key is provided, the system will only use local datasets.

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- You.com API key (optional, for web search)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys:
# GEMINI_API_KEY=your_gemini_key_here
# you_api=your_you_api_key_here (optional)

# Run the server
uvicorn main:app --reload --port 8000
```

API will be available at: **http://localhost:8000**  
API Documentation: **http://localhost:8000/docs**

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

UI will be available at: **http://localhost:3001**

## Project Structure

```
youApi/
├── backend/
│   ├── config/
│   │   ├── intent_config.json      # Intent definitions & required entities
│   │   └── intent_manager.py       # Dynamic config management
│   ├── datasets/
│   │   ├── cms_api.json            # CMS marketplace plan data
│   │   ├── policy_data.json        # Policy coverage details
│   │   └── provider_data.json      # Provider network data
│   ├── main.py                     # FastAPI application
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── conversation/       # Chat UI components
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── ThinkingDisplay.tsx
│   │   │   │   └── ContentViewer.tsx
│   │   │   ├── entity-collection/  # Input forms
│   │   │   │   └── EntityCollectionForm.tsx
│   │   │   └── results/            # Result displays
│   │   │       └── ResultsDisplay.tsx
│   │   ├── services/
│   │   │   └── api.ts              # API client
│   │   ├── App.tsx                 # Main application
│   │   └── main.tsx                # Entry point
│   ├── package.json
│   └── vite.config.ts
├── LICENSE                         # MIT License
└── README.md                       # This file
```

## Configuration

### Intent Configuration

Edit `backend/config/intent_config.json` to add new intents or modify entity requirements:

```json
{
  "intents": {
    "PlanInfo": {
      "description": "User wants information about a specific plan",
      "required_entities": ["plan_name", "insurer"],
      "optional_entities": ["year", "county"]
    }
  },
  "entities": {
    "plan_name": {
      "type": "string",
      "description": "Name of the health insurance plan"
    }
  }
}
```

### Adding New Datasets

1. Create a new JSON file in `backend/datasets/`
2. Add loading logic in `load_datasets()` function
3. Add scoring logic in `search_datasets()` function

## API Endpoints

### POST `/chat`
Conversational endpoint with entity collection

**Request:**
```json
{
  "session_id": "optional-session-id",
  "query": "Show me Florida Blue plans"
}
```

**Response:**
```json
{
  "session_id": "abc-123",
  "response": "I found several Florida Blue plans...",
  "requires_input": false,
  "search_results": [...],
  "status": "complete"
}
```

### POST `/detect-intent`
Intent detection only

### POST `/search`
Direct dataset search

### POST `/search-general`
General search with web results

See full API documentation at `/docs` when running the server.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript for all frontend code
- Add tests for new features
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](#license-text) file below for details.

### License Text

```
MIT License

Copyright (c) 2025 Health Insurance AI Assistant Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Acknowledgments

- **Google Gemini AI** for natural language understanding
- **FastAPI** for the excellent web framework
- **React** and **Vite** for frontend tooling
- **CMS/Healthcare.gov** for official plan data
- **You.com** for web search capabilities

## Contact

For questions or support, please open an issue on GitHub.

---

**Built for better healthcare transparency**
