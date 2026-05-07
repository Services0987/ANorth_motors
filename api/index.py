import sys
import os

try:
    # Add the backend directory to Python path
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
    from server import app
except Exception as e:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    app = FastAPI()
    error_msg = str(e)
    error_trace = traceback.format_exc()
    
    @app.get("/api/{path:path}")
    async def catch_all(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend Startup Failure",
                "details": error_msg,
                "traceback": error_trace,
                "sys_path": sys.path,
                "cwd": os.getcwd()
            }
        )

# Vercel Serverless Functions hook into this specific 'app' variable when exposed in api/index.py
