"""
API for high-risk driving area heatmap in the Greater Toronto Area.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Import Geotab helpers
from geotab_helpers import geotab_login, fetch_trip_events

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

# Helper to fetch vehicles from Geotab
def fetch_vehicles(session_id, credentials):
    from geotab_helpers import GEOTAB_BASE_URL
    import requests
    payload = {
        "method": "Get",
        "params": {
            "typeName": "Device",
            "credentials": credentials,
        },
        "id": 1,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    resp = requests.post(GEOTAB_BASE_URL, json=payload)
    resp.raise_for_status()
    raw = resp.json()
    return raw["result"]

# API endpoint to list all vehicles
@app.get("/api/vehicles")
def get_vehicles():
    try:
        login_result = geotab_login()
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception as e:
        print(f"Geotab login failed: {e}")
        return []
    try:
        vehicles = fetch_vehicles(session_id, credentials)
    except Exception as e:
        print(f"Geotab fetch vehicles failed: {e}")
        return []
    # Return a simplified list (id, name, VIN, etc.)
    return [
        {
            "id": v.get("id"),
            "name": v.get("name"),
            "vin": v.get("vin"),
            "licensePlate": v.get("licensePlate"),
            "deviceType": v.get("deviceType"),
        }
        for v in vehicles
    ]

# API endpoint to get data for a specific vehicle
@app.get("/api/vehicle/{vehicle_id}")
def get_vehicle_data(vehicle_id: str):
    try:
        login_result = geotab_login()
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception:
        # Do not print errors to terminal
        return {}
    # Fetch all status data for this device
    from geotab_helpers import GEOTAB_BASE_URL
    import requests
    payload = {
        "method": "Get",
        "params": {
            "typeName": "StatusData",
            "credentials": credentials,
            "search": {"deviceSearch": {"id": vehicle_id}}
        },
        "id": 1,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    resp = requests.post(GEOTAB_BASE_URL, json=payload)
    resp.raise_for_status()
    raw = resp.json()
    # Only return 5 most important fields for each status data entry
    important_fields = ["id", "dateTime", "data", "name", "device"]
    result = raw.get("result", [])
    filtered = []
    for entry in result:
        filtered.append({k: entry.get(k) for k in important_fields if k in entry})
    return filtered

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
        print("Geotab login response:", login_result)
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception as e:
        print(f"Geotab login failed: {e}")
        return []

    print('About to fetch trip events from Geotab...')
    try:
        events = fetch_trip_events(session_id, credentials)
        print('Fetched events from Geotab.')
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
