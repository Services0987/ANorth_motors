from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai

import os
import re
import io
import csv
import jwt
import bcrypt
import logging
import pathlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
# from emergentintegrations.llm.chat import LlmChat, UserMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'AutoNorth')
if not mongo_url:
    logger.error("MONGO_URL not found in environment variables. Connection will fail when routes are hit.")
    mongo_url = "mongodb://localhost:27017"
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
    response.set_cookie("access_token", create_token(uid, email), httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", create_token(uid, email, "refresh", 168), httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": uid, "email": email, "name": user.get("name", "Admin"), "role": "admin"}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def me(cu=Depends(get_current_user)):    
    cu["_id"] = str(cu["_id"])
    cu.pop("password_hash", None)
    return cu


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

# @api_router.get("/vehicles/{vehicle_id}")
# async def get_vehicle(vehicle_id: str):
#     if not ObjectId.is_valid(vehicle_id): raise HTTPException(400, "Invalid ID")
#     doc = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
#     if not doc: raise HTTPException(404, "Vehicle not found")
#     return Vehicle.from_mongo(doc).model_dump(mode='json')


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

# ─── CSV Import ───────────────────────────────────────────────────
@api_router.post("/vehicles/import")
async def import_vehicles(file: UploadFile = File(...), cu=Depends(get_current_user)):
    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(decoded))
    created, errors = 0, []
    now = datetime.now(timezone.utc)
    for i, row in enumerate(reader, 1):
        try:
            v = {
                "title": row.get("title", "").strip(),
                "make": row.get("make", "").strip(),
                "model": row.get("model", "").strip(),
                "year": int(row.get("year", 2024)),
                "price": float(row.get("price", 0)),
                "mileage": int(row.get("mileage", 0)),
                "condition": row.get("condition", "used").strip().lower(),
                "body_type": row.get("body_type", "Sedan").strip(),
                "fuel_type": row.get("fuel_type", "Gas").strip(),
                "transmission": row.get("transmission", "Automatic").strip(),
                "exterior_color": row.get("exterior_color", "").strip(),
                "interior_color": row.get("interior_color", "").strip(),
                "engine": row.get("engine", "").strip(),
                "drivetrain": row.get("drivetrain", "FWD").strip(),
                "vin": row.get("vin", "").strip(),
                "stock_number": row.get("stock_number", "").strip(),
                "description": row.get("description", "").strip(),
                "features": [f.strip() for f in row.get("features", "").split("|") if f.strip()],
                "images": [im.strip() for im in row.get("images", "").split("|") if im.strip()],
                "status": row.get("status", "available").strip().lower(),
                "featured": str(row.get("featured", "false")).lower() in ("true", "1", "yes"),
                "created_at": now, "updated_at": now,
            }
            if not v["title"] or not v["make"]:
                errors.append(f"Row {i}: missing title/make"); continue
            await db.vehicles.insert_one(v)
            created += 1
        except Exception as e:
            errors.append(f"Row {i}: {e}")
    return {"created": created, "errors": errors[:10]}

@api_router.get("/vehicles/template/csv")
async def csv_template(cu=Depends(get_current_user)):
    from fastapi.responses import Response as FR
    headers = "title,make,model,year,price,mileage,condition,body_type,fuel_type,transmission,exterior_color,interior_color,engine,drivetrain,vin,stock_number,description,features,images,status,featured\n"
    sample = '2024 Ford F-150 XLT,Ford,F-150,2024,52900,12000,used,Truck,Gas,Automatic,Oxford White,Black,3.5L EcoBoost V6,4WD,1FTFW1ET4EKF34678,A001,"Excellent condition truck",Apple CarPlay|Heated Seats|Remote Start,https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800,available,false\n'
    return FR(content=headers + sample, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=autonorth_template.csv"})


# ─── Leads ────────────────────────────────────────────────────────
@api_router.post("/leads")
async def create_lead(data: LeadCreate):
    doc = {**data.model_dump(), "status": "new", "created_at": datetime.now(timezone.utc)}
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


# ─── Scraper Engine ────────────────────────────────────────────────
@api_router.post("/scrape")
async def execute_scrape(request: Request):
    try:
        data = await request.json()
        target_url = data.get("targetUrl")
        secret = data.get("secret")
        
        # Security to prevent external abuse
        if secret != os.environ.get("MASTER_SECRET"):
            raise HTTPException(401, "Unauthorized Pipeline Request")
        
        if not target_url or "inventory" not in target_url:
            raise HTTPException(400, "Invalid Target URL")

        import requests
        from bs4 import BeautifulSoup
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
        }
        res = requests.get(target_url, headers=headers)
        res.raise_for_status()
        
        soup = BeautifulSoup(res.text, 'html.parser')
        new_vehicles = []
        inserted = 0
        
        # Simulated parsing. In production, exact CSS selectors must be mapped to teamford.ca
        for card in soup.select('.inventory-item, .v-card, .vehicle-card'):
            try:
                title_elem = card.select_one('.title, h2, h3')
                if not title_elem: continue
                title = title_elem.text.strip()
                
                price_text = card.select_one('.price, .pricing, .value')
                price = int(re.sub(r'[^0-9]', '', price_text.text)) if price_text else 0
                
                img_elem = card.select_one('img')
                img = img_elem.get('data-src') or img_elem.get('src') if img_elem else "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800"
                
                parts = title.split(' ')
                year = int(parts[0]) if parts[0].isdigit() else datetime.now().year
                make = parts[1] if len(parts) > 1 else 'Unknown'
                model = ' '.join(parts[2:]) if len(parts) > 2 else 'Model'
                
                v = {
                    "title": title, "make": make, "model": model, "year": year, 
                    "price": price, "condition": "used" if "used" in title.lower() else "new",
                    "status": "available", "featured": False, "images": [img],
                    "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
                }
                
                if price > 0:
                    existing = await db.vehicles.find_one({"title": title})
                    if not existing:
                        await db.vehicles.insert_one(v)
                        inserted += 1
            except Exception as e:
                logger.error(f"Error parsing card: {e}")
                
        return {"success": True, "message": f"Scrape complete. Ingested {inserted} new vehicles into database."}

    except Exception as e:
        logger.error(f"Scraper Error: {e}")
        raise HTTPException(500, f"Scrape failed: {str(e)}")


# ─── AI Chat ──────────────────────────────────────────────────────
@api_router.post("/chat")
async def ai_chat(data: ChatRequest):
    try:
        docs = await db.vehicles.find({"status": "available"}).sort([("featured", -1), ("created_at", -1)]).limit(20).to_list(20)
        inventory = "\n".join([f"• {v['title']} — ${v['price']:,.0f} | {v['condition'].upper()} | {v['body_type']} | {v.get('fuel_type','')}" for v in docs])

        system_instruction = f"""You are AutoNorth Motors' AI Vehicle Specialist — Edmonton's most prestigious dealership assistant.

DEALERSHIP: AutoNorth Motors | 9104 91 St NW, Edmonton, AB | Phone: 825-605-5050 | Hours: Mon-Fri 9am-8pm, Sat-Sun 10am-6pm

YOUR PERSONA: Warm, professional, knowledgeable — like a trusted friend who knows cars deeply. Concise responses (2-4 sentences max). Ask one question at a time.

CURRENT INVENTORY:
{inventory}

CONVERSATION GOALS:
1. Understand what the visitor needs (type, budget, new/used, lifestyle)
2. Recommend matching vehicles from our inventory
3. Answer pricing/feature/financing questions
4. Book test drives — collect: name, email, phone, preferred vehicle, preferred date

WHEN YOU HAVE name + email + vehicle of interest (phone optional):
Write your confirmation message naturally, then on a NEW LINE output:
[[LEAD::{{"name":"NAME","email":"EMAIL","phone":"PHONE","vehicle_title":"VEHICLE","preferred_date":"DATE","message":"AI chat booking"}}]]

Be genuine, helpful, never pushy. If asked about financing say we offer rates from 3.99% APR with quick approvals."""

        msg = data.message.lower().strip()
        response_text = ""

        # 1. Intent: Specific Vehicle Matches (Dynamic) - PRIORITY
        vehicle_keywords = ["f-150", "f150", "ram", "dodge", "truck", "suv", "ford", "chevy", "bronco", "explorer", "st", "raptor", "tremor"]
        if any(x in msg for x in vehicle_keywords):
            # Specific trim detection
            kw = next((w for w in ["explorer", "mustang", "f-150", "f150", "ram", "bronco", "escape", "ranger", "expedition"] if w in msg), "vehicle")
            if "st" in msg and "explorer" in msg: kw = "Explorer ST"
            
            matches = [v for v in docs if kw.lower() in v['title'].lower() or kw.lower() in v['model'].lower()]
            if matches:
                titles = ", ".join([f"{v['year']} {v['title']} (${v['price']:,.0f})" for v in matches[:2]])
                response_text = f"We have some stunning {kw}s in stock! {titles}. These are certified and ready for a test drive in Edmonton. Interested in one?"
            else:
                response_text = f"We are Edmonton's high-performance {kw} specialists. While that specific model is in high demand, we can source it for you through our network. What features are you looking for?"

        # 2. Intent: Location & Showroom (Strict Boundaries)
        elif re.search(r'\b(9104 91 st nw|showroom address|directions to showroom|where is the showroom)\b', msg, re.IGNORECASE) or any(x in msg for x in ["9104 91 st", "91 st nw"]):
            response_text = "AutoNorth Motors is located at 9104 91 St NW, Edmonton, AB T6C 3P6. Our showroom is open Mon-Fri 9am-8pm and Sat-Sun 10am-6pm. Would you like me to send directions to your phone?"

        # 3. Intent: Financing & Rates
        elif re.search(r'\b(finance|loan|rate|credit|approve|payment|apr)\b', msg, re.IGNORECASE):
            response_text = "We offer premium financing from 3.99% APR. Our specialists work with all credit backgrounds in Alberta. You can start your approval on our Financing page. Shall I guide you?"

        # 4. Intent: Trade-In
        elif re.search(r'\b(trade|sell|value|worth|my car)\b', msg, re.IGNORECASE):
            response_text = "We offer top-market value for trades in Edmonton. Can you tell me the year, make, and model of your vehicle for a quick estimate?"

        # 5. Intent: General Inventory
        elif any(x in msg for x in ["inventory", "cars", "stock", "have", "buy", "looking for"]):
            top_3 = ", ".join([v['title'] for v in docs[:2]])
            response_text = f"Our current showcase includes the {top_3} and more. Each vehicle undergoes a 150-point inspection. Are you looking for something specific?"

        # 6. Fallback
        else:
            response_text = "Welcome to AutoNorth Motors. I'm your virtual specialist. I can help you browse our live inventory, discuss financing, or value your trade. How can I assist you today?"

        return {"response": response_text, "lead_captured": False}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "I'm having a brief connection issue. Please call us at 825-605-5050 or use the pointer form below — we're here to help!", "lead_captured": False}

# ─── Startup ──────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.vehicles.create_index([("status", 1), ("featured", -1)])
    await db.leads.create_index([("created_at", -1)])

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@autonorth.ca")
    admin_password = os.environ.get("ADMIN_PASSWORD", "AdminPass2024")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password), "name": "AutoNorth Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    if await db.vehicles.count_documents({}) == 0:
        await seed_vehicles()

    # Local memory logging removed for Vercel compatibility


async def seed_vehicles():
    now = datetime.now(timezone.utc)
    vehicles = [
        {"title": "2024 Ford F-150 XLT SuperCrew 4x4", "make": "Ford", "model": "F-150", "year": 2024, "price": 52900, "mileage": 12000, "condition": "used", "body_type": "Truck", "fuel_type": "Gas", "transmission": "Automatic", "exterior_color": "Oxford White", "interior_color": "Black", "engine": "3.5L EcoBoost V6", "drivetrain": "4WD", "doors": 4, "seats": 5, "vin": "1FTFW1ET4EKF34678", "stock_number": "A001", "description": "Powerful and versatile, this 2024 F-150 XLT is ready for any challenge. Features the mighty 3.5L EcoBoost V6 with 4WD, heated front seats, and SYNC 4 infotainment.", "features": ["Adaptive Cruise Control", "Lane Keeping Assist", "Backup Camera", "Apple CarPlay", "Android Auto", "Heated Front Seats", "Remote Start", "Trailer Tow Package", "Pro Power Onboard"], "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80"], "status": "available", "featured": True, "created_at": now, "updated_at": now},
        {"title": "2023 Ford Explorer ST Performance AWD", "make": "Ford", "model": "Explorer", "year": 2023, "price": 62500, "mileage": 18500, "condition": "used", "body_type": "SUV", "fuel_type": "Gas", "transmission": "Automatic", "exterior_color": "Carbonized Gray", "interior_color": "Ebony", "engine": "3.0L EcoBoost V6 400hp", "drivetrain": "AWD", "doors": 4, "seats": 7, "vin": "1FM5K8GCXPGA12345", "stock_number": "A002", "description": "400 horsepower of sport-tuned performance with 7-seat luxury. The Explorer ST is the pinnacle of family performance SUVs — fast, composed, and supremely comfortable.", "features": ["360-Degree Camera", "Panoramic Sunroof", "Wireless Charging", "SYNC 4", "20-inch Sport Wheels", "Sport-Tuned Suspension", "Heated/Cooled Seats", "Third Row Seating", "B&O Sound"], "images": ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80", "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80"], "status": "available", "featured": True, "created_at": now, "updated_at": now},
        {"title": "2024 Ford Mustang GT Fastback 480hp", "make": "Ford", "model": "Mustang", "year": 2024, "price": 45900, "mileage": 5200, "condition": "used", "body_type": "Coupe", "fuel_type": "Gas", "transmission": "Manual", "exterior_color": "Race Red", "interior_color": "Ebony", "engine": "5.0L Coyote V8 480hp", "drivetrain": "RWD", "doors": 2, "seats": 4, "vin": "1FA6P8CF4L5150023", "stock_number": "A003", "description": "Pure American muscle. The 5.0L Coyote V8 delivers 480hp with an exhaust note that stops traffic. Brembo brakes, MagneRide suspension, and Launch Control make this a true performance legend.", "features": ["5.0L V8 480hp", "SYNC 4 12in Display", "Active Valve Exhaust", "Brembo Brakes", "MagneRide Suspension", "Launch Control", "Line Lock", "Track Apps", "Recaro Seats"], "images": ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80", "https://images.unsplash.com/photo-1611651338412-8403fa6e3599?w=800&q=80"], "status": "available", "featured": True, "created_at": now, "updated_at": now},
        {"title": "2025 Ford Escape Plug-In Hybrid", "make": "Ford", "model": "Escape", "year": 2025, "price": 41200, "mileage": 0, "condition": "new", "body_type": "SUV", "fuel_type": "Hybrid", "transmission": "Automatic", "exterior_color": "Agate Black", "interior_color": "Sandstone", "engine": "2.5L PHEV 61km EV Range", "drivetrain": "FWD", "doors": 4, "seats": 5, "vin": "", "stock_number": "N001", "description": "61km of pure electric range in a sleek, intelligent SUV. The 2025 Escape PHEV redefines urban efficiency — charge at home, go electric daily, switch to hybrid for longer trips.", "features": ["61km Electric Range", "Wireless Charging Pad", "SYNC 4 OTA Updates", "Co-Pilot360", "B&O Audio", "Panoramic Roof", "Hands-Free Tailgate"], "images": ["https://images.unsplash.com/photo-1567843-afedf47a4f3e?w=800&q=80"], "status": "available", "featured": False, "created_at": now, "updated_at": now},
        {"title": "2023 Ford Maverick XLT Hybrid Truck", "make": "Ford", "model": "Maverick", "year": 2023, "price": 34500, "mileage": 24000, "condition": "used", "body_type": "Truck", "fuel_type": "Hybrid", "transmission": "Automatic", "exterior_color": "Velocity Blue", "interior_color": "Ebony", "engine": "2.5L i-VCT Hybrid", "drivetrain": "FWD", "doors": 4, "seats": 5, "vin": "3FTTW8E9XPD01234", "stock_number": "A004", "description": "42 MPG city. FlexBed utility. City-friendly dimensions. The Maverick Hybrid proved that you don't have to choose between economy and capability — you can have both.", "features": ["42MPG City Hybrid", "8-inch SYNC 4", "FlexBed System", "USB-C Ports", "Zone Lighting", "FordPass", "Co-Pilot360 Basics"], "images": ["https://images.unsplash.com/photo-1501066927591-314112b5888e?w=800&q=80"], "status": "available", "featured": False, "created_at": now, "updated_at": now},
        {"title": "2024 Ford Bronco Sport Badlands 4WD", "make": "Ford", "model": "Bronco Sport", "year": 2024, "price": 47800, "mileage": 8900, "condition": "used", "body_type": "SUV", "fuel_type": "Gas", "transmission": "Automatic", "exterior_color": "Eruption Green", "interior_color": "Roast", "engine": "2.0L EcoBoost 250hp", "drivetrain": "4WD", "doors": 4, "seats": 5, "vin": "3FMCR9D98PRD12345", "stock_number": "A005", "description": "Born Wild. The Badlands conquers every terrain with HOSS 3.0 suspension, 7 G.O.A.T. driving modes, locking rear differential, and waterproof interior zones. True adventure awaits.", "features": ["HOSS 3.0 Suspension", "7 GOAT Modes", "Trail Turn Assist", "Locking Rear Diff", "Bash Plates", "Mud-Terrain Tires", "Waterproof Interior"], "images": ["https://images.unsplash.com/photo-1528824788011-fbb82c9abad3?w=800&q=80", "https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=800&q=80"], "status": "available", "featured": True, "created_at": now, "updated_at": now},
        {"title": "2022 Ford Ranger Lariat 4WD FX4", "make": "Ford", "model": "Ranger", "year": 2022, "price": 38900, "mileage": 32000, "condition": "used", "body_type": "Truck", "fuel_type": "Gas", "transmission": "Automatic", "exterior_color": "Antimatter Blue", "interior_color": "Black", "engine": "2.3L EcoBoost", "drivetrain": "4WD", "doors": 4, "seats": 5, "vin": "1FTER4FH5NLD34567", "stock_number": "A006", "description": "Mid-size perfection. The Ranger Lariat FX4 brings together genuine off-road capability, premium interior comfort, and impressive towing in an urban-friendly package.", "features": ["FX4 Off-Road Package", "SYNC 4 8in", "Lariat Leather", "Heated Front Seats", "Wireless Charging", "B&O Sound", "Trail Control"], "images": ["https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80"], "status": "available", "featured": False, "created_at": now, "updated_at": now},
        {"title": "2023 Ford Expedition MAX Limited 8-Pass", "make": "Ford", "model": "Expedition", "year": 2023, "price": 89500, "mileage": 15000, "condition": "used", "body_type": "SUV", "fuel_type": "Gas", "transmission": "Automatic", "exterior_color": "Star White Metallic", "interior_color": "Sandstone", "engine": "3.5L EcoBoost V6", "drivetrain": "4WD", "doors": 4, "seats": 8, "vin": "1FMJU2AT4PEA12345", "stock_number": "A007", "description": "The ultimate expression of Ford luxury and capability. 8-passenger seating, massaging front seats, 15.5-inch SYNC 4A display, and class-leading towing make every journey extraordinary.", "features": ["8-Passenger Seating", "Massaging Front Seats", "15.5in SYNC 4A", "B&O Sound", "Panoramic Vista Roof", "Pro Trailer Backup", "Power Running Boards", "Max Recline Seats"], "images": ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80"], "status": "available", "featured": False, "created_at": now, "updated_at": now}
    ]
    await db.vehicles.insert_many(vehicles)
    logger.info(f"Seeded {len(vehicles)} vehicles")


app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db(): client.close()
