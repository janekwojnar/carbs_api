from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

DB_PATH = Path("audit.sqlite3")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS recommendation_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recommendation_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )


def write_audit(recommendation_id: str, payload: Dict[str, Any]) -> None:
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    with _conn() as conn:
        conn.execute(
            "INSERT INTO recommendation_audit (recommendation_id, created_at, payload_json) VALUES (?, ?, ?)",
            (recommendation_id, record["timestamp"], json.dumps(record)),
        )


def read_audit(limit: int = 20) -> List[Dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT recommendation_id, created_at, payload_json FROM recommendation_audit ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()

    output: List[Dict[str, Any]] = []
    for row in rows:
        payload = json.loads(row["payload_json"])
        output.append(
            {
                "recommendation_id": row["recommendation_id"],
                "created_at": row["created_at"],
                "payload": payload,
            }
        )
    return output
