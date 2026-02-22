from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.api.auth import AuthRequest, RegisterRequest, login_user, register_user, require_user
from src.core.engine import predict, simulate
from src.core.models import FoodItem, PredictionRequest, SimulationRequest
from src.integrations.connectors import integration_status, pull_workouts
from src.integrations.providers import IntegrationError
from src.storage.audit import init_db, read_audit, write_audit
from src.storage.auth import init_auth_db
from src.storage.foods import add_custom_food, delete_custom_food, init_food_db, list_foods, resolve_foods_for_plan
from src.storage.integrations import get_token, init_integrations_db, upsert_token
from src.storage.profile import get_profile, init_profile_db, upsert_profile
from src.storage.workouts import (
    add_workout,
    analytics_chart_series,
    analytics_summary,
    init_workout_db,
    list_workouts,
)

app = FastAPI(title="Endurance Fuel AI", version="0.4.0")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


class ProfileUpdate(BaseModel):
    body_mass_kg: float | None = Field(default=None, ge=30, le=180)
    body_fat_percent: float | None = Field(default=None, ge=3, le=60)
    vo2max: float | None = Field(default=None, ge=20, le=95)
    lactate_threshold_pct: float | None = Field(default=None, ge=60, le=100)
    gi_tolerance_score: float | None = Field(default=None, ge=0, le=10)
    sweat_rate_l_h: float | None = Field(default=None, ge=0.1, le=4)
    sodium_loss_mg_l: float | None = Field(default=None, ge=200, le=3000)
    default_temperature_c: float | None = Field(default=None, ge=-20, le=55)
    default_humidity_pct: float | None = Field(default=None, ge=0, le=100)
    default_altitude_m: float | None = Field(default=None, ge=-200, le=6000)
    default_terrain_factor: float | None = Field(default=None, ge=0.7, le=1.8)
    weekly_training_load_hours: float | None = Field(default=None, ge=0, le=60)
    default_indoor: bool | None = None
    bike_ftp_w: float | None = Field(default=None, ge=80, le=600)
    run_ftp_w: float | None = Field(default=None, ge=80, le=600)
    run_threshold_pace_sec_per_km: float | None = Field(default=None, ge=120, le=600)
    bike_lt1_hr_bpm: float | None = Field(default=None, ge=80, le=210)
    bike_lt2_hr_bpm: float | None = Field(default=None, ge=90, le=220)
    run_lt1_hr_bpm: float | None = Field(default=None, ge=80, le=210)
    run_lt2_hr_bpm: float | None = Field(default=None, ge=90, le=220)
    max_carb_absorption_g_h: float | None = Field(default=None, ge=40, le=160)
    gut_training_level: float | None = Field(default=None, ge=0, le=10)


class WorkoutCreate(BaseModel):
    source: str = "manual"
    external_id: str | None = None
    sport: str
    status: str = Field(default="completed", pattern="^(planned|completed)$")
    start_time: str | None = None
    duration_minutes: float | None = Field(default=None, ge=0)
    intensity_rpe: float | None = Field(default=None, ge=1, le=10)
    avg_heart_rate_bpm: float | None = Field(default=None, ge=50, le=230)
    max_heart_rate_bpm: float | None = Field(default=None, ge=80, le=240)
    avg_power_watts: float | None = Field(default=None, ge=40, le=700)
    normalized_power_watts: float | None = Field(default=None, ge=40, le=700)
    avg_cadence: float | None = Field(default=None, ge=20, le=250)
    distance_km: float | None = Field(default=None, ge=0)
    elevation_gain_m: float | None = Field(default=None, ge=0)
    tss: float | None = Field(default=None, ge=0)
    completed_carbs_g: float | None = Field(default=None, ge=0)
    completed_fluids_ml: float | None = Field(default=None, ge=0)
    completed_sodium_mg: float | None = Field(default=None, ge=0)
    temperature_c: float | None = Field(default=None, ge=-20, le=55)
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = None


class IntegrationTokenIn(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_at: str | None = None


class FoodCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    category: str = Field(min_length=2, max_length=30)
    serving_desc: str = Field(min_length=1, max_length=60)
    carbs_g: float = Field(ge=0, le=200)
    sodium_mg: float = Field(ge=0, le=5000)
    fluid_ml: float = Field(ge=0, le=1500)
    caffeine_mg: float = Field(default=0, ge=0, le=500)


@app.on_event("startup")
def startup() -> None:
    init_db()
    init_auth_db()
    init_profile_db()
    init_workout_db()
    init_integrations_db()
    init_food_db()


@app.get("/", include_in_schema=False)
def root() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


@app.get("/api/v1/health")
def health() -> dict:
    return {"ok": True, "service": "endurance-fuel-ai", "version": "0.4.0"}


@app.post("/api/v1/auth/register")
def register(payload: RegisterRequest) -> dict:
    auth = register_user(payload)
    profile_payload: dict[str, Any] = {
        k: v
        for k, v in payload.model_dump().items()
        if k
        in {
            "body_mass_kg",
            "body_fat_percent",
            "vo2max",
            "lactate_threshold_pct",
            "gi_tolerance_score",
            "default_temperature_c",
            "default_humidity_pct",
            "default_altitude_m",
            "default_terrain_factor",
            "weekly_training_load_hours",
            "bike_ftp_w",
            "run_ftp_w",
            "run_threshold_pace_sec_per_km",
            "bike_lt1_hr_bpm",
            "bike_lt2_hr_bpm",
            "run_lt1_hr_bpm",
            "run_lt2_hr_bpm",
            "max_carb_absorption_g_h",
            "gut_training_level",
        }
        and v is not None
    }
    upsert_profile(auth.user["id"], profile_payload)
    result = auth.model_dump()
    result["profile"] = get_profile(auth.user["id"])
    return result


@app.post("/api/v1/auth/login")
def login(payload: AuthRequest) -> dict:
    auth = login_user(payload)
    result = auth.model_dump()
    result["profile"] = get_profile(auth.user["id"])
    return result


@app.get("/api/v1/auth/me")
def me(current_user: dict = Depends(require_user)) -> dict:
    return {"user": current_user, "profile": get_profile(current_user["id"])}


@app.get("/api/v1/profile")
def profile_get(current_user: dict = Depends(require_user)) -> dict:
    return {"profile": get_profile(current_user["id"])}


@app.put("/api/v1/profile")
def profile_put(payload: ProfileUpdate, current_user: dict = Depends(require_user)) -> dict:
    profile = upsert_profile(
        user_id=current_user["id"],
        payload={k: v for k, v in payload.model_dump().items() if v is not None},
    )
    return {"profile": profile}


@app.get("/api/v1/foods")
def foods_get(
    scope: str = Query(default="all", pattern="^(all|builtin|custom)$"),
    current_user: dict = Depends(require_user),
) -> dict:
    return {"items": list_foods(current_user["id"], scope=scope)}


@app.post("/api/v1/foods")
def foods_create(payload: FoodCreate, current_user: dict = Depends(require_user)) -> dict:
    return {"item": add_custom_food(current_user["id"], payload.model_dump())}


@app.delete("/api/v1/foods/{food_id}")
def foods_delete(food_id: int, current_user: dict = Depends(require_user)) -> dict:
    deleted = delete_custom_food(current_user["id"], food_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Food not found")
    return {"ok": True}


@app.get("/api/v1/integrations")
def integrations(current_user: dict = Depends(require_user)) -> dict:
    return {"items": integration_status(current_user["id"]), "user": current_user["email"]}


@app.post("/api/v1/integrations/{provider}/token")
def set_integration_token(
    provider: str,
    payload: IntegrationTokenIn,
    current_user: dict = Depends(require_user),
) -> dict:
    if provider not in {"strava", "garmin_connect"}:
        raise HTTPException(status_code=404, detail="Unsupported provider")
    upsert_token(
        user_id=current_user["id"],
        provider=provider,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        expires_at=payload.expires_at,
    )
    return {"ok": True, "provider": provider}


@app.post("/api/v1/integrations/{provider}/sync")
def sync_provider_workouts(
    provider: str,
    kind: str = Query(default="completed", pattern="^(planned|completed)$"),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(require_user),
) -> dict:
    token = get_token(current_user["id"], provider)
    if token is None:
        raise HTTPException(status_code=400, detail=f"{provider} is not connected")

    try:
        pulled = pull_workouts(provider=provider, access_token=token["access_token"], kind=kind)[:limit]
    except IntegrationError as exc:
        raise HTTPException(status_code=400, detail=f"Integration sync failed: {exc}") from exc
    created = []
    for item in pulled:
        item["status"] = kind
        created.append(add_workout(current_user["id"], item))
    return {"synced": len(created), "items": created}


@app.post("/api/v1/workouts")
def workout_create(payload: WorkoutCreate, current_user: dict = Depends(require_user)) -> dict:
    return {"item": add_workout(current_user["id"], payload.model_dump())}


@app.get("/api/v1/workouts")
def workouts_get(
    limit: int = Query(default=100, ge=1, le=500),
    status: Optional[str] = Query(default=None, pattern="^(planned|completed)$"),
    source: Optional[str] = None,
    current_user: dict = Depends(require_user),
) -> dict:
    return {"items": list_workouts(current_user["id"], limit=limit, status=status, source=source)}


@app.get("/api/v1/analytics/summary")
def analytics_summary_get(
    days: int = Query(default=30, ge=7, le=365),
    current_user: dict = Depends(require_user),
) -> dict:
    return {"summary": analytics_summary(current_user["id"], days=days)}


@app.get("/api/v1/analytics/charts")
def analytics_charts_get(
    days: int = Query(default=30, ge=7, le=365),
    current_user: dict = Depends(require_user),
) -> dict:
    return {"charts": analytics_chart_series(current_user["id"], days=days)}


@app.post("/api/v1/predict")
def predict_endpoint(req: PredictionRequest, current_user: dict = Depends(require_user)) -> dict:
    foods_raw = resolve_foods_for_plan(current_user["id"], req.selected_food_ids)
    foods = [FoodItem(**f) for f in foods_raw]
    res = predict(req, foods=foods)
    write_audit(
        recommendation_id=res.recommendation_id,
        user_id=current_user["id"],
        user_email=current_user["email"],
        payload={
            "user_id": current_user["id"],
            "user_email": current_user["email"],
            "request": req.model_dump(),
            "response": res.model_dump(),
        },
    )
    return res.model_dump()


@app.post("/api/v1/simulate")
def simulate_endpoint(req: SimulationRequest, current_user: dict = Depends(require_user)) -> dict:
    foods_raw = resolve_foods_for_plan(current_user["id"], req.base_request.selected_food_ids)
    foods = [FoodItem(**f) for f in foods_raw]
    res = simulate(req, foods=foods)
    write_audit(
        recommendation_id=res.simulated.recommendation_id,
        user_id=current_user["id"],
        user_email=current_user["email"],
        payload={
            "user_id": current_user["id"],
            "user_email": current_user["email"],
            "simulation_request": req.model_dump(),
            "simulation_response": res.model_dump(),
        },
    )
    return res.model_dump()


@app.get("/api/v1/audit")
def audit(
    limit: int = Query(default=20, ge=1, le=200),
    current_user: dict = Depends(require_user),
) -> dict:
    return {"items": read_audit(user_id=current_user["id"], limit=limit), "user": current_user["email"]}
