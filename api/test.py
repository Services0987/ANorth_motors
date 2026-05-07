import os
import motor.motor_asyncio
import asyncio
import json

async def test():
    mongo_url = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "autonorth")
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_pass = os.environ.get("ADMIN_PASSWORD")
    
    if not mongo_url:
        return {"error": "MONGO_URL not set"}
        
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        v_count = await db.vehicles.count_documents({})
        u_count = await db.users.count_documents({})
        colls = await db.list_collection_names()
        
        return {
            "db_name": db_name,
            "collections": colls,
            "vehicle_count": v_count,
            "user_count": u_count,
            "has_admin_env": admin_email is not None and admin_pass is not None,
            "admin_email_masked": f"{admin_email[:3]}...@{admin_email.split('@')[1]}" if admin_email else None
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
