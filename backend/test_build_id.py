import httpx
import json
import re

async def main():
    url = "https://www.teamford.ca/used/inventory/results?region=Edmonton"
    headers = {"User-Agent": "Mozilla/5.0"}
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        match = re.search(r'"buildId":"([^"]+)"', resp.text)
        if match:
            build_id = match.group(1)
            print(f"BuildId Found: {build_id}")
            # Construct standard Next.js data URL
            data_url = f"https://www.teamford.ca/_next/data/{build_id}/used/inventory/results.json?region=Edmonton"
            print(f"Data URL: {data_url}")
            
            # Fetch data to verify structure
            data_resp = await client.get(data_url, headers=headers)
            if data_resp.status_code == 200:
                print("Data Fetch: SUCCESS")
                json_data = data_resp.json()
                # Check for products
                products = json_data.get('pageProps', {}).get('initialState', {}).get('products', [])
                print(f"Count: {len(products)}")
            else:
                print(f"Data Fetch: FAILED ({data_resp.status_code})")
        else:
            print("BuildId Not Found")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
