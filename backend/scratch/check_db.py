import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    uri = "mongodb+srv://smmservices0987:vO6Y9T6x7B4N9Z2W@cluster0.v8q5r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(uri)
    db = client.autonorth_motors
    total = await db.vehicles.count_documents({})
    available_low = await db.vehicles.count_documents({"status": "available"})
    available_cap = await db.vehicles.count_documents({"status": "Available"})
    available_none = await db.vehicles.count_documents({"status": None})
    print(f"Total: {total}")
    print(f"available: {available_low}")
    print(f"Available: {available_cap}")
    print(f"None: {available_none}")

if __name__ == "__main__":
    asyncio.run(check())
