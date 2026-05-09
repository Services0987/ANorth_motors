import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import json_util

async def check():
    uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL") or "mongodb://localhost:27017"
    client = AsyncIOMotorClient(uri)
    db = client["AutoNorth"]
    
    settings = await db.settings.find_one({"type": "general"})
    print("General Settings:", json_util.dumps(settings, indent=2))
    
    v_count = await db.vehicles.count_documents({})
    print(f"Vehicle Count: {v_count}")

if __name__ == "__main__":
    asyncio.run(check())
