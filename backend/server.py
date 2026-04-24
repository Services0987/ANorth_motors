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

@api_router.get("/stats")
async def get_stats(cu=Depends(get_current_user)):
    total = await db.vehicles.count_documents({})
    avail = await db.vehicles.count_documents({"status": "available"})
    featured = await db.vehicles.count_documents({"featured": True})
    t_leads = await db.leads.count_documents({}) if "leads" in (await db.list_collection_names()) else 0
    return {"total_vehicles": total, "available": avail, "featured": featured, "total_leads": t_leads, "new_leads": 0}

@api_router.get("/vehicles")
async def list_vehicles(
    make: Optional[str] = None, body_type: Optional[str] = None,
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
        if status and status != "all": q["status"] = status
        if featured is not None: q["featured"] = featured
        if min_price is not None or max_price is not None:
            q["price"] = {k: v for k, v in [("$gte", min_price), ("$lte", max_price)] if v is not None}
        if search:
            q["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"make": {"$regex": search, "$options": "i"}}]
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

@api_router.post("/vehicles")
async def create_vehicle(data: VehicleCreate, cu=Depends(get_current_user)):
    doc = {**data.model_dump(), "created_at": datetime.now(timezone.utc)}
    res = await db.vehicles.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc

@api_router.post("/vehicles/import")
async def import_vehicles(file: UploadFile = File(...), cu=Depends(get_current_user)):
    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(decoded))
    added = 0
    for row in reader:
        try:
            # FLEXIBLE IMAGE PARSING: Split by multiple spaces, commas, or newlines
            raw_imgs = row.get("images", "")
            # We use a regex that handles sequences of whitespace or newlines as delimiters
            imgs = [img.strip() for img in re.split(r'[,\n\s]+', raw_imgs) if img.strip() and img.startswith("http")]
            
            v = {
                "title": row.get("title", f"{row.get('year')} {row.get('make')} {row.get('model')}").strip(),
                "make": row.get("make", "").strip(),
                "model": row.get("model", "").strip(),
                "year": int(row.get("year", 2024)),
                "price": float(row.get("price", 0)),
                "mileage": int(row.get("mileage", 0)),
                "condition": row.get("condition", "used").lower(),
                "body_type": row.get("body_type", "Sedan"),
                "vin": row.get("vin", "").strip(),
                "stock_number": row.get("stock_number", "").strip(),
                "images": imgs,
                "status": "available",
                "created_at": datetime.now(timezone.utc)
            }
            if not v["vin"] and not v["stock_number"]: continue
            await db.vehicles.update_one(
                {"$or": [{"vin": v["vin"]}, {"stock_number": v["stock_number"]}]},
                {"$set": v},
                upsert=True
            )
            added += 1
        except Exception as e:
            logger.error(f"CSV Row error: {e}")
    return {"message": f"Imported {added} vehicles"}

@api_router.get("/leads")
async def list_leads(cu=Depends(get_current_user)):
    if "leads" not in (await db.list_collection_names()): return []
    docs = await db.leads.find({}).sort("created_at", -1).to_list(100)
    for d in docs: d["_id"] = str(d["_id"])
    return docs

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

@api_router.post("/chat")
async def ai_chat(data: ChatRequest):
    try:
        docs = await db.vehicles.find({"status": "available"}).limit(10).to_list(10)
        inventory = "\n".join([f"• {v.get('title')} - ${v.get('price')}" for v in docs])
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            from scraper import NeuralKnowledge
            return {"response": NeuralKnowledge.generate_response(data.message, docs)}
        client = genai.Client(api_key=gemini_api_key)
        chat = client.chats.create(model='gemini-1.5-flash', config=genai.types.GenerateContentConfig(system_instruction=f"Persona: Alpha Specialist. Inventory: {inventory}"))
        resp = chat.send_message(data.message)
        return {"response": resp.text}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "Specialist connection issue—call 825-605-5050."}

@app.on_event("startup")
async def startup():
    global client, db
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

app.include_router(api_router)
