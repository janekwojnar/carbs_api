from __future__ import annotations

from typing import Any, Dict, List

from src.integrations.providers import fetch_garmin_workouts, fetch_strava_workouts
from src.storage.integrations import list_connections


def integration_status(user_id: int) -> List[Dict[str, Any]]:
    base = list_connections(user_id)
    for item in base:
        if item["provider"] == "strava":
            item["supports"] = ["completed", "planned_placeholder"]
        if item["provider"] == "garmin_connect":
            item["supports"] = ["planned", "completed"]
    return base


def pull_workouts(provider: str, access_token: str, kind: str) -> List[Dict[str, Any]]:
    if provider == "strava":
        return fetch_strava_workouts(access_token=access_token, kind=kind)
    if provider == "garmin_connect":
        return fetch_garmin_workouts(access_token=access_token, kind=kind)
    return []
