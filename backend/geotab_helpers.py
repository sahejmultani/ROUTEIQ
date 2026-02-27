import requests
import os
from dotenv import load_dotenv

load_dotenv()

GEOTAB_BASE_URL = "https://my.geotab.com/apiv1/"
GEOTAB_DATABASE = os.environ.get("GEOTAB_DATABASE", "demo_vibe_code_comp")
GEOTAB_USERNAME = os.environ.get("GEOTAB_USERNAME", "")
GEOTAB_PASSWORD = os.environ.get("GEOTAB_PASSWORD", "")

def geotab_login():
    payload = {
        "method": "Authenticate",
        "params": {
            "database": GEOTAB_DATABASE,
            "userName": GEOTAB_USERNAME,
            "password": GEOTAB_PASSWORD
        },
        "id": 1,
        "jsonrpc": "2.0"
    }
    resp = requests.post(GEOTAB_BASE_URL, json=payload)
    resp.raise_for_status()
    return resp.json()["result"]

def fetch_trip_events(session_id, credentials):
    payload = {
        "method": "Get",
        "params": {
            "typeName": "StatusData",
            "credentials": credentials,
            "search": {
                # Add filters as needed
            }
        },
        "id": 1,
        "jsonrpc": "2.0",
        "sessionId": session_id
    }
    resp = requests.post(GEOTAB_BASE_URL, json=payload)
    resp.raise_for_status()
    return resp.json()["result"]["data"]
