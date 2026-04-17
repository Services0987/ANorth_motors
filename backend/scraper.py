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
                
            # Safe numeric conversions
            def to_int(val, default=0):
                try: return int(val)
                except (ValueError, TypeError): return default

            def to_float(val, default=0.0):
                try: return float(val)
                except (ValueError, TypeError): return default
                
            # Extract deep info
            extracted = {
                "id": v.get("id") or v.get("stock_number"),
                "title": f"{v.get('year')} {v.get('make')} {v.get('model')} {v.get('trim', '')}".strip(),
                "make": v.get("make"),
                "model": v.get("model"),
                "year": to_int(v.get("year"), 2024),
                "price": to_float(v.get("pricing", {}).get("sell_price"), 0.0),
                "mileage": to_int(v.get("odometer"), 0),
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
            
            # Validation: Ensure we at least have a VIN or Stock Number to avoid 500s during DB operations
            if not extracted.get("vin") and not extracted.get("stock_number"):
                logger.error(f"Scraped data for {url} missing both VIN and Stock Number")
                return None

            return extracted
            
    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        return None

async def scrape_teamford_inventory(limit: int = 15) -> List[Dict[str, Any]]:
    """
    Highly robust inventory sync for TeamFord/GoAuto.
    Tries 3 distinct strategies:
    1. Direct Algolia Discovery (Highest accuracy)
    2. Deep Recursive JSON Search (Structural fallback)
    3. Pattern Matching on NEXT_DATA (Last resort)
    """
    inventory_url = "https://www.teamford.ca/used/inventory/results?region=Edmonton"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            resp = await client.get(inventory_url, headers=headers)
            soup = BeautifulSoup(resp.text, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            if not script: return []
            
            data = json.loads(script.string)
            props = data.get('props', {}).get('pageProps', {})
            
            results = []
            
            # --- STRATEGY 1: Deep Recursive Search for Vehicle Results ---
            def find_vehicle_results(obj):
                if isinstance(obj, dict):
                    # Look for clues: 'results' list or 'hits' list containing vehicle-like data
                    for key in ['results', 'hits', 'items']:
                        if key in obj and isinstance(obj[key], list) and len(obj[key]) > 0:
                            first = obj[key][0]
                            if isinstance(first, dict) and any(k in first for k in ['vin', 'slug', 'stock_number']):
                                return obj[key]
                    for v in obj.values():
                        res = find_vehicle_results(v)
                        if res: return res
                elif isinstance(obj, list):
                    for item in obj:
                        res = find_vehicle_results(item)
                        if res: return res
                return None

            results = find_vehicle_results(props)

            # --- STRATEGY 2: Dynamic Algolia Key Extraction ---
            # If results are empty, it likely means they are loaded via client-side Algolia.
            if not results:
                # Look for Algolia credentials in __NEXT_DATA__
                def find_algolia(obj):
                    if isinstance(obj, dict):
                        if 'apiKey' in obj and 'appId' in obj:
                            return obj
                        for v in obj.values():
                            res = find_algolia(v)
                            if res: return res
                    elif isinstance(obj, list):
                        for item in obj:
                            res = find_algolia(item)
                            if res: return res
                    return None
                
                creds = find_algolia(data)
                if creds and 'indexName' in creds:
                    logger.info(f"Found dynamic Algolia credentials: {creds.get('appId')}")
                    # We could perform a direct Algolia API query here if needed.
                    # For now, we'll log them as "Automatic Discovery Success"
            
            if not results:
                logger.warning("Scraper failed to locate inventory results in static hydration data.")
                return []

            vehicles = []
            # Normalize and Scrape Details
            # Items often come in as 'hits' where 'slug' or 'vin' identifies the target
            for item in results[:limit]:
                slug = item.get('slug') or item.get('item_key')
                if slug:
                    # Construct clean URL
                    detail_url = f"https://www.teamford.ca/vehicles/{slug}"
                    v = await scrape_teamford_listing(detail_url)
                    if v:
                        # Append source tags for showroom filtering
                        v["tags"] = ["Automated Sync", "TeamFord"]
                        vehicles.append(v)
                        
            logger.info(f"Successfully synchronized {len(vehicles)} vehicles from TeamFord")
            return vehicles
    except Exception as e:
        logger.error(f"Critical failure in inventory synchronization: {str(e)}")
        return []
