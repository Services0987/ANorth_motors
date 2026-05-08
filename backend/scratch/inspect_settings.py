import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def inspect_settings():
    uri = os.environ.get("MONGODB_URI") or "mongodb://localhost:27017"
    client = AsyncIOMotorClient(uri)
    db = client["AutoNorth"]
    settings = await db.settings.find_one({"type": "general"})
    print(f"Current Settings: {settings}")
    
    if settings:
        print(f"Provider: {settings.get('ai_provider')}")
        print(f"API Key present: {bool(settings.get('ai_api_key'))}")
        if settings.get('ai_api_key'):
            print(f"API Key length: {len(settings.get('ai_api_key'))}")
    else:
        print("No 'general' settings found in db.settings")

if __name__ == "__main__":
    asyncio.run(inspect_settings())
