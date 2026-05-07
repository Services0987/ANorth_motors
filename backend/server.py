import os
from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import pandas as pd
import io
import logging
from jose import JWTError, jwt
from passlib.context import CryptContext
from scraper import NeuralKnowledge, scrape_teamford_listing, sync_teamford_listings, sync_teamford_batch, get_sync_info
from bson import ObjectId

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AutoNorth Motors API")

# Database (Must be before scraper import to avoid circular issues)
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URI)
db = client.autonorth

# Security
SECRET_KEY = os.environ.get("JWT_SECRET", "autonorth-super-secret-2024-elite")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*\.vercel\.app",
    allow_origins=["http://localhost:3000", "https://autonorth.ca", "https://www.autonorth.ca", "https://anorth-motors.vercel.app"],
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
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@autonorth.ca")
    admin_password = os.environ.get("ADMIN_PASSWORD", "autonorth2024")
    
    # Check against DB first
    db_user = await db.users.find_one({"email": user_data.email})
    
    if db_user:
        if not pwd_context.verify(user_data.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    elif user_data.email == admin_email and user_data.password == admin_password:
        # Initial login - create user in DB
        await db.users.insert_one({
            "email": admin_email,
            "password": pwd_context.hash(admin_password)
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
        secure=True # Set to True in production
    )
    return response

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
    if status != "all":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"make": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
            {"vin": {"$regex": search, "$options": "i"}},
            {"stock_number": {"$regex": search, "$options": "i"}}
        ]
    
    if make: query["make"] = {"$regex": f"^{make}$", "$options": "i"}
    if body_type: query["body_type"] = {"$regex": f"^{body_type}$", "$options": "i"}
    if fuel_type: query["fuel_type"] = {"$regex": f"^{fuel_type}$", "$options": "i"}
    if condition: query["condition"] = {"$regex": f"^{condition}$", "$options": "i"}
    
    if show_on_home is not None:
        if show_on_home.lower() == "true":
            query["show_on_home"] = {"$ne": False}
        else:
            query["show_on_home"] = False
        
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None: query["price"]["$gte"] = min_price
        if max_price is not None: query["price"]["$lte"] = max_price

    cursor = db.vehicles.find(query).sort("created_at", -1).skip(skip).limit(limit)
    vehicles = await cursor.to_list(length=limit)
    total = await db.vehicles.count_documents(query)
    
    for v in vehicles:
        v["_id"] = str(v["_id"])
    return {"vehicles": vehicles, "total": total}

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
    msg = data.get("message", "")
    # Get recent inventory for AI context
    cursor = db.vehicles.find({"status": "available"}).sort("created_at", -1).limit(50)
    inventory = await cursor.to_list(length=50)
    
    response = NeuralKnowledge.generate_response(msg, inventory)
    return {"response": response}

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
    info = await get_sync_info()
    return info

@app.post("/api/scraper/sync/batch")
async def scraper_sync_batch(page: int, user: str = Depends(get_current_user)):
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
    url = data.get("url")
    if not url: raise HTTPException(status_code=400, detail="URL required")
    vehicle = await scrape_teamford_listing(url)
    if not vehicle: raise HTTPException(status_code=404, detail="Could not scrape vehicle")
    return {"vehicle": vehicle}

@app.post("/api/vehicles/import")
async def import_csv(file: UploadFile = File(...), user: str = Depends(get_current_user)):
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
