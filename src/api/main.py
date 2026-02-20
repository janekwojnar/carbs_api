from __future__ import annotations

from pathlib import Path

from fastapi import Depends, FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.api.auth import AuthRequest, login_user, register_user, require_user
from src.core.engine import predict, simulate
from src.core.models import PredictionRequest, SimulationRequest
from src.integrations.connectors import integration_status
from src.storage.audit import init_db, read_audit, write_audit
from src.storage.auth import init_auth_db

app = FastAPI(title="Endurance Fuel AI", version="0.2.0")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


@app.on_event("startup")
def startup() -> None:
    init_db()
    init_auth_db()


@app.get("/", include_in_schema=False)
def root() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


@app.get("/api/v1/health")
def health() -> dict:
    return {"ok": True, "service": "endurance-fuel-ai"}


@app.post("/api/v1/auth/register")
def register(payload: AuthRequest) -> dict:
    return register_user(payload).model_dump()


@app.post("/api/v1/auth/login")
def login(payload: AuthRequest) -> dict:
    return login_user(payload).model_dump()


@app.get("/api/v1/auth/me")
def me(current_user: dict = Depends(require_user)) -> dict:
    return {"user": current_user}


@app.get("/api/v1/integrations")
def integrations(current_user: dict = Depends(require_user)) -> dict:
    return {"items": integration_status(), "user": current_user["email"]}


@app.post("/api/v1/predict")
def predict_endpoint(req: PredictionRequest, current_user: dict = Depends(require_user)) -> dict:
    res = predict(req)
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
    res = simulate(req)
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
