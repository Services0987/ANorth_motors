import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_candidates():
    url = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URL') or "mongodb://localhost:27017"
    client = AsyncIOMotorClient(url)
    candidates = ["autonorth", "ANorthMotors", "AutoNorth", "AutoNorthMotors", "autonorth_motors", "ANorth_motors"]
    for cand in candidates:
        try:
            db = client[cand]
            count = await db.vehicles.count_documents({})
            print(f"Database: {cand}, Vehicles: {count}")
        except Exception as e:
            print(f"Database: {cand}, Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_candidates())
