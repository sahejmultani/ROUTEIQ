from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Placeholder for actual risk cluster logic
# Import Geotab helpers
from .geotab_helpers import geotab_login, fetch_trip_events

description = """
API for high-risk driving area heatmap in the Greater Toronto Area.
"""

app = FastAPI(title="Risk Heatmap API", description=description)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HeatCluster(BaseModel):
    id: str
    lat: float
    lng: float
    risk_score: float
    event_count: int
    concentration: float
    speed_limit: int
    avg_speed: float
    exception_count: int
    speed_excess_count: int
    speed_deficit_count: int

@app.get("/api/heatmap", response_model=List[HeatCluster])
def get_heatmap():
    # Login to Geotab
    try:
        login_result = geotab_login()
        session_id = login_result["sessionId"]
        credentials = login_result["credentials"]
    except Exception as e:
        print(f"Geotab login failed: {e}")
        return []

    # Fetch trip events (aggressive driving, etc.)
    try:
        events = fetch_trip_events(session_id, credentials)
    except Exception as e:
        print(f"Geotab fetch failed: {e}")
        return []

    # Convert events to HeatCluster objects (example: you must adapt this mapping)
    clusters = []
    for idx, event in enumerate(events):
        # You must adapt these fields to match your Geotab data structure
        clusters.append(HeatCluster(
            id=f"point_{idx}",
            lat=event.get("latitude", 0),
            lng=event.get("longitude", 0),
            risk_score=event.get("risk_score", 0.5),
            event_count=1,
            concentration=1.0,
            speed_limit=event.get("speed_limit", 0),
            avg_speed=event.get("speed", 0),
            exception_count=event.get("exception_count", 0),
            speed_excess_count=event.get("speed_excess_count", 0),
            speed_deficit_count=event.get("speed_deficit_count", 0)
        ))
    return clusters
