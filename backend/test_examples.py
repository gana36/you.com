"""
Example test cases for the intent detection endpoint.
Run this after starting the server with: uvicorn main:app --reload
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# Test cases covering different intents and entity combinations
test_queries = [
    {
        "name": "PlanInfo with multiple entities",
        "query": "Tell me about Molina Silver plan in Broward county for a 43 year old",
        "expected_intent": "PlanInfo"
    },
    {
        "name": "CoverageDetail query",
        "query": "Does Aetna Gold cover dental services in Miami-Dade?",
        "expected_intent": "CoverageDetail"
    },
    {
        "name": "ProviderNetwork query",
        "query": "Is Dr. Smith in the UnitedHealthcare network in Palm Beach county?",
        "expected_intent": "ProviderNetwork"
    },
    {
        "name": "Comparison query",
        "query": "Compare Molina Silver and Aetna Gold plans for 2025",
        "expected_intent": "Comparison"
    },
    {
        "name": "FAQ query",
        "query": "What is the difference between HMO and PPO plans?",
        "expected_intent": "FAQ"
    },
    {
        "name": "News query",
        "query": "What are the latest updates for Humana plans in 2025?",
        "expected_intent": "News"
    },
    {
        "name": "Minimal entities",
        "query": "Tell me about health insurance",
        "expected_intent": "FAQ"
    },
    {
        "name": "Complex entity extraction",
        "query": "I'm 65 years old in Broward county, looking for a plan that covers prescription drugs",
        "expected_intent": "PlanInfo"
    }
]


def test_endpoint():
    """Test the /detect_intent_entities endpoint with various queries."""
    print("=" * 80)
    print("Testing Intent Detection Endpoint")
    print("=" * 80)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health")
        health = response.json()
        print(f"\n✓ Server Status: {health['status']}")
        print(f"✓ Gemini API Configured: {health['gemini_api_configured']}\n")
        
        if not health['gemini_api_configured']:
            print("⚠️  Warning: GEMINI_API_KEY not configured. Set it in .env file")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Error: Server not running. Start it with: uvicorn main:app --reload")
        return
    
    # Run test cases
    for i, test in enumerate(test_queries, 1):
        print(f"\n{'─' * 80}")
        print(f"Test {i}: {test['name']}")
        print(f"{'─' * 80}")
        print(f"Query: \"{test['query']}\"")
        
        try:
            response = requests.post(
                f"{BASE_URL}/detect_intent_entities",
                json={"query": test['query']},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"\n✓ Status: Success")
                print(f"Intent: {result['intent']}")
                print(f"Confidence: {result.get('confidence', 'N/A')}")
                print(f"\nEntities:")
                if result['entities']:
                    for key, value in result['entities'].items():
                        print(f"  • {key}: {value}")
                else:
                    print("  (none extracted)")
                
                if result['missing']:
                    print(f"\nMissing/Ambiguous:")
                    for entity in result['missing']:
                        print(f"  • {entity}")
                
                # Check if intent matches expected
                if result['intent'] == test['expected_intent']:
                    print(f"\n✓ Intent matches expected: {test['expected_intent']}")
                else:
                    print(f"\n⚠️  Intent mismatch - Expected: {test['expected_intent']}, Got: {result['intent']}")
            else:
                print(f"\n❌ Error: {response.status_code}")
                print(response.json())
                
        except Exception as e:
            print(f"\n❌ Exception: {str(e)}")
    
    print(f"\n{'=' * 80}")
    print("Testing Complete")
    print("=" * 80)


if __name__ == "__main__":
    test_endpoint()
