"""OpenStreetMap speed limit service."""
import requests
from typing import Optional, Dict, List
from functools import lru_cache


OVERPASS_URL = "http://overpass-api.de/api/interpreter"
SPEED_LIMIT_CACHE: Dict[tuple, int] = {}


def _query_overpass(lat: float, lng: float, radius: float = 0.01) -> Optional[Dict]:
    """Query Overpass API for speed limits near a coordinate.
    
    Args:
        lat: Latitude
        lng: Longitude
        radius: Search radius in decimal degrees (~1km = 0.009 degrees)
    
    Returns:
        Overpass API response or None if error
    """
    try:
        south = lat - radius
        west = lng - radius
        north = lat + radius
        east = lng + radius
        
        query = f"""
        [bbox:{south},{west},{north},{east}];
        (
          way["maxspeed"];
          relation["maxspeed"];
        );
        out body geom;
        """
        
        # Use shorter timeout to fail fast
        response = requests.post(OVERPASS_URL, data={"data": query}, timeout=2)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        # Silently fail - we'll use default speed limit
        return None


def _parse_speed_limit(maxspeed_str: str) -> Optional[int]:
    """Parse OSM maxspeed tag to integer.
    
    Handles formats like: "50", "50 km/h", "30 mph", etc.
    Returns speed in km/h, or None if unparseable.
    """
    if not maxspeed_str:
        return None
    
    try:
        # Remove common units
        speed_str = maxspeed_str.lower().strip()
        speed_str = speed_str.replace(" km/h", "").replace(" kmh", "").replace("kmh", "")
        speed_str = speed_str.replace(" mph", "")
        
        speed = int(speed_str)
        
        # If it's in mph (typically UK), convert to km/h
        # Most OSM data uses km/h, but some regions use mph
        # Assume if it's a UK-like value (like 30, 40 mph), convert it
        # This is a heuristic; ideally check the region
        if "mph" in maxspeed_str.lower():
            speed = int(speed * 1.60934)
        
        return speed
    except ValueError:
        return None


def get_speed_limit_for_location(lat: float, lng: float) -> int:
    """Get speed limit for a location from OSM.
    
    Uses caching to avoid repeated API calls for nearby coordinates.
    Falls back to 50 km/h (urban default) if not found.
    
    Args:
        lat: Latitude
        lng: Longitude
    
    Returns:
        Speed limit in km/h (default 50 if not found)
    """
    # Round to 3 decimals (~100m) for cache key
    cache_key = (round(lat, 3), round(lng, 3))
    
    if cache_key in SPEED_LIMIT_CACHE:
        return SPEED_LIMIT_CACHE[cache_key]
    
    # Query Overpass API
    data = _query_overpass(lat, lng)
    speed_limit = 50  # Default urban speed limit
    
    if data and "elements" in data:
        elements = data["elements"]
        
        # Find ways/relations with maxspeed tag
        speeds = []
        for elem in elements:
            if "tags" in elem and "maxspeed" in elem["tags"]:
                parsed = _parse_speed_limit(elem["tags"]["maxspeed"])
                if parsed:
                    speeds.append(parsed)
        
        # Use the most common speed limit in the area
        if speeds:
            speed_limit = max(set(speeds), key=speeds.count)
    
    # Cache result
    SPEED_LIMIT_CACHE[cache_key] = speed_limit
    
    return speed_limit


def batch_get_speed_limits(locations: List[tuple]) -> Dict[tuple, int]:
    """Batch fetch speed limits for multiple locations.
    
    Args:
        locations: List of (lat, lng) tuples
    
    Returns:
        Dict mapping location tuple to speed limit
    """
    results = {}
    for lat, lng in locations:
        results[(lat, lng)] = get_speed_limit_for_location(lat, lng)
    return results
