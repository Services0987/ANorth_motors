import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def repair():
    uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(uri)
    db = client.autonorth
    
    print(f"Repairing collection: {db.vehicles.name}")
    
    # 1. Backfill show_on_home
    result = await db.vehicles.update_many(
        {"show_on_home": {"$exists": False}},
        {"$set": {"show_on_home": True}}
    )
    print(f"Backfilled show_on_home for {result.modified_count} vehicles")
    
    # 2. Ensure all vehicles are 'available' if they don't have status
    result = await db.vehicles.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "available"}}
    )
    print(f"Fixed status for {result.modified_count} vehicles")
    
    # 3. Add timestamps if missing
    result = await db.vehicles.update_many(
        {"created_at": {"$exists": False}},
        {"$set": {"created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
    )
    print(f"Added timestamps for {result.modified_count} vehicles")

    print("Repair complete.")

if __name__ == "__main__":
    asyncio.run(repair())
