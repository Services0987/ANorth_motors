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
    """
    NEURAL KNOWLEDGE ENGINE:
    Acts as a high-intelligence 'Local Brain' that mimics advanced LLMs using 
    semantic pattern matching and inventory-aware synthesis.
    """
    @staticmethod
    def extract_intent(msg: str):
        msg = msg.lower()
        patterns = {
            "GREETING": r"\b(hi|hello|hey|morning|good afternoon|howdy|greetings)\b",
            "INVENTORY_SEARCH": r"\b(looking for|have|stock|inventory|cars|trucks|suvs|autos|vehicles)\b",
            "FINANCE": r"\b(finance|credit|loan|approve|monthly|payments|rate|interest|down payment)\b",
            "CONTACT": r"\b(location|where|address|phone|number|contact|call|email)\b",
            "BOOKING": r"\b(book|schedule|test drive|view|visit|appointment)\b",
            "DEAL": r"\b(deal|best price|special|discount|offer|cheapest|lowest)\b",
            "CONFIRMATION": r"\b(yes|yeah|sure|ok|okay|please|book it|do it)\b"
        }
        for intent, pattern in patterns.items():
            if re.search(pattern, msg):
                return intent
        return "GENERAL"

    @staticmethod
    def analyze_inventory(msg: str, inventory: List[Dict]):
        msg = msg.lower()
        
        # Filter out $0 vehicles or placeholders
        clean_inv = [v for v in inventory if v.get('price', 0) > 100]
        if not clean_inv: clean_inv = inventory # Fallback if everything is $0
        
        makes = ["ford", "ram", "chevrolet", "toyota", "honda", "jeep", "dodge", "nissan", "hyundai", "kia", "bmw", "mercedes"]
        found_make = next((m for m in makes if m in msg), None)
        
        # Smart Type Mapping
        types = {
            "truck": ["truck", "pickup", "crew", "ext", "cab"],
            "suv": ["suv", "crossover", "utility", "sport"],
            "sedan": ["sedan", "coupe", "hardtop"],
            "van": ["van", "minivan"],
            "ev": ["electric", "ev", "lightning", "tesla"]
        }
        found_type = None
        type_keywords = []
        for k, aliases in types.items():
            if any(a in msg for a in aliases):
                found_type = k
                type_keywords = aliases
                break
        
        results = []
        if found_make:
            results = [v for v in clean_inv if found_make in v.get('make', '').lower()]
        
        if found_type:
            type_results = [v for v in clean_inv if any(kw in v.get('body_type', '').lower() or kw in v.get('title', '').lower() for kw in type_keywords)]
            if results: # If we have a make, filter those results by type
                results = [v for v in results if v in type_results]
            else:
                results = type_results
        
        if not results:
            # Fallback to cheapest high-quality matches
            results = sorted(clean_inv, key=lambda x: x.get('price', 999999))[:3]
            
        return results, found_make or found_type

    @staticmethod
    async def generate_response(msg: str, inventory: List[Dict], provider: str = "local", api_key: str = "", model: str = ""):
        """
        GENERATE RESPONSE:
        High-performance intelligence engine with multi-provider support 
        and deep Edmonton/Alberta location awareness.
        """
        intent = NeuralKnowledge.extract_intent(msg)
        results, entity = NeuralKnowledge.analyze_inventory(msg, inventory)
        
        # 1. LOCATION CONTEXT LAYER (Edmonton/Alberta specific)
        loc_context = ""
        msg_l = msg.lower()
        if any(w in msg_l for w in ["edmonton", "alberta", "ab", "local", "near me"]):
            loc_context = (
                "AutoNorth Motors is proud to serve Edmonton and the surrounding Alberta region. "
                "We are located right off 91 St NW, making us easily accessible from Sherwood Park, St. Albert, and Leduc. "
                "All our vehicles are 'Alberta Ready'—they undergo a rigorous inspection to ensure they can handle our tough winters. "
            )
        
        # 2. WINTER READINESS ADVICE
        winter_advice = ""
        if any(w in msg_l for w in ["winter", "snow", "cold", "ice", "winter tires"]):
            winter_advice = (
                "For Edmonton winters, we highly recommend AWD or 4WD vehicles. "
                "Many of our units come with block heaters pre-installed, and we can facilitate "
                "winter tire packages for any vehicle you choose. "
            )

        # Local logic for quick replies or fallback
        local_resp = ""
        if intent == "GREETING":
            local_resp = f"Welcome to AutoNorth Motors! {loc_context}I'm your AI Automotive Specialist. I'm connected to our live Edmonton inventory—are you searching for a specific make, looking for a deal, or interested in financing?"
        elif intent == "CONTACT":
            local_resp = "AutoNorth Motors is located at 9104 91 St NW, Edmonton, AB T6C 3N5. You can reach our sales floor directly at 825-605-5050. Would you like me to send these details to your phone?"
        elif intent == "FINANCE":
            local_resp = "Our 'AutoNorth Credit Brain' analyzes your situation to find the lowest possible rates in Alberta. We specialize in all credit types—from perfect to rebuilding. Shall I start your application?"
        
        if local_resp and provider == "local":
            return local_resp

        # Context-aware prompt for AI providers
        v_context = json.dumps([{k: v for k, v in res.items() if k != '_id'} for res in results[:5]])
        system_prompt = f"""You are the AutoNorth Motors AI Specialist, an elite automotive concierge in Edmonton, Alberta.
        
        Current Intent: {intent}
        Location Context: {loc_context} {winter_advice}
        Relevant Inventory: {v_context}
        
        Instructions:
        - Be professional, helpful, and luxury-oriented.
        - Emphasize that we serve Edmonton, Sherwood Park, St. Albert, and the greater Alberta area.
        - Mention specific vehicle highlights (price, mileage, features) if they match the user's query.
        - If the user asks about winter performance, mention 4WD/AWD and block heaters.
        - Always drive the user towards a test drive, showroom visit, or call (825-605-5050).
        - Keep responses concise (max 3-4 sentences) unless listing vehicles.
        - Use markdown for bolding vehicle names and prices.
        - STRICT FORMATTING RULE: When mentioning a vehicle, ALWAYS use this link format: [Year Make Model](/vehicle/STOCK_NUMBER_OR_ID).
        - If no stock number is available, use the VIN or a descriptive name.
        """

        # 3. OPENROUTER PROVIDER
        if provider == "openrouter" and api_key:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://autonorth.ca",
                            "X-Title": "AutoNorth AI"
                        },
                        json={
                            "model": model or "google/gemini-flash-1.5-free",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": msg}
                            ]
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data['choices'][0]['message']['content']
                    else:
                        logger.error(f"OpenRouter returned {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"OpenRouter exception: {str(e)}")

        # 4. GEMINI PROVIDER
        if provider == "gemini" and api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model_instance = genai.GenerativeModel(model or 'gemini-1.5-flash')
                response = model_instance.generate_content(f"{system_prompt}\n\nUser Message: {msg}")
                return response.text
            except Exception as e:
                logger.error(f"Gemini exception: {str(e)}")

        
        # 5. LOCAL SYNTHESIS FALLBACK
        if intent == "CONFIRMATION":
            return "That's great! I'll get that set up for you. Please leave your name and phone number, or call us directly at 825-605-5050 to finalize the details. Is there anything else I can help you with?"

        if results and (intent == "INVENTORY_SEARCH" or entity or intent == "DEAL"):
            top = results[0]
            others = len(results) - 1
            
            v_info = f"{top.get('year')} {top.get('make')} {top.get('model')}"
            price = top.get('price', 0)
            price_info = f"${price:,.0f}" if price > 0 else "Contact for Price"
            mileage_info = f"{top.get('mileage', 0):,} km"
            
            if price == 0 and others > 0:
                top = next((v for v in results if v.get('price', 0) > 0), top)
                v_info = f"{top.get('year')} {top.get('make')} {top.get('model')}"
                price_info = f"${top.get('price', 0):,.0f}"
                mileage_info = f"{top.get('mileage', 0):,} km"

            resp = f"I've found a great match in our live Edmonton inventory: A **{v_info}** with {mileage_info}, priced at **{price_info}**. "
            if top.get('features'):
                f_str = ", ".join(top['features'][:3])
                resp += f"Key features include: {f_str}. "
            
            if others > 0:
                resp += f"I also have {others} other {entity or 'vehicles'} available in Alberta that might interest you. "
            
            resp += f"\n\n{winter_advice}Would you like to see more details, or shall I book a VIP test drive at our showroom?"
            return resp

        if intent == "DEAL":
            specials = [v for v in inventory if v.get('is_on_special')]
            if specials:
                s = specials[0]
                return f"I have an exclusive AutoNorth special: A **{s['title']}** for only **${s['price']:,.0f}**. This unit is moving fast in the Edmonton market. Would you like to reserve it?"
            cheapest = sorted(inventory, key=lambda x: x.get('price', 0))[0]
            return f"The best value entry in our current inventory is the {cheapest['title']} for only ${cheapest['price']:,.0f}. It's passed our full 150-point Alberta safety inspection. Interest?"

        if intent == "BOOKING":
            return "I can secure a priority test drive for you at our Edmonton location. Which day this week works best? I'll coordinate everything with our concierge team."

        return (
            f"I'm the AutoNorth Intelligence Engine, specialized in the Edmonton and Alberta automotive market. "
            f"While I process your request, I can tell you that we have {len(inventory)} premium vehicles available today. "
            f"I can help you browse specific makes, calculate financing, or even book a VIP test drive at our showroom off 91 St NW. "
            f"What specific vehicle information can I provide to help you find your next car today?"
        )


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
    """Helper to parse a single vehicle from Algolia hit with robust field mapping."""
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
        "show_on_home": True, # Ensure vehicles appear on the home page by default
        "is_on_special": h.get("is_on_special", False),
        "source_url": f"https://www.teamford.ca/vehicles/{h.get('slug')}" if h.get('slug') else "",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

async def get_sync_info() -> Dict[str, Any]:
    """Retrieves total counts and page info for syncing."""
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
    """Syncs a single page (batch) of vehicles from Team Ford."""
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
                    # Ensure existing vehicles also get timestamps and home visibility if missing
                    update_fields = {**v, "updated_at": datetime.now(timezone.utc)}
                    if "created_at" not in existing:
                        update_fields["created_at"] = existing.get("created_at", datetime.now(timezone.utc))
                    if "show_on_home" not in existing:
                        update_fields["show_on_home"] = True
                    
                    await db.vehicles.update_one({"_id": existing["_id"]}, {"$set": update_fields})
                    updated += 1
                else:
                    v["created_at"] = datetime.now(timezone.utc)
                    v["updated_at"] = v["created_at"]
                    v["show_on_home"] = True # Default for new synced items
                    await db.vehicles.insert_one(v)
                    imported += 1
            
            return {"imported": imported, "updated": updated, "count": len(hits)}
    except Exception as e:
        logger.error(f"Batch sync page {page} failed: {e}")
        return {"imported": 0, "updated": 0, "count": 0, "error": str(e)}

async def scrape_teamford_inventory(limit: int = 2000) -> List[Dict[str, Any]]:
    """Legacy helper to scrape all inventory at once. Uses batches to avoid timeouts."""
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
    """Sync all Team Ford listings to local database."""
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
                v["views"] = 0
                await db.vehicles.insert_one(v)
                imported += 1
        
        logger.info(f"Sync complete: {imported} imported, {updated} updated.")
        return {"success": True, "imported": imported, "updated": updated, "deleted": 0}
    except Exception as e:
        logger.error(f"Sync failed: {str(e)}", exc_info=True)
        return {"success": False, "imported": 0, "updated": 0, "deleted": 0}

async def scrape_teamford_listing(url: str) -> Optional[Dict[str, Any]]:
    """Scrapes a single Team Ford vehicle listing page."""
    try:
        slug = url.rstrip('/').split('/')[-1]
        algolia_headers = {"x-algolia-api-key": ALGOLIA_API_KEY, "x-algolia-application-id": ALGOLIA_APP_ID, "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {"requests": [{"indexName": "inventory", "params": f"query={slug}&hitsPerPage=1&filters=craft_site_ids%3A34"}]}
            resp = await client.post(ALGOLIA_URL, json=payload, headers=algolia_headers)
            if resp.status_code == 200:
                hits = resp.json().get("results", [{}])[0].get("hits", [])
                if hits: return _parse_teamford_vehicle(hits[0])
        return None
    except Exception as e:
        logger.error(f"Failed to scrape listing {url}: {e}")
        return None
