import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    uri = "mongodb+srv://smmservices0987:vO6Y9T6x7B4N9Z2W@cluster0.v8q5r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(uri)
    db = client.autonorth_motors
    settings = await db.settings.find_one({"type": "general"})
    print(f"Settings: {settings}")

if __name__ == "__main__":
    asyncio.run(check())
