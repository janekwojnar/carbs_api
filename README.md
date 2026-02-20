# Endurance Fuel AI

Web platform for advanced carb/fueling analysis, planning, tracking, and prediction for endurance/hybrid sports.

## Major features now
- Email/password auth (free for all users)
- Profile onboarding defaults saved once and auto-filled later
- Advanced prediction inputs: avg HR, max HR, avg power, normalized power, cadence, distance, elevation
- Multi-strategy fueling output + confidence + explainability
- Workout tracking (planned/completed) with metrics and fueling actuals
- Analytics dashboard + time-series graphs (HR, power, carbs, duration)
- Integration tokens + sync routes:
  - Strava completed workouts
  - Garmin planned/completed via configurable Garmin proxy endpoint

## Run locally
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET='replace-with-long-random-secret'
# Optional for Garmin sync bridge
export GARMIN_PROXY_URL='https://your-garmin-proxy.example.com'
uvicorn src.api.main:app --reload --port 8000
```

Open: http://localhost:8000

## Public deploy (Render)
- Push to GitHub
- Render uses `render.yaml`
- Set env var `JWT_SECRET`
- Optional: set `GARMIN_PROXY_URL`

## API overview
Public:
- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

Auth required:
- `GET /api/v1/auth/me`
- `GET /api/v1/profile`
- `PUT /api/v1/profile`
- `POST /api/v1/predict`
- `POST /api/v1/simulate`
- `POST /api/v1/workouts`
- `GET /api/v1/workouts`
- `GET /api/v1/analytics/summary`
- `GET /api/v1/analytics/charts`
- `GET /api/v1/integrations`
- `POST /api/v1/integrations/{provider}/token`
- `POST /api/v1/integrations/{provider}/sync?kind=planned|completed`
- `GET /api/v1/audit`

## Integration notes
- Strava: requires user access token.
- Garmin Connect: there is no stable public direct consumer API. This app supports Garmin sync through a partner/proxy endpoint (`GARMIN_PROXY_URL`).
