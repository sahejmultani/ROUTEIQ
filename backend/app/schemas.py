from pydantic import BaseModel


class HeatPoint(BaseModel):
    id: str
    lat: float
    lng: float
    risk_score: float  # 0.0 - 1.0, higher means more dangerous
