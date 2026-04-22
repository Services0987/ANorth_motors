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
    Robust Sync Engine: Uses Algolia API (Site ID 34) to pull full inventory.
    Implements mandatory 'AutoNorth' brand sanitization.
    """
    try:
        # Standard headers to mimic shiftly/browser listeners
        headers = {
            "x-algolia-api-key": ALGOLIA_API_KEY,
            "x-algolia-application-id": ALGOLIA_APP_ID,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }

        # Payload captured from live shop results
        payload = {
            "requests": [
                {
                    "indexName": "inventory",
                    "params": f"aroundRadius=500000&facetFilters=%5B%5B%22stock_type%3AUSED%22%5D%5D&filters=craft_site_ids%3A34&hitsPerPage={limit}&page=0"
                }
            ]
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(ALGOLIA_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        hits = data.get("results", [{}])[0].get("hits", [])
        vehicles = []

        # Brand Sanitization Regex
        def sanitize(text):
            if not text: return ""
            return re.sub(r'(?i)team\s*ford', 'AutoNorth', str(text))

        for h in hits:
            # Handle pricing structure
            price = float(h.get("pricing", {}).get("sell_price", 0))
            if not price: price = float(h.get("list_price", 0))

            # Image processing
            images = [img.get("url") for img in h.get("images", []) if img.get("url")]
            if not images and h.get("thumbnail_url"): images = [h.get("thumbnail_url")]

            vehicles.append({
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

        logger.info(f"Sync Successful: Captured {len(vehicles)} vehicles via Algolia Listener.")
        return vehicles

    except Exception as e:
        logger.error(f"Sync Engine Critical Failure: {str(e)}")
        return []

async def scrape_teamford_listing(url: str) -> Optional[Dict[str, Any]]:
    # Fallback to single sync if needed, though inventory sync is the primary driver
    # We maintain the signature for backend compatibility
    return None
