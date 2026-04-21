import asyncio
from scraper import scrape_teamford_inventory

async def main():
    print("Fetching from TeamFord...")
    results = await scrape_teamford_inventory(limit=5)
    print(f"Found {len(results)} vehicles")
    if results:
        for r in results:
            print(f"- {r.get('year')} {r.get('make')} {r.get('model')} | VIN: {r.get('vin')} | Price: {r.get('price')}")

if __name__ == "__main__":
    asyncio.run(main())
