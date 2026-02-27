from fastapi import APIRouter, HTTPException
from typing import List

from app.schemas import HeatPoint
from app.services import geotab

router = APIRouter(prefix="/heatmap", tags=["heatmap"])


@router.get("/", response_model=List[HeatPoint])
def get_heatmap():
    """Return a list of points with a risk_score.  
    Currently this is a stub; replace with real geotab data.
    """
    try:
        points = geotab.fetch_heat_points()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return points
