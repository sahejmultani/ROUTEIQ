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
    risk_score: float  # Average risk in this cluster
    event_count: int  # Number of events in this cluster
    concentration: float  # Relative concentration (0-1)
