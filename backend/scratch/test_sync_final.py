import asyncio
import logging
import sys
import os

# Add the current directory to sys.path to import local modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Setup logging to console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("test_sync")

async def run_sync_test():
    try:
        from scraper import sync_teamford_listings
        # We need a mock or real DB. Since we are in the environment, 'server.db' might work if configured.
        # But wait, 'server.py' initializes db on first access.
        
        logger.info("Starting practical sync test...")
        result = await sync_teamford_listings()
        logger.info(f"Test Result: {result}")
    except Exception as e:
        logger.error(f"Test Failed: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(run_sync_test())
