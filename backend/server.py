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

# Initialize DB globally for Serverless/Vercel compatibility
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

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

# --- Database Resilience Configuration ---
# Fallback logic for various environment naming conventions (Vercel/Atlas)
mongo_url = os.environ.get('MONGO_URL') or os.environ.get('MONGODB_URI') or "mongodb://localhost:27017"
db_name = os.environ.get('DB_NAME', "autonorth")

# Lazy initialization to prevent module-level crashes
client = None
db = None

def get_db():
    global client, db
    if db is None:
        try:
            logger.info(f"Initializing MongoDB connection to {mongo_url.split('@')[-1] if '@' in mongo_url else 'local'}")
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
            db = client[db_name]
        except Exception as e:
            logger.error(f"MongoDB Initialization Failed: {str(e)}")
            return None
    return db

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_type = type(exc).__name__
    error_msg = str(exc)
    logger.error(f"Global error [{error_type}]: {error_msg}", exc_info=True)
    
    # Check if this is a DB-related crash
    if "NoneType" in error_msg and "vehicles" in error_msg:
        return JSONResponse(status_code=503, content={"error": "Database Unavailable", "message": "The system is currently unable to connect to the inventory database."})
    
    msg = error_msg if isinstance(exc, HTTPException) else f"Platform conflict: {error_type}"
    return JSONResponse(status_code=500, content={"error": "Internal Server Error", "message": msg})

# --- DB Middleware ---
@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    get_db()
    return await call_next(request)

def safe_price(v):
    try:
        p = v.get('price', 0)
        return float(p) if p else 0.0
    except: return 0.0

JWT_ALGORITHM = "HS256"
chat_sessions: dict = {}

# ─── Auth ─────────────────────────────────────────────────────────
def hash_password(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_password(plain, hashed): return bcrypt.checkpw(plain.encode(), hashed.encode())
def jwt_secret(): return os.environ.get("JWT_SECRET", "super-secret-key")

def create_token(user_id, email, kind="access", exp_hours=24):
    exp = timedelta(hours=exp_hours) if kind == "access" else timedelta(days=7)
    return jwt.encode({"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + exp, "type": kind}, jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    # IP Blacklist Check
    ip = request.client.host if request.client else "unknown"
    is_blocked = await db.blacklist.find_one({"ip": ip})
    if is_blocked: raise HTTPException(403, "Access denied from this IP")

    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "): token = auth[7:]
    if not token: raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not user: raise HTTPException(401, "User not found")
        
        # Check if session is still valid
        session = await db.sessions.find_one({"token": token, "is_active": True})
        if not session: raise HTTPException(401, "Session expired or terminated")
        
        user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        logger.error(f"JWT Decryption Error: {e}")
        raise HTTPException(401, "Invalid or expired token")

# ─── Models ───────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str; password: str

class AnalyticsEvent(BaseModel):
    event_type: str # 'view', 'click', 'lead_start', 'search'
    vehicle_id: Optional[str] = None
    metadata: Dict[str, Any] = {}

class IPBlockRequest(BaseModel):
    ip: str; reason: Optional[str] = ""

# ─── Endpoints ───────────────────────────────────────────────────
@api_router.post("/auth/login")
async def login(request: Request, data: LoginRequest, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    
    uid = str(user["_id"])
    token = create_token(uid, email)
    
    # Track login session
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    await db.sessions.insert_one({
        "user_id": uid, "token": token, "ip": ip, "user_agent": ua,
        "is_active": True, "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="lax", max_age=86400, path="/")
    return {"id": uid, "email": email, "role": "admin"}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("access_token")
    if token:
        await db.sessions.update_one({"token": token}, {"$set": {"is_active": False}})
    response.delete_cookie("access_token")
    return {"message": "Logged out"}

@api_router.get("/auth/sessions")
async def list_sessions(cu=Depends(get_current_user)):
    docs = await db.sessions.find({"user_id": cu["_id"], "is_active": True}).sort("created_at", -1).to_list(100)
    for d in docs: d["_id"] = str(d["_id"]); d.pop("token", None)
    return docs

@api_router.post("/auth/sessions/terminate")
async def terminate_session(session_id: str, cu=Depends(get_current_user)):
    await db.sessions.update_one({"_id": ObjectId(session_id), "user_id": cu["_id"]}, {"$set": {"is_active": False}})
    return {"message": "Session terminated"}

@api_router.get("/auth/me")
async def me(cu=Depends(get_current_user)):
    cu["_id"] = str(cu["_id"])
    cu.pop("password_hash", None)
    return cu

@api_router.put("/auth/profile")
async def update_profile(request: Request, cu=Depends(get_current_user)):
    try:
        data = await request.json()
        upd = {}
        if "email" in data: upd["email"] = data["email"].lower().strip()
        if "password" in data and data["password"]:
            upd["password_hash"] = hash_password(data["password"])
        if not upd: return {"message": "No changes"}
        await db.users.update_one({"_id": ObjectId(cu["_id"])}, {"$set": upd})
        return {"message": "Profile updated successfully"}
    except Exception as e:
        logger.error(f"Profile Update Error: {e}")
        raise HTTPException(500, "Failed to update profile")

@api_router.get("/settings")
async def get_settings(cu=Depends(get_current_user)):
    s = await db.settings.find_one({"type": "general"}) or {}
    if s: s.pop("_id", None)
    return s

@api_router.put("/settings")
async def update_settings(request: Request, cu=Depends(get_current_user)):
    data = await request.json()
    await db.settings.update_one({"type": "general"}, {"$set": data}, upsert=True)
    return {"message": "Settings updated"}

@api_router.get("/analytics/summary")
async def get_analytics_summary(cu=Depends(get_current_user)):
    # Aggregation for top vehicles
    top_views = await db.analytics.aggregate([
        {"$match": {"event_type": "view"}},
        {"$group": {"_id": "$vehicle_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    # Lead conversion rate
    total_views = await db.analytics.count_documents({"event_type": "view"})
    total_leads = await db.leads.count_documents({})
    
    return {
        "top_vehicles": top_views,
        "total_views": total_views,
        "conversion_rate": (total_leads / total_views * 100) if total_views > 0 else 0
    }

@api_router.post("/analytics/track")
async def track_event(request: Request, event: AnalyticsEvent):
    doc = {
        **event.model_dump(),
        "ip": request.client.host if request.client else "unknown",
        "created_at": datetime.now(timezone.utc)
    }
    await db.analytics.insert_one(doc)
    return {"status": "ok"}

@api_router.get("/security/blacklist")
async def get_blacklist(cu=Depends(get_current_user)):
    docs = await db.blacklist.find({}).to_list(100)
    for d in docs: d["_id"] = str(d["_id"])
    return docs

@api_router.post("/security/blacklist")
async def block_ip(data: IPBlockRequest, cu=Depends(get_current_user)):
    await db.blacklist.update_one({"ip": data.ip}, {"$set": {"reason": data.reason, "blocked_at": datetime.now(timezone.utc)}}, upsert=True)
    return {"message": f"IP {data.ip} blocked"}

@api_router.get("/stats")
async def get_stats(cu=Depends(get_current_user)):
    total = await db.vehicles.count_documents({})
    avail = await db.vehicles.count_documents({"status": "available"})
    sold = await db.vehicles.count_documents({"status": "sold"})
    featured = await db.vehicles.count_documents({"featured": True})
    t_leads = await db.leads.count_documents({}) if "leads" in (await db.list_collection_names()) else 0
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_leads = await db.leads.count_documents({"created_at": {"$gte": thirty_days_ago}}) if "leads" in (await db.list_collection_names()) else 0
    
    # Analytics
    total_clicks = await db.analytics.count_documents({"event_type": "click"})
    total_views = await db.analytics.count_documents({"event_type": "view"})
    
    return {
        "total_vehicles": total,
        "available": avail,
        "sold": sold,
        "featured": featured,
        "total_leads": t_leads,
        "recent_leads": recent_leads,
        "total_clicks": total_clicks,
        "total_views": total_views
    }

@api_router.get("/vehicles")
async def list_vehicles(
    make: Optional[str] = None, body_type: Optional[str] = None,
    condition: Optional[str] = None, fuel_type: Optional[str] = None,
    min_price: Optional[float] = None, max_price: Optional[float] = None,
    status: Optional[str] = "available", featured: Optional[bool] = None,
    show_on_home: Optional[bool] = None, search: Optional[str] = None, 
    limit: int = 50, skip: int = 0
):
    try:
        q = {}
        if show_on_home is not None: q["show_on_home"] = show_on_home
        if make: q["make"] = {"$regex": make, "$options": "i"}
        if body_type: q["body_type"] = body_type
        if condition: q["condition"] = condition
        if fuel_type: q["fuel_type"] = fuel_type
        if status and status != "all": q["status"] = status
        if featured is not None: q["featured"] = featured
        if min_price is not None or max_price is not None:
            q["price"] = {k: v for k, v in [("$gte", min_price), ("$lte", max_price)] if v is not None}
        if search:
            q["$or"] = [
                {"title": {"$regex": search, "$options": "i"}}, 
                {"make": {"$regex": search, "$options": "i"}},
                {"model": {"$regex": search, "$options": "i"}},
                {"vin": {"$regex": search, "$options": "i"}},
                {"stock_number": {"$regex": search, "$options": "i"}}
            ]
        total = await db.vehicles.count_documents(q)
        docs = await db.vehicles.find(q).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        vehicles = []
        for d in docs:
            d["_id"] = str(d["_id"])
            vehicles.append(d)
        return {"vehicles": vehicles, "total": total}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"vehicles": [], "total": 0}

@api_router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    if not ObjectId.is_valid(vehicle_id): raise HTTPException(400, "Invalid ID")
    doc = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    if not doc: raise HTTPException(404, "Vehicle not found")
    doc["_id"] = str(doc["_id"])
    return doc

@api_router.post("/vehicles")
async def create_vehicle(data: VehicleCreate, cu=Depends(get_current_user)):
    doc = {**data.model_dump(), "created_at": datetime.now(timezone.utc)}
    res = await db.vehicles.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: VehicleUpdate, cu=Depends(get_current_user)):
    if not ObjectId.is_valid(vehicle_id): raise HTTPException(400, "Invalid ID")
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.vehicles.update_one({"_id": ObjectId(vehicle_id)}, {"$set": upd})
    doc = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    doc["_id"] = str(doc["_id"])
    return doc

@api_router.delete("/vehicles/bulk/delete")
async def bulk_delete_vehicles(vehicle_ids: List[str], cu=Depends(get_current_user)):
    oids = [ObjectId(vid) for vid in vehicle_ids if ObjectId.is_valid(vid)]
    if not oids: raise HTTPException(400, "No valid IDs")
    await db.vehicles.delete_many({"_id": {"$in": oids}})
    return {"message": "Deleted"}

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, cu=Depends(get_current_user)):
    if not ObjectId.is_valid(vehicle_id): raise HTTPException(400, "Invalid ID")
    await db.vehicles.delete_one({"_id": ObjectId(vehicle_id)})
    return {"message": "Deleted"}

@api_router.post("/vehicles/import")
async def import_vehicles(file: UploadFile = File(...), cu=Depends(get_current_user)):
    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(decoded), skipinitialspace=True)
    added = 0
    
    # Normalize keys for fuzzy mapping
    def get_val(row, aliases):
        for alias in aliases:
            # Check for exact match, lowercase match, and stripped match
            for key in row.keys():
                k = str(key).lower().strip().replace(" ", "_").replace("#", "")
                if k == alias.lower().replace(" ", "_").replace("#", ""):
                    return str(row[key]).strip()
        return ""

    for row in reader:
        try:
            # Fuzzy Map Fields
            vin = get_val(row, ["vin", "vehicle identification number", "vin#"])
            stock = get_val(row, ["stock_number", "stock", "stk", "stk#", "stock#", "inventory_id"])
            
            # Skip placeholders that cause collisions
            id_blacklist = ["", "n/a", "none", "pending", "unknown", "null"]
            clean_vin = vin.lower().strip() if vin else ""
            clean_stock = stock.lower().strip() if stock else ""
            
            use_vin = vin.strip() if clean_vin not in id_blacklist else ""
            use_stock = stock.strip() if clean_stock not in id_blacklist else ""

            # WE MUST HAVE AT LEAST ONE UNIQUE ID
            if not use_vin and not use_stock:
                continue

            # Map the rest of the data
            title = get_val(row, ["title", "headline", "name"])
            make = get_val(row, ["make", "brand", "manufacturer"])
            model = get_val(row, ["model", "series"])
            year_val = get_val(row, ["year", "model_year"])
            price_val = get_val(row, ["price", "msrp", "retail_price", "sale_price"])
            mileage_val = get_val(row, ["mileage", "miles", "kms", "odometer"])
            images_val = get_val(row, ["images", "photos", "image_urls", "urls"])
            body = get_val(row, ["body_type", "body", "style", "type"])
            cond = get_val(row, ["condition", "status"])
            desc = get_val(row, ["description", "notes", "comments", "details"])
            
            fuel = get_val(row, ["fuel_type", "fuel", "gas_type"])
            trans = get_val(row, ["transmission", "trans", "gearbox"])
            ext_color = get_val(row, ["exterior_color", "color", "ext_color", "exterior"])
            int_color = get_val(row, ["interior_color", "int_color", "interior"])
            eng = get_val(row, ["engine", "motor", "engine_size"])
            drive = get_val(row, ["drivetrain", "drive", "awd_fwd_rwd"])

            imgs = [img.strip() for img in re.split(r'[\s\n]+|,\s*(?=http)', images_val) if img.strip() and img.startswith("http")]
            
            v_data = {
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
                "vin": use_vin,
                "stock_number": use_stock,
                "description": desc,
                "images": imgs,
                "status": "available"
            }

            # SMART UPSERT: Priority 1: VIN, Priority 2: Stock
            query = {}
            if use_vin:
                query = {"vin": use_vin}
            else:
                query = {"stock_number": use_stock}

            # Check if exists to preserve created_at
            existing = await db.vehicles.find_one(query)
            if existing:
                await db.vehicles.update_one({"_id": existing["_id"]}, {"$set": v_data})
            else:
                v_data["created_at"] = datetime.now(timezone.utc)
                v_data["featured"] = False
                v_data["show_on_home"] = False
                await db.vehicles.insert_one(v_data)
            
            added += 1
        except Exception as e:
            logger.error(f"CSV Row error: {e}")
            
    return {"message": f"Inventory sync complete. Processed {added} vehicles."}

@api_router.get("/leads")
async def list_leads(cu=Depends(get_current_user)):
    if "leads" not in (await db.list_collection_names()): return []
    docs = await db.leads.find({}).sort("created_at", -1).to_list(100)
    for d in docs: d["_id"] = str(d["_id"])
    return docs

@api_router.post("/leads")
async def create_lead(data: LeadCreate):
    lead_doc = {**data.model_dump(), "created_at": datetime.now(timezone.utc), "status": "new"}
    res = await db.leads.insert_one(lead_doc)
    lead_doc["_id"] = str(res.inserted_id)
    return lead_doc

@api_router.get("/scraper/settings")
async def get_scraper_settings(cu=Depends(get_current_user)):
    return {"auto_sync": False, "last_sync": None}

@api_router.post("/scraper/import-url")
async def import_vehicle_from_url(data: Dict[str, str], cu=Depends(get_current_user)):
    raw_urls = data.get("url", "")
    urls = [u.strip() for u in raw_urls.split("\n") if u.strip()]
    from scraper import scrape_teamford_listing
    results = []
    for url in urls:
        try:
            v_data = await scrape_teamford_listing(url)
            if not v_data: continue
            vin = v_data.get("vin")
            existing = await db.vehicles.find_one({"vin": vin}) if vin else None
            if existing:
                await db.vehicles.update_one({"_id": existing["_id"]}, {"$set": v_data})
                results.append({"status": "updated", "url": url})
            else:
                await db.vehicles.insert_one(v_data)
                results.append({"status": "imported", "url": url})
        except: pass
    return {"results": results}

@api_router.post("/scraper/sync/teamford")
async def sync_teamford_scraper(cu=Depends(get_current_user)):
    from scraper import sync_teamford_listings
    try:
        sync_result = await sync_teamford_listings()
        return {"message": "Team Ford sync complete", "imported": sync_result.get("imported", 0), "updated": sync_result.get("updated", 0)}
    except Exception as e:
        logger.error(f"Team Ford sync error: {e}")
        raise HTTPException(500, "Failed to sync with Team Ford")

async def get_ai_response(message: str, inventory_docs: list):
    """Indestructible AI Engine with Global Health Monitoring"""
    # ── 1. Secure Settings Loader (Safe from None/Empty) ──
    s = await db.settings.find_one({"type": "general"}) or {}
    provider_raw = s.get("ai_provider") or os.environ.get("AI_PROVIDER") or "local"
    provider = str(provider_raw).lower()
    api_key = s.get("ai_api_key") or os.environ.get("AI_API_KEY")
    custom_model = s.get("ai_model")
    
    def safe_price(v):
        try:
            p = v.get('price', 0)
            if p is None: return 0.0
            return float(str(p).replace('$', '').replace(',', ''))
        except: return 0.0

    # ── 2. The 'Local Brain' (Works Offline / Fallback) ──
    async def local_fallback(msg, docs):
        query = str(msg or "").lower()
        price_match = re.search(r'(?:under|below|less than|max|up to|around|within)\s*\$?(\d+(?:k|000)?)', query)
        max_price = 1000000
        if price_match:
            p_val = price_match.group(1).replace('k', '000')
            try: max_price = float(p_val)
            except: pass

        matches = []
        for v in docs:
            p = safe_price(v)
            if p <= max_price:
                # Fuzzy keyword matching
                keywords = [v.get('make'), v.get('model'), v.get('body_type'), v.get('title')]
                if any(str(k or "").lower() in query for k in keywords):
                    matches.append(f"{v.get('year')} {v.get('make')} {v.get('model')} (${p:,.0f})")
        
        # Log health as 'local'
        await db.settings.update_one({"type": "general"}, {"$set": {"ai_health": "local", "last_active": datetime.now(timezone.utc)}})
        
        if matches:
            return f"Specialist here! I found {len(matches)} matches. Top picks: {', '.join(matches[:3])}. Would you like more details or a test drive?"
        return f"We have {len(docs)} vehicles available! What are you looking for? (e.g. Ford, SUV, under $30k)"

    # Force Local if requested
    if provider == "local" or not api_key:
        return await local_fallback(message, inventory_docs)

    # ── 3. The 'Global Brain' (Cloud Providers) ──
    try:
        inventory_summary = "\n".join([f"• {v.get('year')} {v.get('make')} {v.get('model')} (ID: {str(v.get('_id', ''))}) - ${safe_price(v):,.0f}" for v in inventory_docs[:12]])
        system_prompt = (
            "You are the AutoNorth AI Specialist. Professional and sales-oriented. "
            "When mentioning a specific vehicle, ALWAYS link it like this: [Year Make Model](/vehicle/ID). "
            "Use markdown tables for specs. Always end with a call to action like booking a test drive. "
            f"Context:\n{inventory_summary}\nTotal available: {len(inventory_docs)}."
        )
        
        # ── Gemini ──
        if provider == "gemini":
            ai_client = genai.Client(api_key=api_key)
            resp = ai_client.models.generate_content(model=custom_model or 'gemini-1.5-flash', config=genai.types.GenerateContentConfig(system_instruction=system_prompt), contents=message)
            await db.settings.update_one({"type": "general"}, {"$set": {"ai_health": "online", "last_active": datetime.now(timezone.utc)}})
            return resp.text

        # ── Claude ──
        elif provider == "claude":
            async with httpx.AsyncClient() as client:
                resp = await client.post("https://api.anthropic.com/v1/messages", 
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                    json={"model": custom_model or 'claude-3-haiku-20240307', "max_tokens": 512, "system": system_prompt, "messages": [{"role": "user", "content": message}]}, timeout=15.0)
                await db.settings.update_one({"type": "general"}, {"$set": {"ai_health": "online", "last_active": datetime.now(timezone.utc)}})
                return resp.json()["content"][0]["text"]

        # ── OpenRouter ──
        elif provider == "openrouter":
            async with httpx.AsyncClient() as client:
                resp = await client.post("https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "HTTP-Referer": "https://autonorth.ca", "X-Title": "AutoNorth"},
                    json={"model": custom_model or 'openrouter/auto', "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": message}]}, timeout=15.0)
                r_json = resp.json()
                if "choices" in r_json:
                    await db.settings.update_one({"type": "general"}, {"$set": {"ai_health": "online", "last_active": datetime.now(timezone.utc)}})
                    return r_json["choices"][0]["message"]["content"]
                raise Exception(r_json.get("error", {}).get("message", "API Error"))

    except Exception as e:
        logger.error(f"Global AI Fail ({provider}): {e}")
        await db.settings.update_one({"type": "general"}, {"$set": {"ai_health": "error", "ai_error": str(e), "last_active": datetime.now(timezone.utc)}})
        return await local_fallback(message, inventory_docs)

@api_router.post("/chat")
async def ai_chat(data: ChatRequest):
    try:
        docs = await db.vehicles.find({"status": "available"}).sort("created_at", -1).to_list(100)
        response_text = await get_ai_response(data.message, docs)
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Chat Endpoint Error: {e}")
        return {"response": "Specialist connection issue—call 825-605-5050."}

@app.on_event("startup")
async def startup():
    # Ensure DB is ready (redundant but safe)
    global client, db
    if client is None:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]

app.include_router(api_router)
