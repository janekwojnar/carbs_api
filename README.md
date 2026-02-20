# Endurance Fuel AI

Endurance Fuel AI is a web-first platform for carb/fueling analysis and prediction across running, cycling, swimming, hiking, trail running, gym, HIIT, and Hyrox.

## Why web first
For your goals (ASAP launch, broad user access, premium UX, rapid iteration), the best starting point is **web-first**:
- fastest release cycle
- easier integrations and analytics
- immediate cross-device availability
- lower initial maintenance than native iOS + backend at day one

A native iOS app can be added in Phase 2 using the same backend.

## Current deliverable in this repository
- Product architecture and roadmap docs
- Runnable FastAPI backend
- Polished web UI served by backend
- Prediction engine with:
  - carbs targets (g/h)
  - pre/during/post fueling guidance
  - hydration + sodium guidance
  - GI risk scoring
  - confidence intervals + uncertainty notes
  - aggressive/balanced/conservative strategies
  - scenario simulator (heat/duration/intensity adjustments)
- Audit logging for each prediction
- Integration stubs for Garmin, Strava, TrainingPeaks, Zwift, Apple Health, CSV import/export, webhooks

## Quick start
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 8000
```

Open: http://localhost:8000

## API endpoints
- `GET /api/v1/health`
- `POST /api/v1/predict`
- `POST /api/v1/simulate`
- `GET /api/v1/audit?limit=20`

## Notes
- This is a serious production-grade foundation, not yet a full clinical-grade system.
- Next steps are in `docs/ROADMAP.md` and `docs/VALIDATION_PLAN.md`.
