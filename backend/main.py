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
    # TODO: Replace with real data fetching
    # clusters = fetch_heat_points()
    clusters = [
        HeatCluster(
            id="cluster_1",
            lat=43.6532,
            lng=-79.3832,
            risk_score=0.8,
            event_count=20,
            concentration=1.0,
            speed_limit=50,
            avg_speed=62.0,
            exception_count=3,
            speed_excess_count=5,
            speed_deficit_count=1,
        ),
        HeatCluster(
            id="cluster_2",
            lat=43.7001,
            lng=-79.4163,
            risk_score=0.6,
            event_count=12,
            concentration=0.6,
            speed_limit=60,
            avg_speed=45.0,
            exception_count=1,
            speed_excess_count=0,
            speed_deficit_count=3,
        ),
    ]
    return clusters
