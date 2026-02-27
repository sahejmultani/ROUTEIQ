from pydantic import BaseModel


class HeatPoint(BaseModel):
    id: str
    lat: float
    lng: float
    risk_score: float  # 0.0 - 1.0, higher means more dangerous


class HeatCluster(BaseModel):
    id: str
    lat: float
    lng: float
    risk_score: float  # Average risk in this cluster (0-1)
    event_count: int  # Number of events (log records) in this cluster
    concentration: float  # Relative concentration (0-1)
    speed_limit: int  # Posted speed limit in km/h
    avg_speed: float  # Average speed in cluster
    exception_count: int  # Number of violation events
    speed_excess_count: int  # Events exceeding speed limit by >12 km/h
    speed_deficit_count: int  # Events going >12 km/h under speed limit
