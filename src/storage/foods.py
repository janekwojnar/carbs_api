from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.storage.db import get_db_path


BUILTIN_FOODS: List[Dict[str, Any]] = [
    {"name": "Energy Gel 25", "category": "gel", "serving_desc": "1 gel", "carbs_g": 25, "sodium_mg": 120, "fluid_ml": 0, "caffeine_mg": 0},
    {"name": "Energy Gel Caffeine", "category": "gel", "serving_desc": "1 gel", "carbs_g": 23, "sodium_mg": 90, "fluid_ml": 0, "caffeine_mg": 50},
    {"name": "Isotonic Drink 500ml", "category": "drink", "serving_desc": "500 ml bottle", "carbs_g": 32, "sodium_mg": 420, "fluid_ml": 500, "caffeine_mg": 0},
    {"name": "Chews Serving", "category": "chews", "serving_desc": "1 pack", "carbs_g": 30, "sodium_mg": 70, "fluid_ml": 0, "caffeine_mg": 0},
    {"name": "Gummy Bears 40g", "category": "food", "serving_desc": "40 g", "carbs_g": 31, "sodium_mg": 10, "fluid_ml": 0, "caffeine_mg": 0},
    {"name": "Coke Can 330ml", "category": "drink", "serving_desc": "1 can", "carbs_g": 35, "sodium_mg": 20, "fluid_ml": 330, "caffeine_mg": 32},
    {"name": "Banana Medium", "category": "food", "serving_desc": "1 banana", "carbs_g": 27, "sodium_mg": 1, "fluid_ml": 0, "caffeine_mg": 0},
    {"name": "Rice Cake Sports", "category": "food", "serving_desc": "1 cake", "carbs_g": 22, "sodium_mg": 110, "fluid_ml": 0, "caffeine_mg": 0},
    {"name": "Pizza Slice", "category": "food", "serving_desc": "1 slice", "carbs_g": 36, "sodium_mg": 620, "fluid_ml": 0, "caffeine_mg": 0},
    {"name": "Salt Capsule", "category": "supplement", "serving_desc": "1 capsule", "carbs_g": 0, "sodium_mg": 215, "fluid_ml": 0, "caffeine_mg": 0},
]


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_food_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                serving_desc TEXT NOT NULL,
                carbs_g REAL NOT NULL,
                sodium_mg REAL NOT NULL,
                fluid_ml REAL NOT NULL,
                caffeine_mg REAL NOT NULL,
                is_builtin INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        row = conn.execute("SELECT COUNT(*) AS c FROM foods WHERE is_builtin = 1").fetchone()
        if row and row["c"] == 0:
            for f in BUILTIN_FOODS:
                conn.execute(
                    """
                    INSERT INTO foods (user_id, name, category, serving_desc, carbs_g, sodium_mg, fluid_ml, caffeine_mg, is_builtin)
                    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 1)
                    """,
                    (f["name"], f["category"], f["serving_desc"], f["carbs_g"], f["sodium_mg"], f["fluid_ml"], f["caffeine_mg"]),
                )


def list_foods(user_id: int, scope: str = "all") -> List[Dict[str, Any]]:
    with _conn() as conn:
        if scope == "builtin":
            rows = conn.execute("SELECT * FROM foods WHERE is_builtin = 1 ORDER BY name ASC").fetchall()
        elif scope == "custom":
            rows = conn.execute("SELECT * FROM foods WHERE user_id = ? AND is_builtin = 0 ORDER BY name ASC", (user_id,)).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM foods WHERE is_builtin = 1 OR user_id = ? ORDER BY is_builtin DESC, name ASC",
                (user_id,),
            ).fetchall()
    return [dict(r) for r in rows]


def add_custom_food(user_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    with _conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO foods (user_id, name, category, serving_desc, carbs_g, sodium_mg, fluid_ml, caffeine_mg, is_builtin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            """,
            (
                user_id,
                payload["name"],
                payload["category"],
                payload["serving_desc"],
                payload["carbs_g"],
                payload["sodium_mg"],
                payload["fluid_ml"],
                payload.get("caffeine_mg", 0),
            ),
        )
        fid = cursor.lastrowid
        row = conn.execute("SELECT * FROM foods WHERE id = ?", (fid,)).fetchone()
    return dict(row)


def delete_custom_food(user_id: int, food_id: int) -> bool:
    with _conn() as conn:
        cur = conn.execute("DELETE FROM foods WHERE id = ? AND user_id = ? AND is_builtin = 0", (food_id, user_id))
        return cur.rowcount > 0


def resolve_foods_for_plan(user_id: int, selected_food_ids: Optional[List[int]]) -> List[Dict[str, Any]]:
    with _conn() as conn:
        if selected_food_ids:
            placeholders = ",".join(["?"] * len(selected_food_ids))
            params: List[Any] = selected_food_ids + [user_id]
            rows = conn.execute(
                f"SELECT * FROM foods WHERE id IN ({placeholders}) AND (is_builtin = 1 OR user_id = ?)",
                tuple(params),
            ).fetchall()
            resolved = [dict(r) for r in rows]
            if resolved:
                return resolved
        # Default to endurance-focused in-session options instead of highest-carb list.
        preferred = [
            "Isotonic Drink 500ml",
            "Energy Gel 25",
            "Chews Serving",
            "Banana Medium",
            "Rice Cake Sports",
            "Coke Can 330ml",
            "Gummy Bears 40g",
            "Energy Gel Caffeine",
        ]
        placeholders = ",".join(["?"] * len(preferred))
        case_expr = " ".join([f"WHEN ? THEN {idx}" for idx, _ in enumerate(preferred)])
        fallback = conn.execute(
            f"""
            SELECT *
            FROM foods
            WHERE is_builtin = 1
              AND name IN ({placeholders})
            ORDER BY CASE name {case_expr} ELSE 999 END
            LIMIT 8
            """,
            tuple(preferred + preferred),
        ).fetchall()
        if not fallback:
            fallback = conn.execute(
                "SELECT * FROM foods WHERE is_builtin = 1 ORDER BY name ASC LIMIT 8"
            ).fetchall()
    return [dict(r) for r in fallback]
