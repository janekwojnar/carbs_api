from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.storage.db import get_db_path


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row[1] == column for row in rows)


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
                updated_at TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        if not _column_exists(conn, "workouts", "updated_at"):
            conn.execute("ALTER TABLE workouts ADD COLUMN updated_at TEXT")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workout_fueling_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                workout_id INTEGER NOT NULL,
                minute_offset INTEGER NOT NULL,
                event_time_iso TEXT,
                food_name TEXT,
                carbs_g REAL NOT NULL DEFAULT 0,
                fluid_ml REAL NOT NULL DEFAULT 0,
                sodium_mg REAL NOT NULL DEFAULT 0,
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
    data.setdefault("updated_at", data["created_at"])

    with _conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO workouts (
                user_id, source, external_id, sport, status, start_time, duration_minutes,
                intensity_rpe, avg_heart_rate_bpm, max_heart_rate_bpm, avg_power_watts,
                normalized_power_watts, avg_cadence, distance_km, elevation_gain_m, tss,
                completed_carbs_g, completed_fluids_ml, completed_sodium_mg, temperature_c,
                humidity_pct, notes, updated_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                data.get("updated_at"),
                data.get("created_at"),
            ),
        )
        wid = cursor.lastrowid
    return {"id": wid, **data}


def get_workout(user_id: int, workout_id: int) -> Optional[Dict[str, Any]]:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM workouts WHERE id = ? AND user_id = ?",
            (workout_id, user_id),
        ).fetchone()
    return dict(row) if row else None


def update_workout(user_id: int, workout_id: int, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    allowed = {
        "duration_minutes",
        "intensity_rpe",
        "avg_heart_rate_bpm",
        "max_heart_rate_bpm",
        "avg_power_watts",
        "normalized_power_watts",
        "avg_cadence",
        "distance_km",
        "elevation_gain_m",
        "tss",
        "completed_carbs_g",
        "completed_fluids_ml",
        "completed_sodium_mg",
        "temperature_c",
        "humidity_pct",
        "notes",
        "start_time",
        "status",
    }
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        return get_workout(user_id, workout_id)

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
    params = list(updates.values()) + [workout_id, user_id]
    with _conn() as conn:
        cur = conn.execute(
            f"UPDATE workouts SET {set_clause} WHERE id = ? AND user_id = ?",
            tuple(params),
        )
        if cur.rowcount == 0:
            return None
    return get_workout(user_id, workout_id)


def list_workout_fueling_events(user_id: int, workout_id: int) -> List[Dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM workout_fueling_events
            WHERE user_id = ? AND workout_id = ?
            ORDER BY minute_offset ASC, id ASC
            """,
            (user_id, workout_id),
        ).fetchall()
    return [dict(r) for r in rows]


def add_workout_fueling_event(user_id: int, workout_id: int, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if get_workout(user_id, workout_id) is None:
        return None
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "minute_offset": int(payload.get("minute_offset", 0)),
        "event_time_iso": payload.get("event_time_iso"),
        "food_name": payload.get("food_name"),
        "carbs_g": float(payload.get("carbs_g") or 0),
        "fluid_ml": float(payload.get("fluid_ml") or 0),
        "sodium_mg": float(payload.get("sodium_mg") or 0),
        "notes": payload.get("notes"),
        "created_at": now,
    }
    with _conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO workout_fueling_events (
                user_id, workout_id, minute_offset, event_time_iso, food_name,
                carbs_g, fluid_ml, sodium_mg, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                workout_id,
                data["minute_offset"],
                data["event_time_iso"],
                data["food_name"],
                data["carbs_g"],
                data["fluid_ml"],
                data["sodium_mg"],
                data["notes"],
                data["created_at"],
            ),
        )
        event_id = cursor.lastrowid
    recalc_workout_fueling_totals(user_id, workout_id)
    return {"id": event_id, "user_id": user_id, "workout_id": workout_id, **data}


def delete_workout_fueling_event(user_id: int, workout_id: int, event_id: int) -> bool:
    with _conn() as conn:
        cur = conn.execute(
            "DELETE FROM workout_fueling_events WHERE id = ? AND workout_id = ? AND user_id = ?",
            (event_id, workout_id, user_id),
        )
        ok = cur.rowcount > 0
    if ok:
        recalc_workout_fueling_totals(user_id, workout_id)
    return ok


def recalc_workout_fueling_totals(user_id: int, workout_id: int) -> None:
    with _conn() as conn:
        row = conn.execute(
            """
            SELECT
                COALESCE(SUM(carbs_g), 0) AS carbs_g,
                COALESCE(SUM(fluid_ml), 0) AS fluid_ml,
                COALESCE(SUM(sodium_mg), 0) AS sodium_mg
            FROM workout_fueling_events
            WHERE user_id = ? AND workout_id = ?
            """,
            (user_id, workout_id),
        ).fetchone()
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            UPDATE workouts
            SET completed_carbs_g = ?, completed_fluids_ml = ?, completed_sodium_mg = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (row["carbs_g"], row["fluid_ml"], row["sodium_mg"], now, workout_id, user_id),
        )


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
