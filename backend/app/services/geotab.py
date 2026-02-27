"""Helpers for talking to the Geotab API."""
import os
import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from dotenv import load_dotenv
import math

from app.schemas import HeatPoint, HeatCluster
from app.services.osm import get_speed_limit_for_location

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
    avg_speed: float,
    speed_limit: int,
    log_record_count: int,
    speeds: list,
) -> tuple:
    """Calculate composite risk score and related metrics.
    
    Risk Factors:
    - Exception events (speeding, harsh braking, etc.)
    - Speed deviation: ±12 km/h from limit triggers risk
      * >12 km/h over: aggressive speeding
      * >12 km/h under: potential congestion/traffic issues
    - Data concentration at location (indicates high-traffic area)
    
    Returns:
        Tuple of (risk_score, speed_excess_count, speed_deficit_count)
        where risk_score is 0.0-1.0
    """
    # Each exception event adds risk (5% per event, max 40%)
    exception_risk = min(exception_event_count * 0.05, 0.4)
    
    # Count speed deviations with ±12 km/h tolerance
    speed_excess_count = 0
    speed_deficit_count = 0
    
    for speed in speeds:
        if speed > speed_limit + 12:
            speed_excess_count += 1
        elif speed < speed_limit - 12:
            speed_deficit_count += 1
    
    # Speed deviation risk: percentage of events violating tolerance
    total_speed_events = speed_excess_count + speed_deficit_count
    speed_event_pct = total_speed_events / max(len(speeds), 1)
    speed_risk = min(speed_event_pct * 0.4, 0.4)
    
    # Concentration risk: high traffic density at location
    concentration_risk = min(log_record_count / 100.0, 0.2)
    
    total_risk = exception_risk + speed_risk + concentration_risk
    return min(total_risk, 1.0), speed_excess_count, speed_deficit_count


def fetch_heat_points() -> List[HeatCluster]:
    """Fetch real telematics data from Geotab and return risk clusters.

    Creates geographic clusters of high-risk areas based on:
    - Event concentration (log records)
    - Violation frequency (exception events)
    - Speed violations
    
    Returns larger clusters highlighting areas with risky driving patterns.
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

    # Aggregate by location (2 decimal = ~500m-1km granularity for clustering)
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

        # Cluster with 0.05 decimal = ~500m-1km granularity for neighborhood-level clusters
        lat_rounded = round(lat, 2)
        lng_rounded = round(lng, 2)
        key = (lat_rounded, lng_rounded)

        location_stats[key]["lat"] = lat_rounded
        location_stats[key]["lng"] = lng_rounded
        location_stats[key]["log_count"] += 1
        location_stats[key]["speeds"].append(speed)

    # Process exception events (violations)
    for event in exception_events:
        # Exception events may not have exact lat/lng, but they have driver/device info
        # For now, we'll estimate based on the distance field or skip if not locatable
        # In a real scenario, you'd track driver location at time of event
        if "longitude" in event and "latitude" in event:
            lat = event.get("latitude")
            lng = event.get("longitude")
            
            if lat is not None and lng is not None:
                lat_rounded = round(lat, 2)
                lng_rounded = round(lng, 2)
                key = (lat_rounded, lng_rounded)
                
                # Only count exception if we have a cluster for that location
                if key in location_stats:
                    location_stats[key]["exception_count"] += 1

    # Convert to HeatCluster list
    heat_clusters = []
    
    # Calculate max event count for normalization
    max_event_count = max(
        [stats["log_count"] for stats in location_stats.values()],
        default=1
    )

    for idx, (key, stats) in enumerate(location_stats.items()):
        if stats["log_count"] < 20:
            # Skip locations with very few data points
            continue

        avg_speed = sum(stats["speeds"]) / len(stats["speeds"]) if stats["speeds"] else 0
        
        # Get actual speed limit from OpenStreetMap
        speed_limit = get_speed_limit_for_location(stats["lat"], stats["lng"])
        
        # Calculate risk with actual speed limit and speeds array
        risk_score, speed_excess_cnt, speed_deficit_cnt = _calculate_risk_score(
            stats["exception_count"],
            avg_speed,
            speed_limit,
            stats["log_count"],
            stats["speeds"],
        )

        # Concentration: relative to max event count in area
        concentration = min(stats["log_count"] / max_event_count, 1.0)

        # Include clusters with at least 20 data points
        if stats["log_count"] > 20:
            heat_clusters.append(
                HeatCluster(
                    id=f"cluster_{idx}",
                    lat=stats["lat"],
                    lng=stats["lng"],
                    risk_score=risk_score,
                    event_count=stats["log_count"],
                    concentration=concentration,
                    speed_limit=speed_limit,
                    avg_speed=round(avg_speed, 1),
                    exception_count=stats["exception_count"],
                    speed_excess_count=speed_excess_cnt,
                    speed_deficit_count=speed_deficit_cnt,
                )
            )

    print(f"Generated {len(heat_clusters)} risk clusters")
    return heat_clusters
