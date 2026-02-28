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
                client TEXT NOT NULL DEFAULT 'web',
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        cols = conn.execute("PRAGMA table_info(oauth_states)").fetchall()
        if not any(c[1] == "client" for c in cols):
            conn.execute("ALTER TABLE oauth_states ADD COLUMN client TEXT NOT NULL DEFAULT 'web'")


def create_state(user_id: int, provider: str, client: str = "web", ttl_minutes: int = 15) -> str:
    state = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(minutes=ttl_minutes)).isoformat()
    with _conn() as conn:
        conn.execute(
            "INSERT INTO oauth_states (state, user_id, provider, client, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (state, user_id, provider, client, expires_at, now.isoformat()),
        )
    return state


def consume_state(state: str, provider: str) -> Optional[tuple[int, str]]:
    now = datetime.now(timezone.utc)
    with _conn() as conn:
        row = conn.execute(
            "SELECT user_id, expires_at, provider, client FROM oauth_states WHERE state = ?",
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
    return int(row["user_id"]), str(row["client"] or "web")
