# Endurance Fuel AI

Endurance Fuel AI is a web-first platform for carb/fueling analysis and prediction across running, cycling, swimming, hiking, trail running, gym, HIIT, and Hyrox.

## What is implemented now
- FastAPI backend + frontend website
- Email/password auth (register/login/logout)
- JWT-based protected API access
- Prediction engine + simulation
- Audit logging

## Local run
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET='replace-with-a-long-random-secret'
uvicorn src.api.main:app --reload --port 8000
```

Open: http://localhost:8000

## API endpoints
- Public:
  - `GET /api/v1/health`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
- Auth required (Bearer token):
  - `GET /api/v1/auth/me`
  - `POST /api/v1/predict`
  - `POST /api/v1/simulate`
  - `GET /api/v1/integrations`
  - `GET /api/v1/audit?limit=20`

## Deploy publicly (Render)
Your `render.yaml` already exists. In Render dashboard add env var:
- `JWT_SECRET`: long random secret

Deploy from GitHub and your site will be available publicly at the Render URL.

## Notes
- App is currently free for everyone (no paid gating).
- For production hardening next: email verification, password reset, rate limits, CSRF/session security policy, and per-user audit filtering.
