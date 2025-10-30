# 🔍 Dataset Search Mechanism - Deep Dive

This document provides a comprehensive explanation of how the dataset search system works in the Health Insurance AI Assistant.

## Table of Contents

1. [Overview](#overview)
2. [Data Architecture](#data-architecture)
3. [Search Algorithm](#search-algorithm)
4. [Scoring System](#scoring-system)
5. [Example Walkthroughs](#example-walkthroughs)
6. [Performance Considerations](#performance-considerations)

---

## Overview

The dataset search system is a **score-based, multi-source information retrieval engine** that finds relevant health insurance plans, coverage details, and provider information from structured JSON datasets.

### Key Characteristics

- **In-Memory**: All data loaded at runtime for fast access
- **Score-Based Ranking**: Results ranked by relevance score
- **Multi-Source**: Combines CMS data, policy documents, and provider networks
- **Fuzzy Matching**: Works with partial matches and keywords
- **Transparent**: Returns match reasons for explainability

---

## Data Architecture

### Dataset Files

The system uses three primary JSON datasets:

```
backend/datasets/
├── cms_api.json         # 13 health insurance plans
├── policy_data.json     # 13 detailed policy documents
└── provider_data.json   # 5 healthcare providers
```

### Data Schema

#### CMS API Data (`cms_api.json`)

Official marketplace data from Healthcare.gov:

```json
{
  "id": "cms_30252FL0070025M03_2025",
  "source": "cms_api",
  "plan_id": "30252FL0070025M03",
  "issuer_id": "30252",
  "issuer_name": "Florida Blue",
  "plan_marketing_name": "myBlue Silver HMO 2025",
  "plan_type": "HMO",
  "metal_level": "Silver",
  "state": "FL",
  "year": 2025,
  "monthly_premium_adult_21": 295.2,
  "monthly_premium_adult_40": 450,
  "deductible_individual_in_network": 100,
  "out_of_pocket_max_individual_in_network": 1800,
  "pcp_office_visit_copay": 5,
  "specialist_office_visit_copay": 12,
  "official_source": "https://www.healthcare.gov/plan/..."
}
```

**Key Fields:**
- Pricing by age brackets
- Deductibles and out-of-pocket maximums
- Copay amounts
- Official source URLs

#### Policy Data (`policy_data.json`)

Detailed coverage information from Summary of Benefits and Coverage (SBC) documents:

```json
{
  "id": "floridablue_myblue_silver_2025_25M03",
  "source": "policy_doc",
  "insurer": "Florida Blue",
  "plan_name": "myBlue Silver HMO 2025",
  "plan_id": "30252FL0070025M03",
  "coverage": [
    "preventive care",
    "emergency services",
    "mental health",
    "prescription drugs",
    "maternity care"
  ],
  "text_chunk": "The myBlue Silver HMO 2025 plan from Florida Blue...",
  "sbc_url": "https://www.bcbsfl.com/DocumentLibrary/sbc/2025/..."
}
```

**Key Fields:**
- Coverage array (searchable list of covered services)
- Human-readable text descriptions
- Links to official SBC documents

#### Provider Data (`provider_data.json`)

Healthcare provider network information:

```json
{
  "id": "provider_dr_garcia_miami_001",
  "source": "provider_api",
  "provider_name": "Dr. Maria Garcia",
  "provider_type": "Physician",
  "specialty": "Family Medicine",
  "plan_networks": [
    {
      "plan_id": "30252FL0070025M03",
      "plan_name": "Florida Blue myBlue Silver HMO 2025",
      "issuer_name": "Florida Blue",
      "network_tier": "preferred",
      "in_network": true
    }
  ],
  "location": {
    "city": "Miami",
    "state": "FL",
    "county": "Miami-Dade"
  }
}
```

**Key Fields:**
- Provider specialty and type
- Network affiliations with plans
- Location information
- Quality metrics

---

## Search Algorithm

### Function: `search_datasets(query, entities)`

Located in: `backend/main.py` (lines 287-451)

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LOAD DATASETS                                            │
│    Load all three JSON files into memory                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. EXTRACT SEARCH CRITERIA                                  │
│    • Parse entities (plan_name, insurer, etc.)              │
│    • Convert query to lowercase                             │
│    • Extract keywords from query text                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. KEYWORD DETECTION                                        │
│    Detect keywords: florida, blue, molina, silver, etc.     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. SEARCH EACH DATASET                                      │
│    ┌────────────────────────────────────────────┐           │
│    │ For each item in CMS data:                 │           │
│    │   • Calculate relevance score              │           │
│    │   • Track match reasons                    │           │
│    │   • Add to results if score > 0            │           │
│    └────────────────────────────────────────────┘           │
│    ┌────────────────────────────────────────────┐           │
│    │ For each item in Policy data:              │           │
│    │   • Calculate relevance score              │           │
│    │   • Track match reasons                    │           │
│    │   • Add to results if score > 0            │           │
│    └────────────────────────────────────────────┘           │
│    ┌────────────────────────────────────────────┐           │
│    │ For each item in Provider data:            │           │
│    │   • Calculate relevance score              │           │
│    │   • Track match reasons                    │           │
│    │   • Add to results if score > 0            │           │
│    └────────────────────────────────────────────┘           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. SORT & RETURN                                            │
│    • Sort all results by score (descending)                 │
│    • Return ranked list                                     │
└─────────────────────────────────────────────────────────────┘
```

### Code Walkthrough

#### Step 1: Load Datasets

```python
def load_datasets() -> Dict[str, List[Dict[str, Any]]]:
    """Load all datasets from the datasets directory."""
    datasets_dir = Path(__file__).parent / "datasets"
    datasets = {}
    
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
    
    return datasets
```

#### Step 2: Extract Search Criteria

```python
def search_datasets(query: str, entities: Dict[str, Any]) -> List[Dict[str, Any]]:
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
```

#### Step 3: Keyword Detection

```python
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
```

---

## Scoring System

### CMS Data Scoring

```python
for item in datasets.get('cms', []):
    score = 0
    match_reasons = []
    
    # Exact entity matches
    if plan_name and plan_name in item.get('plan_marketing_name', '').lower():
        score += 10
        match_reasons.append("Plan name match")
    
    if insurer and insurer in item.get('issuer_name', '').lower():
        score += 8
        match_reasons.append("Insurer match")
    
    if state and state.lower() == item.get('state', '').lower():
        score += 5
        match_reasons.append("State match")
    
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
    
    # Default Florida plans
    if not plan_name and not insurer and item.get('state') == 'FL':
        score += 2
```

### Scoring Matrix

| Match Type | Points | Example |
|------------|--------|---------|
| **Exact plan name** | +10 | "myBlue Silver HMO" matches user query |
| **Exact insurer** | +8 | "Florida Blue" matches entity |
| **Coverage item** | +7 | "mental health" in coverage array |
| **In-network** | +6 | Provider accepts this plan |
| **State match** | +5 | Plan available in FL |
| **Metal/Type match** | +4 | "Silver" or "HMO" keyword |
| **Keyword in name** | +3 | "blue" appears in plan name |
| **Default FL plan** | +2 | Fallback for broad queries |

### Policy Data Scoring

```python
for item in datasets.get('policy', []):
    score = 0
    match_reasons = []
    
    if plan_name and plan_name in item.get('plan_name', '').lower():
        score += 10
        match_reasons.append("Plan name match")
    
    if insurer and insurer in item.get('insurer', '').lower():
        score += 8
        match_reasons.append("Insurer match")
    
    if coverage_item:
        coverage_list = ' '.join(item.get('coverage', [])).lower()
        if coverage_item in coverage_list:
            score += 7
            match_reasons.append(f"Coverage match: {coverage_item}")
    
    if state and state.lower() == item.get('state', '').lower():
        score += 5
        match_reasons.append("State match")
```

### Provider Data Scoring

```python
for item in datasets.get('provider', []):
    score = 0
    match_reasons = []
    
    if provider_name and provider_name in item.get('provider_name', '').lower():
        score += 10
        match_reasons.append("Provider name match")
    
    if specialty and specialty in item.get('specialty', '').lower():
        score += 8
        match_reasons.append("Specialty match")
    
    if insurer:
        networks = item.get('plan_networks', [])
        for net in networks:
            if insurer in net.get('issuer_name', '').lower():
                score += 6
                match_reasons.append(f"In-network for {insurer}")
                break
```

---

## Example Walkthroughs

### Example 1: Simple Plan Search

**User Query:** "Show me Florida Blue plans"

**Step 1 - Entity Extraction (via Gemini):**
```json
{
  "intent": "PlanInfo",
  "entities": {
    "insurer": "Florida Blue"
  }
}
```

**Step 2 - Keyword Detection:**
```python
detected_keywords = {
  'florida': 'FL',
  'blue': 'blue'
}
```

**Step 3 - Scoring:**

For "myBlue Silver HMO 2025":
```
CMS Data:
  +8 (insurer "Florida Blue" match)
  +3 (keyword "blue" in plan name)
  +2 (default FL plan)
  = 13 points

Policy Data:
  +8 (insurer match)
  +3 (keyword "blue" in plan name)
  +2 (default FL plan)
  = 13 points
```

For "BlueOptions Bronze PPO 2025":
```
CMS Data:
  +8 (insurer match)
  +3 (keyword "blue" in plan name)
  +2 (default FL plan)
  = 13 points
```

**Result:** All 3 Florida Blue plans returned with equal scores

---

### Example 2: Coverage-Specific Search

**User Query:** "I need a plan with mental health coverage"

**Step 1 - Entity Extraction:**
```json
{
  "intent": "CoverageDetail",
  "entities": {
    "coverage_item": "mental health"
  }
}
```

**Step 2 - Keyword Detection:**
```python
detected_keywords = {
  'mental health': 'mental health'
}
```

**Step 3 - Scoring:**

For "myBlue Silver HMO 2025" (has mental health in coverage):
```
Policy Data:
  +7 (coverage_item "mental health" in coverage array)
  +4 (keyword "mental health" in coverage list)
  +2 (default FL plan)
  = 13 points
```

For "Molina Silver 1 HMO 2025" (has mental health):
```
Policy Data:
  +7 (coverage match)
  +4 (keyword match)
  +2 (default FL plan)
  = 13 points
```

**Result:** All plans with mental health coverage returned (all FL plans include this)

---

### Example 3: Provider Search

**User Query:** "Find cardiologists in Tampa"

**Step 1 - Entity Extraction:**
```json
{
  "intent": "ProviderNetwork",
  "entities": {
    "specialty": "cardiology",
    "city": "Tampa"
  }
}
```

**Step 2 - Scoring:**

For "Dr. Robert Johnson" (Cardiologist in Tampa):
```
Provider Data:
  +8 (specialty "Cardiology" match)
  +3 (keyword "cardiology" in specialty)
  = 11 points
```

For "Dr. Maria Garcia" (Family Medicine in Miami):
```
Provider Data:
  +0 (no matches)
```

**Result:** Only Dr. Robert Johnson returned

---

### Example 4: Complex Multi-Criteria Search

**User Query:** "Show me Molina silver plans with low deductibles"

**Step 1 - Entity Extraction:**
```json
{
  "intent": "PlanInfo",
  "entities": {
    "insurer": "Molina",
    "metal_level": "Silver"
  }
}
```

**Step 2 - Keyword Detection:**
```python
detected_keywords = {
  'molina': 'molina',
  'silver': 'silver'
}
```

**Step 3 - Scoring:**

For "Molina Marketplace Silver 1 HMO 2025":
```
CMS Data:
  +8 (insurer "Molina" match)
  +4 (metal_level "Silver" match)
  +3 (keyword "molina" in issuer)
  +3 (keyword "silver" in plan name)
  = 18 points

Policy Data:
  +8 (insurer match)
  +4 (keyword "silver" in plan name)
  +3 (keyword "molina" in insurer)
  = 15 points
```

For "Molina Marketplace Silver 3 HMO 2025":
```
CMS Data:
  +8 (insurer match)
  +4 (metal_level match)
  +3 (keyword "molina")
  +3 (keyword "silver")
  = 18 points
```

**Result:** Both Molina Silver plans returned with high scores

**Note:** The system doesn't filter by deductible amount (not implemented in scoring), but the AI can analyze returned results to identify low-deductible options.

---

## Performance Considerations

### Time Complexity

- **Data Loading**: O(1) - Files loaded once at startup
- **Search**: O(n) - Linear scan through all items
- **Sorting**: O(n log n) - Sort results by score

**Total per query**: O(n log n) where n = total items across all datasets (~31 items)

### Space Complexity

- **Memory**: O(n) - All datasets kept in memory
- **Results**: O(m) - Where m = number of matching results

### Optimization Strategies

1. **In-Memory Storage**: No database I/O overhead
2. **Early Termination**: Could add score threshold to skip low-relevance items
3. **Caching**: Results could be cached for repeated queries
4. **Indexing**: For larger datasets, could build inverted indexes on keywords

### Scalability

**Current Scale:**
- 13 CMS plans
- 13 policy documents
- 5 providers
- **Total: 31 items**

**Recommended Scale:**
- Up to 10,000 items: Current approach works well
- 10,000-100,000 items: Add indexing
- 100,000+ items: Consider Elasticsearch or vector database

### Future Enhancements

1. **Vector Search**: Use embeddings for semantic similarity
2. **Fuzzy String Matching**: Levenshtein distance for typo tolerance
3. **Machine Learning Ranking**: Learn optimal scoring weights
4. **Personalization**: Adjust scores based on user preferences
5. **A/B Testing**: Experiment with different scoring algorithms

---

## Summary

The dataset search system provides:

✅ **Fast in-memory search** across multiple data sources  
✅ **Transparent scoring** with explainable match reasons  
✅ **Flexible matching** via entities and keywords  
✅ **Multi-source aggregation** for comprehensive results  
✅ **Extensible architecture** for adding new datasets  

This approach balances **simplicity**, **performance**, and **accuracy** for a health insurance search use case with moderate data volumes.
