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
            "vin": v.get("vehicleIdentificationNumber"),
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
    from geotab_helpers import GEOTAB_BASE_URL
    import requests
    # Fetch device-level info
    device_payload = {
        "method": "Get",
        "params": {
            "typeName": "Device",
            "credentials": credentials,
            "search": {"id": vehicle_id}
        },
        "id": 1,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    device_resp = requests.post(GEOTAB_BASE_URL, json=device_payload)
    device_resp.raise_for_status()
    device_raw = device_resp.json()
    device_info = device_raw.get("result", [{}])[0] if device_raw.get("result") else {}

    # Fetch all status data for this device
    status_payload = {
        "method": "Get",
        "params": {
            "typeName": "StatusData",
            "credentials": credentials,
            "search": {"deviceSearch": {"id": vehicle_id}}
        },
        "id": 2,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    status_resp = requests.post(GEOTAB_BASE_URL, json=status_payload)
    status_resp.raise_for_status()
    status_raw = status_resp.json()
    status_data = status_raw.get("result", [])

    # Helper to extract latest diagnostic value by diagnostic id
    def get_latest_status(diagnostic_id):
        filtered = [s for s in status_data if s.get("diagnostic", {}).get("id") == diagnostic_id]
        if not filtered:
            return None
        # Return the most recent by dateTime
        return max(filtered, key=lambda s: s.get("dateTime", ""))

    # Map Geotab diagnostic IDs to dashboard fields
    DIAGNOSTICS = {
        "speed": ["DiagnosticSpeedId", "Speed"],
        "fuel": ["DiagnosticFuelLevelId", "FuelLevel"],
        "seatbelt": ["DiagnosticSeatbeltId", "Seatbelt"],
        "engine_fault": ["DiagnosticEngineLightId", "EngineLight"],
        "harsh_accel": ["DiagnosticHarshAccelerationId", "HarshAcceleration"],
        "harsh_brake": ["DiagnosticHarshBrakingId", "HarshBraking"],
        "harsh_corner": ["DiagnosticHarshCorneringId", "HarshCornering"],
        "impact": ["DiagnosticAccidentId", "Accident"],
        "maintenance": ["DiagnosticMaintenanceDueId", "MaintenanceDue"],
    }

    # Extract required fields
    vehicle_name = device_info.get("name")
    vehicle_id = device_info.get("id")
    license_plate = device_info.get("licensePlate")
    vin = device_info.get("vehicleIdentificationNumber")
    is_active = device_info.get("isActive", True)
    last_reported = device_info.get("lastCommunicated", None)

    # Active status: consider active if isActive and last report within 10 minutes
    from datetime import datetime, timedelta
    active_status = False
    if is_active and last_reported:
        try:
            last_dt = datetime.fromisoformat(last_reported.replace("Z", "+00:00"))
            active_status = (datetime.utcnow() - last_dt) < timedelta(minutes=10)
        except Exception:
            active_status = is_active
    else:
        active_status = is_active


    # Find the most recent status entry with latitude, longitude, speed, and dateTime
    latest_gps_speed = None
    for s in sorted(status_data, key=lambda x: x.get("dateTime", ""), reverse=True):
        if (
            s.get("latitude") is not None and
            s.get("longitude") is not None and
            s.get("speed") is not None and
            s.get("dateTime")
        ):
            latest_gps_speed = s
            break

    if latest_gps_speed:
        last_position = {
            "latitude": latest_gps_speed["latitude"],
            "longitude": latest_gps_speed["longitude"],
            "dateTime": latest_gps_speed["dateTime"]
        }
        speed = latest_gps_speed["speed"]
        speed_time = latest_gps_speed["dateTime"]
        # Add these fields for direct access
        latitude = latest_gps_speed["latitude"]
        longitude = latest_gps_speed["longitude"]
        speed_val = latest_gps_speed["speed"]
        dateTime = latest_gps_speed["dateTime"]
    else:
        # Fallback to previous logic
        gps_status = get_latest_status("DiagnosticGpsPositionId")
        if gps_status:
            last_position = {
                "latitude": gps_status.get("data", {}).get("latitude"),
                "longitude": gps_status.get("data", {}).get("longitude"),
                "dateTime": gps_status.get("dateTime")
            }
            latitude = gps_status.get("data", {}).get("latitude")
            longitude = gps_status.get("data", {}).get("longitude")
            dateTime = gps_status.get("dateTime")
        else:
            last_position = None
            latitude = None
            longitude = None
            dateTime = None
        speed_status = get_latest_status(DIAGNOSTICS["speed"][0])
        speed = speed_status.get("data") if speed_status else None
        speed_time = speed_status.get("dateTime") if speed_status else None
        speed_val = speed

    # Fuel
    fuel_status = get_latest_status(DIAGNOSTICS["fuel"][0])
    fuel = fuel_status.get("data") if fuel_status else None

    # Seatbelt
    seatbelt_status = get_latest_status(DIAGNOSTICS["seatbelt"][0])
    seatbelt = seatbelt_status.get("data") if seatbelt_status else None

    # Speeding alert
    SPEED_LIMIT = 100  # km/h
    speeding_alert = speed is not None and speed > SPEED_LIMIT

    # Seatbelt warning
    seatbelt_warning = seatbelt is not None and seatbelt == 0 and speed and speed > 5

    # Engine/malfunction alert
    engine_fault_status = get_latest_status(DIAGNOSTICS["engine_fault"][0])
    engine_fault = engine_fault_status.get("data") if engine_fault_status else None

    # Harsh driving alerts
    harsh_accel = get_latest_status(DIAGNOSTICS["harsh_accel"][0])
    harsh_brake = get_latest_status(DIAGNOSTICS["harsh_brake"][0])
    harsh_corner = get_latest_status(DIAGNOSTICS["harsh_corner"][0])

    # Impact/accident alert
    impact = get_latest_status(DIAGNOSTICS["impact"][0])

    # Maintenance alert
    maintenance = get_latest_status(DIAGNOSTICS["maintenance"][0])

    # Helper for user-friendly display
    def friendly(val, label=None):
        if val is None or val is False or val == "" or (isinstance(val, (list, dict)) and not val):
            return f"No {label or 'data'}"
        if isinstance(val, bool):
            return "Yes" if val else f"No {label or 'data'}"
        return val

    dashboard = {
        "vehicleName": friendly(vehicle_name, "vehicle name"),
        "vehicleId": friendly(vehicle_id, "vehicle ID"),
        "licensePlate": friendly(license_plate, "license plate"),
        "vin": friendly(vin, "VIN"),
        "activeStatus": active_status,
        "lastReportedPosition": last_position if last_position else "No position data",
        "speed": {"value": friendly(speed, "speed"), "dateTime": speed_time or "No timestamp"},
        "latitude": latitude,
        "longitude": longitude,
        "speedValue": speed_val,
        "dateTime": dateTime,
        "fuelStatus": friendly(fuel, "fuel status"),
        "seatbeltStatus": friendly(seatbelt, "seatbelt status"),
        "speedingAlert": speeding_alert,
        "seatbeltWarning": seatbelt_warning,
        "engineWarning": friendly(engine_fault, "engine warning"),
        "harshDrivingAlerts": {
            "acceleration": friendly(harsh_accel, "harsh acceleration"),
            "braking": friendly(harsh_brake, "harsh braking"),
            "cornering": friendly(harsh_corner, "harsh cornering")
        },
        "impactAlert": friendly(impact, "impact/accident"),
        "maintenanceAlert": friendly(maintenance, "maintenance alert")
    }

    return {
        "dashboard": dashboard,
        "device": device_info,
        "statusData": status_data
    }

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
