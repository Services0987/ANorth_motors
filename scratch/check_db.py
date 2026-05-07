
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_db():
    uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
    print(f"Connecting to: {uri[:20]}...")
    client = AsyncIOMotorClient(uri)
    db = client.autonorth
    try:
        count = await db.vehicles.count_documents({})
        print(f"Total vehicles: {count}")
        
        available_count = await db.vehicles.count_documents({"status": "available"})
        print(f"Available vehicles: {available_count}")
        
        show_on_home_count = await db.vehicles.count_documents({"show_on_home": True})
        print(f"Show on home vehicles: {show_on_home_count}")
        
        if count > 0:
            sample = await db.vehicles.find_one({})
            print(f"Sample vehicle: {sample.get('title')} | status: {sample.get('status')} | show_on_home: {sample.get('show_on_home')}")
            
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_db())
