import requests
import json
from datetime import datetime, timedelta, timezone

url = "https://my.geotab.com/apiv1"

# Query for DrivingBehaviorEvent or other event types
for event_type in ["DrivingBehaviorEvent", "LogRecord", "ExceptionEvent"]:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=7)
    
    payload = {
        "method": "Get",
        "params": {
            "typeName": event_type,
            "credentials": {
                "sessionId": "pTw-4n6t6zaGp3VmiREDww",
                "database": "demo_vibe_code_comp",
                "userName": "sahejmultanii@gmail.com",
            },
            "search": {
                "fromDate": start.isoformat(),
                "toDate": now.isoformat(),
            },
        },
    }

    resp = requests.post(url, json=payload, timeout=10)
    data = resp.json()

    if data.get("result"):
        events = data["result"]
        print(f"\n{event_type}: Found {len(events)} events")
        if events:
            print(f"Sample {event_type}:")
            print(json.dumps(events[0], indent=2, default=str))
    else:
        print(f"\n{event_type}: Error or no data")
        err = json.dumps(data, indent=2, default=str)
        print(err[:500])



