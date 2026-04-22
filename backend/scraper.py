import httpx
import json
import logging
import asyncio
import re
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Algolia Credentials verified for TeamFord.ca
ALGOLIA_APP_ID = "VBAFQME90B"
ALGOLIA_API_KEY = "650a66d4bf074b5de276a2ecb945bf80"
ALGOLIA_URL = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/inventory/queries"

async def scrape_teamford_inventory(limit: int = 2000) -> List[Dict[str, Any]]:
    """
    ULTIMATE SYNC ENGINE: 
    - Scrapes NEW, USED, FEATURED, and ON SPECIAL vehicles.
    - Captures the full 500+ vehicle feed by iterating through all site IDs.
    - Mimics extension-style 'Wait-and-Extract' methodology.
    """
    try:
        headers = {
            "x-algolia-api-key": ALGOLIA_API_KEY,
            "x-algolia-application-id": ALGOLIA_APP_ID,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Referer": "https://www.teamford.ca/"
        }

        all_vehicles = []
        page = 0
        hits_per_page = 100 # Maximum density for high-speed synchronization
        
        def sanitize(text):
            if not text: return ""
            return re.sub(r'(?i)team\s*ford', 'AutoNorth', str(text))

        async with httpx.AsyncClient(timeout=120.0) as client:
            while len(all_vehicles) < limit:
                # Expanded payload: Removes 'stock_type:USED' restriction to include NEW vehicles
                # Expands filters to include Site IDs 34, 1, and 50 (Full TeamFord/GoAuto ecosystem)
                payload = {
                    "requests": [
                        {
                            "indexName": "inventory",
                            "params": f"aroundRadius=500000&filters=craft_site_ids%3A34%20OR%20craft_site_ids%3A1%20OR%20craft_site_ids%3A50&hitsPerPage={hits_per_page}&page={page}"
                        }
                    ]
                }

                resp = await client.post(ALGOLIA_URL, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                
                result = data.get("results", [{}])[0]
                hits = result.get("hits", [])
                nb_hits = result.get("nbHits", 0)
                
                if not hits:
                    break

                for h in hits:
                    # Mathematical Field Mapping (Heading Alignment)
                    price = float(h.get("pricing", {}).get("sell_price", 0))
                    if not price: price = float(h.get("list_price", 0))
                    if not price: price = float(h.get("retail_price", 0))

                    images = [img.get("url") for img in h.get("images", []) if img.get("url")]
                    if not images and h.get("thumbnail_url"): images = [h.get("thumbnail_url")]

                    # Deep Metadata Construction (Featured & Specials)
                    all_vehicles.append({
                        "id": str(h.get("vin") or h.get("stock_number")),
                        "title": sanitize(f"{h.get('year')} {h.get('make')} {h.get('model')} {h.get('trim', '')}".strip()),
                        "make": h.get("make"),
                        "model": h.get("model"),
                        "year": int(h.get("year", 2024)),
                        "price": price,
                        "mileage": int(h.get("odometer", 0)),
                        "condition": h.get("stock_type", "used").lower(),
                        "body_type": h.get("body_style") or h.get("body_type_category"),
                        "fuel_type": h.get("fuel_type_category") or h.get("fuel_type", "Gas"),
                        "transmission": h.get("transmission_description") or h.get("transmission", "Automatic"),
                        "exterior_color": h.get("exterior_colour") or h.get("exterior_color"),
                        "interior_color": h.get("interior_colour") or h.get("interior_color"),
                        "engine": h.get("engine_description") or h.get("engine"),
                        "drivetrain": h.get("drive_type_name") or h.get("drivetrain"),
                        "vin": h.get("vin"),
                        "stock_number": h.get("stock_number"),
                        "description": sanitize(h.get("comments", f"Certified premium {h.get('make')} {h.get('model')} available at AutoNorth Motors.")),
                        "features": [sanitize(f.get("name")) for f in h.get("features", []) if f.get("name")],
                        "images": images,
                        "status": "available",
                        "source": "teamford_sync",
                        "featured": h.get("is_featured", False), # NEW: Capture Featured status
                        "is_on_special": h.get("is_on_special", False), # NEW: Capture Special status
                        "source_url": f"https://www.teamford.ca/vehicles/{h.get('slug')}" if h.get('slug') else ""
                    })

                # Termination check
                if len(all_vehicles) >= nb_hits or page >= 30: 
                    break
                    
                page += 1
                await asyncio.sleep(0.3)

        logger.info(f"Ultimate Sync Success: Merged {len(all_vehicles)} units (New, Used, Featured, Specials). Source total: {nb_hits}.")
        return all_vehicles

    except Exception as e:
        logger.error(f"Ultimate Sync Engine Failure: {str(e)}")
        return []

async def scrape_teamford_listing(url: str) -> Optional[Dict[str, Any]]:
    return None
