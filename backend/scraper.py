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
    Search across TeamFord's used inventory and pull listings.
    Now more robust to handle structural changes in GoAuto/Next.js pages.
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
            
            # 1. Try traditional path
            results = props.get('initialResults', {}).get('results', [])
            
            # 2. Try New ContentBuilderBlocks path
            if not results:
                blocks = props.get('contentBuilderBlocks', [])
                for block in blocks:
                    if block.get('type') == 'Inventory' or 'inventory' in str(block).lower():
                        results = block.get('data', {}).get('initialResults', {}).get('results', [])
                        if results: break
            
            # 3. Fallback: Recursive Search for 'results' key containing list of dicts with 'vin' or 'slug'
            if not results:
                def find_results(obj):
                    if isinstance(obj, dict):
                        if 'results' in obj and isinstance(obj['results'], list) and len(obj['results']) > 0:
                            # Verify if it's vehicle data (look for common keys like vin/slug)
                            first = obj['results'][0]
                            if isinstance(first, dict) and ('vin' in first or 'slug' in first):
                                return obj['results']
                        for v in obj.values():
                            found = find_results(v)
                            if found: return found
                    elif isinstance(obj, list):
                        for item in obj:
                            found = find_results(item)
                            if found: return found
                    return None
                results = find_results(props) or []

            vehicles = []
            for item in results[:limit]:
                slug = item.get('slug')
                if slug:
                    detail_url = f"https://www.teamford.ca/vehicles/{slug}"
                    v = await scrape_teamford_listing(detail_url)
                    if v: vehicles.append(v)
                    
            logger.info(f"Successfully scraped {len(vehicles)} vehicles from TeamFord")
            return vehicles
    except Exception as e:
        logger.error(f"Error in inventory scrape: {str(e)}")
        return []
