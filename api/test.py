import os
import motor.motor_asyncio
import asyncio
import json

async def test():
    mongo_url = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL")
    if not mongo_url: return {"error": "MONGO_URL not set"}
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
    try:
        dbs = await client.list_database_names()
        results = {}
        for db_name in dbs:
            if db_name.lower() in ['autonorth', 'admin', 'local', 'config']:
                db = client[db_name]
                colls = await db.list_collection_names()
                counts = {}
                for c in colls:
                    counts[c] = await db[c].count_documents({})
                results[db_name] = {"collections": colls, "counts": counts}
        return {
            "all_dbs": dbs,
            "probed_details": results,
            "current_env_db": os.environ.get("DB_NAME", "autonorth")
        }
    except Exception as e:
        return {"error": str(e)}

def handler(request):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    res = loop.run_until_complete(test())
    return {
        "statusCode": 200,
        "body": json.dumps(res),
        "headers": {"Content-Type": "application/json"}
    }
