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
    
    payload = {
        "requests": [
            {
                "indexName": "inventory",
                "params": "filters=craft_site_ids%3A34&hitsPerPage=1"
            }
        ]
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(ALGOLIA_URL, json=payload, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [{}])[0]
            hits = results.get("hits", [])
            if hits:
                print(json.dumps(hits[0], indent=2))
        else:
            print(f"Error: {resp.status_code}")

if __name__ == "__main__":
    asyncio.run(test_algolia())
