from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path("audit.sqlite3")


PROVIDERS = ["strava", "garmin_connect"]


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_integrations_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS integration_tokens (
                user_id INTEGER NOT NULL,
                provider TEXT NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, provider)
            )
            """
        )


def upsert_token(
    user_id: int,
    provider: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    expires_at: Optional[str] = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO integration_tokens (user_id, provider, access_token, refresh_token, expires_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, provider) DO UPDATE SET
                access_token=excluded.access_token,
                refresh_token=excluded.refresh_token,
                expires_at=excluded.expires_at,
                updated_at=excluded.updated_at
            """,
            (user_id, provider, access_token, refresh_token, expires_at, now),
        )


def get_token(user_id: int, provider: str) -> Optional[Dict[str, Any]]:
    with _conn() as conn:
        row = conn.execute(
            "SELECT user_id, provider, access_token, refresh_token, expires_at, updated_at FROM integration_tokens WHERE user_id = ? AND provider = ?",
            (user_id, provider),
        ).fetchone()
    return dict(row) if row else None


def list_connections(user_id: int) -> List[Dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT provider, updated_at FROM integration_tokens WHERE user_id = ?",
            (user_id,),
        ).fetchall()

    connected = {row["provider"]: row["updated_at"] for row in rows}
    return [
        {
            "provider": p,
            "connected": p in connected,
            "updated_at": connected.get(p),
        }
        for p in PROVIDERS
    ]
