import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URL")
    if not mongo_uri:
        print("No Mongo URI")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client.get_database()
    
    vehicles = await db.vehicles.find({}, {"title": 1, "images": 1, "vin": 1}).limit(10).to_list(None)
    for v in vehicles:
        print(f"Vehicle: {v.get('title')}")
        print(f"VIN: {v.get('vin')}")
        print(f"Images: {v.get('images')}")
        print("-" * 20)

if __name__ == "__main__":
    # Try to load .env manually if needed
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except: pass
    asyncio.run(check_db())
