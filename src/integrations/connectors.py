from __future__ import annotations

from typing import Dict, List


SUPPORTED_INTEGRATIONS = [
    "garmin",
    "strava",
    "trainingpeaks",
    "zwift",
    "apple_health",
    "csv_import_export",
    "webhooks",
]


def integration_status() -> List[Dict[str, str]]:
    return [
        {"provider": name, "status": "planned", "notes": "Adapter scaffold ready"}
        for name in SUPPORTED_INTEGRATIONS
    ]
