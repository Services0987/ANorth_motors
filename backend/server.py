from dotenv import load_dotenv
load_dotenv()
from google import genai

import os
import re
import io
import csv
import jwt
import bcrypt
import logging
import pathlib
import httpx
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any, Dict

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
mongo_url = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
db_name = os.environ.get('DB_NAME', 'AutoNorth')

client: Optional[AsyncIOMotorClient] = None
db: Any = None

app = FastAPI(title="AutoNorth Motors API")
api_router = APIRouter(prefix="/api")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler to prevent HTML 500s
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "message": str(exc) if not isinstance(exc, HTTPException) else exc.detail}
    )

JWT_ALGORITHM = "HS256"
chat_sessions: dict = {}


# ─── ObjectId helpers ─────────────────────────────────────────────
def _coerce_oid(v: Any) -> str:
    if isinstance(v, ObjectId): return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v): return v
    raise ValueError(f"Invalid ObjectId: {v}")

PyObjectId = Annotated[str, BeforeValidator(_coerce_oid)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self):
        d = self.model_dump(by_alias=True, exclude_none=True)
        if "_id" in d and d["_id"] is None:
            del d["_id"]
        return d

    @classmethod
    def from_mongo(cls, doc):
        if doc and "_id" in doc:
            doc = {**doc, "_id": str(doc["_id"])}
        return cls(**doc)


# ─── Auth ─────────────────────────────────────────────────────────
def hash_password(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_password(plain, hashed): return bcrypt.checkpw(plain.encode(), hashed.encode())
def jwt_secret(): return os.environ.get("JWT_SECRET", "super-secret-key")


def create_token(user_id, email, kind="access", exp_hours=24):
    exp = timedelta(hours=exp_hours) if kind == "access" else timedelta(days=7)
    return jwt.encode({"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + exp, "type": kind}, jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "): token = auth[7:]
    if not token: raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGORITHM])
        if p.get("type") != "access": raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not user: raise HTTPException(401, "User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError: raise HTTPException(401, "Invalid token")


# ─── Models ───────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class VehicleCreate(BaseModel):
    title: str; make: str; model: str; year: int; price: float
    mileage: int = 0; condition: str = "used"; body_type: str = "Sedan"
    fuel_type: str = "Gas"; transmission: str = "Automatic"
    exterior_color: str = ""; interior_color: str = ""; engine: str = ""
    drivetrain: str = ""; doors: int = 4; seats: int = 5
    vin: str = ""; stock_number: str = ""; description: str = ""
    features: List[str] = []; images: List[str] = []
    status: str = "available"; featured: bool = False

class VehicleUpdate(BaseModel):
    title: Optional[str] = None; make: Optional[str] = None; model: Optional[str] = None
    year: Optional[int] = None; price: Optional[float] = None; mileage: Optional[int] = None
    condition: Optional[str] = None; body_type: Optional[str] = None
    fuel_type: Optional[str] = None; transmission: Optional[str] = None
    exterior_color: Optional[str] = None; interior_color: Optional[str] = None
    engine: Optional[str] = None; drivetrain: Optional[str] = None
    doors: Optional[int] = None; seats: Optional[int] = None
    vin: Optional[str] = None; stock_number: Optional[str] = None
    description: Optional[str] = None; features: Optional[List[str]] = None
    images: Optional[List[str]] = None; status: Optional[str] = None
    featured: Optional[bool] = None

class Vehicle(BaseDocument):
    title: str; make: str; model: str; year: int; price: float
    mileage: int = 0; condition: str = "used"; body_type: str = "Sedan"
    fuel_type: str = "Gas"; transmission: str = "Automatic"
    exterior_color: str = ""; interior_color: str = ""; engine: str = ""
    drivetrain: str = ""; doors: int = 4; seats: int = 5
    vin: str = ""; stock_number: str = ""; description: str = ""
    features: List[str] = []; images: List[str] = []
    status: str = "available"; featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadCreate(BaseModel):
    lead_type: str; name: str; email: str; phone: str = ""
    vehicle_id: Optional[str] = None; vehicle_title: Optional[str] = None
    message: str = ""; preferred_contact: str = "email"
    down_payment: Optional[float] = None; trade_in_value: Optional[float] = None
    preferred_date: Optional[str] = None; preferred_time: Optional[str] = None

class Lead(BaseDocument):
    lead_type: str; name: str; email: str; phone: str = ""
    vehicle_id: Optional[str] = None; vehicle_title: Optional[str] = None
    message: str = ""; preferred_contact: str = "email"
    down_payment: Optional[float] = None; trade_in_value: Optional[float] = None
    preferred_date: Optional[str] = None; preferred_time: Optional[str] = None
    status: str = "new"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadStatusUpdate(BaseModel):
    status: str

class ChatRequest(BaseModel):
    session_id: str
    message: str


# ─── Auth endpoints ───────────────────────────────────────────────
@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    uid = str(user["_id"])
    response.set_cookie("access_token", create_token(uid, email), httponly=True, secure=True, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", create_token(uid, email, "refresh", 168), httponly=True, secure=True, samesite="lax", max_age=604800, path="/")
    return {"id": uid, "email": email, "name": user.get("name", "Admin"), "role": "admin"}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def me(cu=Depends(get_current_user)):
    try:
        cu["_id"] = str(cu["_id"])
        cu.pop("password_hash", None)
        return cu
    except Exception as e:
        logger.warning(f"Me check error: {str(e)}")
        return JSONResponse({"user": None}, status_code=401)

@api_router.get("/health")
async def health():
    try:
        await client.admin.command('ping')
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"
    return {
        "status": "online",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc)
    }


# ─── Vehicles ─────────────────────────────────────────────────────
@api_router.get("/vehicles")
async def list_vehicles(
    condition: Optional[str] = None, make: Optional[str] = None,
    body_type: Optional[str] = None, fuel_type: Optional[str] = None,
    min_price: Optional[float] = None, max_price: Optional[float] = None,
    min_year: Optional[int] = None, max_year: Optional[int] = None,
    status: Optional[str] = "available", featured: Optional[bool] = None,
    search: Optional[str] = None, limit: int = 50, skip: int = 0
):
    try:
        q = {}
        if condition: q["condition"] = condition
        if make: q["make"] = {"$regex": make, "$options": "i"}
        if body_type: q["body_type"] = body_type
        if fuel_type: q["fuel_type"] = fuel_type
        if status and status != "all": q["status"] = status
        if featured is not None: q["featured"] = featured
        if min_price is not None or max_price is not None:
            q["price"] = {k: v for k, v in [("$gte", min_price), ("$lte", max_price)] if v is not None}
        if min_year is not None or max_year is not None:
            q["year"] = {k: v for k, v in [("$gte", min_year), ("$lte", max_year)] if v is not None}
        if search:
            q["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"make": {"$regex": search, "$options": "i"}}, {"model": {"$regex": search, "$options": "i"}}]
        total = await db.vehicles.count_documents(q)
        docs = await db.vehicles.find(q).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return {"vehicles": [Vehicle.from_mongo(d).model_dump(mode='json') for d in docs], "total": total, "skip": skip, "limit": limit}
    except Exception as e:
        logger.error(f"Database error in list_vehicles: {str(e)}")
        return {"vehicles": [], "total": 0, "skip": skip, "limit": limit, "error": "Service temporarily unavailable"}

@api_router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    if not ObjectId.is_valid(vehicle_id): raise HTTPException(400, "Invalid ID")
    doc = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    if not doc: raise HTTPException(404, "Vehicle not found")
    return Vehicle.from_mongo(doc).model_dump(mode='json')



@api_router.post("/vehicles")
async def create_vehicle(data: VehicleCreate, cu=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {**data.model_dump(), "created_at": now, "updated_at": now}
    result = await db.vehicles.insert_one(doc)
    doc["_id"] = result.inserted_id
    return Vehicle.from_mongo(doc).model_dump(mode='json')

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: VehicleUpdate, cu=Depends(get_current_user)):
    if not ObjectId.is_valid(vehicle_id): raise HTTPException(400, "Invalid ID")
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    upd["updated_at"] = datetime.now(timezone.utc)
    await db.vehicles.update_one({"_id": ObjectId(vehicle_id)}, {"$set": upd})
    return Vehicle.from_mongo(await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})).model_dump(mode='json')

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, cu=Depends(get_current_user)):
    if not ObjectId.is_valid(vehicle_id): raise HTTPException(400, "Invalid ID")
    r = await db.vehicles.delete_one({"_id": ObjectId(vehicle_id)})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

@api_router.delete("/vehicles/bulk/delete")
async def bulk_delete_vehicles(vehicle_ids: List[str], cu=Depends(get_current_user)):
    oids = [ObjectId(vid) for vid in vehicle_ids if ObjectId.is_valid(vid)]
    if not oids: raise HTTPException(400, "No valid IDs provided")
    result = await db.vehicles.delete_many({"_id": {"$in": oids}})
    return {"message": f"Deleted {result.deleted_count} vehicles"}

# ─── CSV Import ───────────────────────────────────────────────────
@api_router.post("/vehicles/import")
async def import_vehicles(file: UploadFile = File(...), cu=Depends(get_current_user)):
    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(decoded))
    added = 0
    for row in reader:
        try:
            v = {
                "title": row.get("title", f"{row.get('year')} {row.get('make')} {row.get('model')}").strip(),
                "make": row.get("make", "").strip(),
                "model": row.get("model", "").strip(),
                "year": int(row.get("year", 2024)),
                "price": float(row.get("price", 0)),
                "mileage": int(row.get("mileage", 0)),
                "condition": row.get("condition", "used").lower(),
                "body_type": row.get("body_type", "Sedan"),
                "fuel_type": row.get("fuel_type", "Gas"),
                "transmission": row.get("transmission", "Automatic"),
                "exterior_color": row.get("exterior_color", ""),
                "interior_color": row.get("interior_color", ""),
                "engine": row.get("engine", ""),
                "drivetrain": row.get("drivetrain", ""),
                "vin": row.get("vin", "").strip(),
                "stock_number": row.get("stock_number", "").strip(),
                "description": row.get("description", ""),
                "images": [img.strip() for img in row.get("images", "").split(",") if img.strip()],
                "status": "available",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            if not v["vin"] and not v["stock_number"]: continue
            await db.vehicles.update_one(
                {"$or": [{"vin": v["vin"]}, {"stock_number": v["stock_number"]}]} if v["vin"] or v["stock_number"] else {"title": v["title"]},
                {"$set": v},
                upsert=True
            )
            added += 1
        except Exception as e:
            logger.error(f"Row import error: {e}")
            continue
    return {"message": f"Imported {added} vehicles"}

# ─── Leads ────────────────────────────────────────────────────────
@api_router.post("/leads")
async def create_lead(data: LeadCreate):
    now = datetime.now(timezone.utc)
    doc = {**data.model_dump(), "status": "new", "created_at": now}
    result = await db.leads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return Lead.from_mongo(doc).model_dump(mode='json')

@api_router.get("/leads")
async def list_leads(status: Optional[str] = None, lead_type: Optional[str] = None, cu=Depends(get_current_user)):
    q = {}
    if status and status != "all": q["status"] = status
    if lead_type and lead_type != "all": q["lead_type"] = lead_type
    docs = await db.leads.find(q).sort("created_at", -1).to_list(500)
    return [Lead.from_mongo(d).model_dump(mode='json') for d in docs]

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, data: LeadStatusUpdate, cu=Depends(get_current_user)):
    if not ObjectId.is_valid(lead_id): raise HTTPException(400, "Invalid ID")
    await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": {"status": data.status}})
    return Lead.from_mongo(await db.leads.find_one({"_id": ObjectId(lead_id)})).model_dump(mode='json')

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, cu=Depends(get_current_user)):
    if not ObjectId.is_valid(lead_id): raise HTTPException(400, "Invalid ID")
    await db.leads.delete_one({"_id": ObjectId(lead_id)})
    return {"message": "Deleted"}


# ─── Stats ────────────────────────────────────────────────────────
@api_router.get("/stats")
async def get_stats(cu=Depends(get_current_user)):
    total = await db.vehicles.count_documents({})
    avail = await db.vehicles.count_documents({"status": "available"})
    sold = await db.vehicles.count_documents({"status": "sold"})
    featured = await db.vehicles.count_documents({"featured": True})
    t_leads = await db.leads.count_documents({})
    n_leads = await db.leads.count_documents({"status": "new"})
    contacted = await db.leads.count_documents({"status": "contacted"})
    recent = await db.leads.find({}).sort("created_at", -1).limit(5).to_list(5)
    return {"total_vehicles": total, "available": avail, "sold": sold, "featured": featured,
            "total_leads": t_leads, "new_leads": n_leads, "contacted": contacted,
            "recent_leads": [Lead.from_mongo(d).model_dump(mode='json') for d in recent]}


# ─── Scraper & Settings ──────────────────────────────────────────
@api_router.get("/scraper/settings")
async def get_scraper_settings(cu=Depends(get_current_user)):
    s = await db.settings.find_one({"key": "scraper"})
    if not s: return {"auto_sync": False, "last_sync": None}
    return {"auto_sync": s.get("auto_sync", False), "last_sync": s.get("last_sync")}

@api_router.post("/scraper/settings")
async def update_scraper_settings(data: Dict[str, Any], cu=Depends(get_current_user)):
    await db.settings.update_one(
        {"key": "scraper"},
        {"$set": {"auto_sync": data.get("auto_sync", False)}},
        upsert=True
    )
    return {"message": "Settings updated"}

@api_router.post("/scraper/import-url")
async def import_vehicle_from_url(data: Dict[str, str], cu=Depends(get_current_user)):
    url = data.get("url")
    if not url: raise HTTPException(400, "URL required")
    from scraper import scrape_teamford_listing
    try:
        v_data = await scrape_teamford_listing(url)
        if not v_data: raise HTTPException(400, "Could not extract data from the provided URL")
        
        vin = v_data.get("vin")
        stock = v_data.get("stock_number")
        if not vin and not stock: raise HTTPException(400, "Incomplete vehicle data")

        query = []
        if vin: query.append({"vin": vin})
        if stock: query.append({"stock_number": stock})
        
        existing = await db.vehicles.find_one({"$or": query})
        if existing:
            await db.vehicles.update_one({"_id": existing["_id"]}, {"$set": v_data})
            return {"message": "Vehicle updated", "id": str(existing["_id"])}
        
        res = await db.vehicles.insert_one(v_data)
        return {"message": "Vehicle imported", "id": str(res.inserted_id)}
    except HTTPException as he: raise he
    except Exception as e:
        logger.error(f"Error importing from URL: {e}")
        raise HTTPException(500, f"Error processing listing: {str(e)}")

@api_router.post("/scraper/sync/teamford")
async def sync_teamford(cu=Depends(get_current_user)):
    from scraper import scrape_teamford_inventory
    v_list = await scrape_teamford_inventory(limit=15)
    added, updated = 0, 0
    for v in (v_list or []):
        try:
            if not v or (not v.get("vin") and not v.get("stock_number")): continue
            existing = await db.vehicles.find_one({ "$or": [{"vin": v["vin"]}, {"stock_number": v["stock_number"]}] })
            if existing:
                await db.vehicles.update_one({"_id": existing["_id"]}, {"$set": v})
                updated += 1
            else:
                await db.vehicles.insert_one(v)
                added += 1
        except Exception as e:
            logger.error(f"Error processing synced vehicle: {str(e)}")
            continue
    
    await db.settings.update_one({"key": "scraper"}, {"$set": {"last_sync": datetime.now(timezone.utc)}}, upsert=True)
    return {"added": added, "updated": updated}

@api_router.get("/debug/health")
async def debug_health():
    status = { "database": "unknown", "ai_service": "unknown", "environment": { "mongo_set": bool(os.getenv("MONGO_URL")), "gemini_set": bool(os.getenv("GEMINI_API_KEY")), "frontend_url": os.getenv("FRONTEND_URL", "not set") } }
    try:
        if db is not None:
            await db.command("ping"); status["database"] = "healthy"
        else: status["database"] = "uninitialized"
    except Exception as e: status["database"] = f"unhealthy: {str(e)}"
    try: status["ai_service"] = "ready" if os.getenv("GEMINI_API_KEY") else "missing api key"
    except: status["ai_service"] = "error"
    return status

@api_router.get("/ai/inventory-snapshot")
async def get_inventory_snapshot(cu=Depends(get_current_user)):
    total = await db.vehicles.count_documents({"status": "available"})
    makes = await db.vehicles.distinct("make", {"status": "available"})
    types = await db.vehicles.distinct("body_type", {"status": "available"})
    featured = await db.vehicles.find({"featured": True, "status": "available"}).limit(5).to_list(5)
    snapshot = f"Total Available: {total}\nMakes: {', '.join(makes)}\nBody Types: {', '.join(types)}\nFeatured Models:\n"
    for v in featured: snapshot += f"- {v['title']} (${v['price']:,.0f})\n"
    return {"snapshot": snapshot}

# ─── AI Chat ──────────────────────────────────────────────────────
@api_router.post("/chat")
async def ai_chat(data: ChatRequest):
    try:
        docs = await db.vehicles.find({"status": "available"}).sort([("featured", -1), ("created_at", -1)]).limit(20).to_list(20)
        inventory = "\n".join([f"• {v['title']} — ${v['price']:,.0f} | {v['condition'].upper()} | {v['body_type']} | {v.get('fuel_type','')}" for v in docs])

        system_instruction = f"""You are AutoNorth Motors' AI Vehicle Specialist — Edmonton's most prestigious dealership assistant.
DEALERSHIP: AutoNorth Motors | 9104 91 St NW, Edmonton, AB | Phone: 825-605-5050
PERSONA: Warm, professional, concise (2-4 sentences). 
INVENTORY:
{inventory}
GOALS: Recommend vehicles, book test drives (name, email, phone, vehicle, date).
LEAD CAPTURE: [[LEAD::{{"name":"NAME","email":"EMAIL","phone":"PHONE","vehicle_title":"VEHICLE","preferred_date":"DATE","message":"AI chat booking"}}]]"""

        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            logger.warning("[AI_RESTRICTION] GEMINI_API_KEY is missing. AI Specialist restricted to safety fallbacks.")
            msg = data.message.lower().strip()
            if "truck" in msg: return {"response": "We have some stunning trucks in stock, like the Ford F-150. Would you like to see our full inventory?", "lead_captured": False}
            return {"response": "Welcome to AutoNorth Motors! How can I help you find your next vehicle in Edmonton today?", "lead_captured": False}

        client = genai.Client(api_key=gemini_api_key)
        
        # New SDK Chat Session Logic
        if data.session_id not in chat_sessions:
            chat_sessions[data.session_id] = client.chats.create(
                model='gemini-1.5-flash',
                config=genai.types.GenerateContentConfig(system_instruction=system_instruction)
            )
            
        chat = chat_sessions[data.session_id]
        response = chat.send_message(data.message)
        raw = response.text
        lead_captured = False; response_text = raw
        if "[[LEAD::" in raw:
            match = re.search(r'\[\[LEAD::(.+?)\]\]', raw, re.DOTALL)
            if match:
                try:
                    lead_data = json.loads(match.group(1))
                    await db.leads.insert_one({**lead_data, "lead_type": "test_drive", "status": "new", "created_at": datetime.now(timezone.utc)})
                    lead_captured = True
                except: pass
            try: response_text = raw[:raw.index("[[LEAD::")].strip()
            except: pass
        return {"response": response_text, "lead_captured": lead_captured}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "I'm having a brief connection issue. Please call us at 825-605-5050 — we're here to help!", "lead_captured": False}

# ─── Startup ──────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    global client, db
    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000, connectTimeoutMS=10000)
        db = client[db_name]; await client.admin.command('ping')
        await db.users.create_index("email", unique=True)
        await db.vehicles.create_index([("status", 1), ("featured", -1)])
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@autonorth.ca")
        admin_password = os.environ.get("ADMIN_PASSWORD", "AdminPass26")
        if not await db.users.find_one({"email": admin_email}):
            await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password), "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
    except Exception as e: logger.error(f"Startup failed: {e}")

app.include_router(api_router)
@app.on_event("shutdown")
async def shutdown_db(): client.close()
