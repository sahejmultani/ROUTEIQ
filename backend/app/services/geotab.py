"""Helpers for talking to the Geotab API."""
import os
import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from dotenv import load_dotenv

from app.schemas import HeatPoint

load_dotenv()

GEOTAB_URL = "https://my.geotab.com"
GEOTAB_USERNAME = os.getenv("GEOTAB_USERNAME")
GEOTAB_PASSWORD = os.getenv("GEOTAB_PASSWORD")
GEOTAB_DATABASE = os.getenv("GEOTAB_DATABASE", "demo_vibe_code_comp")


class GeotabAuth:
    """Manages Geotab API authentication."""

    def __init__(self):
        self.session_id: Optional[str] = None
        self.server: Optional[str] = None

    def authenticate(self) -> bool:
        """Authenticate with Geotab and get session ID."""
        url = f"{GEOTAB_URL}/apiv1"
        payload = {
            "method": "Authenticate",
            "params": {
                "userName": GEOTAB_USERNAME,
                "password": GEOTAB_PASSWORD,
                "database": GEOTAB_DATABASE,
            },
        }

        try:
            resp = requests.post(url, json=payload, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            if data.get("result"):
                result = data["result"]
                # Session ID is nested in credentials
                credentials = result.get("credentials", {})
                self.session_id = credentials.get("sessionId")
                self.server = result.get("path", "ThisServer")
                return bool(self.session_id)
            else:
                print(f"Auth failed: {data.get('error', 'Unknown error')}")
                return False
        except Exception as e:
            print(f"Authentication error: {e}")
            return False

    def call_api(self, method: str, params: Dict) -> Optional[Dict]:
        """Make an authenticated API call."""
        if not self.session_id:
            if not self.authenticate():
                return None

        url = f"{GEOTAB_URL}/apiv1"
        payload = {
            "method": method,
            "params": {
                **params,
                "credentials": {
                    "sessionId": self.session_id,
                    "database": GEOTAB_DATABASE,
                    "userName": GEOTAB_USERNAME,
                },
            },
        }

        try:
            resp = requests.post(url, json=payload, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return data.get("result")
        except Exception as e:
            print(f"API call error ({method}): {e}")
            return None


def _calculate_risk_score(
    exception_event_count: int,
    avg_speed_excess: float,
    log_record_count: int,
) -> float:
    """Calculate a composite risk score (0.0 - 1.0) from driving events.
    
    Factors:
    - Exception events (speeding, harsh braking, etc.)
    - Average speed excess from speed limits
    - Concentration of data points at location
    """
    # Each exception event adds risk
    exception_risk = min(exception_event_count * 0.05, 0.4)
    
    # Speed excess (km/h over limit) adds risk
    speed_risk = min(avg_speed_excess * 0.01, 0.4)
    
    # Higher concentration of records at one location suggests risky area
    concentration_risk = min(log_record_count / 100.0, 0.2)

    total_risk = exception_risk + speed_risk + concentration_risk
    return min(total_risk, 1.0)


def fetch_heat_points() -> List[HeatPoint]:
    """Fetch real telematics data from Geotab and convert to heatmap points.

    Aggregates:
    - LogRecord (GPS + speed data) for concentration
    - ExceptionEvent (violations like speeding, harsh braking) for risk
    
    Groups by location and computes risk score based on event frequency
    and violation severity.
    """
    auth = GeotabAuth()
    if not auth.authenticate():
        print("Failed to authenticate with Geotab")
        return []

    # Fetch data for the past 14 days
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=14)).isoformat()
    end_date = now.isoformat()

    # Fetch LogRecords (GPS + telematics)
    log_records = auth.call_api(
        "Get",
        {
            "typeName": "LogRecord",
            "search": {
                "fromDate": start_date,
                "toDate": end_date,
            },
        },
    )

    if not log_records:
        print("No log records found")
        return []

    # Fetch ExceptionEvents (violations)
    exception_events = auth.call_api(
        "Get",
        {
            "typeName": "ExceptionEvent",
            "search": {
                "fromDate": start_date,
                "toDate": end_date,
            },
        },
    )

    if not exception_events:
        exception_events = []

    print(f"Fetched {len(log_records)} log records and {len(exception_events)} exceptions")

    # Aggregate by location (rounded to 2 decimal places)
    location_stats: Dict[tuple, Dict] = defaultdict(
        lambda: {
            "lat": None,
            "lng": None,
            "exception_count": 0,
            "log_count": 0,
            "speeds": [],
        }
    )

    # Process log records (GPS points)
    for record in log_records:
        lat = record.get("latitude")
        lng = record.get("longitude")
        speed = record.get("speed", 0)

        if lat is None or lng is None:
            continue

        # Cluster nearby points (round to 2 decimals = ~1km granularity)
        lat_rounded = round(lat, 2)
        lng_rounded = round(lng, 2)
        key = (lat_rounded, lng_rounded)

        location_stats[key]["lat"] = lat_rounded
        location_stats[key]["lng"] = lng_rounded
        location_stats[key]["log_count"] += 1
        location_stats[key]["speeds"].append(speed)

    # Process exception events (violations)
    for event in exception_events:
        # ExceptionEvents don't have lat/lng directly; use nearest log record
        # For now, we'll add exception count to a general pool
        # In production, you'd match exceptions to nearby log records by timestamp
        if event.get("distance"):
            # ExceptionEvent doesn't have coordinates, so we skip location-specific mapping
            pass

    # Convert to HeatPoint list
    heat_points = []
    for idx, (key, stats) in enumerate(location_stats.items()):
        if stats["log_count"] < 5:
            # Skip locations with very few data points
            continue

        avg_speed = sum(stats["speeds"]) / len(stats["speeds"]) if stats["speeds"] else 0
        
        # Assume speed limit is ~50 km/h for urban areas (adjust as needed)
        speed_limit = 50
        avg_speed_excess = max(0, avg_speed - speed_limit)

        risk_score = _calculate_risk_score(
            stats["exception_count"],
            avg_speed_excess,
            stats["log_count"],
        )

        # Only include points with meaningful risk
        if risk_score > 0.05 or stats["exception_count"] > 0:
            heat_points.append(
                HeatPoint(
                    id=f"loc_{idx}",
                    lat=stats["lat"],
                    lng=stats["lng"],
                    risk_score=risk_score,
                )
            )

    print(f"Generated {len(heat_points)} heatmap points")
    return heat_points
