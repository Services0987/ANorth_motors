import motor.motor_asyncio
import asyncio
import os

async def analyze():
    uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL") or "mongodb://localhost:27017"
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client["AutoNorth"]
    
    print("--- BODY TYPES ---")
    body_types = await db.vehicles.distinct("body_type")
    print(body_types)
    
    print("\n--- FUEL TYPES ---")
    fuel_types = await db.vehicles.distinct("fuel_type")
    print(fuel_types)
    
    print("\n--- MAKES ---")
    makes = await db.vehicles.distinct("make")
    print(makes)
    
    print("\n--- SAMPLES (First 5) ---")
    cursor = db.vehicles.find().limit(5)
    async for v in cursor:
        print(f"Title: {v.get('title')}, Body: {v.get('body_type')}, Price: {v.get('price')}")

if __name__ == "__main__":
    asyncio.run(analyze())
