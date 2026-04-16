import httpx
import json
import logging
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

async def scrape_teamford_listing(url: str) -> Optional[Dict[str, Any]]:
    """
    Scrapes a single vehicle listing from TeamFord.ca (or any GoAuto-based site).
    Extracts high-res images, specs, and features from __NEXT_DATA__.
    """
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            next_data_script = soup.find('script', id='__NEXT_DATA__')
            
            if not next_data_script:
                logger.error(f"Could not find __NEXT_DATA__ for {url}")
                return None
                
            data = json.loads(next_data_script.string)
            # Drill down into the specific vehicle data structure (Page Props)
            props = data.get('props', {}).get('pageProps', {})
            v = props.get('vehicle', {})
            
            if not v:
                logger.error(f"No vehicle object found in pageProps for {url}")
                return None
                
            # Extract deep info
            extracted = {
                "id": v.get("id") or v.get("stock_number"),
                "title": f"{v.get('year')} {v.get('make')} {v.get('model')} {v.get('trim', '')}".strip(),
                "make": v.get("make"),
                "model": v.get("model"),
                "year": int(v.get("year", 2024)),
                "price": float(v.get("pricing", {}).get("sell_price", 0)),
                "mileage": int(v.get("odometer", 0)),
                "condition": v.get("stock_type", "used").lower(),
                "body_type": v.get("body_style"),
                "fuel_type": v.get("fuel_type", "Gas"),
                "transmission": v.get("transmission"),
                "exterior_color": v.get("exterior_color"),
                "interior_color": v.get("interior_color"),
                "engine": v.get("engine_description"),
                "drivetrain": v.get("drivetrain"),
                "vin": v.get("vin"),
                "stock_number": v.get("stock_number"),
                "description": v.get("comments", ""),
                "features": [f.get("name") for f in v.get("features", []) if f.get("name")],
                "images": [img.get("url") for img in v.get("images", []) if img.get("url")],
                "status": "available",
                "featured": False,
                "source_url": url
            }
            
            return extracted
            
    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        return None

async def scrape_teamford_inventory(limit: int = 10) -> List[Dict[str, Any]]:
    """
    Search across TeamFord's used inventory and pull the first N vehicle listings.
    """
    inventory_url = "https://www.teamford.ca/used/inventory/results?region=Edmonton"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {"User-Agent": "Mozilla/5.0"}
            resp = await client.get(inventory_url, headers=headers)
            soup = BeautifulSoup(resp.text, 'html.parser')
            next_data = json.loads(soup.find('script', id='__NEXT_DATA__').string)
            
            # GoAuto typically stores search results in searchProps or similar
            results = next_data.get('props', {}).get('pageProps', {}).get('initialResults', {}).get('results', [])
            
            vehicles = []
            for item in results[:limit]:
                # Construct detail URL – standard pattern /vehicles/[slug] or [id]
                slug = item.get('slug')
                if slug:
                    detail_url = f"https://www.teamford.ca/vehicles/{slug}"
                    v = await scrape_teamford_listing(detail_url)
                    if v: vehicles.append(v)
                    
            return vehicles
    except Exception as e:
        logger.error(f"Error in inventory scrape: {str(e)}")
        return []
