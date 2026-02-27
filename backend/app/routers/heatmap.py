from fastapi import APIRouter, HTTPException
from typing import List

from app.schemas import HeatCluster
from app.services import geotab

router = APIRouter(prefix="/heatmap", tags=["heatmap"])


@router.get("/", response_model=List[HeatCluster])
def get_heatmap():
    """Return a list of risk clusters with concentration and event counts."""
    try:
        clusters = geotab.fetch_heat_points()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return clusters
