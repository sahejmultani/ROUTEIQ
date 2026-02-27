import requests
import os
from dotenv import load_dotenv

load_dotenv()

GEOTAB_BASE_URL = "https://my.geotab.com/apiv1/"  # Exported for use in main.py
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
    raw = resp.json()
    print('Raw Geotab API response:', raw)
    print('Type of raw:', type(raw))
    if 'result' in raw:
        print('Type of raw["result"]:', type(raw["result"]))
        if isinstance(raw["result"], dict):
            print('Keys in raw["result"]:', list(raw["result"].keys()))
    return raw["result"]
