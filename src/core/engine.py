from __future__ import annotations

import math
import uuid
from typing import List, Tuple

from .models import (
    PredictionRequest,
    PredictionResponse,
    SimulationRequest,
    SimulationResponse,
    StrategyRecommendation,
    StrategyType,
)

SPORT_MULTIPLIER = {
    "running": 1.08,
    "cycling": 1.0,
    "swimming": 0.98,
    "hiking": 0.85,
    "trail_running": 1.15,
    "gym": 0.7,
    "hiit": 0.9,
    "hyrox": 1.1,
}


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _env_load_factor(temp_c: float, humidity: float, altitude_m: float, terrain_factor: float) -> float:
    heat = 1.0 + max(0.0, (temp_c - 18.0) * 0.008)
    humidity_load = 1.0 + max(0.0, (humidity - 55.0) * 0.002)
    altitude_load = 1.0 + max(0.0, (altitude_m - 500.0) * 0.00006)
    return heat * humidity_load * altitude_load * terrain_factor


def _confidence_band(req: PredictionRequest) -> Tuple[float, float, List[str]]:
    notes: List[str] = []
    uncertainty = 0.14

    if req.profile.vo2max is None:
        uncertainty += 0.04
        notes.append("VO2max missing; confidence widened.")
    if req.profile.lactate_threshold_pct is None:
        uncertainty += 0.03
        notes.append("Lactate threshold missing; threshold assumptions applied.")
    if req.profile.sleep_hours is None:
        uncertainty += 0.02
        notes.append("Sleep data missing; recovery estimate less precise.")
    if req.profile.hrv_score is None:
        uncertainty += 0.02
        notes.append("HRV missing; readiness uncertainty increased.")
    if req.session.sport.value in {"hyrox", "hiit"}:
        uncertainty += 0.03
        notes.append("High-variability session type raises uncertainty.")

    center = 0.78 if req.science_mode else 0.72
    low = _clamp(center - uncertainty, 0.4, 0.95)
    high = _clamp(center + uncertainty, 0.45, 0.99)
    return round(low, 2), round(high, 2), notes


def _base_carbs_per_hour(req: PredictionRequest) -> float:
    intensity = req.session.intensity_rpe
    duration_h = req.session.duration_minutes / 60.0
    mass = req.profile.body_mass_kg
    sport_mult = SPORT_MULTIPLIER[req.session.sport.value]
    env_factor = _env_load_factor(
        req.environment.temperature_c,
        req.environment.humidity_pct,
        req.environment.altitude_m,
        req.environment.terrain_factor,
    )

    carb_rate = 18 + (intensity * 5.8) + math.log1p(duration_h) * 8.5
    carb_rate += (mass - 60) * 0.25
    carb_rate *= sport_mult
    carb_rate *= env_factor

    if req.session.race_day:
        carb_rate *= 1.08
    if req.session.indoor:
        carb_rate *= 0.97

    gi_adjust = 1.0 - ((5 - req.profile.gi_tolerance_score) * 0.03)
    carb_rate *= _clamp(gi_adjust, 0.8, 1.15)

    return _clamp(carb_rate, 25, 120)


def _hydration_ml_per_hour(req: PredictionRequest) -> float:
    base = 420 + req.session.intensity_rpe * 55
    base += max(0, req.environment.temperature_c - 16) * 18
    base += max(0, req.environment.humidity_pct - 50) * 3
    if req.session.sport.value in {"cycling", "running", "trail_running", "hyrox"}:
        base += 60
    return _clamp(base, 350, 1300)


def _sodium_mg_per_hour(req: PredictionRequest, hydration_ml_h: float) -> float:
    sweat_factor = 0.6 + (req.environment.temperature_c / 50.0)
    sodium = hydration_ml_h * sweat_factor
    return _clamp(sodium, 300, 1800)


def _gi_risk(req: PredictionRequest, carbs_per_hour: float) -> float:
    risk = 2.5
    risk += max(0, carbs_per_hour - 70) * 0.03
    risk += max(0, req.session.intensity_rpe - 7) * 0.5
    risk += max(0, req.environment.temperature_c - 25) * 0.08
    risk += max(0, (5 - req.profile.gi_tolerance_score)) * 0.55
    if req.session.sport.value in {"running", "trail_running", "hyrox", "hiit"}:
        risk += 0.8
    return round(_clamp(risk, 0, 10), 2)


def _strategy_factor(strategy: StrategyType) -> float:
    if strategy == StrategyType.conservative:
        return 0.88
    if strategy == StrategyType.aggressive:
        return 1.12
    return 1.0


def _recommendation(req: PredictionRequest, strategy: StrategyType) -> StrategyRecommendation:
    carb_h = _base_carbs_per_hour(req) * _strategy_factor(strategy)
    carb_h = _clamp(carb_h, 20, 130)

    duration_h = req.session.duration_minutes / 60.0
    hydration = _hydration_ml_per_hour(req) * (0.96 if strategy == StrategyType.conservative else 1.0)
    sodium = _sodium_mg_per_hour(req, hydration)

    pre = _clamp(req.profile.body_mass_kg * (1.0 if req.science_mode else 0.8), 30, 140)
    during_total = carb_h * duration_h
    post = _clamp(req.profile.body_mass_kg * 0.9, 25, 120)

    gi = _gi_risk(req, carb_h)

    return StrategyRecommendation(
        strategy=strategy,
        carbs_g_per_hour=round(carb_h, 1),
        hydration_ml_per_hour=round(hydration, 0),
        sodium_mg_per_hour=round(sodium, 0),
        pre_workout_carbs_g=round(pre, 1),
        during_workout_carbs_g_total=round(during_total, 1),
        post_workout_carbs_g=round(post, 1),
        gi_risk_score=gi,
    )


def predict(req: PredictionRequest) -> PredictionResponse:
    low, high, notes = _confidence_band(req)
    strategies = [
        _recommendation(req, StrategyType.conservative),
        _recommendation(req, StrategyType.balanced),
        _recommendation(req, StrategyType.aggressive),
    ]

    rationale = [
        f"Sport-specific multiplier applied for {req.session.sport.value}.",
        "Environment load includes temperature, humidity, altitude, and terrain.",
        "GI risk includes carb density, intensity, heat, and tolerance profile.",
        "Outputs are shown in conservative/balanced/aggressive strategies.",
    ]

    return PredictionResponse(
        recommendation_id=str(uuid.uuid4()),
        strategies=strategies,
        confidence_low=low,
        confidence_high=high,
        uncertainty_notes=notes,
        rationale=rationale,
    )


def simulate(req: SimulationRequest) -> SimulationResponse:
    baseline = predict(req.base_request)

    modified = req.base_request.model_copy(deep=True)
    modified.environment.temperature_c += req.hotter_by_c
    modified.session.duration_minutes += req.longer_by_minutes
    modified.session.intensity_rpe = _clamp(modified.session.intensity_rpe + req.intensity_delta_rpe, 1, 10)

    simulated = predict(modified)

    base_balanced = [s for s in baseline.strategies if s.strategy == StrategyType.balanced][0]
    sim_balanced = [s for s in simulated.strategies if s.strategy == StrategyType.balanced][0]

    delta_summary = [
        f"Carbs/h change: {sim_balanced.carbs_g_per_hour - base_balanced.carbs_g_per_hour:+.1f} g/h",
        f"Hydration change: {sim_balanced.hydration_ml_per_hour - base_balanced.hydration_ml_per_hour:+.0f} ml/h",
        f"Sodium change: {sim_balanced.sodium_mg_per_hour - base_balanced.sodium_mg_per_hour:+.0f} mg/h",
        f"GI risk change: {sim_balanced.gi_risk_score - base_balanced.gi_risk_score:+.2f}",
    ]

    return SimulationResponse(
        baseline=baseline,
        simulated=simulated,
        delta_summary=delta_summary,
    )
