from fastapi import FastAPI
import os
import sys

app = FastAPI()

@app.get("/api/test")
async def test():
    return {
        "DB_NAME": os.environ.get("DB_NAME"),
        "MONGO_URL_SET": "MONGO_URL" in os.environ,
        "MONGODB_URI_SET": "MONGODB_URI" in os.environ,
        "PYTHONPATH": sys.path
    }
