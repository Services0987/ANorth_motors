import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def create_indexes():
    mongo_url = "mongodb+srv://smmservices0987_db_user:Smm0987@an.beuzkok.mongodb.net/?appName=AN"
    client = AsyncIOMotorClient(mongo_url)
    db = client.get_database("AutoNorth")
    
    print(f"Connecting to DB and creating indexes...")
    
    # Standard query indexes
    await db.vehicles.create_index([("created_at", -1)])
    await db.vehicles.create_index([("status", 1)])
    await db.vehicles.create_index([("featured", 1)])
    await db.vehicles.create_index([("show_on_home", 1)])
    await db.vehicles.create_index([("make", 1)])
    await db.vehicles.create_index([("body_type", 1)])
    await db.vehicles.create_index([("condition", 1)])
    
    # Text search index for the search bar
    await db.vehicles.create_index([
        ("title", "text"),
        ("make", "text"),
        ("model", "text"),
        ("vin", "text"),
        ("stock_number", "text")
    ])
    
    print("✅ All Performance Indexes Created Successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())
