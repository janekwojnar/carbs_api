from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path("audit.sqlite3")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_workout_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                source TEXT NOT NULL,
                external_id TEXT,
                sport TEXT NOT NULL,
                status TEXT NOT NULL,
                start_time TEXT,
                duration_minutes REAL,
                intensity_rpe REAL,
                avg_heart_rate_bpm REAL,
                max_heart_rate_bpm REAL,
                avg_power_watts REAL,
                normalized_power_watts REAL,
                avg_cadence REAL,
                distance_km REAL,
                elevation_gain_m REAL,
                tss REAL,
                completed_carbs_g REAL,
                completed_fluids_ml REAL,
                completed_sodium_mg REAL,
                temperature_c REAL,
                humidity_pct REAL,
                notes TEXT,
                created_at TEXT NOT NULL
            )
            """
        )


def add_workout(user_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = dict(payload)
    data.setdefault("source", "manual")
    data.setdefault("status", "completed")
    data.setdefault("created_at", datetime.now(timezone.utc).isoformat())

    with _conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO workouts (
                user_id, source, external_id, sport, status, start_time, duration_minutes,
                intensity_rpe, avg_heart_rate_bpm, max_heart_rate_bpm, avg_power_watts,
                normalized_power_watts, avg_cadence, distance_km, elevation_gain_m, tss,
                completed_carbs_g, completed_fluids_ml, completed_sodium_mg, temperature_c,
                humidity_pct, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                data.get("source"),
                data.get("external_id"),
                data.get("sport"),
                data.get("status"),
                data.get("start_time"),
                data.get("duration_minutes"),
                data.get("intensity_rpe"),
                data.get("avg_heart_rate_bpm"),
                data.get("max_heart_rate_bpm"),
                data.get("avg_power_watts"),
                data.get("normalized_power_watts"),
                data.get("avg_cadence"),
                data.get("distance_km"),
                data.get("elevation_gain_m"),
                data.get("tss"),
                data.get("completed_carbs_g"),
                data.get("completed_fluids_ml"),
                data.get("completed_sodium_mg"),
                data.get("temperature_c"),
                data.get("humidity_pct"),
                data.get("notes"),
                data.get("created_at"),
            ),
        )
        wid = cursor.lastrowid
    return {"id": wid, **data}


def list_workouts(
    user_id: int,
    limit: int = 100,
    status: Optional[str] = None,
    source: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = "SELECT * FROM workouts WHERE user_id = ?"
    params: List[Any] = [user_id]
    if status:
        query += " AND status = ?"
        params.append(status)
    if source:
        query += " AND source = ?"
        params.append(source)
    query += " ORDER BY coalesce(start_time, created_at) DESC LIMIT ?"
    params.append(limit)

    with _conn() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
    return [dict(row) for row in rows]


def analytics_summary(user_id: int, days: int = 30) -> Dict[str, Any]:
    with _conn() as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*) AS sessions,
                AVG(duration_minutes) AS avg_duration_minutes,
                AVG(avg_heart_rate_bpm) AS avg_heart_rate_bpm,
                AVG(avg_power_watts) AS avg_power_watts,
                AVG(intensity_rpe) AS avg_rpe,
                SUM(distance_km) AS total_distance_km,
                SUM(completed_carbs_g) AS total_carbs_g
            FROM workouts
            WHERE user_id = ? AND status = 'completed' AND datetime(created_at) >= datetime('now', ?)
            """,
            (user_id, f"-{days} days"),
        ).fetchone()

    result = dict(row) if row else {}
    for key in list(result.keys()):
        if result[key] is None:
            result[key] = 0
    return result


def analytics_chart_series(user_id: int, days: int = 30) -> Dict[str, Any]:
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT
                date(coalesce(start_time, created_at)) as d,
                AVG(avg_heart_rate_bpm) as avg_hr,
                AVG(avg_power_watts) as avg_power,
                SUM(duration_minutes) as total_minutes,
                SUM(completed_carbs_g) as carbs_g,
                SUM(distance_km) as distance_km
            FROM workouts
            WHERE user_id = ? AND datetime(created_at) >= datetime('now', ?)
            GROUP BY d
            ORDER BY d ASC
            """,
            (user_id, f"-{days} days"),
        ).fetchall()

    labels: List[str] = []
    avg_hr: List[float] = []
    avg_power: List[float] = []
    total_minutes: List[float] = []
    carbs_g: List[float] = []
    distance_km: List[float] = []

    for row in rows:
        labels.append(row["d"])
        avg_hr.append(round(row["avg_hr"] or 0, 1))
        avg_power.append(round(row["avg_power"] or 0, 1))
        total_minutes.append(round(row["total_minutes"] or 0, 1))
        carbs_g.append(round(row["carbs_g"] or 0, 1))
        distance_km.append(round(row["distance_km"] or 0, 1))

    return {
        "labels": labels,
        "avg_hr": avg_hr,
        "avg_power": avg_power,
        "total_minutes": total_minutes,
        "carbs_g": carbs_g,
        "distance_km": distance_km,
    }
