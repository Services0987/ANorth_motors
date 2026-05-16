import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    url = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URL') or "mongodb://localhost:27017"
    client = AsyncIOMotorClient(url)
    dbs = await client.list_database_names()
    print(f"Databases: {dbs}")
    for db_name in dbs:
        db = client[db_name]
        colls = await db.list_collection_names()
        print(f"  DB: {db_name}, Collections: {colls}")
        for coll_name in colls:
            count = await db[coll_name].count_documents({})
            print(f"    Coll: {coll_name}, Count: {count}")

if __name__ == "__main__":
    asyncio.run(check_db())
