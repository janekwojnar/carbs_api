from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.core.engine import predict, simulate
from src.core.models import PredictionRequest, SimulationRequest
from src.integrations.connectors import integration_status
from src.storage.audit import init_db, read_audit, write_audit

app = FastAPI(title="Endurance Fuel AI", version="0.1.0")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/", include_in_schema=False)
def root() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


@app.get("/api/v1/health")
def health() -> dict:
    return {"ok": True, "service": "endurance-fuel-ai"}


@app.get("/api/v1/integrations")
def integrations() -> dict:
    return {"items": integration_status()}


@app.post("/api/v1/predict")
def predict_endpoint(req: PredictionRequest) -> dict:
    res = predict(req)
    write_audit(res.recommendation_id, {"request": req.model_dump(), "response": res.model_dump()})
    return res.model_dump()


@app.post("/api/v1/simulate")
def simulate_endpoint(req: SimulationRequest) -> dict:
    res = simulate(req)
    write_audit(
        res.simulated.recommendation_id,
        {"simulation_request": req.model_dump(), "simulation_response": res.model_dump()},
    )
    return res.model_dump()


@app.get("/api/v1/audit")
def audit(limit: int = Query(default=20, ge=1, le=200)) -> dict:
    return {"items": read_audit(limit=limit)}
