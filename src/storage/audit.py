from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List

from src.storage.db import get_db_path


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row[1] == column for row in rows)


def init_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS recommendation_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recommendation_id TEXT NOT NULL,
                user_id INTEGER,
                user_email TEXT,
                created_at TEXT NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )
        if not _column_exists(conn, "recommendation_audit", "user_id"):
            conn.execute("ALTER TABLE recommendation_audit ADD COLUMN user_id INTEGER")
        if not _column_exists(conn, "recommendation_audit", "user_email"):
            conn.execute("ALTER TABLE recommendation_audit ADD COLUMN user_email TEXT")


def write_audit(recommendation_id: str, user_id: int, user_email: str, payload: Dict[str, Any]) -> None:
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO recommendation_audit (recommendation_id, user_id, user_email, created_at, payload_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (recommendation_id, user_id, user_email, record["timestamp"], json.dumps(record)),
        )


def read_audit(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT recommendation_id, user_id, user_email, created_at, payload_json
            FROM recommendation_audit
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()

    output: List[Dict[str, Any]] = []
    for row in rows:
        payload = json.loads(row["payload_json"])
        output.append(
            {
                "recommendation_id": row["recommendation_id"],
                "user_id": row["user_id"],
                "user_email": row["user_email"],
                "created_at": row["created_at"],
                "payload": payload,
            }
        )
    return output
