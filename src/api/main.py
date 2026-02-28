from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
from typing import Any, Optional
from urllib.parse import quote

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.api.auth import AuthRequest, RegisterRequest, login_user, register_user, require_user
from src.core.engine import predict, simulate
from src.core.models import FoodItem, PredictionRequest, SimulationRequest
from src.integrations.connectors import integration_status, pull_workouts
from src.integrations.oauth import OAuthError, build_authorize_url, exchange_code, missing_env_for_provider, oauth_ready
from src.integrations.providers import IntegrationError
from src.storage.audit import init_db, read_audit, write_audit
from src.storage.auth import init_auth_db
from src.storage.foods import add_custom_food, delete_custom_food, init_food_db, list_foods, resolve_foods_for_plan
from src.storage.integrations import get_token, init_integrations_db, upsert_token
from src.storage.oauth_state import consume_state, create_state, init_oauth_state_db
from src.storage.profile import get_profile, init_profile_db, upsert_profile
from src.storage.workouts import (
    add_workout,
    add_workout_fueling_event,
    analytics_chart_series,
    analytics_summary,
    delete_workout_fueling_event,
    get_workout,
    init_workout_db,
    list_workout_fueling_events,
    list_workouts,
    update_workout,
)

app = FastAPI(title="Endurance Fuel AI", version="0.5.0")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


def _app_base_url(request: Request) -> str:
    configured = os.getenv("APP_BASE_URL", "").strip().rstrip("/")
    if configured:
        return configured
    return str(request.base_url).rstrip("/")


def _callback_url(provider: str, request: Request) -> str:
    return f"{_app_base_url(request)}/api/v1/integrations/{provider}/oauth/callback"


def _front_redirect(provider: str, status: str, message: str = "") -> str:
    q = f"?oauth_provider={quote(provider)}&oauth_status={quote(status)}"
    if message:
        q += f"&oauth_message={quote(message)}"
    return f"/{q}"


def _oauth_result_redirect(provider: str, status: str, message: str = "", client: str | None = None) -> str:
    if client == "ios":
        q = f"?provider={quote(provider)}&status={quote(status)}"
        if message:
            q += f"&message={quote(message)}"
        return f"/api/v1/integrations/oauth/result{q}"
    return _front_redirect(provider, status, message)


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


class WorkoutUpdate(BaseModel):
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
    start_time: str | None = None
    status: str | None = Field(default=None, pattern="^(planned|completed)$")


class FuelingEventCreate(BaseModel):
    minute_offset: int = Field(ge=0, le=3000)
    event_time_iso: str | None = None
    food_name: str | None = None
    carbs_g: float = Field(default=0, ge=0, le=300)
    fluid_ml: float = Field(default=0, ge=0, le=2000)
    sodium_mg: float = Field(default=0, ge=0, le=6000)
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
    init_oauth_state_db()


@app.get("/", include_in_schema=False)
def root() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


@app.get("/api/v1/health")
def health() -> dict:
    return {"ok": True, "service": "endurance-fuel-ai", "version": "0.5.0"}


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


@app.get("/api/v1/integrations/{provider}/oauth/config")
def integration_oauth_config(
    provider: str,
    request: Request,
    current_user: dict = Depends(require_user),
) -> dict:
    if provider not in {"strava", "garmin_connect"}:
        raise HTTPException(status_code=404, detail="Unsupported provider")
    return {
        "provider": provider,
        "ready": oauth_ready(provider),
        "missing_env": missing_env_for_provider(provider),
        "callback_url": _callback_url(provider, request),
        "app_base_url": _app_base_url(request),
    }


@app.post("/api/v1/integrations/{provider}/oauth/start")
def integration_oauth_start(
    provider: str,
    request: Request,
    client: str | None = Query(default=None, pattern="^(ios|web)$"),
    current_user: dict = Depends(require_user),
) -> dict:
    if provider not in {"strava", "garmin_connect"}:
        raise HTTPException(status_code=404, detail="Unsupported provider")
    state = create_state(current_user["id"], provider, client=client or "web")
    try:
        authorize_url = build_authorize_url(provider, _callback_url(provider, request), state)
    except OAuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"authorize_url": authorize_url}


@app.get("/api/v1/integrations/{provider}/oauth/callback")
def integration_oauth_callback(
    provider: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    client: str | None = None
    if provider not in {"strava", "garmin_connect"}:
        return RedirectResponse(url=_oauth_result_redirect(provider, "error", "unsupported_provider", client), status_code=302)

    if error:
        return RedirectResponse(url=_oauth_result_redirect(provider, "error", error, client), status_code=302)
    if not code or not state:
        return RedirectResponse(url=_oauth_result_redirect(provider, "error", "missing_code_or_state", client), status_code=302)

    consumed = consume_state(state, provider)
    if consumed is None:
        return RedirectResponse(url=_oauth_result_redirect(provider, "error", "invalid_state", client), status_code=302)
    user_id, state_client = consumed
    client = state_client or client

    try:
        token_payload = exchange_code(provider, code, _callback_url(provider, request))
    except OAuthError as exc:
        return RedirectResponse(url=_oauth_result_redirect(provider, "error", str(exc), client), status_code=302)

    access_token = str(token_payload.get("access_token") or "")
    if not access_token:
        return RedirectResponse(url=_oauth_result_redirect(provider, "error", "missing_access_token", client), status_code=302)

    refresh_token = token_payload.get("refresh_token")
    raw_exp = token_payload.get("expires_at") or token_payload.get("expires_in")
    expires_at: str | None = None
    if isinstance(raw_exp, (int, float)):
        # Strava returns epoch seconds as `expires_at`, other providers may return `expires_in`.
        if raw_exp > 2_000_000_000:
            dt = datetime.fromtimestamp(raw_exp / 1000, tz=timezone.utc)
        elif raw_exp > 100_000_000:
            dt = datetime.fromtimestamp(raw_exp, tz=timezone.utc)
        else:
            dt = datetime.now(timezone.utc)
        expires_at = dt.isoformat()
    elif isinstance(raw_exp, str) and raw_exp:
        expires_at = raw_exp

    upsert_token(
        user_id=user_id,
        provider=provider,
        access_token=access_token,
        refresh_token=str(refresh_token) if refresh_token else None,
        expires_at=expires_at,
    )
    return RedirectResponse(url=_oauth_result_redirect(provider, "connected", client=client), status_code=302)


@app.get("/api/v1/integrations/oauth/result", include_in_schema=False)
def oauth_result_page(
    provider: str = Query(default="integration"),
    status: str = Query(default="connected"),
    message: str | None = None,
) -> HTMLResponse:
    ok = status == "connected"
    title = "Connection complete" if ok else "Connection failed"
    status_line = f"{provider.replace('_', ' ').title()}: {status}"
    detail = message or ("You can close this screen and return to the app." if ok else "Please return to the app and try again.")
    color = "#0f766e" if ok else "#b91c1c"
    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <style>
      body {{
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0; background: #f4f7fb; color: #0f172a;
      }}
      .wrap {{
        max-width: 640px; margin: 56px auto; padding: 0 20px;
      }}
      .card {{
        background: #fff; border-radius: 16px; padding: 24px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      }}
      .pill {{
        display: inline-block; border-radius: 999px; padding: 8px 12px;
        background: #ecfeff; color: {color}; font-weight: 700;
      }}
      h1 {{ margin: 14px 0 8px; font-size: 28px; }}
      p {{ margin: 0; color: #475569; font-size: 17px; line-height: 1.4; }}
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <span class="pill">{status_line}</span>
        <h1>{title}</h1>
        <p>{detail}</p>
      </section>
    </main>
  </body>
</html>"""
    return HTMLResponse(content=html, status_code=200)


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


@app.get("/api/v1/workouts/{workout_id}")
def workout_get(workout_id: int, current_user: dict = Depends(require_user)) -> dict:
    item = get_workout(current_user["id"], workout_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"item": item}


@app.put("/api/v1/workouts/{workout_id}")
def workout_put(workout_id: int, payload: WorkoutUpdate, current_user: dict = Depends(require_user)) -> dict:
    item = update_workout(
        current_user["id"],
        workout_id,
        {k: v for k, v in payload.model_dump().items() if v is not None},
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"item": item}


@app.get("/api/v1/workouts/{workout_id}/fueling")
def workout_fueling_get(workout_id: int, current_user: dict = Depends(require_user)) -> dict:
    if get_workout(current_user["id"], workout_id) is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"items": list_workout_fueling_events(current_user["id"], workout_id)}


@app.post("/api/v1/workouts/{workout_id}/fueling")
def workout_fueling_add(
    workout_id: int,
    payload: FuelingEventCreate,
    current_user: dict = Depends(require_user),
) -> dict:
    item = add_workout_fueling_event(current_user["id"], workout_id, payload.model_dump())
    if item is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"item": item}


@app.delete("/api/v1/workouts/{workout_id}/fueling/{event_id}")
def workout_fueling_delete(workout_id: int, event_id: int, current_user: dict = Depends(require_user)) -> dict:
    deleted = delete_workout_fueling_event(current_user["id"], workout_id, event_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Fueling event not found")
    return {"ok": True}


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
