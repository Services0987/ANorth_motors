import httpx
import asyncio
import json

ALGOLIA_APP_ID = "VBAFQME90B"
ALGOLIA_API_KEY = "650a66d4bf074b5de276a2ecb945bf80"
ALGOLIA_URL = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries"

async def test_algolia():
    headers = {
        "x-algolia-api-key": ALGOLIA_API_KEY,
        "x-algolia-application-id": ALGOLIA_APP_ID,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.teamford.ca/"
    }
    
    # Try different filters or no filters to see what's available
    payloads = [
        # Original filter
        {"requests": [{"indexName": "inventory", "params": "filters=craft_site_ids%3A34&hitsPerPage=5"}]},
        # No filter
        {"requests": [{"indexName": "inventory", "params": "hitsPerPage=5"}]},
        # Try finding the correct site ID by searching
        {"requests": [{"indexName": "inventory", "params": "query=Ford&hitsPerPage=5"}]}
    ]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, payload in enumerate(payloads):
            print(f"--- Test {i+1} ---")
            try:
                resp = await client.post(ALGOLIA_URL, json=payload, headers=headers)
                print(f"Status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [{}])[0]
                    nb_hits = results.get("nbHits", 0)
                    print(f"nbHits: {nb_hits}")
                    hits = results.get("hits", [])
                    if hits:
                        print(f"First hit keys: {list(hits[0].keys())}")
                        print(f"First hit site_id: {hits[0].get('craft_site_ids')}")
                    else:
                        print("No hits found.")
                else:
                    print(resp.text)
            except Exception as e:
                print(f"Error: {e}")
            print("\n")

if __name__ == "__main__":
    asyncio.run(test_algolia())
