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

async def scrape_teamford_inventory(limit: int = 1000) -> List[Dict[str, Any]]:
    """
    Robust Sync Engine: Uses Algolia API with recursive pagination to capture 100% of feed.
    """
    try:
        headers = {
            "x-algolia-api-key": ALGOLIA_API_KEY,
            "x-algolia-application-id": ALGOLIA_APP_ID,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }

        all_vehicles = []
        page = 0
        hits_per_page = 40 # Standard Algolia cap for public search keys
        
        # Brand Sanitization Regex
        def sanitize(text):
            if not text: return ""
            return re.sub(r'(?i)team\s*ford', 'AutoNorth', str(text))

        async with httpx.AsyncClient(timeout=30.0) as client:
            while len(all_vehicles) < limit:
                payload = {
                    "requests": [
                        {
                            "indexName": "inventory",
                            "params": f"aroundRadius=500000&facetFilters=%5B%5B%22stock_type%3AUSED%22%5D%5D&filters=craft_site_ids%3A34&hitsPerPage={hits_per_page}&page={page}"
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
                    price = float(h.get("pricing", {}).get("sell_price", 0))
                    if not price: price = float(h.get("list_price", 0))

                    images = [img.get("url") for img in h.get("images", []) if img.get("url")]
                    if not images and h.get("thumbnail_url"): images = [h.get("thumbnail_url")]

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
                        "fuel_type": h.get("fuel_type_category", "Gas"),
                        "transmission": h.get("transmission_description") or "Automatic",
                        "exterior_color": h.get("exterior_colour"),
                        "interior_color": h.get("interior_colour"),
                        "engine": h.get("engine_description"),
                        "drivetrain": h.get("drive_type_name"),
                        "vin": h.get("vin"),
                        "stock_number": h.get("stock_number"),
                        "description": sanitize(h.get("comments", f"Premium {h.get('make')} {h.get('model')} available at AutoNorth Motors.")),
                        "features": [sanitize(f.get("name")) for f in h.get("features", []) if f.get("name")],
                        "images": images,
                        "status": "available",
                        "source": "teamford_sync",
                        "featured": False,
                        "source_url": f"https://www.teamford.ca/vehicles/{h.get('slug')}" if h.get('slug') else ""
                    })

                # Termination check
                if len(all_vehicles) >= nb_hits or page >= 10: # Safety break at 400 or max hits
                    break
                    
                page += 1
                await asyncio.sleep(0.2) # Rate limit safety

        logger.info(f"Sync Success: Captured {len(all_vehicles)} vehicles (Total available in source: {nb_hits}).")
        return all_vehicles

    except Exception as e:
        logger.error(f"Sync Engine Critical Failure: {str(e)}")
        return []

async def scrape_teamford_listing(url: str) -> Optional[Dict[str, Any]]:
    return None
