from fastapi import FastAPI
import os
import sys

app = FastAPI()

@app.get("/api/test")
async def test():
    results = {
        "status": "online",
        "python_version": sys.version,
        "env": {k: v for k, v in os.environ.items() if "SECRET" not in k.upper() and "URI" not in k.upper()}
    }
    
    try:
        import motor
        results["motor"] = motor.__version__
    except Exception as e:
        results["motor"] = str(e)
        
    try:
        import jose
        results["jose"] = "ok"
    except Exception as e:
        results["jose"] = str(e)
        
    try:
        import pandas
        results["pandas"] = pandas.__version__
    except Exception as e:
        results["pandas"] = str(e)
        
    try:
        import scraper
        results["scraper"] = "ok"
    except Exception as e:
        results["scraper"] = str(e)

    return results
