import httpx
import json
import logging
import asyncio
import re
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

async def scrape_teamford_listing(url: str) -> Optional[Dict[str, Any]]:
    """
    Scrapes a single vehicle listing from TeamFord.ca.
    Mimics a browser 'listener' to pull direct __NEXT_DATA__ content.
    """
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            }
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            next_data_script = soup.find('script', id='__NEXT_DATA__')
            
            if not next_data_script:
                return None
                
            data = json.loads(next_data_script.string)
            props = data.get('props', {}).get('pageProps', {})
            v = props.get('vehicle', {})
            
            if not v:
                return None
            
            # String Sanitization: Team Ford -> AutoNorth
            def sanitize(text):
                if not text: return ""
                return re.sub(r'(?i)team\s*ford', 'AutoNorth', str(text))
                
            raw_desc = v.get("comments", "") or f"Check out this {v.get('year')} {v.get('make')} {v.get('model')} at AutoNorth Motors."
            
            images = [img.get("url") for img in v.get("images", []) if img.get("url")]
            if not images and v.get("thumbnail_url"): images = [v.get("thumbnail_url")]

            return {
                "id": str(v.get("vin") or v.get("stock_number")),
                "title": sanitize(f"{v.get('year')} {v.get('make')} {v.get('model')} {v.get('trim', '')}".strip()),
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
                "description": sanitize(raw_desc),
                "features": [sanitize(f.get("name")) for f in v.get("features", []) if f.get("name")],
                "images": images,
                "status": "available",
                "source": "teamford_sync",
                "featured": False,
                "source_url": url
            }
    except Exception as e:
        logger.error(f"Listener Scrape Error for {url}: {str(e)}")
        return None

async def scrape_teamford_inventory(limit: int = 1000) -> List[Dict[str, Any]]:
    """
    Alpha Listener Sync: Cycles through inventory results to build a complete dataset.
    Bypasses simple blocks by using direct GoAuto result set extraction.
    """
    inventory_url = "https://www.teamford.ca/used/inventory/results?region=Edmonton"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.teamford.ca/",
            }
            resp = await client.get(inventory_url, headers=headers)
            soup = BeautifulSoup(resp.text, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            if not script:
                logger.error("Failed to find Alpha Data script on TeamFord")
                return []
            
            data = json.loads(script.string)
            props = data.get('props', {}).get('pageProps', {})
            
            # Extract recursive results
            results = props.get('initialResults', {}).get('results', [])
            if not results:
                # Try fallback block search (GoAuto structural variants)
                blocks = props.get('contentBuilderBlocks', [])
                for b in blocks:
                    if b.get('type') == 'Inventory':
                        results = b.get('data', {}).get('initialResults', {}).get('results', [])
                        if results: break
            
            if not results:
                logger.warning("No live results found in data stream.")
                return []

            vehicles = []
            # Scrape details for each found item
            # To avoid overloading, we'll limit to the actual requested limit
            target_list = results[:limit]
            
            # Phase 1: Rapid async gathering of detail pages
            tasks = []
            for item in target_list:
                slug = item.get('slug')
                if slug:
                    url = f"https://www.teamford.ca/vehicles/{slug}"
                    tasks.append(scrape_teamford_listing(url))
            
            # Execute in batches to be 'listener-safe'
            batch_size = 10
            for i in range(0, len(tasks), batch_size):
                batch = tasks[i:i+batch_size]
                batch_results = await asyncio.gather(*batch)
                vehicles.extend([v for v in batch_results if v])
                await asyncio.sleep(0.5) # Gentle spacing
            
            logger.info(f"Alpha Listener Sync Complete: {len(vehicles)} units verified.")
            return vehicles
            
    except Exception as e:
        logger.error(f"Alpha Sync Failure: {str(e)}")
        return []
