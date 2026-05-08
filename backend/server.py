import os
import json
from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import io
import logging
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AutoNorth Motors API")

# Database
MONGODB_URI = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL") or "mongodb://localhost:27017"
DB_NAME = os.environ.get("DB_NAME", "AutoNorth")
client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

# Security
SECRET_KEY = os.environ.get("JWT_SECRET", "autonorth-super-secret-2024-elite")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Global Background Task State
SYNC_PROGRESS = {"status": "idle", "processed": 0, "total": 0, "imported": 0, "updated": 0, "current_page": 0, "total_pages": 0}


async def ensure_default_admin():
    try:
        admin_email = "admin@autonorth.ca"
        admin_pass = "AdminPassword123!"
        exists = await db.users.find_one({"email": admin_email})
        if not exists:
            await db.users.insert_one({
                "email": admin_email,
                "password": pwd_context.hash(admin_pass),
                "role": "admin",
                "created_at": datetime.now(timezone.utc)
            })
            logger.info(f"Default admin {admin_email} created.")
        else:
            logger.info(f"Admin {admin_email} already exists.")
    except Exception as e:
        logger.error(f"Failed to ensure admin: {e}")

@app.on_event("startup")
async def startup_event():
    try:
        await ensure_default_admin()
    except Exception as e:
        logger.error(f"Startup error: {e}")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "https://autonorth.ca", 
        "https://www.autonorth.ca",
        "https://autonorthab.ca",
        "https://www.autonorthab.ca",
        "https://anorth-motors.vercel.app",
        "https://anorth-motors-git-main-smmservices0987-9344s-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Models
class Vehicle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    title: str
    make: str
    model: str
    year: int
    price: float
    mileage: int
    condition: str # new, used, certified
    body_type: str
    fuel_type: str
    transmission: str
    exterior_color: str
    interior_color: str
    engine: str
    drivetrain: str
    doors: int = 4
    seats: int = 5
    vin: Optional[str] = None
    stock_number: Optional[str] = None
    description: str
    features: List[str] = []
    images: List[str] = []
    status: str = "available" # available, sold, pending
    featured: bool = False
    show_on_home: bool = False
    is_on_special: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    email: str
    password: str

class ScraperSettings(BaseModel):
    auto_sync: bool = False
    last_sync: Optional[datetime] = None

class Lead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    lead_type: str # contact, test_drive, financing, trade_in
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None
    vehicle_id: Optional[str] = None
    vehicle_title: Optional[str] = None
    status: str = "new" # new, contacted, qualified, closed
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    down_payment: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Auth Helpers
def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(request: Request):
    token = request.cookies.get("auth_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@app.post("/api/auth/login")
async def login(user_data: User):
    try:
        admin_email = "admin@autonorth.ca"
        admin_password = "AdminPassword123!" # Hardcoded for recovery
        
        # Check against DB first
        db_user = await db.users.find_one({"email": user_data.email})
        
        if db_user:
            # If it's the admin and password doesn't match, try to reset/verify against recovery password
            if user_data.email == admin_email and not pwd_context.verify(user_data.password, db_user["password"]):
                if user_data.password == admin_password:
                    # Password matches recovery default - update DB
                    await db.users.update_one(
                        {"email": admin_email},
                        {"$set": {"password": pwd_context.hash(admin_password)}}
                    )
                else:
                    raise HTTPException(status_code=401, detail="Invalid credentials")
            elif not pwd_context.verify(user_data.password, db_user["password"]):
                raise HTTPException(status_code=401, detail="Invalid credentials")
        elif user_data.email == admin_email and user_data.password == admin_password:
            # Initial login - create user in DB
            await db.users.insert_one({
                "email": admin_email,
                "password": pwd_context.hash(admin_password),
                "role": "admin",
                "created_at": datetime.now(timezone.utc)
            })
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_access_token({"sub": user_data.email})
        response = JSONResponse({"message": "Login successful"})
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            max_age=86400,
            samesite="lax",
            secure=True
        )
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Login error: {e}")
        return JSONResponse({"detail": f"Server Error: {str(e)}"}, status_code=500)

@app.post("/api/auth/logout")
async def logout():
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("auth_token")
    return response

@app.get("/api/auth/me")
async def me(user_email: str = Depends(get_current_user)):
    return {"email": user_email}

@app.put("/api/auth/profile")
async def update_profile(data: Dict[str, Any], user_email: str = Depends(get_current_user)):
    update_data = {}
    if "email" in data: update_data["email"] = data["email"]
    if "password" in data and data["password"]: 
        update_data["password"] = pwd_context.hash(data["password"])
    
    await db.users.update_one({"email": user_email}, {"$set": update_data})
    return {"message": "Profile updated"}




def to_id(id_str: str):
    try:
        return ObjectId(id_str)
    except:
        return id_str

@app.get("/api/vehicles")
async def get_vehicles(
    status: str = "available", 
    limit: int = 100, 
    skip: int = 0,
    search: Optional[str] = None,
    make: Optional[str] = None,
    body_type: Optional[str] = None,
    fuel_type: Optional[str] = None,
    condition: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    show_on_home: Optional[str] = None
):
    query = {}
    
    # 1. Status Filter: Match case-insensitively. If 'available', match 'available' OR null/missing.
    if status.lower() == "available":
        query["status"] = {"$in": [None, "available", "Available", "AVAILABLE"]}
    elif status.lower() != "all":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    
    # 2. Search Logic
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"make": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
            {"vin": {"$regex": search, "$options": "i"}},
            {"stock_number": {"$regex": search, "$options": "i"}}
        ]
    
    # 3. Categorical Filters
    if make: query["make"] = {"$regex": f"^{make}$", "$options": "i"}
    if body_type: query["body_type"] = {"$regex": f"^{body_type}$", "$options": "i"}
    if fuel_type: query["fuel_type"] = {"$regex": f"^{fuel_type}$", "$options": "i"}
    if condition: query["condition"] = {"$regex": f"^{condition}$", "$options": "i"}
    
    # 4. Show on Home: Match True or null/missing (default True) unless explicitly False
    if show_on_home is not None:
        if show_on_home.lower() == "true":
            query["show_on_home"] = {"$ne": False}
        else:
            query["show_on_home"] = False
        
    # 5. Price range
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None: query["price"]["$gte"] = min_price
        if max_price is not None: query["price"]["$lte"] = max_price

    # 6. Execution
    cursor = db.vehicles.find(query).sort("created_at", -1).skip(skip).limit(limit)
    vehicles = await cursor.to_list(length=limit)
    total = await db.vehicles.count_documents(query)
    
    for v in vehicles:
        v["_id"] = str(v["_id"])
    return {"vehicles": vehicles, "total": total}

@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    v = await db.vehicles.find_one({"_id": to_id(vehicle_id)})
    if not v:
        # Fallback for stock number lookup if ID fails
        v = await db.vehicles.find_one({"stock_number": vehicle_id})
        if not v: raise HTTPException(status_code=404, detail="Vehicle not found")
    v["_id"] = str(v["_id"])
    return v


@app.post("/api/vehicles")
async def create_vehicle(vehicle: Vehicle, user: str = Depends(get_current_user)):
    v_dict = vehicle.dict(by_alias=True)
    if "_id" in v_dict: del v_dict["_id"]
    v_dict["created_at"] = datetime.now(timezone.utc)
    v_dict["updated_at"] = v_dict["created_at"]
    result = await db.vehicles.insert_one(v_dict)
    return {"id": str(result.inserted_id)}

@app.put("/api/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: Dict[str, Any], user: str = Depends(get_current_user)):
    if "_id" in data: del data["_id"]
    data["updated_at"] = datetime.now(timezone.utc)
    await db.vehicles.update_one({"_id": to_id(vehicle_id)}, {"$set": data})
    return {"message": "Vehicle updated"}

@app.delete("/api/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: str = Depends(get_current_user)):
    await db.vehicles.delete_one({"_id": to_id(vehicle_id)})
    return {"message": "Vehicle deleted"}

@app.delete("/api/vehicles/bulk/delete")
async def bulk_delete(ids: List[str], user: str = Depends(get_current_user)):
    obj_ids = [to_id(i) for i in ids]
    await db.vehicles.delete_many({"_id": {"$in": obj_ids}})
    return {"message": f"{len(ids)} vehicles deleted"}

# AI Chat
@app.post("/api/chat")
async def chat(data: Dict[str, Any]):
    from scraper import NeuralKnowledge
    msg = data.get("message", "")
    
    # Get AI Settings
    s = await db.settings.find_one({"type": "general"})
    provider = s.get("ai_provider", "local") if s else "local"
    api_key = s.get("ai_api_key", "") if s else ""

    # Get recent inventory for AI context
    cursor = db.vehicles.find({"status": "available"}).sort("created_at", -1).limit(100)
    inventory = await cursor.to_list(length=100)
    
    response = NeuralKnowledge.generate_response(msg, inventory, provider=provider, api_key=api_key)
    return {"response": response}


# Leads
@app.get("/api/leads")
async def get_leads(user: str = Depends(get_current_user)):
    cursor = db.leads.find().sort("created_at", -1)
    leads = await cursor.to_list(length=1000)
    for l in leads: l["_id"] = str(l["_id"])
    return leads

@app.post("/api/leads")
async def create_lead(lead: Lead):
    l_dict = lead.dict(by_alias=True)
    if "_id" in l_dict: del l_dict["_id"]
    l_dict["created_at"] = datetime.now(timezone.utc)
    result = await db.leads.insert_one(l_dict)
    return {"id": str(result.inserted_id)}

@app.put("/api/leads/{lead_id}")
async def update_lead(lead_id: str, data: Dict[str, Any], user: str = Depends(get_current_user)):
    if "_id" in data: del data["_id"]
    await db.leads.update_one({"_id": to_id(lead_id)}, {"$set": data})
    return {"message": "Lead updated"}

@app.delete("/api/leads/{lead_id}")
async def delete_lead(lead_id: str, user: str = Depends(get_current_user)):
    await db.leads.delete_one({"_id": to_id(lead_id)})
    return {"message": "Lead deleted"}

@app.post("/api/leads/clear")
async def clear_leads(user: str = Depends(get_current_user)):
    await db.leads.delete_many({})
    return {"message": "All leads cleared"}

# Stats
@app.get("/api/stats")
async def get_stats(user: str = Depends(get_current_user)):
    total_vehicles = await db.vehicles.count_documents({})
    available = await db.vehicles.count_documents({"status": "available"})
    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"status": "new"})
    
    # Simple analytics stubs
    total_views = await db.vehicles.aggregate([{"$group": {"_id": None, "total": {"$sum": "$views"}}}]).to_list(1)
    views = total_views[0]["total"] if total_views else 0
    
    return {
        "total_vehicles": total_vehicles,
        "available_vehicles": available,
        "total_leads": total_leads,
        "new_leads": new_leads,
        "total_views": views,
        "inventory_health": 100 if total_vehicles > 0 else 0
    }


# Scraper & Sync
@app.get("/api/scraper/settings")
async def get_settings():
    settings = await db.settings.find_one({"type": "scraper"})
    if not settings:
        return {"auto_sync": False, "last_sync": None}
    return {"auto_sync": settings.get("auto_sync", False), "last_sync": settings.get("last_sync")}

@app.post("/api/scraper/settings")
async def update_settings(settings: ScraperSettings, user: str = Depends(get_current_user)):
    await db.settings.update_one(
        {"type": "scraper"},
        {"$set": {"auto_sync": settings.auto_sync}},
        upsert=True
    )
    return {"message": "Settings updated"}

@app.get("/api/scraper/sync/info")
async def scraper_sync_info(user: str = Depends(get_current_user)):
    from scraper import get_sync_info
    info = await get_sync_info()
    return info

@app.post("/api/scraper/sync/batch")
async def scraper_sync_batch(page: int, user: str = Depends(get_current_user)):
    from scraper import sync_teamford_batch
    result = await sync_teamford_batch(page)
    if result.get("count", 0) > 0:
        await db.settings.update_one(
            {"type": "scraper"},
            {"$set": {"last_sync": datetime.now(timezone.utc)}},
            upsert=True
        )
    return result

@app.post("/api/scraper/sync")
async def trigger_sync(user: str = Depends(get_current_user)):
    from scraper import sync_teamford_listings
    # Legacy bulk sync - might timeout on Vercel
    result = await sync_teamford_listings()
    if result.get("success"):
        await db.settings.update_one(
            {"type": "scraper"},
            {"$set": {"last_sync": datetime.now(timezone.utc)}},
            upsert=True
        )
    return result

@app.post("/api/scraper/import-url")
async def import_url(data: Dict[str, str], user: str = Depends(get_current_user)):
    from scraper import scrape_teamford_listing
    url = data.get("url")
    if not url: raise HTTPException(status_code=400, detail="URL required")
    vehicle = await scrape_teamford_listing(url)
    if not vehicle: raise HTTPException(status_code=404, detail="Could not scrape vehicle")
    return {"vehicle": vehicle}

@app.post("/api/vehicles/import")
async def import_csv(file: UploadFile = File(...), user: str = Depends(get_current_user)):
    import pandas as pd
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    imported = 0
    for _, row in df.iterrows():
        v = Vehicle(
            title=row.get('title', 'Unknown'),
            make=row.get('make', ''),
            model=row.get('model', ''),
            year=int(row.get('year', 2024)),
            price=float(row.get('price', 0)),
            mileage=int(row.get('mileage', 0)),
            condition=row.get('condition', 'used'),
            body_type=row.get('body_type', 'SUV'),
            fuel_type=row.get('fuel_type', 'Gas'),
            transmission=row.get('transmission', 'Automatic'),
            exterior_color=row.get('exterior_color', ''),
            interior_color=row.get('interior_color', ''),
            engine=row.get('engine', ''),
            drivetrain=row.get('drivetrain', ''),
            description=row.get('description', ''),
            images=str(row.get('images', '')).split(',') if row.get('images') else []
        )
        await db.vehicles.insert_one(v.dict(by_alias=True))
        imported += 1
    return {"imported": imported}

# General Settings (AI Provider etc)
@app.get("/api/settings")
async def get_general_settings(user: str = Depends(get_current_user)):
    s = await db.settings.find_one({"type": "general"})
    if not s: return {"ai_provider": "local", "ai_api_key": ""}
    return {
        "ai_provider": s.get("ai_provider", "local"),
        "ai_api_key": s.get("ai_api_key", "")
    }

@app.put("/api/settings")
async def update_general_settings(data: Dict[str, Any], user: str = Depends(get_current_user)):
    await db.settings.update_one(
        {"type": "general"},
        {"$set": {
            "ai_provider": data.get("ai_provider", "local"),
            "ai_api_key": data.get("ai_api_key", "")
        }},
        upsert=True
    )
    return {"message": "Settings updated"}

@app.post("/api/scraper/sync/start")
async def start_background_sync(background_tasks: BackgroundTasks, user: str = Depends(get_current_user)):
    global SYNC_PROGRESS
    if SYNC_PROGRESS["status"] == "running":
        return {"message": "Sync already in progress"}
    
    from scraper import get_sync_info
    info = await get_sync_info()
    
    SYNC_PROGRESS = {
        "status": "running",
        "processed": 0,
        "total": info.get("total_vehicles", 0),
        "imported": 0,
        "updated": 0,
        "current_page": 0,
        "total_pages": info.get("total_pages", 0),
        "start_time": datetime.now(timezone.utc).isoformat()
    }
    
    background_tasks.add_task(run_sync_task)
    return {"message": "Sync started", "info": info}

@app.get("/api/scraper/sync/status")
async def get_sync_status(user: str = Depends(get_current_user)):
    return SYNC_PROGRESS

async def run_sync_task():
    global SYNC_PROGRESS
    from scraper import sync_teamford_batch
    try:
        for p in range(SYNC_PROGRESS["total_pages"]):
            SYNC_PROGRESS["current_page"] = p + 1
            res = await sync_teamford_batch(p)
            SYNC_PROGRESS["imported"] += res.get("imported", 0)
            SYNC_PROGRESS["updated"] += res.get("updated", 0)
            SYNC_PROGRESS["processed"] += res.get("count", 0)
        
        SYNC_PROGRESS["status"] = "completed"
        SYNC_PROGRESS["end_time"] = datetime.now(timezone.utc).isoformat()
        
        # Update last sync in DB
        await db.settings.update_one(
            {"type": "scraper"},
            {"$set": {"last_sync": datetime.now(timezone.utc)}},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Background sync failed: {e}")
        SYNC_PROGRESS["status"] = "failed"
        SYNC_PROGRESS["error"] = str(e)

@app.get("/api/health")

async def health():
    return {"status": "healthy", "db": DB_NAME}
