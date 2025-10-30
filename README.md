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
- Python 3.11+ - Core language
- Docker - Containerization
- AWS ECR - Container registry
- AWS App Runner - Serverless container hosting

**Frontend:**
- React 18 - UI framework
- TypeScript - Type-safe development
- Tailwind CSS - Styling
- Vite - Build tool and dev server
- AWS Amplify - Frontend hosting and deployment

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

## Deployment

### Production Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AWS Cloud                             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Frontend (AWS Amplify)                  │  │
│  │  • Hosted React App                               │  │
│  │  • CDN Distribution                               │  │
│  │  • HTTPS Enabled                                  │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                      │
│                   │ HTTPS/CORS                          │
│                   ▼                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Backend (AWS App Runner)                  │  │
│  │  • Docker Container from ECR                      │  │
│  │  • Auto-scaling                                   │  │
│  │  • Environment Variables (Secrets)                │  │
│  │  • Health Checks                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │      Amazon ECR (Container Registry)              │  │
│  │  • Docker Images                                  │  │
│  │  • Version Tags                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Backend Deployment (AWS App Runner)

#### Prerequisites
- AWS Account with appropriate IAM permissions
- AWS CLI installed and configured
- Docker installed locally

#### Step 1: Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository --repository-name youcom-backend --region us-east-1

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

#### Step 2: Build and Push Docker Image

```bash
# Navigate to backend directory
cd backend

# Build Docker image
docker build -t youcom-backend .

# Tag the image
docker tag youcom-backend:latest <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youcom-backend:latest

# Push to ECR
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youcom-backend:latest
```

#### Step 3: Deploy to App Runner

**Option A: Using AWS Console (Recommended for first deployment)**

1. Go to AWS App Runner Console
2. Click "Create service"
3. **Source:**
   - Repository type: Container registry
   - Provider: Amazon ECR
   - Container image URI: `<YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youcom-backend:latest`
   - Deployment trigger: Manual
4. **Service settings:**
   - Service name: `youcom-backend`
   - Port: `8080`
   - CPU: 1 vCPU
   - Memory: 2 GB
5. **Environment variables:**
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `you_api`: Your You.com API key
   - `FRONTEND_URL`: Your Amplify frontend URL (for CORS)
6. Click "Create & deploy"

**Option B: Using AWS CLI**

```bash
# Create App Runner service
aws apprunner create-service \
  --service-name youcom-backend \
  --source-configuration file://source-config.json \
  --instance-configuration file://instance-config.json
```

#### Step 4: Configure Environment Variables

**Via AWS Console:**
1. Go to App Runner → Your Service → Configuration
2. Navigate to "Environment variables"
3. Add the following:
   - `GEMINI_API_KEY`
   - `you_api`
   - `FRONTEND_URL`
4. Click "Save"

**Important:** App Runner will automatically restart after adding environment variables.

#### Step 5: Update CORS Configuration

After deployment, update `backend/main.py` with your production frontend URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://your-amplify-url.amplifyapp.com",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then rebuild and redeploy the Docker image.

#### Backend URL

After deployment, App Runner provides a URL like:
```
https://xxxxxxxxxx.us-east-1.awsapprunner.com
```

This URL remains stable across deployments.

---

### Frontend Deployment (AWS Amplify)

#### Prerequisites
- AWS Account
- Amplify CLI installed: `npm install -g @aws-amplify/cli`
- AWS credentials configured

#### Step 1: Initialize Amplify

```bash
# Navigate to frontend directory
cd frontend

# Initialize Amplify (first time only)
amplify init
```

Follow the prompts:
- Project name: `youcom-frontend`
- Environment: `dev` or `prod`
- Default editor: Your preferred editor
- App type: `javascript`
- Framework: `react`
- Source directory: `src`
- Distribution directory: `dist` (Vite builds to dist/)
- Build command: `npm run build`
- Start command: `npm run dev`

#### Step 2: Add Hosting

```bash
# Add hosting service (first time only)
amplify add hosting
```

Choose:
- Hosting with Amplify Console
- Manual deployment

#### Step 3: Update Backend URL

Update `frontend/src/config.ts` with your App Runner backend URL:

```typescript
export const API_BASE_URL = "https://your-app-runner-url.us-east-1.awsapprunner.com";
```

#### Step 4: Configure Build Settings

Update `amplify configure project` if needed to ensure:
- Distribution Directory Path: `dist` (not `build`)

#### Step 5: Deploy

```bash
# Build and deploy
amplify publish
```

This will:
1. Build your React app (`npm run build`)
2. Upload build artifacts to Amplify
3. Deploy to CDN
4. Provide a public URL

#### Frontend URL

After deployment, Amplify provides a URL like:
```
https://dev.xxxxxxxxxxxx.amplifyapp.com
```

---

### Security Considerations

#### ✅ DO:
- ✅ Store API keys in environment variables (AWS App Runner console)
- ✅ Use `.dockerignore` to exclude `.env` from Docker images
- ✅ Keep `.env` in `.gitignore`
- ✅ Use HTTPS for all production traffic (automatic with Amplify/App Runner)
- ✅ Configure CORS to only allow your frontend domain

#### ❌ DON'T:
- ❌ Commit `.env` files to git
- ❌ Hardcode API keys in source code
- ❌ Use `allow_origins=["*"]` in production
- ❌ Include AWS credentials in Docker images

---

### Updating Deployments

#### Backend Updates

```bash
# Rebuild and push new image
cd backend
docker build -t youcom-backend .
docker tag youcom-backend:latest <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youcom-backend:latest
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youcom-backend:latest

# App Runner auto-deploys the new image
```

**Note:** Your App Runner URL stays the same across updates.

#### Frontend Updates

```bash
cd frontend
amplify publish
```

**Note:** Your Amplify URL stays the same across updates.

---

### Monitoring and Logs

#### Backend Logs (App Runner)
```bash
# View logs via AWS Console
AWS Console → App Runner → Your Service → Logs

# Or via CloudWatch
AWS Console → CloudWatch → Log Groups → /aws/apprunner/youcom-backend
```

#### Frontend Monitoring (Amplify)
```bash
# View build logs
AWS Console → Amplify → Your App → Build logs
```

---

### Cost Estimation

**AWS App Runner:**
- ~$25-50/month for basic usage (1 vCPU, 2GB RAM)
- Free tier: First 3 months

**AWS Amplify:**
- Free tier: 1000 build minutes/month, 15GB storage
- ~$0-10/month for typical usage

**Total estimated cost:** $25-60/month for production deployment

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
