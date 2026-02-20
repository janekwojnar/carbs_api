from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from src.storage.db import get_db_path


DEFAULT_PROFILE: Dict[str, Any] = {
    "body_mass_kg": 72.0,
    "body_fat_percent": 15.0,
    "vo2max": 50.0,
    "lactate_threshold_pct": 85.0,
    "gi_tolerance_score": 6.0,
    "sweat_rate_l_h": 0.9,
    "sodium_loss_mg_l": 850.0,
    "default_temperature_c": 20.0,
    "default_humidity_pct": 55.0,
    "default_altitude_m": 100.0,
    "default_terrain_factor": 1.0,
    "weekly_training_load_hours": 8.0,
    "default_indoor": 0,
}


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_profile_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY,
                body_mass_kg REAL,
                body_fat_percent REAL,
                vo2max REAL,
                lactate_threshold_pct REAL,
                gi_tolerance_score REAL,
                sweat_rate_l_h REAL,
                sodium_loss_mg_l REAL,
                default_temperature_c REAL,
                default_humidity_pct REAL,
                default_altitude_m REAL,
                default_terrain_factor REAL,
                weekly_training_load_hours REAL,
                default_indoor INTEGER,
                updated_at TEXT NOT NULL
            )
            """
        )


def upsert_profile(user_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = {**DEFAULT_PROFILE, **payload}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO user_profiles (
                user_id, body_mass_kg, body_fat_percent, vo2max, lactate_threshold_pct,
                gi_tolerance_score, sweat_rate_l_h, sodium_loss_mg_l, default_temperature_c,
                default_humidity_pct, default_altitude_m, default_terrain_factor,
                weekly_training_load_hours, default_indoor, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                body_mass_kg=excluded.body_mass_kg,
                body_fat_percent=excluded.body_fat_percent,
                vo2max=excluded.vo2max,
                lactate_threshold_pct=excluded.lactate_threshold_pct,
                gi_tolerance_score=excluded.gi_tolerance_score,
                sweat_rate_l_h=excluded.sweat_rate_l_h,
                sodium_loss_mg_l=excluded.sodium_loss_mg_l,
                default_temperature_c=excluded.default_temperature_c,
                default_humidity_pct=excluded.default_humidity_pct,
                default_altitude_m=excluded.default_altitude_m,
                default_terrain_factor=excluded.default_terrain_factor,
                weekly_training_load_hours=excluded.weekly_training_load_hours,
                default_indoor=excluded.default_indoor,
                updated_at=excluded.updated_at
            """,
            (
                user_id,
                data["body_mass_kg"],
                data["body_fat_percent"],
                data["vo2max"],
                data["lactate_threshold_pct"],
                data["gi_tolerance_score"],
                data["sweat_rate_l_h"],
                data["sodium_loss_mg_l"],
                data["default_temperature_c"],
                data["default_humidity_pct"],
                data["default_altitude_m"],
                data["default_terrain_factor"],
                data["weekly_training_load_hours"],
                int(bool(data["default_indoor"])),
                data["updated_at"],
            ),
        )
    return get_profile(user_id)


def get_profile(user_id: int) -> Dict[str, Any]:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user_id,)).fetchone()
    if row is None:
        return {"user_id": user_id, **DEFAULT_PROFILE}
    out = dict(row)
    out["default_indoor"] = bool(out.get("default_indoor", 0))
    return out
