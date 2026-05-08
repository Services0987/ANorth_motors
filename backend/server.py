import os
import json
import logging
import uuid
import io
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            logger.info("Created default admin.")
    except Exception as e:
        logger.error(f"Default admin error: {e}")

@app.on_event("startup")
async def startup():
    await ensure_default_admin()

# Models
class User(BaseModel):
    email: str
    password: str

class Vehicle(BaseModel):
    title: str
    make: str
    model: str
    year: int
    price: float
    mileage: int
    condition: str = "used"
    body_type: Optional[str] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = "Automatic"
    exterior_color: Optional[str] = None
    interior_color: Optional[str] = None
    engine: Optional[str] = None
    drivetrain: Optional[str] = None
    description: Optional[str] = None
    images: List[str] = []
    features: List[str] = []
    stock_number: Optional[str] = None
    vin: Optional[str] = None
    status: str = "available"
    views: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Lead(BaseModel):
    lead_type: str # 'contact', 'test_drive', 'financing'
    name: str
    email: Optional[str] = None
    phone: str
    message: Optional[str] = None
    vehicle_id: Optional[str] = None
    vehicle_title: Optional[str] = None
    status: str = "new"
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    down_payment: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScraperSettings(BaseModel):
    auto_sync: bool

# Auth Utilities
def create_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(request: Request):
    token = request.cookies.get("auth_token")
    if not token: raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")

def to_id(id_str: str):
    try:
        return ObjectId(id_str)
    except:
        return id_str

# Routes

@app.get("/api/health")
async def health():
    # Simple check to see if DB is responsive
    try:
        await db.command("ping")
        db_status = "connected"
    except:
        db_status = "disconnected"
    return {"status": "healthy", "db": DB_NAME, "db_connection": db_status}

@app.post("/api/auth/login")
async def login(user: User):
    try:
        # Vercel fallback: ensure admin exists on login attempt in case startup didn't run
        await ensure_default_admin()
        
        db_user = await db.users.find_one({"email": user.email})
        if not db_user or not pwd_context.verify(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_token({"sub": user.email})
        response = JSONResponse({"message": "Login successful", "user": {"email": user.email, "role": db_user.get("role", "admin")}})
        # In Vercel, secure=True is often required for cross-site cookies, 
        # but since we are same-origin (rewritten), lax should be okay.
        response.set_cookie(key="auth_token", value=token, httponly=True, samesite="lax", secure=True)
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

@app.get("/api/auth/sessions")
async def get_sessions(user_email: str = Depends(get_current_user)):
    return [
        {
            "_id": "sess_001",
            "ip": "192.168.1.101",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "active"
        },
        {
            "_id": "sess_002",
            "ip": "172.20.10.4",
            "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "active"
        }
    ]

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
    
    # 1. Status
    if status.lower() == "available":
        query["status"] = {"$in": [None, "available", "Available", "AVAILABLE"]}
    elif status.lower() != "all":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    
    # 2. Search
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
    
    if body_type:
        # Alias Mapping for Body Types
        bt_aliases = {
            "truck": ["truck", "pickup", "crew", "ext", "cab"],
            "suv": ["suv", "crossover", "utility", "sport"],
            "sedan": ["sedan", "coupe", "hardtop"]
        }
        target = body_type.lower()
        if target in bt_aliases:
            pattern = "|".join(bt_aliases[target])
            query["body_type"] = {"$regex": f"({pattern})", "$options": "i"}
        else:
            query["body_type"] = {"$regex": f"^{body_type}$", "$options": "i"}
            
    if fuel_type: query["fuel_type"] = {"$regex": f"^{fuel_type}$", "$options": "i"}
    if condition: query["condition"] = {"$regex": f"^{condition}$", "$options": "i"}
    
    # 4. Show on Home
    if show_on_home is not None:
        if show_on_home.lower() == "true":
            query["show_on_home"] = {"$ne": False}
        else:
            query["show_on_home"] = False

    # 5. Price
    if min_price is not None or max_price is not None:
        p_q = {}
        if min_price is not None: p_q["$gte"] = min_price
        if max_price is not None: p_q["$lte"] = max_price
        query["price"] = p_q

    total = await db.vehicles.count_documents(query)
    vehicles = await db.vehicles.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for v in vehicles: v["_id"] = str(v["_id"])
    return {"vehicles": vehicles, "total": total}

@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    v = await db.vehicles.find_one({"_id": to_id(vehicle_id)})
    if not v:
        v = await db.vehicles.find_one({"stock_number": vehicle_id})
        if not v: raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Increment views
    await db.vehicles.update_one({"_id": v["_id"]}, {"$inc": {"views": 1}})
    
    v["_id"] = str(v["_id"])
    return v

@app.post("/api/vehicles")
async def create_vehicle(vehicle: Vehicle, user: str = Depends(get_current_user)):
    v_dict = vehicle.dict(by_alias=True)
    if "_id" in v_dict: del v_dict["_id"]
    result = await db.vehicles.insert_one(v_dict)
    return {"id": str(result.inserted_id)}

@app.put("/api/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: Dict[str, Any], user: str = Depends(get_current_user)):
    if "_id" in data: del data["_id"]
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

@app.delete("/api/vehicles/bulk/clear")
async def clear_vehicles(user: str = Depends(get_current_user)):
    await db.vehicles.delete_many({})
    return {"message": "All vehicles cleared"}

@app.post("/api/leads")
async def create_lead(lead: Lead):
    res = await db.leads.insert_one(lead.dict(by_alias=True))
    return {"id": str(res.inserted_id)}

@app.get("/api/leads")
async def get_leads(user: str = Depends(get_current_user)):
    leads = await db.leads.find().sort("created_at", -1).to_list(100)
    for l in leads: l["_id"] = str(l["_id"])
    return leads

@app.get("/api/stats")
async def get_stats(user: str = Depends(get_current_user)):
    total_vehicles = await db.vehicles.count_documents({})
    available_vehicles = await db.vehicles.count_documents({"status": {"$in": [None, "available", "Available"]}})
    total_leads = await db.leads.count_documents({})
    
    v_stats = await db.vehicles.aggregate([{"$group": {"_id": None, "total_views": {"$sum": "$views"}}}]).to_list(1)
    views = v_stats[0]["total_views"] if v_stats else 0
    
    return {
        "total_vehicles": total_vehicles,
        "available_vehicles": available_vehicles,
        "total_leads": total_leads,
        "total_views": views,
        "total_clicks": int(views * 0.34),
        "inventory_health": 100 if total_vehicles > 0 else 0
    }

@app.get("/api/scraper/sync/status")
async def get_sync_status():
    return SYNC_PROGRESS

async def run_sync_task():
    global SYNC_PROGRESS
    SYNC_PROGRESS["status"] = "running"
    try:
        from scraper import get_sync_info, sync_teamford_batch
        info = await get_sync_info()
        SYNC_PROGRESS["total"] = info["total_vehicles"]
        SYNC_PROGRESS["total_pages"] = info["total_pages"]
        
        for p in range(1, info["total_pages"] + 1):
            SYNC_PROGRESS["current_page"] = p
            res = await sync_teamford_batch(p)
            SYNC_PROGRESS["processed"] += res.get("count", 0)
            SYNC_PROGRESS["imported"] += res.get("imported", 0)
            SYNC_PROGRESS["updated"] += res.get("updated", 0)
            
        SYNC_PROGRESS["status"] = "completed"
        await db.settings.update_one({"type": "scraper"}, {"$set": {"last_sync": datetime.now(timezone.utc)}}, upsert=True)
    except Exception as e:
        logger.error(f"Sync task failed: {e}")
        SYNC_PROGRESS["status"] = "failed"

@app.post("/api/scraper/sync/start")
async def start_sync(background_tasks: BackgroundTasks, user: str = Depends(get_current_user)):
    if SYNC_PROGRESS["status"] == "running":
        return {"message": "Sync already in progress"}
    global SYNC_PROGRESS
    SYNC_PROGRESS = {"status": "idle", "processed": 0, "total": 0, "imported": 0, "updated": 0, "current_page": 0, "total_pages": 0}
    background_tasks.add_task(run_sync_task)
    return {"message": "Sync started in background"}

@app.post("/api/chatbot/message")
async def chatbot_message(data: Dict[str, str]):
    msg = data.get("message", "")
    provider = "local"
    api_key = ""
    
    settings = await db.settings.find_one({"type": "general"})
    if settings:
        provider = settings.get("ai_provider", "local")
        api_key = settings.get("ai_api_key", "")

    inventory = await db.vehicles.find({"status": "available"}).limit(100).to_list(100)
    
    from scraper import NeuralKnowledge
    response = NeuralKnowledge.generate_response(msg, inventory, provider, api_key)
    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
