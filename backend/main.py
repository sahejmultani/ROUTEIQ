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

    # Fetch all status data for this device (limited to 100 for performance)
    status_payload = {
        "method": "Get",
        "params": {
            "typeName": "StatusData",
            "credentials": credentials,
            "search": {"deviceSearch": {"id": vehicle_id}},
            "resultsLimit": 100
        },
        "id": 2,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    status_resp = requests.post(GEOTAB_BASE_URL, json=status_payload)
    status_resp.raise_for_status()
    status_raw = status_resp.json()
    status_data = status_raw.get("result", [])

    # Fetch latest LogRecord for this device for accurate last position (limited to 100 for performance)
    logrecord_payload = {
        "method": "Get",
        "params": {
            "typeName": "LogRecord",
            "credentials": credentials,
            "search": {"deviceSearch": {"id": vehicle_id}},
            "resultsLimit": 100,
            "sortBy": "dateTime desc"
        },
        "id": 3,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    logrecord_resp = requests.post(GEOTAB_BASE_URL, json=logrecord_payload)
    logrecord_resp.raise_for_status()
    logrecord_raw = logrecord_resp.json()
    logrecord_data = logrecord_raw.get("result", [])

    # Fetch recent Trip data (contains driving events)
    trip_payload = {
        "method": "Get",
        "params": {
            "typeName": "Trip",
            "credentials": credentials,
            "search": {"deviceSearch": {"id": vehicle_id}},
            "resultsLimit": 5,
            "sortBy": "startDateTime desc"
        },
        "id": 6,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    trip_resp = requests.post(GEOTAB_BASE_URL, json=trip_payload)
    trip_resp.raise_for_status()
    trip_raw = trip_resp.json()
    trip_data = trip_raw.get("result", [])

    # Fetch recent Exception data (violations, accidents)
    exception_payload = {
        "method": "Get",
        "params": {
            "typeName": "Exception",
            "credentials": credentials,
            "search": {"deviceSearch": {"id": vehicle_id}},
            "resultsLimit": 10,
            "sortBy": "activeTime desc"
        },
        "id": 7,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    exception_resp = requests.post(GEOTAB_BASE_URL, json=exception_payload)
    exception_resp.raise_for_status()
    exception_raw = exception_resp.json()
    exception_data = exception_raw.get("result", [])

    # Fetch DueDiagnostics (maintenance items)
    due_diagnostics_payload = {
        "method": "Get",
        "params": {
            "typeName": "DueDiagnostic",
            "credentials": credentials,
            "search": {"deviceSearch": {"id": vehicle_id}}
        },
        "id": 8,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    due_diag_resp = requests.post(GEOTAB_BASE_URL, json=due_diagnostics_payload)
    due_diag_resp.raise_for_status()
    due_diag_raw = due_diag_resp.json()
    due_diagnostics_data = due_diag_raw.get("result", [])

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


    # Try RequestLocation for real-time position, then Device.lastKnownPosition, then LogRecord, then StatusData
    last_position = None
    latitude = None
    longitude = None
    dateTime = None
    speed = None
    speed_time = None
    speed_val = None
    import time
    # 1. Try RequestLocation (real-time)
    try:
        # Add a RequestLocation
        request_location_payload = {
            "method": "Add",
            "params": {
                "typeName": "RequestLocation",
                "entity": {"device": {"id": vehicle_id}},
                "credentials": credentials
            },
            "id": 4,
            "jsonrpc": "2.0",
            "sessionId": session_id
        }
        requests.post(GEOTAB_BASE_URL, json=request_location_payload)
        # Poll for up to 5 seconds for a new RequestLocation result
        for _ in range(5):
            poll_payload = {
                "method": "Get",
                "params": {
                    "typeName": "RequestLocation",
                    "credentials": credentials,
                    "search": {"deviceSearch": {"id": vehicle_id}},
                },
                "id": 5,
                "jsonrpc": "2.0",
                "sessionId": session_id
            }
            poll_resp = requests.post(GEOTAB_BASE_URL, json=poll_payload)
            poll_resp.raise_for_status()
            poll_data = poll_resp.json().get("result", [])
            if poll_data and poll_data[0].get("latitude") is not None and poll_data[0].get("longitude") is not None:
                req = poll_data[0]
                last_position = {
                    "latitude": req.get("latitude"),
                    "longitude": req.get("longitude"),
                    "dateTime": req.get("dateTime"),
                    "speed": req.get("speed")
                }
                latitude = req.get("latitude")
                longitude = req.get("longitude")
                dateTime = req.get("dateTime")
                speed = req.get("speed")
                speed_time = req.get("dateTime")
                speed_val = req.get("speed")
                break
            time.sleep(1)
    except Exception:
        pass
    # 2. Device.lastKnownPosition
    if last_position is None:
        lkp = device_info.get("lastKnownPosition")
        if lkp and lkp.get("latitude") is not None and lkp.get("longitude") is not None:
            last_position = {
                "latitude": lkp.get("latitude"),
                "longitude": lkp.get("longitude"),
                "dateTime": lkp.get("dateTime"),
                "speed": lkp.get("speed")
            }
            latitude = lkp.get("latitude")
            longitude = lkp.get("longitude")
            dateTime = lkp.get("dateTime")
            speed = lkp.get("speed")
            speed_time = lkp.get("dateTime")
            speed_val = lkp.get("speed")
    # 3. LogRecord
    if last_position is None and logrecord_data and len(logrecord_data) > 0:
        # Get most recent LogRecord (first one since sorted by dateTime desc)
        log = logrecord_data[0]
        last_position = {
            "latitude": log.get("latitude"),
            "longitude": log.get("longitude"),
            "dateTime": log.get("dateTime"),
            "speed": log.get("speed")
        }
        latitude = log.get("latitude")
        longitude = log.get("longitude")
        dateTime = log.get("dateTime")
        speed = log.get("speed")
        speed_time = log.get("dateTime")
        speed_val = log.get("speed")
    # 4. StatusData fallback
    if last_position is None:
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

    # Recent violations/exceptions (replaces engine warning)
    recent_violations = []
    if exception_data:
        for exc in exception_data[:3]:  # Get top 3 recent exceptions
            recent_violations.append({
                "type": exc.get("exceptionType", {}).get("name", "Unknown"),
                "activeTime": exc.get("activeTime"),
                "severity": exc.get("severity", "Normal")
            })

    # Trip summary (for driving events and harsh events)
    trip_summary = None
    harsh_driving_count = 0
    
    # Calculate real-time distance and average speed from GPS LogRecord data
    real_distance_km = 0
    real_avg_speed = 0
    real_speeds = []
    
    if logrecord_data and len(logrecord_data) > 1:
        # Sort by dateTime ascending (oldest to newest) for correct distance calculation
        sorted_logs = sorted(logrecord_data, key=lambda x: x.get("dateTime", ""), reverse=False)
        
        # Haversine formula to calculate distance between two GPS points
        def haversine_distance(lat1, lon1, lat2, lon2):
            from math import radians, cos, sin, asin, sqrt
            # All arguments are in degrees
            # Convert decimal degrees to radians
            lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
            # Haversine formula
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            km = 6371 * c  # Radius of earth in kilometers
            return km
        
        # Calculate distance between consecutive GPS points
        for i in range(len(sorted_logs) - 1):
            current = sorted_logs[i]
            next_point = sorted_logs[i + 1]
            
            # Get coordinates
            lat1 = current.get("latitude")
            lon1 = current.get("longitude")
            lat2 = next_point.get("latitude")
            lon2 = next_point.get("longitude")
            
            # Calculate distance if both points have valid coordinates
            if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
                distance = haversine_distance(lat1, lon1, lat2, lon2)
                real_distance_km += distance
            
            # Collect speeds
            speed = next_point.get("speed")
            if speed is not None and speed > 0:
                real_speeds.append(speed)
        
        # Calculate average speed from collected values
        if real_speeds:
            real_avg_speed = sum(real_speeds) / len(real_speeds)
    
    # Calculate average speed from last 5 speed recordings
    avg_speed_from_data = None
    speed_records = [s for s in status_data if s.get("diagnostic", {}).get("id") == DIAGNOSTICS["speed"][0]]
    if speed_records:
        # Get last 5 speed recordings and calculate average
        recent_speeds = speed_records[-5:]  # Last 5 records
        speed_values = [s.get("data") for s in recent_speeds if s.get("data") is not None]
        if speed_values:
            avg_speed_from_data = sum(speed_values) / len(speed_values)
    
    if trip_data:
        latest_trip = trip_data[0]
        # Parse duration strings like "00:55:00" to total seconds
        def parse_duration(duration_str):
            if not duration_str or not isinstance(duration_str, str):
                return 0
            parts = duration_str.split(':')
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            return 0

        trip_summary = {
            "startDateTime": latest_trip.get("start"),
            "stopDateTime": latest_trip.get("stop"),
            "distance": round(real_distance_km, 2) if real_distance_km > 0 else latest_trip.get("distance"),
            "drivingDuration": latest_trip.get("drivingDuration"),
            "idlingDuration": latest_trip.get("idlingDuration"),
            "avgSpeed": round(real_avg_speed, 2) if real_avg_speed > 0 else (avg_speed_from_data if avg_speed_from_data is not None else latest_trip.get("averageSpeed")),
            "maxSpeed": latest_trip.get("maximumSpeed"),
            "speedRange1Distance": latest_trip.get("speedRange1Duration"),  # Low speed range
            "speedRange2Distance": latest_trip.get("speedRange2Duration"),  # Medium speed range
            "speedRange3Distance": latest_trip.get("speedRange3Duration"),  # High speed range
            "engineHours": latest_trip.get("engineHours"),
        }
        # No harsh events available, but we can flag if maxSpeed is high
        harsh_driving_count = 1 if latest_trip.get("maximumSpeed", 0) > 100 else 0

    # Maintenance alerts (from DueDiagnostics)
    maintenance_items = []
    if due_diagnostics_data:
        for item in due_diagnostics_data[:3]:  # Get top 3
            maintenance_items.append({
                "diagnostic": item.get("diagnostic", {}).get("name", "Unknown"),
                "kilometers": item.get("kilometers"),
                "days": item.get("days"),
            })

    # Engine/malfunction alert
    engine_fault_status = get_latest_status(DIAGNOSTICS["engine_fault"][0])
    engine_fault = engine_fault_status.get("data") if engine_fault_status else None

    # Helper for user-friendly display
    def friendly(val, label=None):
        if val is None or val is False or val == "" or (isinstance(val, (list, dict)) and not val):
            return f"No {label or 'data'}"
        if isinstance(val, bool):
            return "Yes" if val else f"No {label or 'data'}"
        return val

    # Dashboard response with new fields
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
        # Recent violations/exceptions instead of engine warning
        "recentViolations": recent_violations if recent_violations else None,
        # Trip summary with harsh driving counts
        "tripSummary": trip_summary if trip_summary else None,
        "harshDrivingCount": harsh_driving_count,
        # Maintenance items instead of single maintenance alert
        "maintenanceItems": maintenance_items if maintenance_items else None,
    }

    return {
        "dashboard": dashboard,
        "device": device_info,
        "statusData": status_data,
        "_debug": {
            "queried_vehicle_id": vehicle_id,
            "logrecord_data": logrecord_data,
            "trip_count": len(trip_data),
            "exception_count": len(exception_data),
            "due_diagnostics_count": len(due_diagnostics_data),
            "trip_sample": trip_data[0] if trip_data else None,
            "exception_sample": exception_data[0] if exception_data else None,
            "due_diag_sample": due_diagnostics_data[0] if due_diagnostics_data else None,
        }
    }

# Endpoint to get all vehicle locations for map display
@app.get("/api/vehicle_locations")
async def get_vehicle_locations():
    try:
        login_result = geotab_login()
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception as e:
        print(f"Geotab login failed: {e}")
        return []
    
    from geotab_helpers import GEOTAB_BASE_URL
    import httpx
    import asyncio
    from datetime import datetime, timedelta
    
    # Fetch all devices
    try:
        vehicles = fetch_vehicles(session_id, credentials)
    except Exception as e:
        print(f"Geotab fetch vehicles failed: {e}")
        return []
    
    # Only show vehicles active in the last 24 hours
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    
    # Function to fetch location for a single vehicle
    async def fetch_vehicle_location(client, vehicle):
        vehicle_id = vehicle.get("id")
        vehicle_name = vehicle.get("name")
        
        logrecord_payload = {
            "method": "Get",
            "params": {
                "typeName": "LogRecord",
                "credentials": credentials,
                "search": {"deviceSearch": {"id": vehicle_id}},
                "resultsLimit": 1,
                "sortBy": "dateTime desc"
            },
            "id": 1,
            "jsonrpc": "2.0",
            "sessionId": session_id
        }
        try:
            response = await client.post(GEOTAB_BASE_URL, json=logrecord_payload, timeout=10.0)
            response.raise_for_status()
            logrecord_raw = response.json()
            logrecord_data = logrecord_raw.get("result", [])
            
            if logrecord_data and len(logrecord_data) > 0:
                log = logrecord_data[0]
                latitude = log.get("latitude")
                longitude = log.get("longitude")
                speed = log.get("speed")
                dateTime = log.get("dateTime")
                
                # Only include if vehicle was active in last 24 hours
                if dateTime:
                    try:
                        log_time = datetime.fromisoformat(dateTime.replace("Z", "+00:00"))
                        if log_time < cutoff_time:
                            return None  # Skip vehicles inactive for more than 24 hours
                    except Exception:
                        pass
                
                if latitude is not None and longitude is not None:
                    return {
                        "id": vehicle_id,
                        "name": vehicle_name,
                        "latitude": latitude,
                        "longitude": longitude,
                        "speed": speed,
                        "dateTime": dateTime,
                        "vin": vehicle.get("vehicleIdentificationNumber"),
                        "licensePlate": vehicle.get("licensePlate")
                    }
        except Exception as e:
            print(f"Failed to fetch location for vehicle {vehicle_id}: {e}")
        
        return None
    
    # Make concurrent requests for all vehicles
    async with httpx.AsyncClient() as client:
        tasks = [fetch_vehicle_location(client, v) for v in vehicles]
        results = await asyncio.gather(*tasks, return_exceptions=False)
    
    # Filter out None results
    vehicle_locations = [v for v in results if v is not None]
    
    return vehicle_locations

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
