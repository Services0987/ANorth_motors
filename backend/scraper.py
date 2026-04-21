import httpx
import json
import logging
import asyncio
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

async def scrape_teamford_inventory(limit: int = 25) -> List[Dict[str, Any]]:
    """
    Search across TeamFord's used inventory using their native Algolia API.
    Bypasses WAF by using the exact keys used by the front-end.
    """
    ALGOLIA_APP_ID = "VBAFQME90B"
    ALGOLIA_API_KEY = "650a66d4bf074b5de276a2ecb945bf80"
    url = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.teamford.ca/",
        "Origin": "https://www.teamford.ca",
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    params = {
        "x-algolia-agent": "Algolia for JavaScript (4.26.0); Browser",
        "x-algolia-api-key": ALGOLIA_API_KEY,
        "x-algolia-application-id": ALGOLIA_APP_ID
    }
    
    payload = {
        "requests": [
            {
                "indexName": "inventory",
                "params": f"query=&hitsPerPage={limit}&filters=craft_site_ids:34 AND stock_type:USED"
            }
        ]
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, params=params, content=json.dumps(payload))
            resp.raise_for_status()
            
            res_json = resp.json()
            hits = res_json.get('results', [])[0].get('hits', [])
            
            vehicles = []
            for h in hits:
                # Correct pricing from list_price
                price = float(h.get('list_price') or 0)
                
                # Correct mileage from odometer
                mileage = int(h.get('odometer') or 0)
                
                # Drivetrain extraction from trim_variation
                trim_var = h.get('trim_variation', '')
                drivetrain = "4x4" if "4x4" in trim_var or "4WD" in trim_var else "AWD" if "AWD" in trim_var else "FWD"
                
                # Image processing using Cloudinary IDs
                # Base: https://res.cloudinary.com/goauto-images/image/upload/f_auto,c_fill,ar_14:9,q_auto/v1/
                photo_ids = h.get('photo_service_ids', [])
                if not isinstance(photo_ids, list): photo_ids = []
                
                processed_images = []
                for pid in photo_ids:
                    processed_images.append(f"https://res.cloudinary.com/goauto-images/image/upload/f_auto,c_fill,ar_14:9,q_auto/v1/{pid}.jpg")
                
                if not processed_images and h.get('thumbnail_url'):
                    processed_images = [h.get('thumbnail_url')]

                vehicles.append({
                    "id": str(h.get("objectID") or h.get("vin") or h.get("stock_number")),
                    "title": f"{h.get('year')} {h.get('make_name')} {h.get('model_name')}".strip(),
                    "make": h.get("make_name"),
                    "model": h.get("model_name"),
                    "year": int(h.get("year", 2024)),
                    "price": price,
                    "mileage": mileage,
                    "condition": "used",
                    "body_type": h.get("body_type_category"),
                    "fuel_type": h.get("fuel_type_name", "Gas"),
                    "transmission": h.get("transmission_name"),
                    "exterior_color": h.get("exterior_colour_name") or h.get("exterior_search_colour"),
                    "interior_color": h.get("interior_color_base"),
                    "engine": h.get("engine_name"),
                    "drivetrain": drivetrain,
                    "vin": h.get("vin"),
                    "stock_number": h.get("stock_number"),
                    "description": h.get("description") or h.get("comments") or f"Check out this {h.get('year')} {h.get('make_name')} {h.get('model_name')} available at Team Ford.",
                    "features": h.get("options", []) or h.get("packages", []),
                    "images": processed_images,
                    "status": "available",
                    "featured": False,
                    "source_url": f"https://www.teamford.ca/vehicles/{h.get('slug')}" if h.get('slug') else "https://www.teamford.ca"
                })
            
            logger.info(f"Successfully fetched {len(vehicles)} live listings with full images from TeamFord Algolia")
            return vehicles

    except Exception as e:
        logger.error(f"Algolia fetch error: {str(e)}")
        return []

async def scrape_teamford_listing(url: str) -> Optional[Dict[str, Any]]:
    # Keep URL scraper as fallback or for manual imports
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            resp = await client.get(url, headers=headers)
            soup = BeautifulSoup(resp.text, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            if not script: return None
            data = json.loads(script.string)
            v = data.get('props', {}).get('pageProps', {}).get('vehicle', {})
            if not v: return None
            
            return {
                "id": str(v.get("vin") or v.get("stock_number")),
                "title": f"{v.get('year')} {v.get('make')} {v.get('model')} {v.get('trim', '')}".strip(),
                "make": v.get("make"),
                "model": v.get("model"),
                "year": int(v.get("year", 2024)),
                "price": float(v.get("pricing", {}).get("sell_price") or 0),
                "mileage": int(v.get("odometer") or 0),
                "condition": "used",
                "images": [img.get("url") for img in v.get("images", []) if img.get("url")],
                "vin": v.get("vin"),
                "stock_number": v.get("stock_number"),
                "status": "available",
                "source_url": url
            }
    except Exception as e:
        logger.error(f"Single scrape error: {str(e)}")
        return None
