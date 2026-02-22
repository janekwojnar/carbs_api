from __future__ import annotations

import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

from src.storage.db import get_db_path


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_oauth_state_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                provider TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def create_state(user_id: int, provider: str, ttl_minutes: int = 15) -> str:
    state = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(minutes=ttl_minutes)).isoformat()
    with _conn() as conn:
        conn.execute(
            "INSERT INTO oauth_states (state, user_id, provider, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
            (state, user_id, provider, expires_at, now.isoformat()),
        )
    return state


def consume_state(state: str, provider: str) -> Optional[int]:
    now = datetime.now(timezone.utc)
    with _conn() as conn:
        row = conn.execute(
            "SELECT user_id, expires_at, provider FROM oauth_states WHERE state = ?",
            (state,),
        ).fetchone()
        conn.execute("DELETE FROM oauth_states WHERE state = ?", (state,))

    if row is None:
        return None
    if row["provider"] != provider:
        return None
    try:
        expires_at = datetime.fromisoformat(row["expires_at"])
    except ValueError:
        return None
    if expires_at < now:
        return None
    return int(row["user_id"])
