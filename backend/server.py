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

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {str(exc)}", exc_info=True)
    msg = str(exc) if not isinstance(exc, HTTPException) else exc.detail
    return JSONResponse(status_code=500, content={"error": "Internal Server Error", "message": msg})

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
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "): token = auth[7:]
    if not token: raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not user: raise HTTPException(401, "User not found")
        user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        logger.error(f"JWT Decryption Error: {e}")
        raise HTTPException(401, "Invalid or expired token")

# ─── Models ───────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str; password: str

class VehicleCreate(BaseModel):
    title: str; make: Optional[str] = ""; model: Optional[str] = ""; year: Optional[int] = 2024; price: Optional[float] = 0
    mileage: Optional[int] = 0; condition: Optional[str] = "used"; body_type: Optional[str] = "Sedan"
    fuel_type: Optional[str] = "Gas"; transmission: Optional[str] = "Automatic"
    exterior_color: Optional[str] = ""; interior_color: Optional[str] = ""; engine: Optional[str] = ""
    drivetrain: Optional[str] = ""; doors: Optional[int] = 4; seats: Optional[int] = 5
    vin: Optional[str] = ""; stock_number: Optional[str] = ""; description: Optional[str] = ""
    features: List[str] = []; images: List[str] = []
    status: str = "available"; featured: bool = False; show_on_home: bool = False

class VehicleUpdate(BaseModel):
    title: Optional[str] = None; make: Optional[str] = None; model: Optional[str] = None
    year: Optional[int] = None; price: Optional[float] = None; mileage: Optional[int] = None
    condition: Optional[str] = None; body_type: Optional[str] = None
    fuel_type: Optional[str] = None; transmission: Optional[str] = None
    exterior_color: Optional[str] = None; interior_color: Optional[str] = None
    engine: Optional[str] = None; drivetrain: Optional[str] = None
    vin: Optional[str] = None; stock_number: Optional[str] = None
    description: Optional[str] = None; features: Optional[List[str]] = None
    images: Optional[List[str]] = None; status: Optional[str] = None
    featured: Optional[bool] = None; show_on_home: Optional[bool] = None

class ChatRequest(BaseModel):
    session_id: str; message: str

class LeadStatusUpdate(BaseModel):
    status: str

class LeadCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: Optional[str] = None
    vehicle_id: Optional[str] = None

# ─── Endpoints ───────────────────────────────────────────────────
@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    uid = str(user["_id"])
    response.set_cookie("access_token", create_token(uid, email), httponly=True, secure=True, samesite="lax", max_age=86400, path="/")
    return {"id": uid, "email": email, "role": "admin"}

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

@api_router.get("/stats")
async def get_stats(cu=Depends(get_current_user)):
    total = await db.vehicles.count_documents({})
    avail = await db.vehicles.count_documents({"status": "available"})
    sold = await db.vehicles.count_documents({"status": "sold"})
    featured = await db.vehicles.count_documents({"featured": True})
    t_leads = await db.leads.count_documents({}) if "leads" in (await db.list_collection_names()) else 0
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_leads = await db.leads.count_documents({"created_at": {"$gte": thirty_days_ago}}) if "leads" in (await db.list_collection_names()) else 0
    return {
        "total_vehicles": total,
        "available": avail,
        "sold": sold,
        "featured": featured,
        "total_leads": t_leads,
        "recent_leads": recent_leads
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
            clean_vin = vin.lower() if vin else ""
            clean_stock = stock.lower() if stock else ""
            
            use_vin = vin if clean_vin not in id_blacklist else ""
            use_stock = stock if clean_stock not in id_blacklist else ""

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
            
            # New fields from screenshot
            fuel = get_val(row, ["fuel_type", "fuel", "gas_type"])
            trans = get_val(row, ["transmission", "trans", "gearbox"])
            ext_color = get_val(row, ["exterior_color", "color", "ext_color", "exterior"])
            int_color = get_val(row, ["interior_color", "int_color", "interior"])
            eng = get_val(row, ["engine", "motor", "engine_size"])
            drive = get_val(row, ["drivetrain", "drive", "awd_fwd_rwd"])

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
                "vin": use_vin,
                "stock_number": use_stock,
                "description": desc,
                "images": imgs,
                "status": "available",
                "created_at": datetime.now(timezone.utc)
            }

            # SMART UPSERT
            query = {}
            if use_vin and use_stock:
                query = {"$or": [{"vin": use_vin}, {"stock_number": use_stock}]}
            elif use_vin:
                query = {"vin": use_vin}
            else:
                query = {"stock_number": use_stock}

            await db.vehicles.update_one(query, {"$set": v}, upsert=True)
            added += 1
        except Exception as e:
            logger.error(f"CSV Row error: {e}")
            
    return {"message": f"Successfully imported {added} vehicles"}

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
    """Universal AI Connector with Local Intelligence Fallback"""
    # Fetch settings from DB
    s = await db.settings.find_one({"type": "general"}) or {}
    provider = s.get("ai_provider", os.environ.get("AI_PROVIDER", "local")).lower()
    api_key = s.get("ai_api_key", os.environ.get("AI_API_KEY"))
    
    # ── Local Intelligence Fallback (Works without API) ──
    inventory_summary = "\n".join([f"• {v.get('year')} {v.get('make')} {v.get('model')} - ${v.get('price'):,.0f} ({v.get('mileage'):,.0f}km)" for v in inventory_docs[:15]])
    
    if provider == "local" or not api_key:
        query = message.lower()
        matches = []
        for v in inventory_docs:
            if v.get('make', '').lower() in query or v.get('model', '').lower() in query or v.get('body_type', '').lower() in query:
                matches.append(f"{v.get('year')} {v.get('make')} {v.get('model')} (${v.get('price'):,.0f})")
        
        if matches:
            return f"I found these matches in our inventory: {', '.join(matches[:3])}. Would you like to see more details or book a test drive?"
        return "I can help you find the perfect vehicle from our 500+ car inventory. Are you looking for a truck, SUV, or sedan today?"

    try:
        system_prompt = f"Persona: AutoNorth Specialist. Tone: Professional, direct. Inventory Context: {inventory_summary}. Total Inventory: {len(inventory_docs)} vehicles."
        
        # ── Provider: Gemini ──
        if provider == "gemini":
            client = genai.Client(api_key=api_key)
            resp = client.models.generate_content(model='gemini-1.5-flash', config=genai.types.GenerateContentConfig(system_instruction=system_prompt), contents=message)
            return resp.text

        # ── Provider: Claude (Anthropic) ──
        elif provider == "claude":
            async with httpx.AsyncClient() as client:
                resp = await client.post("https://api.anthropic.com/v1/messages", 
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                    json={"model": "claude-3-haiku-20240307", "max_tokens": 512, "system": system_prompt, "messages": [{"role": "user", "content": message}]})
                return resp.json()["content"][0]["text"]

        # ── Provider: OpenRouter ──
        elif provider == "openrouter":
            async with httpx.AsyncClient() as client:
                resp = await client.post("https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"model": "google/gemini-flash-1.5", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": message}]})
                return resp.json()["choices"][0]["message"]["content"]

    except Exception as e:
        logger.error(f"AI Provider Error ({provider}): {e}")
        return f"I'm scanning our current inventory... we have {len(inventory_docs)} vehicles available. What specific model or price range are you looking for?"

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
    global client, db
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

app.include_router(api_router)
