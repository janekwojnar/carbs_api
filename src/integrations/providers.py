from __future__ import annotations

import json
import os
from typing import Any, Dict, List
from urllib import parse, request


class IntegrationError(Exception):
    pass


def _get_json(url: str, access_token: str) -> Any:
    req = request.Request(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
    )
    try:
        with request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        raise IntegrationError(str(exc)) from exc


def fetch_strava_workouts(access_token: str, kind: str = "completed", per_page: int = 50) -> List[Dict[str, Any]]:
    if kind == "planned":
        return []

    url = (
        "https://www.strava.com/api/v3/athlete/activities?"
        + parse.urlencode({"page": 1, "per_page": per_page})
    )
    activities = _get_json(url, access_token)

    workouts: List[Dict[str, Any]] = []
    for a in activities:
        workouts.append(
            {
                "source": "strava",
                "external_id": str(a.get("id")),
                "sport": (a.get("sport_type") or a.get("type") or "running").lower().replace(" ", "_"),
                "status": "completed",
                "start_time": a.get("start_date"),
                "duration_minutes": round((a.get("moving_time") or 0) / 60.0, 1),
                "distance_km": round((a.get("distance") or 0) / 1000.0, 2),
                "elevation_gain_m": a.get("total_elevation_gain"),
                "avg_heart_rate_bpm": a.get("average_heartrate"),
                "max_heart_rate_bpm": a.get("max_heartrate"),
                "avg_power_watts": a.get("average_watts"),
                "normalized_power_watts": a.get("weighted_average_watts"),
                "avg_cadence": a.get("average_cadence"),
                "notes": a.get("name"),
            }
        )
    return workouts


def fetch_garmin_workouts(access_token: str, kind: str = "completed") -> List[Dict[str, Any]]:
    # Garmin Connect does not offer a stable public API for direct consumer OAuth.
    # If GARMIN_PROXY_URL is configured, this app can call a partner/proxy endpoint.
    base_url = os.getenv("GARMIN_PROXY_URL", "").strip()
    if not base_url:
        return []

    url = base_url.rstrip("/") + f"/workouts?kind={kind}"
    data = _get_json(url, access_token)
    if not isinstance(data, list):
        return []

    workouts: List[Dict[str, Any]] = []
    for w in data:
        workouts.append(
            {
                "source": "garmin_connect",
                "external_id": str(w.get("external_id") or ""),
                "sport": (w.get("sport") or "running").lower(),
                "status": kind,
                "start_time": w.get("start_time"),
                "duration_minutes": w.get("duration_minutes"),
                "distance_km": w.get("distance_km"),
                "elevation_gain_m": w.get("elevation_gain_m"),
                "avg_heart_rate_bpm": w.get("avg_heart_rate_bpm"),
                "max_heart_rate_bpm": w.get("max_heart_rate_bpm"),
                "avg_power_watts": w.get("avg_power_watts"),
                "normalized_power_watts": w.get("normalized_power_watts"),
                "avg_cadence": w.get("avg_cadence"),
                "notes": w.get("notes"),
            }
        )
    return workouts
