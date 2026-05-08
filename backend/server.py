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
from contextlib import asynccontextmanager

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure default admin exists
    try:
        await ensure_default_admin()
        logger.info("Lifespan startup: Admin check complete.")
    except Exception as e:
        logger.error(f"Lifespan startup error: {e}")
    
    yield
    # Shutdown logic if needed
    logger.info("Lifespan shutdown.")

app = FastAPI(title="AutoNorth Motors API", lifespan=lifespan)

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
            # Check for both password and password_hash to support legacy and new schemas
            await db.users.insert_one({
                "email": admin_email,
                "password": pwd_context.hash(admin_pass),
                "role": "admin",
                "created_at": datetime.now(timezone.utc)
            })
            logger.info("Created default admin.")
    except Exception as e:
        logger.error(f"Default admin error: {e}")

# Models
class LoginRequest(BaseModel):
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
async def login(user: LoginRequest, request: Request):
    try:
        # Check database connection robustness
        try:
            await db.command("ping")
        except Exception as e:
            logger.error(f"Login Database Ping failed: {e}")
            raise HTTPException(status_code=503, detail="Service temporarily unavailable. Please try again in a moment.")

        db_user = await db.users.find_one({"email": user.email})
        if not db_user:
            # Fallback: ensure default admin exists if this is a fresh deployment
            await ensure_default_admin()
            db_user = await db.users.find_one({"email": user.email})
            if not db_user:
                logger.error(f"Login Failure: User {user.email} not found.")
                raise HTTPException(status_code=401, detail="Invalid credentials")

        # Verify password with support for legacy 'password_hash' and current 'password' fields
        stored_password = db_user.get("password") or db_user.get("password_hash")
        if not stored_password:
            logger.error(f"Login Failure: No password stored for {user.email}")
            raise HTTPException(status_code=401, detail="Account configuration error. Please contact support.")

        try:
            is_valid = pwd_context.verify(user.password, stored_password)
        except Exception as e:
            logger.error(f"Password verification error for {user.email}: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed.")

        if not is_valid:
            logger.error(f"Login Failure: Incorrect password for {user.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        token = create_token({"sub": user.email})
        
        # Record session in DB (Wrapped in try-except to prevent blocking login if session tracking fails)
        try:
            await db.sessions.insert_one({
                "ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown"),
                "created_at": datetime.now(timezone.utc),
                "status": "active",
                "user": user.email
            })
        except Exception as e:
            logger.warning(f"Non-critical: Failed to record session for {user.email}: {e}")

        response = JSONResponse({"message": "Login successful", "user": {"email": user.email, "role": db_user.get("role", "admin")}})
        response.set_cookie(key="auth_token", value=token, httponly=True, samesite="lax", secure=True)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected login error: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal error occurred during login.")

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
    # Update admin credentials
    update_data = {}
    if "email" in data:
        update_data["email"] = data["email"]
    if "password" in data:
        update_data["password"] = pwd_context.hash(data["password"])
    
    if update_data:
        await db.users.update_one({"email": user_email}, {"$set": update_data})
    return {"message": "Profile updated"}

@app.get("/api/auth/sessions")
async def get_sessions(request: Request, user_email: str = Depends(get_current_user)):
    # Find active sessions in DB
    sessions = await db.sessions.find().sort("created_at", -1).to_list(100)
    
    # If no sessions found in DB (e.g. fresh migration), at least return current
    if not sessions:
        return [{
            "_id": "current",
            "ip": request.client.host if request.client else "127.0.0.1",
            "user_agent": request.headers.get("user-agent", "Unknown"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "active"
        }]
    
    for s in sessions:
        s["_id"] = str(s["_id"])
        if isinstance(s.get("created_at"), datetime):
            s["created_at"] = s["created_at"].isoformat()
    return sessions

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

@app.post("/api/vehicles/import")
async def import_vehicles_csv(file: UploadFile = File(...), user: str = Depends(get_current_user)):
    import csv
    contents = await file.read()
    decoded = contents.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Fuzzy mapping helper
    def get_val(row, aliases):
        for alias in aliases:
            for key in row.keys():
                k = str(key).lower().strip().replace(" ", "_").replace("#", "")
                if k == alias.lower().replace(" ", "_").replace("#", ""):
                    return str(row[key]).strip()
        return ""

    imported = 0
    updated = 0
    
    for row in reader:
        try:
            vin = get_val(row, ["vin", "vehicle identification number", "vin#"])
            stock = get_val(row, ["stock_number", "stock", "stk", "stk#", "stock#", "inventory_id"])
            
            if not vin and not stock: continue

            # Extract fields with fallback aliases
            title = get_val(row, ["title", "headline", "name", "vehicle"])
            make = get_val(row, ["make", "brand", "manufacturer"])
            model = get_val(row, ["model", "series"])
            year_val = get_val(row, ["year", "model_year"])
            price_val = get_val(row, ["price", "msrp", "retail_price", "sale_price"])
            mileage_val = get_val(row, ["mileage", "miles", "kms", "odometer"])
            images_val = get_val(row, ["images", "photos", "image_urls", "urls"])
            body = get_val(row, ["body_type", "body", "style", "type"])
            cond = get_val(row, ["condition", "status", "stock_type"])
            desc = get_val(row, ["description", "notes", "comments", "details"])
            fuel = get_val(row, ["fuel_type", "fuel", "gas_type"])
            trans = get_val(row, ["transmission", "trans", "gearbox"])
            ext_color = get_val(row, ["exterior_color", "color", "ext_color", "exterior"])
            int_color = get_val(row, ["interior_color", "int_color", "interior"])
            eng = get_val(row, ["engine", "motor", "engine_size"])
            drive = get_val(row, ["drivetrain", "drive", "awd_fwd_rwd"])

            # Image cleaning
            import re
            imgs = [img.strip() for img in re.split(r'[\s\n]+|,\s*(?=http)', images_val) if img.strip() and img.startswith("http")]

            v = {
                "title": title if title else f"{year_val} {make} {model}".strip(),
                "make": make,
                "model": model,
                "year": int(year_val) if year_val.isdigit() else 2024,
                "price": float(re.sub(r'[^\d.]', '', price_val)) if price_val else 0.0,
                "mileage": int(re.sub(r'[^\d]', '', mileage_val)) if mileage_val else 0,
                "condition": cond.lower() if cond else "used",
                "body_type": body if body else "Sedan",
                "fuel_type": fuel,
                "transmission": trans,
                "exterior_color": ext_color,
                "interior_color": int_color,
                "engine": eng,
                "drivetrain": drive,
                "vin": vin,
                "stock_number": stock,
                "description": desc,
                "images": imgs,
                "status": "available",
                "updated_at": datetime.now(timezone.utc)
            }

            # Smart Upsert
            query = {}
            if vin: query = {"vin": vin}
            elif stock: query = {"stock_number": stock}
            
            existing = await db.vehicles.find_one(query)
            if existing:
                await db.vehicles.update_one({"_id": existing["_id"]}, {"$set": v})
                updated += 1
            else:
                v["created_at"] = datetime.now(timezone.utc)
                v["views"] = 0
                await db.vehicles.insert_one(v)
                imported += 1
        except Exception as e:
            logger.error(f"CSV Row error: {e}")
            
    return {"message": f"Successfully processed {imported + updated} vehicles", "imported": imported, "updated": updated}

@app.post("/api/leads")
async def create_lead(lead: Lead):
    res = await db.leads.insert_one(lead.dict(by_alias=True))
    return {"id": str(res.inserted_id)}

@app.get("/api/leads")
async def get_leads(user: str = Depends(get_current_user)):
    leads = await db.leads.find().sort("created_at", -1).to_list(1000)
    for l in leads: l["_id"] = str(l["_id"])
    return leads

@app.post("/api/leads/clear")
async def clear_leads(user: str = Depends(get_current_user)):
    await db.leads.delete_many({})
    return {"message": "All leads cleared"}

@app.get("/api/leads/export")
async def export_leads(user: str = Depends(get_current_user)):
    import csv
    leads = await db.leads.find().sort("created_at", -1).to_list(2000)
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["name", "email", "phone", "lead_type", "vehicle_title", "status", "created_at"])
    writer.writeheader()
    for l in leads:
        writer.writerow({
            "name": l.get("name"),
            "email": l.get("email"),
            "phone": l.get("phone"),
            "lead_type": l.get("lead_type"),
            "vehicle_title": l.get("vehicle_title"),
            "status": l.get("status"),
            "created_at": l.get("created_at").isoformat() if l.get("created_at") else ""
        })
    
    return JSONResponse(
        content={"csv": output.getvalue()},
        headers={"Content-Disposition": "attachment; filename=leads.csv"}
    )

@app.get("/api/public/stats")
async def get_public_stats():
    # Publicly accessible stats for the chatbot
    try:
        count = await db.vehicles.count_documents({"status": {"$in": [None, "available", "Available"]}})
        return {"inventoryCount": count}
    except:
        return {"inventoryCount": 0}

@app.get("/api/stats")
async def get_stats(user: str = Depends(get_current_user)):
    total_vehicles = await db.vehicles.count_documents({})
    available_vehicles = await db.vehicles.count_documents({"status": {"$in": [None, "available", "Available", "AVAILABLE"]}})
    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"status": "new"})
    
    v_stats = await db.vehicles.aggregate([{"$group": {"_id": None, "total_views": {"$sum": "$views"}}}]).to_list(1)
    views = v_stats[0]["total_views"] if v_stats else 0
    
    # Top 5 most viewed vehicles
    top_vehicles = await db.vehicles.find({"status": {"$in": [None, "available", "Available"]}}).sort("views", -1).limit(5).to_list(5)
    for tv in top_vehicles: tv["_id"] = str(tv["_id"])

    # Top 5 search terms
    pipeline = [{"$group": {"_id": {"$toLower": "$query"}, "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 5}]
    search_results = await db.searches.aggregate(pipeline).to_list(5)
    top_searches = [{"term": r["_id"], "count": r["count"]} for r in search_results]

    return {
        "total_vehicles": total_vehicles,
        "available": available_vehicles, # Match frontend
        "available_vehicles": available_vehicles,
        "total_leads": total_leads,
        "new_leads": new_leads,
        "recent_leads": new_leads, # Match frontend dashboard
        "total_views": views,
        "total_clicks": int(views * 0.34),
        "inventory_health": 100 if total_vehicles > 0 else 0,
        "top_vehicles": top_vehicles,
        "top_searches": top_searches
    }

@app.get("/api/scraper/settings")
async def get_scraper_settings(user: str = Depends(get_current_user)):
    settings = await db.settings.find_one({"type": "scraper"})
    if not settings:
        return {"auto_sync": False, "last_sync": None}
    settings["_id"] = str(settings["_id"])
    if "last_sync" in settings and isinstance(settings["last_sync"], datetime):
        settings["last_sync"] = settings["last_sync"].isoformat()
    return settings

@app.post("/api/scraper/settings")
async def update_scraper_settings(settings: ScraperSettings, user: str = Depends(get_current_user)):
    await db.settings.update_one(
        {"type": "scraper"},
        {"$set": {"auto_sync": settings.auto_sync, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Scraper settings updated"}

@app.post("/api/scraper/import-url")
async def import_from_url(data: Dict[str, str], user: str = Depends(get_current_user)):
    url = data.get("url")
    if not url: raise HTTPException(status_code=400, detail="URL is required")
    
    from scraper import scrape_teamford_listing
    v = await scrape_teamford_listing(url)
    if not v: raise HTTPException(status_code=404, detail="Could not extract vehicle from URL")
    
    # Check if exists
    existing = await db.vehicles.find_one({"vin": v["vin"]}) if v.get("vin") else None
    if not existing and v.get("stock_number"):
        existing = await db.vehicles.find_one({"stock_number": v["stock_number"]})
    
    if existing:
        await db.vehicles.update_one({"_id": existing["_id"]}, {"$set": v})
        return {"message": "Vehicle updated", "vehicle": v, "id": str(existing["_id"])}
    else:
        res = await db.vehicles.insert_one(v)
        return {"message": "Vehicle imported", "vehicle": v, "id": str(res.inserted_id)}

@app.get("/api/settings")
async def get_general_settings(user: str = Depends(get_current_user)):
    s = await db.settings.find_one({"type": "general"})
    if not s: return {"ai_provider": "local", "ai_api_key": "", "ai_health": "online"}
    s["_id"] = str(s["_id"])
    if "ai_health" not in s: s["ai_health"] = "online"
    return s

@app.put("/api/settings")
async def update_general_settings(data: Dict[str, Any], user: str = Depends(get_current_user)):
    if "_id" in data: del data["_id"]
    await db.settings.update_one(
        {"type": "general"},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "General settings updated"}

@app.get("/api/scraper/sync/status")
async def get_sync_status(user: str = Depends(get_current_user)):
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
    global SYNC_PROGRESS
    if SYNC_PROGRESS["status"] == "running":
        return {"message": "Sync already in progress"}
    SYNC_PROGRESS = {"status": "idle", "processed": 0, "total": 0, "imported": 0, "updated": 0, "current_page": 0, "total_pages": 0}
    background_tasks.add_task(run_sync_task)
    return {"message": "Sync started in background"}

@app.post("/api/chatbot/message")
@app.post("/api/chat")
async def chatbot_message(data: Dict[str, Any], request: Request):
    msg = data.get("message", "")
    # Load AI Settings from DB with environment fallbacks
    s = await db.settings.find_one({"type": "general"}) or {}
    provider_raw = s.get("ai_provider") or os.environ.get("AI_PROVIDER") or "local"
    provider = str(provider_raw).lower()
    api_key = s.get("ai_api_key") or os.environ.get("AI_API_KEY")
    model = s.get("ai_model") or os.environ.get("AI_MODEL")
    
    logger.info(f"Chatbot utilizing provider: {provider} (Key present: {bool(api_key)})")

    inventory = await db.vehicles.find({"status": "available"}).limit(100).to_list(100)
    
    from scraper import NeuralKnowledge
    try:
        response = await NeuralKnowledge.generate_response(msg, inventory, provider, api_key, model)
        
        # Robust Lead Detection
        import re
        # Detect Phone Numbers or Emails
        email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        
        has_email = re.search(email_pattern, msg)
        has_phone = re.search(phone_pattern, msg)
        
        if has_email or has_phone:
            lead_info = {
                "name": "Chat Lead",
                "phone": has_phone.group(0) if has_phone else "N/A",
                "email": has_email.group(0) if has_email else "N/A",
                "message": f"Auto-captured during AI chat: {msg}",
                "lead_type": "chat",
                "status": "new",
                "created_at": datetime.now(timezone.utc)
            }
            await db.leads.insert_one(lead_info)
            logger.info(f"Lead captured from chat: {lead_info['phone']} / {lead_info['email']}")

        # Market Intelligence: Log search terms found in message
        makes_list = ["ford", "ram", "chevrolet", "toyota", "honda", "jeep", "dodge", "nissan", "hyundai", "kia", "suv", "truck"]
        found_terms = [w for w in makes_list if w in msg.lower()]
        if found_terms:
            await db.searches.insert_one({
                "query": " ".join(found_terms),
                "timestamp": datetime.now(timezone.utc),
                "source": "chatbot_ai",
                "ip": request.client.host if request.client else "127.0.0.1"
            })

        await db.settings.update_one({"type": "general"}, {"$set": {"ai_health": "online", "last_active": datetime.now(timezone.utc)}})
        return {"response": response}

    except Exception as e:
        import traceback
        logger.error(f"Chat error: {e}\n{traceback.format_exc()}")
        await db.settings.update_one({"type": "general"}, {"$set": {"ai_health": "error", "ai_error": str(e)}})
        return {"response": "I'm having a technical moment. Please call us at 825-605-5050 or visit our Edmonton showroom."}

@app.post("/api/analytics/search/log")
async def log_search(data: Dict[str, Any], request: Request):
    query = data.get("query", "").strip()
    if not query:
        return {"status": "skipped"}
    
    await db.searches.insert_one({
        "query": query,
        "timestamp": datetime.now(timezone.utc),
        "ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "unknown")
    })
    return {"status": "logged"}

@app.get("/api/auth/blacklist")
async def get_blacklist(user_email: str = Depends(get_current_user)):
    blacklist = await db.blacklist.find().sort("created_at", -1).to_list(100)
    for b in blacklist: b["_id"] = str(b["_id"])
    return blacklist

@app.post("/api/auth/blacklist")
async def block_ip(data: dict, user_email: str = Depends(get_current_user)):
    ip = data.get("ip")
    if not ip: raise HTTPException(status_code=400, detail="IP is required")
    await db.blacklist.update_one(
        {"ip": ip},
        {"$set": {
            "ip": ip,
            "reason": data.get("reason", "Manual block"),
            "created_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    return {"status": "success", "message": f"IP {ip} blocked"}

@app.delete("/api/auth/blacklist")
async def unblock_ip(ip: str, user_email: str = Depends(get_current_user)):
    await db.blacklist.delete_one({"ip": ip})
    return {"status": "success", "message": f"IP {ip} unblocked"}

@app.post("/api/auth/sessions/terminate")
async def terminate_session(session_id: str = None, user_email: str = Depends(get_current_user)):
    if session_id and session_id != "current":
        await db.sessions.delete_one({"_id": to_id(session_id)})
    return {"status": "success", "message": "Session terminated"}

@app.get("/api/analytics/summary")
async def get_analytics_summary(user_email: str = Depends(get_current_user)):
    v_stats = await db.vehicles.aggregate([{"$group": {"_id": None, "total_views": {"$sum": "$views"}}}]).to_list(1)
    views_count = v_stats[0]["total_views"] if v_stats else 0
    top_vehicles = await db.vehicles.find({"views": {"$gt": 0}}).sort("views", -1).limit(5).to_list(5)
    formatted_top = []
    for v in top_vehicles:
        formatted_top.append({
            "_id": str(v["_id"]),
            "title": f"{v.get('year', '')} {v.get('make', '')} {v.get('model', '')}",
            "vin": v.get("vin", "N/A"),
            "count": v.get("views", 0)
        })
    # Top Searches
    search_pipeline = [
        {"$group": {"_id": {"$toLower": "$query"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_searches = await db.searches.aggregate(search_pipeline).to_list(5)

    leads_count = await db.leads.count_documents({})
    conversion_rate = (leads_count / views_count * 100) if views_count > 0 else 0

    return {
        "total_views": views_count,
        "conversion_rate": conversion_rate,
        "top_vehicles": formatted_top,
        "top_searches": [{"term": r["_id"], "count": r["count"]} for r in top_searches]
    }

@app.post("/api/analytics/reset")
async def reset_analytics(user_email: str = Depends(get_current_user)):
    await db.vehicles.update_many({}, {"$set": {"views": 0, "clicks": 0}})
    return {"status": "success", "message": "Analytics reset"}

@app.get("/api/analytics/export")
async def export_analytics(user_email: str = Depends(get_current_user)):
    return {"status": "success", "message": "Export started"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
