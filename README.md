# Health Insurance Assistant

Multi-agent conversational AI for health insurance search, comparison, and provider lookup.

## Features

- **Agentic UI**: Transparent multi-step thinking with visible reasoning
- **Progressive Entity Collection**: One question at a time, inline
- **Intent Detection**: Auto-classifies queries (Plan Info, Comparison, Coverage, Provider Search)
- **Query Construction**: Shows actual search queries being built
- **Source Verification**: All results include verified source badges

## Tech Stack

**Backend**: FastAPI + Gemini 2.0 Flash  
**Frontend**: React 18 + TypeScript + Tailwind CSS + Vite

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add GEMINI_API_KEY to .env
uvicorn main:app --reload
```
API: http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
UI: http://localhost:3001

## Project Structure

```
├── backend/          # FastAPI + Gemini AI
│   ├── main.py      # Intent detection API
│   └── .env         # API keys
├── frontend/         # React conversational UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── conversation/    # Chat, thinking, entity collection
│   │   │   ├── entity-collection/ # Input components
│   │   │   └── results/          # Plan cards
│   │   ├── data/    # Dummy data
│   │   └── App.tsx  # Main flow
│   └── package.json
└── README.md
```

## License

MIT
