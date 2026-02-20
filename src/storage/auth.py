from __future__ import annotations

import base64
import hashlib
import hmac
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import jwt

from src.storage.db import get_db_path

JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 14


def _jwt_secret() -> str:
    return os.getenv("JWT_SECRET", "dev-change-me-in-production")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def _hash_password(password: str, salt: Optional[bytes] = None) -> str:
    salt_bytes = salt or os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 120_000)
    return base64.b64encode(salt_bytes + derived).decode("utf-8")


def _verify_password(password: str, encoded: str) -> bool:
    raw = base64.b64decode(encoded.encode("utf-8"))
    salt = raw[:16]
    expected = raw[16:]
    trial = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return hmac.compare_digest(expected, trial)


def create_user(email: str, password: str) -> Dict[str, Any]:
    normalized = email.strip().lower()
    password_hash = _hash_password(password)
    created_at = datetime.now(timezone.utc).isoformat()
    with _conn() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (normalized, password_hash, created_at),
        )
        user_id = cursor.lastrowid
    return {"id": user_id, "email": normalized, "created_at": created_at}


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    normalized = email.strip().lower()
    with _conn() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, created_at FROM users WHERE email = ?",
            (normalized,),
        ).fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "password_hash": row["password_hash"],
        "created_at": row["created_at"],
    }


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with _conn() as conn:
        row = conn.execute(
            "SELECT id, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if row is None:
        return None
    return {"id": row["id"], "email": row["email"], "created_at": row["created_at"]}


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    user = get_user_by_email(email)
    if user is None:
        return None
    if not _verify_password(password, user["password_hash"]):
        return None
    return {"id": user["id"], "email": user["email"], "created_at": user["created_at"]}


def create_access_token(user_id: int, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALG)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        return None
    return payload
