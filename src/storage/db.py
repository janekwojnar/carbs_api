from __future__ import annotations

import os
from pathlib import Path


def get_db_path() -> Path:
    raw = os.getenv("DB_PATH", "audit.sqlite3").strip()
    return Path(raw)
