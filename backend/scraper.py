import httpx
import json
import logging
import asyncio
import re
import math
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# DEFINITIVE ALGOLIA CREDENTIALS
ALGOLIA_APP_ID = "VBAFQME90B"
ALGOLIA_API_KEY = "650a66d4bf074b5de276a2ecb945bf80"
ALGOLIA_URL = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries"

class NeuralKnowledge:
    \"\"\"
    NEURAL KNOWLEDGE ENGINE:
    Acts as a high-intelligence 'Local Brain' that mimics advanced LLMs using 
    semantic pattern matching and inventory-aware synthesis.
    \"\"\"
    @staticmethod
    def extract_intent(msg: str):
        msg = msg.lower()
        patterns = {
            "GREETING": r"\b(hi|hello|hey|morning|good afternoon|howdy|greetings)\b",
            "INVENTORY_SEARCH": r"\b(looking for|have|stock|inventory|cars|trucks|suvs|autos|vehicles)\b",
            "FINANCE": r"\b(finance|credit|loan|approve|monthly|payments|rate|interest|down payment)\b",
            "CONTACT": r"\b(location|where|address|phone|number|contact|call|email)\b",
            "BOOKING": r"\b(book|schedule|test drive|view|visit|appointment)\b",
            "DEAL": r"\b(deal|best price|special|discount|offer|cheapest|lowest)\b"
        }
        for intent, pattern in patterns.items():
            if re.search(pattern, msg):
                return intent
        return "GENERAL"

    @staticmethod
    def analyze_inventory(msg: str, inventory: List[Dict]):
        msg = msg.lower()
        makes = ["ford", "ram", "chevrolet", "toyota", "honda", "jeep", "dodge", "nissan", "hyundai", "kia", "bmw", "mercedes"]
        found_make = next((m for m in makes if m in msg), None)
        types = ["truck", "suv", "sedan", "van", "coupe", "convertible"]
        found_type = next((t for t in types if t in msg), None)
        
        results = []
        if found_make:
            results = [v for v in inventory if found_make in v.get('make', '').lower()]
        elif found_type:
            results = [v for v in inventory if found_type in v.get('body_type', '').lower() or found_type in v.get('title', '').lower()]
        
        if not results:
            results = sorted(inventory, key=lambda x: x.get('price', 999999))[:3]
        return results, found_make or found_type

    @staticmethod
    def generate_response(msg: str, inventory: List[Dict]):
        intent = NeuralKnowledge.extract_intent(msg)
        results, entity = NeuralKnowledge.analyze_inventory(msg, inventory)
        if intent == "GREETING":
            return "Welcome to AutoNorth Motors! I'm your AI Automotive Specialist. I'm connected to our live Edmonton inventory—are you searching for a specific make, looking for a deal, or interested in financing?"
        if intent == "CONTACT":
            return "AutoNorth Motors is located at 9104 91 St NW, Edmonton, AB T6C 3N5. You can reach our sales floor directly at 825-605-5050. Would you like me to send these details to your phone?"
        if intent == "FINANCE":
            return "Our 'AutoNorth Credit Brain' analyzes your situation to find the lowest possible rates. We specialize in all credit types—from perfect to rebuilding. Most approvals happen in under 2 hours. Shall I start your application?"
        if intent == "DEAL":
            specials = [v for v in inventory if v.get('is_on_special')]
            if specials:
                s = specials[0]
                return f"I have a high-value deal right now: A {s['title']} originally priced higher, now available for ${s['price']:,.0f}. This is our top-tier special this week. Interest?"
            cheapest = sorted(inventory, key=lambda x: x.get('price', 0))[0]
            return f"The best entry-point in our current inventory is the {cheapest['title']} for only ${cheapest['price']:,.0f}. It's a great balance of value and reliability."
        if intent == "BOOKING":
            return "I can secure a VIP viewing and test drive for you. Which day this week works best? I'll coordinate everything with a product specialist."
        if intent == "INVENTORY_SEARCH" or entity:
            if results:
                top = results[0]
                others = len(results) - 1
                resp = f"I've analyzed our live stock: The {top['title']} (priced at ${top['price']:,.0f}) perfectly matches your request. "
                if others > 0: resp += f"I also have {others} other similar models available. "
                resp += "Would you like to see the full spec sheet or book a viewing?"
                return resp
            return "I'm checking our incoming manifest. We receive new inventory daily. What specifically should I keep an eye out for?"
        return "I'm the AutoNorth Intelligence Engine. I can analyze our 500+ vehicle feed, explain financing options, or book your VIP test drive. How can I best serve you today?"

def _sanitize(text):
    if not text: return ""
    # Remove HTML entities like &nbsp; and multiple spaces
    text = str(text).replace('&nbsp;', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    # Remove Team Ford branding
    return re.sub(r'(?i)team\s*ford', 'AutoNorth', text)

def _clean_numeric(val):
    if not val: return 0
    if isinstance(val, (int, float)): return float(val)
    cleaned = re.sub(r'[^\d.]', '', str(val))
    try: return float(cleaned)
    except: return 0

def _parse_teamford_vehicle(h: Dict) -> Dict[str, Any]:
    \"\"\"Helper to parse a single vehicle from Algolia hit with robust field mapping.\"\"\"
    # Robust Price Extraction
    price = 0
    price_fields = ["sort_price", "special_price", "list_price", "regular_price", "retail_price", "msrp"]
    for field in price_fields:
        val = h.get(field)
        price = _clean_numeric(val)
        if price > 0: break
    
    if not price:
        pricing = h.get("pricing") or {}
        if isinstance(pricing, dict):
            price = _clean_numeric(pricing.get("sell_price") or pricing.get("list_price") or 0)
    
    # Filter out unrealistic placeholder prices (e.g., 9999999)
    if price >= 9000000:
        price = 0 # Mark as "Contact for Price"
    
    # Robust Mileage
    mileage = _clean_numeric(h.get("odometer") or h.get("mileage") or 0)
    if mileage >= 500000: mileage = 0

    # Robust Image Construction (Cloudinary)
    images = []
    photo_ids = h.get("photo_service_ids") or []
    if isinstance(photo_ids, list) and photo_ids:
        base_url = "https://res.cloudinary.com/goauto-images/image/upload/f_auto,c_fill,q_auto,w_1920/v1/"
        images = [f"{base_url}{pid}.jpg" for pid in photo_ids]
    
    if not images:
        images = [img.get("url") for img in h.get("images", []) if isinstance(img, dict) and img.get("url")]
    
    if not images and h.get("thumbnail_url"):
        images = [h.get("thumbnail_url")]
    
    # Robust Identifiers
    vin = h.get("vin")
    stock = h.get("stock_number")
    
    # Mapping
    make = h.get("make_name") or h.get("make") or ""
    model = h.get("model_name") or h.get("model") or ""
    year = int(h.get("year") or 2024)
    trim = h.get("published_trim") or h.get("trim") or ""
    
    # Cleaner Title Generation
    clean_trim = trim
    if len(clean_trim) > 50:
        clean_trim = clean_trim.split(',')[0].split(';')[0].strip()
    
    title = _sanitize(f"{year} {make} {model} {clean_trim}".strip())
    if not title or title == str(year):
        title = _sanitize(h.get("title") or f"{year} {make} {model}")

    # Enhanced Engine Description
    # Combine litres and config (e.g. 2.3L I4)
    litres = h.get("engine_litres")
    config = h.get("engine_config_name") or h.get("engine_description")
    engine = f"{litres}L {config}" if litres and config else (config or str(litres or ""))
    engine = _sanitize(engine)

    # Build description from published_notes if available for better data quality
    description = h.get("published_notes") or h.get("description") or h.get("comments")
    if description:
        # Strip HTML tags and entities
        description = re.sub('<[^<]+?>', '', description)
        description = description.replace('&nbsp;', ' ').replace('&amp;', '&')
        description = _sanitize(description)
    else:
        description = f"Certified premium {year} {make} {model} available at AutoNorth Motors. Schedule your test drive today!"

    return {
        "vin": vin,
        "stock_number": stock,
        "title": title,
        "make": make,
        "model": model,
        "year": year,
        "price": price,
        "mileage": int(mileage),
        "condition": (h.get("stock_type") or "used").lower(),
        "body_type": h.get("body_type_name") or h.get("body_style") or h.get("body_type_category"),
        "fuel_type": h.get("fuel_type_category") or h.get("fuel_type_name") or "Gas",
        "transmission": h.get("transmission_name") or h.get("transmission_desc") or "Automatic",
        "drivetrain": h.get("drive_type_name") or h.get("drive_type_desc") or "",
        "exterior_color": h.get("exterior_colour_name") or h.get("exterior_color"),
        "interior_color": h.get("interior_colour_name") or h.get("interior_color"),
        "engine": engine,
        "description": description[:2000], 
        "features": [_sanitize(f.get("name")) for f in h.get("features", []) if isinstance(f, dict) and f.get("name")],
        "images": images,
        "status": "available",
        "source": "teamford_sync",
        "featured": h.get("is_featured", False),
        "is_on_special": h.get("is_on_special", False),
        "source_url": f"https://www.teamford.ca/vehicles/{h.get('slug')}" if h.get('slug') else ""
    }

async def get_sync_info() -> Dict[str, Any]:
    \"\"\"Retrieves total counts and page info for syncing.\"\"\"
    try:
        headers = {
            "x-algolia-api-key": ALGOLIA_API_KEY,
            "x-algolia-application-id": ALGOLIA_APP_ID,
            "Content-Type": "application/json"
        }
        payload = {"requests": [{"indexName": "inventory", "params": "filters=craft_site_ids%3A34&hitsPerPage=1&page=0"}]}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(ALGOLIA_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            nb_hits = data.get("results", [{}])[0].get("nbHits", 0)
            return {"total_vehicles": nb_hits, "hits_per_page": 100, "total_pages": math.ceil(nb_hits / 100) if nb_hits else 0}
    except Exception as e:
        logger.error(f"Failed to get sync info: {e}")
        return {"total_vehicles": 0, "hits_per_page": 100, "total_pages": 0}

async def sync_teamford_batch(page: int) -> Dict[str, int]:
    \"\"\"Syncs a single page (batch) of vehicles from Team Ford.\"\"\"
    logger.info(f"Processing batch page {page}...")
    try:
        headers = {
            "x-algolia-api-key": ALGOLIA_API_KEY,
            "x-algolia-application-id": ALGOLIA_APP_ID,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.teamford.ca/"
        }
        payload = {"requests": [{"indexName": "inventory", "params": f"filters=craft_site_ids%3A34&hitsPerPage=100&page={page}"}]}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(ALGOLIA_URL, json=payload, headers=headers)
            resp.raise_for_status()
            hits = resp.json().get("results", [{}])[0].get("hits", [])
            
            if not hits: return {"imported": 0, "updated": 0, "count": 0}
            
            imported, updated = 0, 0
            from server import db
            
            for h in hits:
                v = _parse_teamford_vehicle(h)
                vin, stock = v.get("vin"), v.get("stock_number")
                if not vin and not stock: continue
                
                existing = None
                if vin: existing = await db.vehicles.find_one({"vin": vin})
                if not existing and stock: existing = await db.vehicles.find_one({"stock_number": stock})
                
                if existing:
                    await db.vehicles.update_one({"_id": existing["_id"]}, {"$set": {**v, "updated_at": datetime.now(timezone.utc)}})
                    updated += 1
                else:
                    v["created_at"] = datetime.now(timezone.utc)
                    v["updated_at"] = v["created_at"]
                    await db.vehicles.insert_one(v)
                    imported += 1
            
            return {"imported": imported, "updated": updated, "count": len(hits)}
    except Exception as e:
        logger.error(f"Batch sync page {page} failed: {e}")
        return {"imported": 0, "updated": 0, "count": 0, "error": str(e)}

async def scrape_teamford_inventory(limit: int = 2000) -> List[Dict[str, Any]]:
    \"\"\"Legacy helper to scrape all inventory at once. Uses batches to avoid timeouts.\"\"\"
    info = await get_sync_info()
    total_pages = info.get("total_pages", 0)
    all_vehicles = []
    
    headers = {
        "x-algolia-api-key": ALGOLIA_API_KEY,
        "x-algolia-application-id": ALGOLIA_APP_ID,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.teamford.ca/"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        for page in range(total_pages):
            payload = {"requests": [{"indexName": "inventory", "params": f"filters=craft_site_ids%3A34&hitsPerPage=100&page={page}"}]}
            resp = await client.post(ALGOLIA_URL, json=payload, headers=headers)
            if resp.status_code == 200:
                hits = resp.json().get("results", [{}])[0].get("hits", [])
                for h in hits:
                    all_vehicles.append(_parse_teamford_vehicle(h))
                    if len(all_vehicles) >= limit:
                        return all_vehicles
            if len(all_vehicles) >= limit: break
            
    return all_vehicles

async def sync_teamford_listings() -> Dict[str, int]:
    \"\"\"Sync all Team Ford listings to local database.\"\"\"
    logger.info("Initiating database sync...")
    try:
        vehicles = await scrape_teamford_inventory(limit=2000)
        if not vehicles:
            logger.warning("No vehicles scraped. Sync aborted.")
            return {"imported": 0, "updated": 0, "deleted": 0}
            
        imported = 0
        updated = 0
        
        from server import db
        
        for v in vehicles:
            vin = v.get("vin")
            stock = v.get("stock_number")
            if not vin and not stock: continue
            
            existing = None
            if vin: existing = await db.vehicles.find_one({"vin": vin})
            if not existing and stock: existing = await db.vehicles.find_one({"stock_number": stock})
            
            if existing:
                # Update existing
                await db.vehicles.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {**v, "updated_at": datetime.now(timezone.utc)}}
                )
                updated += 1
            else:
                # Insert new
                v["created_at"] = datetime.now(timezone.utc)
                v["updated_at"] = v["created_at"]
                await db.vehicles.insert_one(v)
                imported += 1
        
        logger.info(f"Sync complete: {imported} imported, {updated} updated.")
        return {"success": True, "imported": imported, "updated": updated, "deleted": 0}
    except Exception as e:
        logger.error(f"Sync failed: {str(e)}", exc_info=True)
        return {"success": False, "imported": 0, "updated": 0, "deleted": 0}

async def scrape_teamford_listing(url: str) -> Optional[Dict[str, Any]]:
    \"\"\"Scrapes a single Team Ford vehicle listing page.\"\"\"
    try:
        slug = url.rstrip('/').split('/')[-1]
        algolia_headers = {\"x-algolia-api-key\": ALGOLIA_API_KEY, \"x-algolia-application-id\": ALGOLIA_APP_ID, \"Content-Type\": \"application/json\"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {\"requests\": [{\"indexName\": \"inventory\", \"params\": f\"query={slug}&hitsPerPage=1&filters=craft_site_ids%3A34\"}]}
            resp = await client.post(ALGOLIA_URL, json=payload, headers=algolia_headers)
            if resp.status_code == 200:
                hits = resp.json().get(\"results\", [{}])[0].get(\"hits\", [])
                if hits: return _parse_teamford_vehicle(hits[0])
        return None
    except Exception as e:
        logger.error(f\"Failed to scrape listing {url}: {e}\")
        return None
