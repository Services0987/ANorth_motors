import os
import bcrypt
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def seed_admin():
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("ERROR: MONGO_URL environment variable is not set.")
        return

    db_name = os.environ.get('DB_NAME', 'AutoNorth')
    
    print(f"Connecting to MongoDB at {mongo_url}...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Admin credentials
    email = "admin@autonorth.ca"
    password = "AdminPassword123!" # User should change this later
    
    # Check if admin already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"Admin user {email} already exists. Skipping.")
    else:
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        admin_user = {
            "email": email,
            "password_hash": password_hash,
            "role": "admin",
            "name": "AutoNorth Administrator"
        }
        await db.users.insert_one(admin_user)
        print(f"Successfully created admin user: {email}")
        print(f"Password: {password}")

    print("Seeding complete.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_admin())
