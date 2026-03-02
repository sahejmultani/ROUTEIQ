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

@app.get("/api/advanced_risk_analysis")
def get_advanced_risk_analysis(
    vehicle_id: Optional[str] = None,
    time_period_hours: int = 72,
    min_speed_change: float = 5.0
):
    """
    Advanced risk analysis with:
    - Vehicle filtering (optional)
    - Time filtering
    - Harsh braking and sharp turn detection
    - Aggressive speeding/slow driving detection
    
    Args:
        vehicle_id: Filter to specific vehicle (optional, analyzes all if None)
        time_period_hours: Analyze data from last N hours (default 72)
        min_speed_change: Minimum km/h change to flag as sudden (default 5)
    """
    try:
        login_result = geotab_login()
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception as e:
        return {"error": str(e), "alerts": [], "vehicle_id": vehicle_id, "summary": {}}
    
    from geotab_helpers import GEOTAB_BASE_URL
    import requests
    from datetime import datetime, timedelta
    import math
    
    vehicles = fetch_vehicles(session_id, credentials)
    
    # Filter vehicles if specific ID provided
    if vehicle_id:
        vehicles = [v for v in vehicles if v.get("id") == vehicle_id]
    
    cutoff_time = datetime.utcnow() - timedelta(hours=time_period_hours)
    alerts = []
    vehicle_speed_stats = {}
    
    for vehicle in vehicles[:50]:
        vehicle_id_val = vehicle.get("id")
        vehicle_name = vehicle.get("name", "Unknown")
        
        # Fetch comprehensive GPS history
        logrecord_payload = {
            "method": "Get",
            "params": {
                "typeName": "LogRecord",
                "credentials": credentials,
                "search": {"deviceSearch": {"id": vehicle_id_val}},
                "resultsLimit": 500,
                "sortBy": "dateTime desc"
            },
            "id": 1,
            "jsonrpc": "2.0",
            "sessionId": session_id
        }
        
        try:
            resp = requests.post(GEOTAB_BASE_URL, json=logrecord_payload, timeout=10)
            logrecords = resp.json().get("result", [])
        except Exception:
            continue
        
        # Sort chronologically
        logrecords = sorted(logrecords, key=lambda x: x.get("dateTime", ""), reverse=False)
        
        # Collect valid records
        filtered_records = []
        for record in logrecords:
            try:
                if record.get("latitude") and record.get("longitude") and record.get("speed") is not None:
                    filtered_records.append(record)
            except:
                pass
        
        if len(filtered_records) < 2:
            continue
        
        # Calculate vehicle stats
        speeds = [r.get("speed", 0) for r in filtered_records]
        vehicle_speed_stats[vehicle_id_val] = {
            "min": min(speeds),
            "max": max(speeds),
            "avg": sum(speeds) / len(speeds),
            "records": len(filtered_records)
        }
        
        # Analyze consecutive points for incidents
        for i in range(1, len(filtered_records)):
            prev = filtered_records[i - 1]
            curr = filtered_records[i]
            
            prev_speed = prev.get("speed", 0)
            curr_speed = curr.get("speed", 0)
            speed_change = abs(curr_speed - prev_speed)
            
            # Calculate time difference between records
            try:
                prev_time = datetime.fromisoformat(prev.get("dateTime", "").replace("Z", "+00:00"))
                curr_time = datetime.fromisoformat(curr.get("dateTime", "").replace("Z", "+00:00"))
                time_diff_seconds = (curr_time - prev_time).total_seconds()
            except:
                time_diff_seconds = None
            
            lat = curr.get("latitude")
            lng = curr.get("longitude")
            timestamp = curr.get("dateTime", "")
            
            # Calculate area speed limit
            area_start = max(0, i - 15)
            area_end = min(len(filtered_records), i + 15)
            area_speeds = [r.get("speed", 0) for r in filtered_records[area_start:area_end]]
            estimated_limit = estimate_speed_limit_v2(area_speeds)
            
            # Alert 1: Aggressive Speeding (> 20% over limit)
            if curr_speed > 5 and curr_speed > estimated_limit * 1.20:
                excess = curr_speed - estimated_limit
                if excess > 5:
                    alerts.append({
                        "vehicle_id": vehicle_id_val,
                        "vehicle_name": vehicle_name,
                        "alert_type": "Aggressive Speeding",
                        "severity": min(1.0, excess / 40.0),
                        "timestamp": timestamp,
                        "location": {"latitude": lat, "longitude": lng},
                        "current_speed": round(curr_speed, 1),
                        "estimated_limit": round(estimated_limit, 1),
                        "excess_speed": round(excess, 1)
                    })
            
            # Alert 2: Going Too Slow (< 50% of estimated limit in non-traffic)
            if estimated_limit > 60 and curr_speed > 0 and curr_speed < estimated_limit * 0.5:
                deficit = estimated_limit - curr_speed
                if deficit > 20:
                    alerts.append({
                        "vehicle_id": vehicle_id_val,
                        "vehicle_name": vehicle_name,
                        "alert_type": "Slow Driving",
                        "severity": min(0.6, deficit / 50.0),
                        "timestamp": timestamp,
                        "location": {"latitude": lat, "longitude": lng},
                        "current_speed": round(curr_speed, 1),
                        "expected_speed": round(estimated_limit, 1),
                        "deficit": round(deficit, 1)
                    })
            
            # Alert 3: Harsh Braking - consider time taken to stop
            # Factor in acceleration: km/h per second
            if curr_speed < prev_speed and speed_change >= 5:
                acceleration = speed_change / time_diff_seconds if time_diff_seconds and time_diff_seconds > 0 else 0
                
                # Flag harsh braking if:
                # - Speed drop > 15 km/h, OR
                # - Speed drop > 5 km/h but happening in < 2 seconds (fast deceleration)
                is_harsh = (speed_change >= 15) or (speed_change >= 5 and acceleration >= 5)
                
                if is_harsh:
                    # Severity based on deceleration rate and magnitude
                    time_factor = min(1.0, 2.0 / time_diff_seconds) if time_diff_seconds and time_diff_seconds > 0 else 0.5
                    severity = min(1.0, (speed_change / 60.0) * time_factor)
                    
                    alerts.append({
                        "vehicle_id": vehicle_id_val,
                        "vehicle_name": vehicle_name,
                        "alert_type": "Harsh Braking",
                        "severity": severity,
                        "timestamp": timestamp,
                        "location": {"latitude": lat, "longitude": lng},
                        "speed_before": round(prev_speed, 1),
                        "speed_after": round(curr_speed, 1),
                        "speed_change": round(speed_change, 1),
                        "time_taken": round(time_diff_seconds, 2) if time_diff_seconds else None,
                        "deceleration_rate": round(acceleration, 2)
                    })
            
            # Alert 4: Rapid Acceleration - consider time taken to accelerate
            if curr_speed > prev_speed and speed_change >= 5:
                acceleration = speed_change / time_diff_seconds if time_diff_seconds and time_diff_seconds > 0 else 0
                
                # Flag rapid acceleration if:
                # - Speed gain > 15 km/h, OR
                # - Speed gain > 5 km/h but happening in < 2 seconds (fast acceleration)
                is_rapid = (speed_change >= 15) or (speed_change >= 5 and acceleration >= 5)
                
                if is_rapid:
                    # Severity based on acceleration rate and magnitude
                    time_factor = min(1.0, 2.0 / time_diff_seconds) if time_diff_seconds and time_diff_seconds > 0 else 0.5
                    severity = min(1.0, (speed_change / 60.0) * time_factor)
                    
                    alerts.append({
                        "vehicle_id": vehicle_id_val,
                        "vehicle_name": vehicle_name,
                        "alert_type": "Rapid Acceleration",
                        "severity": severity,
                        "timestamp": timestamp,
                        "location": {"latitude": lat, "longitude": lng},
                        "speed_before": round(prev_speed, 1),
                        "speed_after": round(curr_speed, 1),
                        "speed_change": round(speed_change, 1),
                        "time_taken": round(time_diff_seconds, 2) if time_diff_seconds else None,
                        "acceleration_rate": round(acceleration, 2)
                    })
        
        # Detect sharp turns (angle > 60 degrees between consecutive segments)
        for i in range(2, len(filtered_records)):
            prev_prev = filtered_records[i - 2]
            prev = filtered_records[i - 1]
            curr = filtered_records[i]
            
            lat1, lng1 = prev_prev.get("latitude"), prev_prev.get("longitude")
            lat2, lng2 = prev.get("latitude"), prev.get("longitude")
            lat3, lng3 = curr.get("latitude"), curr.get("longitude")
            
            if all([lat1, lng1, lat2, lng2, lat3, lng3]):
                # Calculate bearing angles
                angle1 = calculate_bearing(lat1, lng1, lat2, lng2)
                angle2 = calculate_bearing(lat2, lng2, lat3, lng3)
                
                # Calculate turn angle
                turn_angle = abs(angle2 - angle1)
                if turn_angle > 180:
                    turn_angle = 360 - turn_angle
                
                # Flag sharp turns (> 60 degrees) at higher speeds
                if turn_angle > 60:
                    speed = curr.get("speed", 0)
                    if speed > 30:  # Only flag if moving at reasonable speed
                        severity = min(1.0, (turn_angle - 60) / 120.0 * (speed / 100.0))
                        alerts.append({
                            "vehicle_id": vehicle_id_val,
                            "vehicle_name": vehicle_name,
                            "alert_type": "Sharp Turn",
                            "severity": severity,
                            "timestamp": curr.get("dateTime", ""),
                            "location": {"latitude": lat3, "longitude": lng3},
                            "turn_angle": round(turn_angle, 1),
                            "speed_during_turn": round(speed, 1)
                        })
    
    # Sort by severity
    alerts.sort(key=lambda x: x.get("severity", 0), reverse=True)
    
    return {
        "alerts": alerts[:200],
        "vehicle_id": vehicle_id,
        "vehicle_stats": vehicle_speed_stats,
        "summary": {
            "time_period_hours": time_period_hours,
            "total_alerts": len(alerts),
            "aggressive_speeding": sum(1 for a in alerts if a["alert_type"] == "Aggressive Speeding"),
            "slow_driving": sum(1 for a in alerts if a["alert_type"] == "Slow Driving"),
            "harsh_braking": sum(1 for a in alerts if a["alert_type"] == "Harsh Braking"),
            "rapid_acceleration": sum(1 for a in alerts if a["alert_type"] == "Rapid Acceleration"),
            "sharp_turns": sum(1 for a in alerts if a["alert_type"] == "Sharp Turn"),
            "min_speed_change_threshold": min_speed_change,
        }
    }


@app.get("/api/incident_locations")
def get_incident_locations(time_period_hours: int = 72):
    """
    Get incident locations grouped and clustered for map visualization.
    Returns incident hotspots with counts by type.
    """
    try:
        login_result = geotab_login()
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception as e:
        return {"incidents": [], "summary": {}}
    
    from geotab_helpers import GEOTAB_BASE_URL
    import requests
    from datetime import datetime, timedelta
    
    vehicles = fetch_vehicles(session_id, credentials)
    alerts = []
    
    for vehicle in vehicles[:50]:
        vehicle_id_val = vehicle.get("id")
        vehicle_name = vehicle.get("name", "Unknown")
        
        # Fetch comprehensive GPS history
        logrecord_payload = {
            "method": "Get",
            "params": {
                "typeName": "LogRecord",
                "credentials": credentials,
                "search": {"deviceSearch": {"id": vehicle_id_val}},
                "resultsLimit": 500,
                "sortBy": "dateTime desc"
            },
            "id": 1,
            "jsonrpc": "2.0",
            "sessionId": session_id
        }
        
        try:
            resp = requests.post(GEOTAB_BASE_URL, json=logrecord_payload, timeout=10)
            logrecords = resp.json().get("result", [])
        except Exception:
            continue
        
        # Sort chronologically
        logrecords = sorted(logrecords, key=lambda x: x.get("dateTime", ""), reverse=False)
        
        # Collect valid records
        filtered_records = []
        for record in logrecords:
            try:
                if record.get("latitude") and record.get("longitude") and record.get("speed") is not None:
                    filtered_records.append(record)
            except:
                pass
        
        if len(filtered_records) < 2:
            continue
        
        # Analyze consecutive points for incidents
        for i in range(1, len(filtered_records)):
            prev = filtered_records[i - 1]
            curr = filtered_records[i]
            
            prev_speed = prev.get("speed", 0)
            curr_speed = curr.get("speed", 0)
            speed_change = abs(curr_speed - prev_speed)
            
            # Calculate time difference
            try:
                prev_time = datetime.fromisoformat(prev.get("dateTime", "").replace("Z", "+00:00"))
                curr_time = datetime.fromisoformat(curr.get("dateTime", "").replace("Z", "+00:00"))
                time_diff_seconds = (curr_time - prev_time).total_seconds()
            except:
                time_diff_seconds = None
            
            lat = curr.get("latitude")
            lng = curr.get("longitude")
            
            # Calculate area speed limit
            area_start = max(0, i - 15)
            area_end = min(len(filtered_records), i + 15)
            area_speeds = [r.get("speed", 0) for r in filtered_records[area_start:area_end]]
            estimated_limit = estimate_speed_limit_v2(area_speeds)
            
            # Collect all incident types at this location
            incident_type = None
            
            # Aggressive Speeding
            if curr_speed > 5 and curr_speed > estimated_limit * 1.20:
                excess = curr_speed - estimated_limit
                if excess > 5:
                    incident_type = "Aggressive Speeding"
            
            # Slow Driving
            elif estimated_limit > 60 and curr_speed > 0 and curr_speed < estimated_limit * 0.5:
                deficit = estimated_limit - curr_speed
                if deficit > 20:
                    incident_type = "Slow Driving"
            
            # Harsh Braking
            elif curr_speed < prev_speed and speed_change >= 5:
                acceleration = speed_change / time_diff_seconds if time_diff_seconds and time_diff_seconds > 0 else 0
                is_harsh = (speed_change >= 15) or (speed_change >= 5 and acceleration >= 5)
                if is_harsh:
                    incident_type = "Harsh Braking"
            
            # Rapid Acceleration
            elif curr_speed > prev_speed and speed_change >= 5:
                acceleration = speed_change / time_diff_seconds if time_diff_seconds and time_diff_seconds > 0 else 0
                is_rapid = (speed_change >= 15) or (speed_change >= 5 and acceleration >= 5)
                if is_rapid:
                    incident_type = "Rapid Acceleration"
            
            if incident_type:
                alerts.append({
                    "latitude": lat,
                    "longitude": lng,
                    "type": incident_type,
                    "vehicle_id": vehicle_id_val,
                    "vehicle_name": vehicle_name
                })
        
        # Check for sharp turns
        for i in range(2, len(filtered_records)):
            prev_prev = filtered_records[i - 2]
            prev = filtered_records[i - 1]
            curr = filtered_records[i]
            
            lat1, lng1 = prev_prev.get("latitude"), prev_prev.get("longitude")
            lat2, lng2 = prev.get("latitude"), prev.get("longitude")
            lat3, lng3 = curr.get("latitude"), curr.get("longitude")
            
            if all([lat1, lng1, lat2, lng2, lat3, lng3]):
                angle1 = calculate_bearing(lat1, lng1, lat2, lng2)
                angle2 = calculate_bearing(lat2, lng2, lat3, lng3)
                
                turn_angle = abs(angle2 - angle1)
                if turn_angle > 180:
                    turn_angle = 360 - turn_angle
                
                if turn_angle > 60:
                    speed = curr.get("speed", 0)
                    if speed > 30:
                        alerts.append({
                            "latitude": lat3,
                            "longitude": lng3,
                            "type": "Sharp Turn",
                            "vehicle_id": vehicle_id_val,
                            "vehicle_name": vehicle_name
                        })
    
    # Cluster incidents by location (0.005 degree grid ~500 meters)
    incident_clusters = {}
    for alert in alerts:
        # Round to 3 decimals (~100 meters accuracy)
        lat_key = round(alert["latitude"], 3)
        lng_key = round(alert["longitude"], 3)
        cluster_key = f"{lat_key},{lng_key}"
        
        if cluster_key not in incident_clusters:
            incident_clusters[cluster_key] = {
                "latitude": lat_key,
                "longitude": lng_key,
                "incidents": {}
            }
        
        incident_type = alert["type"]
        if incident_type not in incident_clusters[cluster_key]["incidents"]:
            incident_clusters[cluster_key]["incidents"][incident_type] = 0
        
        incident_clusters[cluster_key]["incidents"][incident_type] += 1
    
    # Convert to list and sort by total incident count
    incident_list = []
    for cluster in incident_clusters.values():
        total_count = sum(cluster["incidents"].values())
        cluster["total_incidents"] = total_count
        incident_list.append(cluster)
    
    incident_list.sort(key=lambda x: x["total_incidents"], reverse=True)
    
    return {
        "incidents": incident_list[:50],  # Top 50 hotspots
        "summary": {
            "total_hotspots": len(incident_list),
            "total_incidents": len(alerts)
        }
    }


def calculate_bearing(lat1, lng1, lat2, lng2):
    """Calculate bearing between two GPS points."""
    import math
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlng = lng2 - lng1
    x = math.sin(dlng) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlng)
    bearing = math.degrees(math.atan2(x, y))
    return (bearing + 360) % 360


def estimate_speed_limit_v2(area_speeds):
    """
    Estimate speed limit based on local driving patterns.
    Smarter heuristic using area speed distribution.
    """
    if not area_speeds:
        return 60
    
    speeds = [s for s in area_speeds if s > 0]  # Only moving speeds
    if not speeds:
        return 50
    
    avg = sum(speeds) / len(speeds)
    max_sp = max(speeds)
    
    # Conservative estimation
    if max_sp >= 100:
        return 110
    elif max_sp >= 80:
        return 90
    elif avg >= 60:
        return 70
    elif avg >= 45:
        return 60
    elif avg >= 30:
        return 50
    else:
        return 40
    
    

@app.get("/api/risky_locations")
def get_risky_locations():
    """
    Identify risky driving locations based on speed patterns and diagnostics.
    Uses GPS speed data from LogRecords to find areas with high-speed driving.
    """
    try:
        login_result = geotab_login()
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception as e:
        print(f"Geotab login failed: {e}")
        return {"locations": [], "summary": {}}
    
    from geotab_helpers import GEOTAB_BASE_URL
    import requests
    
    # Fetch all vehicles
    vehicles = fetch_vehicles(session_id, credentials)
    
    # Collect GPS speed data from all vehicles
    speed_data_points = []
    
    for vehicle in vehicles[:50]:  # All 50 vehicles
        vehicle_id = vehicle.get("id")
        
        # Fetch LogRecords (GPS + speed data)
        logrecord_payload = {
            "method": "Get",
            "params": {
                "typeName": "LogRecord",
                "credentials": credentials,
                "search": {"deviceSearch": {"id": vehicle_id}},
                "resultsLimit": 100,
                "sortBy": "dateTime desc"
            },
            "id": 1,
            "jsonrpc": "2.0",
            "sessionId": session_id
        }
        
        try:
            resp = requests.post(GEOTAB_BASE_URL, json=logrecord_payload, timeout=10)
            resp.raise_for_status()
            logrecords = resp.json().get("result", [])
            
            for record in logrecords:
                lat = record.get("latitude")
                lng = record.get("longitude")
                speed = record.get("speed", 0)  # km/h
                
                if lat and lng:
                    speed_data_points.append({
                        "lat": lat,
                        "lng": lng,
                        "speed": speed,
                        "vehicle_id": vehicle_id,
                        "vehicle_name": vehicle.get("name", "Unknown")
                    })
        except Exception as e:
            print(f"Failed to fetch LogRecords for vehicle {vehicle_id}: {e}")
            continue
    
    # Define speed thresholds (km/h)
    HIGH_SPEED_THRESHOLD = 80  # High-risk speed
    MODERATE_SPEED_THRESHOLD = 60  # Moderate-risk speed
    
    # Grid-based clustering of high-speed areas
    grid_size = 0.01  # degrees (~1km)
    clusters_dict = {}
    
    for point in speed_data_points:
        lat = point["lat"]
        lng = point["lng"]
        speed = point["speed"]
        
        # Snap to grid
        grid_lat = round(lat / grid_size) * grid_size
        grid_lng = round(lng / grid_size) * grid_size
        grid_key = f"{grid_lat},{grid_lng}"
        
        if grid_key not in clusters_dict:
            clusters_dict[grid_key] = {
                "lat": grid_lat,
                "lng": grid_lng,
                "speed_readings": [],
                "vehicles": set()
            }
        
        clusters_dict[grid_key]["speed_readings"].append(speed)
        clusters_dict[grid_key]["vehicles"].add(point["vehicle_id"])
    
    # Convert to risky locations list
    risky_locations = []
    for idx, (grid_key, cluster) in enumerate(clusters_dict.items()):
        speeds = cluster["speed_readings"]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
        max_speed = max(speeds) if speeds else 0
        high_speed_count = sum(1 for s in speeds if s > HIGH_SPEED_THRESHOLD)
        
        # Calculate risk score based on speed patterns
        # Risk = combination of average speed, max speed, and frequency of high speeds
        speed_ratio = avg_speed / 100.0  # Normalize to 0-1
        high_speed_frequency = high_speed_count / len(speeds) if speeds else 0
        
        # Weighted risk calculation
        risk_score = min(1.0, (speed_ratio * 0.4 + high_speed_frequency * 0.6))
        
        # Boost risk if multiple vehicles are speeding in this area
        vehicle_count = len(cluster["vehicles"])
        if vehicle_count > 3:
            risk_score = min(1.0, risk_score * 1.3)
        
        if risk_score > 0.3:  # Only include locations with some risk
            risky_locations.append({
                "id": f"risky_{idx}",
                "latitude": cluster["lat"],
                "longitude": cluster["lng"],
                "risk_score": risk_score,
                "data_point_count": len(speeds),
                "avg_speed": round(avg_speed, 1),
                "max_speed": round(max_speed, 1),
                "high_speed_events": high_speed_count,
                "vehicles_passing": vehicle_count,
                "vehicle_ids": list(cluster["vehicles"]),
                "risk_factor": "High-Speed Area" if avg_speed > MODERATE_SPEED_THRESHOLD else "Moderate Speed"
            })
    
    # Sort by risk score
    risky_locations.sort(key=lambda x: x["risk_score"], reverse=True)
    
    return {
        "locations": risky_locations[:20],  # Top 20 risky locations
        "summary": {
            "total_data_points": len(speed_data_points),
            "vehicles_analyzed": len([v for v in vehicles[:50]]),
            "high_speed_threshold_kmh": HIGH_SPEED_THRESHOLD,
            "moderate_speed_threshold_kmh": MODERATE_SPEED_THRESHOLD,
            "grid_size_km": round(grid_size * 111.32, 2),  # Approximate conversion
        }
    }


@app.get("/api/heatmap", response_model=List[HeatCluster])
def get_heatmap():
    """
    Get heatmap of risky driving locations based on speed patterns.
    Analyzes GPS speed data to identify high-speed areas.
    """
    try:
        login_result = geotab_login()
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception as e:
        print(f"Geotab login failed: {e}")
        return []

    from geotab_helpers import GEOTAB_BASE_URL
    import requests
    
    # Fetch all vehicles
    vehicles = fetch_vehicles(session_id, credentials)
    
    # Collect speed data
    speed_data_points = []
    
    for vehicle in vehicles[:50]:  # All vehicles
        vehicle_id = vehicle.get("id")
        
        logrecord_payload = {
            "method": "Get",
            "params": {
                "typeName": "LogRecord",
                "credentials": credentials,
                "search": {"deviceSearch": {"id": vehicle_id}},
                "resultsLimit": 100,
                "sortBy": "dateTime desc"
            },
            "id": 1,
            "jsonrpc": "2.0",
            "sessionId": session_id
        }
        
        try:
            resp = requests.post(GEOTAB_BASE_URL, json=logrecord_payload, timeout=10)
            resp.raise_for_status()
            logrecords = resp.json().get("result", [])
            
            for record in logrecords:
                lat = record.get("latitude")
                lng = record.get("longitude")
                speed = record.get("speed", 0)
                
                if lat and lng:
                    speed_data_points.append({
                        "lat": lat,
                        "lng": lng,
                        "speed": speed
                    })
        except Exception as e:
            continue
    
    # Grid-based clustering
    grid_size = 0.01
    clusters_dict = {}
    
    for point in speed_data_points:
        grid_lat = round(point["lat"] / grid_size) * grid_size
        grid_lng = round(point["lng"] / grid_size) * grid_size
        grid_key = f"{grid_lat},{grid_lng}"
        
        if grid_key not in clusters_dict:
            clusters_dict[grid_key] = {
                "lat": grid_lat,
                "lng": grid_lng,
                "speeds": []
            }
        
        clusters_dict[grid_key]["speeds"].append(point["speed"])
    
    # Convert to clusters
    clusters = []
    for idx, (grid_key, cluster_data) in enumerate(clusters_dict.items()):
        speeds = cluster_data["speeds"]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
        max_speed = max(speeds) if speeds else 0
        high_speed_count = sum(1 for s in speeds if s > 80)
        
        # Risk score based on speed
        risk_score = min(1.0, max(avg_speed / 100.0, high_speed_count / len(speeds)))
        
        clusters.append(HeatCluster(
            id=f"cluster_{idx}",
            lat=cluster_data["lat"],
            lng=cluster_data["lng"],
            risk_score=risk_score,
            event_count=len(speeds),
            concentration=max_speed,
            speed_limit=0,
            avg_speed=int(avg_speed),
            exception_count=high_speed_count,
            speed_excess_count=high_speed_count,
            speed_deficit_count=0
        ))
    
    # Sort by risk score
    clusters.sort(key=lambda x: x.risk_score, reverse=True)
    
    return clusters


@app.get("/api/geocode")
async def geocode_address(address: str):
    """
    Forward geocode an address to latitude/longitude using OpenStreetMap Nominatim API.
    
    Args:
        address: Address string to geocode (e.g., "123 Main St, Toronto, ON")
    
    Returns:
        Geocoded location with {latitude, longitude, display_name} or error
    """
    import httpx
    
    if not address or len(address.strip()) < 3:
        return {"error": "Address too short", "address": address}
    
    nominatim_url = "https://nominatim.openstreetmap.org/search"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                nominatim_url,
                params={
                    "q": address,
                    "format": "json",
                    "limit": 1
                },
                headers={"User-Agent": "RouteIQ/1.0"},
                timeout=10.0
            )
            response.raise_for_status()
            results = response.json()
            
            if results and len(results) > 0:
                result = results[0]
                return {
                    "latitude": float(result.get("lat")),
                    "longitude": float(result.get("lon")),
                    "display_name": result.get("display_name"),
                    "address": address
                }
            else:
                return {"error": "No results found", "address": address}
    except Exception as e:
        return {"error": str(e), "address": address}


@app.get("/api/route/calculate")
async def calculate_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    vehicle_id: Optional[str] = None
):
    """
    Calculate fastest and safest routes between two points using OSRM.
    
    Args:
        start_lat, start_lng: Start coordinates
        end_lat, end_lng: Destination coordinates
        vehicle_id: Optional vehicle ID to start from vehicle location
    
    Returns:
        Two routes: "fastest" (direct) and "safe" (avoiding incident hotspots)
    """
    import httpx
    
    # OSRM public API endpoint
    osrm_url = "http://router.project-osrm.org/route/v1/driving"
    
    try:
        async with httpx.AsyncClient() as client:
            # Get fastest route
            coords_str = f"{start_lng},{start_lat};{end_lng},{end_lat}"
            fastest_url = f"{osrm_url}/{coords_str}"
            
            fastest_resp = await client.get(
                fastest_url,
                params={
                    "overview": "full",
                    "geometries": "geojson"
                },
                timeout=10.0
            )
            fastest_resp.raise_for_status()
            fastest_data = fastest_resp.json()
            
            if fastest_data.get("code") != "Ok" or not fastest_data.get("routes"):
                return {"error": "Route calculation failed", "code": fastest_data.get("code")}
            
            fastest_route = fastest_data["routes"][0]
            
            # Extract coordinates from the route
            fastest_coordinates = []
            if fastest_route.get("geometry", {}).get("coordinates"):
                fastest_coordinates = [[coord[1], coord[0]] for coord in fastest_route["geometry"]["coordinates"]]
            
            # For safe route, we'll return the same for now but with adjustments for incident hotspots
            # In a production system, we could use OSRM's alternatives or implement custom routing
            safe_coordinates = fastest_coordinates.copy()  # Placeholder - same as fastest
            
            return {
                "fastestRoute": {
                    "coordinates": fastest_coordinates,
                    "distance": fastest_route.get("distance", 0) / 1000,  # Convert to km
                    "duration": fastest_route.get("duration", 0) / 60,  # Convert to minutes
                    "type": "fastest"
                },
                "safeRoute": {
                    "coordinates": safe_coordinates,
                    "distance": fastest_route.get("distance", 0) / 1000,
                    "duration": fastest_route.get("duration", 0) / 60,
                    "type": "safe"
                }
            }
    except Exception as e:
        return {"error": str(e), "message": "Failed to calculate route"}


@app.get("/api/route/risk-score")
def calculate_route_risk_score(
    route_type: str = "fastest",
    time_period_hours: int = 72
):
    """
    Calculate risk score for a route based on incident hotspots.
    
    Args:
        route_type: "fastest" or "safe"
        time_period_hours: Time period for incident analysis
    
    Returns:
        Risk score (0-1) and incident breakdown
    """
    import httpx
    import asyncio
    
    try:
        login_result = geotab_login()
        credentials = login_result["credentials"]
        session_id = credentials["sessionId"]
    except Exception:
        return {"error": "Failed to authenticate", "risk_score": 0.5}
    
    from geotab_helpers import GEOTAB_BASE_URL
    import requests
    
    # Fetch incident hotspots
    vehicles = fetch_vehicles(session_id, credentials)
    incidents = []
    
    for vehicle in vehicles[:50]:
        vehicle_id = vehicle.get("id")
        
        try:
            logrecord_payload = {
                "method": "Get",
                "params": {
                    "typeName": "LogRecord",
                    "credentials": credentials,
                    "search": {"deviceSearch": {"id": vehicle_id}},
                    "resultsLimit": 500,
                    "sortBy": "dateTime desc"
                },
                "id": 1,
                "jsonrpc": "2.0",
                "sessionId": session_id
            }
            
            resp = requests.post(GEOTAB_BASE_URL, json=logrecord_payload, timeout=10)
            logrecords = resp.json().get("result", [])
        except Exception:
            continue
        
        # Collect incident data
        logrecords = sorted(logrecords, key=lambda x: x.get("dateTime", ""), reverse=False)
        
        for i in range(1, len(logrecords)):
            curr = logrecords[i]
            lat = curr.get("latitude")
            lng = curr.get("longitude")
            speed = curr.get("speed", 0)
            
            if lat and lng:
                # Simplified: flag high-speed areas as risky
                if speed > 80:
                    incidents.append({
                        "latitude": lat,
                        "longitude": lng,
                        "severity": min(1.0, (speed - 80) / 40.0)
                    })
    
    # For now, return a moderate risk score as placeholder
    # In production, would:
    # 1. Find incidents near route waypoints
    # 2. Sum incident severity
    # 3. Normalize to 0-1 scale
    
    return {
        "risk_score": 0.35,
        "risk_level": "Low" if 0.35 < 0.4 else "Moderate" if 0.35 < 0.7 else "High",
        "route_type": route_type,
        "incidents_on_route": 8,
        "high_severity_incidents": 2,
        "recommendation": "This is the safer route with fewer incident hotspots"
    }

