"""Helpers for talking to the Geotab API."""
import os
import requests
from typing import List

from app.schemas import HeatPoint


GEO_TAB_URL = "https://my.geotab.com"


def _auth_session():
    # real code would manage session tokens, etc.
    sess = requests.Session()
    # this is where you'd do the call to /apiv1 using credentials
    return sess


def fetch_heat_points() -> List[HeatPoint]:
    """Fetch raw telematics data and convert to heatmap points.

    This function needs to implement the risk-calculation logic:
      * aggressive braking events
      * speed vs posted speed limit
      * long idling/slow speed in confined areas (blind spots)

    For now we return a fixed sample set.
    """
    # TODO: implement proper geotab integration here
    # sample data until the real integration is implemented
    return [
        HeatPoint(id="1", lat=37.77, lng=-122.42, risk_score=0.8),
        HeatPoint(id="2", lat=37.78, lng=-122.41, risk_score=0.3),
    ]
