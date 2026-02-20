from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class SportType(str, Enum):
    running = "running"
    cycling = "cycling"
    swimming = "swimming"
    hiking = "hiking"
    trail_running = "trail_running"
    gym = "gym"
    hiit = "hiit"
    hyrox = "hyrox"


class StrategyType(str, Enum):
    conservative = "conservative"
    balanced = "balanced"
    aggressive = "aggressive"


class UserProfile(BaseModel):
    body_mass_kg: float = Field(gt=30, lt=180)
    body_fat_percent: Optional[float] = Field(default=None, ge=3, le=60)
    vo2max: Optional[float] = Field(default=None, ge=20, le=95)
    lactate_threshold_pct: Optional[float] = Field(default=None, ge=60, le=100)
    gi_tolerance_score: float = Field(ge=0, le=10, default=5)
    menstrual_context: Optional[str] = None
    stress_score: float = Field(ge=0, le=10, default=3)
    injury_or_illness_flag: bool = False
    sleep_hours: Optional[float] = Field(default=None, ge=0, le=14)
    hrv_score: Optional[float] = Field(default=None, ge=0, le=100)


class SessionContext(BaseModel):
    sport: SportType
    duration_minutes: int = Field(ge=10, le=1200)
    intensity_rpe: float = Field(ge=1, le=10)
    indoor: bool = False
    race_day: bool = False
    weekly_training_load_hours: Optional[float] = Field(default=None, ge=0, le=60)
    avg_heart_rate_bpm: Optional[float] = Field(default=None, ge=50, le=230)
    max_heart_rate_bpm: Optional[float] = Field(default=None, ge=80, le=240)
    avg_power_watts: Optional[float] = Field(default=None, ge=40, le=700)
    normalized_power_watts: Optional[float] = Field(default=None, ge=40, le=700)
    avg_cadence: Optional[float] = Field(default=None, ge=20, le=250)
    distance_km: Optional[float] = Field(default=None, ge=0, le=1000)
    elevation_gain_m: Optional[float] = Field(default=None, ge=0, le=20000)
    planned_or_completed: str = Field(default="planned", pattern="^(planned|completed)$")


class EnvironmentContext(BaseModel):
    temperature_c: float = Field(ge=-20, le=55)
    humidity_pct: float = Field(ge=0, le=100)
    altitude_m: float = Field(ge=-200, le=6000)
    terrain_factor: float = Field(default=1.0, ge=0.7, le=1.8)


class PredictionRequest(BaseModel):
    profile: UserProfile
    session: SessionContext
    environment: EnvironmentContext
    science_mode: bool = True


class StrategyRecommendation(BaseModel):
    strategy: StrategyType
    carbs_g_per_hour: float
    hydration_ml_per_hour: float
    sodium_mg_per_hour: float
    pre_workout_carbs_g: float
    during_workout_carbs_g_total: float
    post_workout_carbs_g: float
    gi_risk_score: float


class PredictionResponse(BaseModel):
    recommendation_id: str
    strategies: List[StrategyRecommendation]
    confidence_low: float
    confidence_high: float
    uncertainty_notes: List[str]
    rationale: List[str]


class SimulationRequest(BaseModel):
    base_request: PredictionRequest
    hotter_by_c: float = 0
    longer_by_minutes: int = 0
    intensity_delta_rpe: float = 0


class SimulationResponse(BaseModel):
    baseline: PredictionResponse
    simulated: PredictionResponse
    delta_summary: List[str]
