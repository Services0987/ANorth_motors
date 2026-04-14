import sys
import os

# Add the backend directory to Python path so server.py's internal imports work
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from server import app

# Vercel Serverless Functions hook into this specific 'app' variable when exposed in api/index.py
