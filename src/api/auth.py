from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from src.storage.auth import (
    authenticate_user,
    create_access_token,
    create_user,
    decode_access_token,
    get_user_by_email,
    get_user_by_id,
)

http_bearer = HTTPBearer(auto_error=False)


class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterRequest(AuthRequest):
    body_mass_kg: float | None = Field(default=None, ge=30, le=180)
    body_fat_percent: float | None = Field(default=None, ge=3, le=60)
    vo2max: float | None = Field(default=None, ge=20, le=95)
    lactate_threshold_pct: float | None = Field(default=None, ge=60, le=100)
    gi_tolerance_score: float | None = Field(default=None, ge=0, le=10)
    default_temperature_c: float | None = Field(default=None, ge=-20, le=55)
    default_humidity_pct: float | None = Field(default=None, ge=0, le=100)
    default_altitude_m: float | None = Field(default=None, ge=-200, le=6000)
    default_terrain_factor: float | None = Field(default=None, ge=0.7, le=1.8)
    weekly_training_load_hours: float | None = Field(default=None, ge=0, le=60)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def register_user(payload: RegisterRequest) -> AuthResponse:
    existing = get_user_by_email(payload.email)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Account already exists")

    user = create_user(str(payload.email), payload.password)
    token = create_access_token(user_id=user["id"], email=user["email"])
    return AuthResponse(access_token=token, user=user)


def login_user(payload: AuthRequest) -> AuthResponse:
    user = authenticate_user(str(payload.email), payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user_id=user["id"], email=user["email"])
    return AuthResponse(access_token=token, user=user)


def require_user(credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer)) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    payload = decode_access_token(credentials.credentials)
    if payload is None or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user
