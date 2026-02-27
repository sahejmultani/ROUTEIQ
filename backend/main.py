from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Placeholder for actual risk cluster logic
# from .geotab_helpers import fetch_heat_points

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
    # Example: Replace this with real Geotab data fetching
    # For demonstration, use a sample list of points (lat, lng, risk_score, ...)
    points = [
        {"lat": 43.6532, "lng": -79.3832, "risk_score": 0.8, "event_count": 20, "speed_limit": 50, "avg_speed": 62.0, "exception_count": 3, "speed_excess_count": 5, "speed_deficit_count": 1},
        {"lat": 43.6533, "lng": -79.3833, "risk_score": 0.7, "event_count": 10, "speed_limit": 50, "avg_speed": 60.0, "exception_count": 2, "speed_excess_count": 2, "speed_deficit_count": 0},
        {"lat": 43.7001, "lng": -79.4163, "risk_score": 0.6, "event_count": 12, "speed_limit": 60, "avg_speed": 45.0, "exception_count": 1, "speed_excess_count": 0, "speed_deficit_count": 3},
        {"lat": 43.8000, "lng": -79.4200, "risk_score": 0.3, "event_count": 5, "speed_limit": 40, "avg_speed": 38.0, "exception_count": 0, "speed_excess_count": 0, "speed_deficit_count": 1},
    ]

    # Plot all points with aggressive driving (risk_score > 0.5)
    clusters = []
    for idx, p in enumerate(points):
        if p["risk_score"] > 0.5:
            clusters.append(HeatCluster(
                id=f"point_{idx}",
                lat=p["lat"],
                lng=p["lng"],
                risk_score=p["risk_score"],
                event_count=p["event_count"],
                concentration=1.0,
                speed_limit=p["speed_limit"],
                avg_speed=p["avg_speed"],
                exception_count=p["exception_count"],
                speed_excess_count=p["speed_excess_count"],
                speed_deficit_count=p["speed_deficit_count"]
            ))
    return clusters
