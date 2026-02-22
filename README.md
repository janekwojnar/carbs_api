# FuelOS Endurance

Elite-grade carb and fueling platform for running, cycling, swimming, hiking, trail, and hybrid endurance sessions.

## What changed in this version
- Full UI restructure:
  - User Settings separated from Session Planner
  - Sport-specific session logic (only relevant intensity controls shown)
  - Cleaner information architecture and visuals
- OAuth connect flows (no manual token input in UI):
  - Strava `Connect` button + callback flow
  - Garmin Connect `Connect` button + callback flow (through configurable OAuth/provider bridge)
- Advanced physiology retained and weighted in calculations:
  - FTP/rFTP, LT1/LT2, threshold pace, gut training, max absorption, sweat/sodium profile
- Food intelligence:
  - Built-in endurance foods + custom foods
  - Timed fueling schedule with exact slots and suggested item/serving

## Run locally
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export JWT_SECRET='replace-with-long-random-secret'
export DB_PATH='/tmp/endurance.sqlite3'

# For OAuth connect flows
export APP_BASE_URL='http://127.0.0.1:8000'
export STRAVA_CLIENT_ID='your-strava-client-id'
export STRAVA_CLIENT_SECRET='your-strava-client-secret'

# Garmin OAuth bridge/provider config (optional but needed for Garmin connect)
export GARMIN_CLIENT_ID='your-garmin-client-id'
export GARMIN_CLIENT_SECRET='your-garmin-client-secret'
export GARMIN_OAUTH_AUTH_URL='https://your-garmin-auth-url'
export GARMIN_OAUTH_TOKEN_URL='https://your-garmin-token-url'
export GARMIN_SCOPE='activity:read'

# Garmin workout pull bridge (optional)
export GARMIN_PROXY_URL='https://your-garmin-proxy.example.com'

uvicorn src.api.main:app --reload --port 8000
```

Open: http://localhost:8000

## Deploy (Render)
Use `render.yaml` and set env vars:
- Required:
  - `JWT_SECRET`
  - `APP_BASE_URL` (public app URL, e.g. `https://your-app.onrender.com`)
- Strongly recommended:
  - `DB_PATH=/var/data/endurance.sqlite3` with mounted disk
- Strava OAuth:
  - `STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`
- Garmin OAuth bridge:
  - `GARMIN_CLIENT_ID`
  - `GARMIN_CLIENT_SECRET`
  - `GARMIN_OAUTH_AUTH_URL`
  - `GARMIN_OAUTH_TOKEN_URL`
  - `GARMIN_SCOPE` (optional)
- Garmin workout sync bridge:
  - `GARMIN_PROXY_URL` (optional)

## API overview
Public:
- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/integrations/{provider}/oauth/callback`

Auth required:
- `GET /api/v1/auth/me`
- `GET /api/v1/profile`
- `PUT /api/v1/profile`
- `GET /api/v1/foods`
- `POST /api/v1/foods`
- `DELETE /api/v1/foods/{food_id}`
- `POST /api/v1/predict`
- `POST /api/v1/simulate`
- `POST /api/v1/workouts`
- `GET /api/v1/workouts`
- `GET /api/v1/analytics/summary`
- `GET /api/v1/analytics/charts`
- `GET /api/v1/integrations`
- `POST /api/v1/integrations/{provider}/oauth/start`
- `POST /api/v1/integrations/{provider}/sync?kind=planned|completed`
- `GET /api/v1/audit`

## Security
- Passwords are hashed (PBKDF2 + salt), never stored as plain text.
- Session token is stored in browser localStorage.
- OAuth callback uses expiring state records to prevent CSRF replay.
