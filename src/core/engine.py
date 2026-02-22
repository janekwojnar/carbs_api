from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from .models import (
    FoodItem,
    FuelingAction,
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


def _interp(x: float, x1: float, x2: float, y1: float, y2: float) -> float:
    if x2 == x1:
        return y1
    t = _clamp((x - x1) / (x2 - x1), 0.0, 1.0)
    return y1 + (y2 - y1) * t


def _effective_intensity_rpe(req: PredictionRequest) -> float:
    mode = req.session.intensity_mode
    if mode == "rpe":
        return _clamp(req.session.intensity_rpe, 1, 10)

    if mode == "hr":
        target_hr = req.session.target_heart_rate_bpm
        if target_hr:
            lt1 = None
            lt2 = None
            if req.session.sport.value in {"running", "trail_running", "hiking"}:
                lt1 = req.profile.run_lt1_hr_bpm
                lt2 = req.profile.run_lt2_hr_bpm
            elif req.session.sport.value in {"cycling", "hyrox"}:
                lt1 = req.profile.bike_lt1_hr_bpm
                lt2 = req.profile.bike_lt2_hr_bpm

            if lt1 and lt2 and lt2 > lt1:
                if target_hr <= lt1:
                    return round(_interp(target_hr, max(80, lt1 - 30), lt1, 2.5, 4.0), 2)
                if target_hr <= lt2:
                    return round(_interp(target_hr, lt1, lt2, 4.0, 7.2), 2)
                max_hr = req.session.max_heart_rate_bpm or (lt2 + 12)
                return round(_interp(target_hr, lt2, max_hr, 7.2, 9.5), 2)

            if req.session.max_heart_rate_bpm:
                ratio = target_hr / max(1.0, req.session.max_heart_rate_bpm)
                return round(_interp(ratio, 0.55, 0.95, 3.0, 9.2), 2)
        return _clamp(req.session.intensity_rpe, 1, 10)

    if mode == "power":
        target_power = req.session.target_power_watts
        if target_power:
            if req.session.sport.value in {"cycling", "hyrox"} and req.profile.bike_ftp_w:
                ratio = target_power / max(1.0, req.profile.bike_ftp_w)
            elif req.session.sport.value in {"running", "trail_running"} and req.profile.run_ftp_w:
                ratio = target_power / max(1.0, req.profile.run_ftp_w)
            else:
                ratio = None
            if ratio is not None:
                if ratio <= 0.6:
                    return round(_interp(ratio, 0.4, 0.6, 2.5, 3.8), 2)
                if ratio <= 0.75:
                    return round(_interp(ratio, 0.6, 0.75, 3.8, 5.0), 2)
                if ratio <= 0.9:
                    return round(_interp(ratio, 0.75, 0.9, 5.0, 6.8), 2)
                if ratio <= 1.05:
                    return round(_interp(ratio, 0.9, 1.05, 6.8, 8.4), 2)
                return round(_interp(ratio, 1.05, 1.2, 8.4, 9.7), 2)
        return _clamp(req.session.intensity_rpe, 1, 10)

    if mode == "pace":
        if req.session.target_pace_sec_per_km and req.profile.run_threshold_pace_sec_per_km:
            pace_ratio = req.profile.run_threshold_pace_sec_per_km / max(1.0, req.session.target_pace_sec_per_km)
            if pace_ratio <= 0.85:
                return round(_interp(pace_ratio, 0.65, 0.85, 2.5, 4.0), 2)
            if pace_ratio <= 1.0:
                return round(_interp(pace_ratio, 0.85, 1.0, 4.0, 7.0), 2)
            return round(_interp(pace_ratio, 1.0, 1.15, 7.0, 9.5), 2)
        return _clamp(req.session.intensity_rpe, 1, 10)

    return _clamp(req.session.intensity_rpe, 1, 10)


def _effective_hr(req: PredictionRequest) -> Optional[float]:
    if req.session.avg_heart_rate_bpm:
        return req.session.avg_heart_rate_bpm
    if req.session.intensity_mode == "hr" and req.session.target_heart_rate_bpm:
        return req.session.target_heart_rate_bpm
    return None


def _effective_power(req: PredictionRequest) -> Optional[float]:
    if req.session.avg_power_watts:
        return req.session.avg_power_watts
    if req.session.intensity_mode == "power" and req.session.target_power_watts:
        return req.session.target_power_watts
    return None


def _load_signal(req: PredictionRequest) -> Tuple[float, List[str]]:
    notes: List[str] = []
    factor = 1.0
    hr_value = _effective_hr(req)
    power_value = _effective_power(req)

    if hr_value and req.session.max_heart_rate_bpm:
        hr_ratio = hr_value / req.session.max_heart_rate_bpm
        hr_factor = _clamp(0.9 + hr_ratio * 0.2, 0.88, 1.12)
        factor *= hr_factor
        notes.append("Heart-rate load factor applied from target/average HR.")

    if power_value:
        power_factor = _clamp(0.9 + (power_value / 300.0) * 0.18, 0.88, 1.15)
        factor *= power_factor
        notes.append("Power-based load factor applied from target/average power.")

    if req.session.normalized_power_watts and power_value:
        variability = req.session.normalized_power_watts / max(1.0, power_value)
        factor *= _clamp(0.95 + (variability - 1.0) * 0.5, 0.9, 1.1)
        notes.append("Power variability adjustment applied (NP/AP ratio).")

    if req.session.distance_km and req.session.duration_minutes:
        pace_signal = req.session.distance_km / (req.session.duration_minutes / 60.0)
        factor *= _clamp(0.95 + pace_signal * 0.012, 0.9, 1.1)
        notes.append("Speed/pace load factor applied from distance and duration.")

    if req.session.elevation_gain_m and req.session.duration_minutes:
        vert_rate = req.session.elevation_gain_m / max(1.0, req.session.duration_minutes)
        factor *= _clamp(1.0 + vert_rate * 0.007, 1.0, 1.16)
        notes.append("Elevation stress adjustment applied.")

    return factor, notes


def _confidence_band(req: PredictionRequest) -> Tuple[float, float, List[str]]:
    notes: List[str] = []
    uncertainty = 0.13

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
    if _effective_hr(req) is None and _effective_power(req) is None:
        uncertainty += 0.03
        notes.append("No HR/power telemetry provided; load estimate less precise.")
    if req.profile.bike_ftp_w is None and req.profile.run_ftp_w is None:
        uncertainty += 0.02
        notes.append("FTP missing; intensity factor confidence reduced.")

    center = 0.79 if req.science_mode else 0.73
    low = _clamp(center - uncertainty, 0.4, 0.95)
    high = _clamp(center + uncertainty, 0.45, 0.99)
    return round(low, 2), round(high, 2), notes


def _base_carbs_per_hour(req: PredictionRequest) -> Tuple[float, List[str]]:
    intensity = _effective_intensity_rpe(req)
    duration_h = req.session.duration_minutes / 60.0
    mass = req.profile.body_mass_kg
    sport_mult = SPORT_MULTIPLIER[req.session.sport.value]
    env_factor = _env_load_factor(
        req.environment.temperature_c,
        req.environment.humidity_pct,
        req.environment.altitude_m,
        req.environment.terrain_factor,
    )

    intensity_norm = _clamp((intensity - 1) / 9.0, 0.0, 1.0)

    if duration_h < 1.0:
        carb_rate = 12 + intensity_norm * 24
    elif duration_h < 2.0:
        carb_rate = 18 + intensity_norm * 34
    elif duration_h < 3.5:
        carb_rate = 25 + intensity_norm * 48
    else:
        carb_rate = 35 + intensity_norm * 60

    carb_rate += (mass - 70) * 0.12
    carb_rate *= sport_mult
    carb_rate *= env_factor

    load_factor, load_notes = _load_signal(req)
    carb_rate *= load_factor

    power_value = _effective_power(req)
    hr_value = _effective_hr(req)

    if power_value and req.profile.bike_ftp_w and req.session.sport.value in {"cycling", "hyrox"}:
        ifactor = power_value / req.profile.bike_ftp_w
        carb_rate *= _clamp(0.9 + ifactor * 0.18, 0.88, 1.2)
        load_notes.append("Bike intensity factor based on target/average power vs FTP.")

    if power_value and req.profile.run_ftp_w and req.session.sport.value in {"running", "trail_running"}:
        rifactor = power_value / req.profile.run_ftp_w
        carb_rate *= _clamp(0.9 + rifactor * 0.14, 0.88, 1.15)
        load_notes.append("Run intensity factor based on target/average power vs rFTP.")

    if hr_value and req.profile.run_lt2_hr_bpm and req.session.sport.value in {"running", "trail_running"}:
        hr_ratio = hr_value / req.profile.run_lt2_hr_bpm
        carb_rate *= _clamp(0.92 + hr_ratio * 0.1, 0.9, 1.1)
        load_notes.append("Run LT2 heart-rate ratio adjustment applied.")

    if hr_value and req.profile.bike_lt2_hr_bpm and req.session.sport.value in {"cycling"}:
        hr_ratio = hr_value / req.profile.bike_lt2_hr_bpm
        carb_rate *= _clamp(0.92 + hr_ratio * 0.1, 0.9, 1.1)
        load_notes.append("Bike LT2 heart-rate ratio adjustment applied.")

    if req.session.race_day:
        carb_rate *= 1.08
    if req.session.indoor:
        carb_rate *= 0.97

    gut_cap = req.profile.max_carb_absorption_g_h or (70 + req.profile.gut_training_level * 5.5)
    gi_adjust = 1.0 - ((5 - req.profile.gi_tolerance_score) * 0.03)
    carb_rate *= _clamp(gi_adjust, 0.8, 1.15)

    # Guardrail: easy aerobic sessions should not default to race-level intake.
    if intensity <= 4.4 and duration_h <= 2.6 and not req.session.race_day:
        easy_caps = {
            "running": 60,
            "trail_running": 65,
            "hiking": 55,
            "cycling": 65,
            "swimming": 55,
            "gym": 45,
            "hiit": 55,
            "hyrox": 65,
        }
        cap = easy_caps.get(req.session.sport.value, 60)
        carb_rate = min(carb_rate, cap)
        load_notes.append("Easy-session carb guardrail applied.")

    carb_rate = _clamp(carb_rate, 25, gut_cap)
    return _clamp(carb_rate, 25, 140), load_notes


def _hydration_ml_per_hour(req: PredictionRequest) -> float:
    sweat_l_h = req.profile.sweat_rate_l_h or 0.9
    base = sweat_l_h * 1000
    base += (_effective_intensity_rpe(req) - 5.0) * 45
    base += max(0, req.environment.temperature_c - 16) * 18
    base += max(0, req.environment.humidity_pct - 50) * 3
    if req.session.sport.value in {"cycling", "running", "trail_running", "hyrox"}:
        base += 60
    hr_value = _effective_hr(req)
    if hr_value:
        base += max(0.0, hr_value - 145) * 1.1
    return _clamp(base, 350, 1300)


def _sodium_mg_per_hour(req: PredictionRequest, hydration_ml_h: float) -> float:
    sodium_loss_mg_l = req.profile.sodium_loss_mg_l or 850
    sodium = (hydration_ml_h / 1000.0) * sodium_loss_mg_l
    sodium *= 1.0 + max(0.0, req.environment.temperature_c - 24) * 0.01
    return _clamp(sodium, 300, 1800)


def _gi_risk(req: PredictionRequest, carbs_per_hour: float) -> float:
    risk = 2.0
    risk += max(0, carbs_per_hour - 65) * 0.025
    risk += max(0, _effective_intensity_rpe(req) - 7) * 0.5
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


def _recommendation(req: PredictionRequest, strategy: StrategyType, base_carb_h: float) -> StrategyRecommendation:
    carb_h = base_carb_h * _strategy_factor(strategy)
    carb_h = _clamp(carb_h, 20, 130)

    duration_h = req.session.duration_minutes / 60.0
    hydration = _hydration_ml_per_hour(req) * (0.96 if strategy == StrategyType.conservative else 1.0)
    sodium = _sodium_mg_per_hour(req, hydration)

    pre = _clamp(req.profile.body_mass_kg * (1.1 if req.science_mode else 0.85), 30, 170)
    during_total = carb_h * duration_h
    post = _clamp(req.profile.body_mass_kg * 1.0, 25, 140)

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


def _slot_times(duration_minutes: int) -> List[int]:
    slots = [0]
    minute = 15
    while minute <= duration_minutes:
        slots.append(minute)
        minute += 15
    if slots[-1] != duration_minutes:
        slots.append(duration_minutes)
    return sorted(set(slots))


def _best_food_combo(
    foods: List[FoodItem],
    target_carbs: float,
    target_fluid: float,
    target_sodium: float,
) -> Optional[FoodItem]:
    if not foods:
        return None
    best = None
    best_score = 1e9
    for f in foods:
        score = (
            abs(f.carbs_g - target_carbs) * 1.8
            + abs(f.fluid_ml - target_fluid) * 0.01
            + abs(f.sodium_mg - target_sodium) * 0.003
        )
        if score < best_score:
            best = f
            best_score = score
    return best


def _format_clock(start_iso: Optional[str], offset_min: int) -> str:
    if not start_iso:
        return f"T+{offset_min}m"
    try:
        start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    except ValueError:
        return f"T+{offset_min}m"
    return (start + timedelta(minutes=offset_min)).strftime("%H:%M")


def build_fueling_schedule(
    req: PredictionRequest,
    balanced: StrategyRecommendation,
    foods: Optional[List[FoodItem]] = None,
) -> List[FuelingAction]:
    duration = req.session.duration_minutes
    slots = _slot_times(duration)
    schedule: List[FuelingAction] = []
    per_slot_carb = balanced.carbs_g_per_hour / 4.0
    per_slot_fluid = balanced.hydration_ml_per_hour / 4.0
    per_slot_sodium = balanced.sodium_mg_per_hour / 4.0
    active_foods = foods or []

    for m in slots:
        if m == 0:
            schedule.append(
                FuelingAction(
                    minute_offset=0,
                    action=_format_clock(req.session.planned_start_iso, 0),
                    food_name="Pre-start carb meal",
                    serving=f"{balanced.pre_workout_carbs_g:.0f} g carbs total",
                    carbs_g=round(balanced.pre_workout_carbs_g, 1),
                    sodium_mg=round(per_slot_sodium, 0),
                    fluid_ml=round(per_slot_fluid, 0),
                    notes="Finish 25-40 min before start.",
                )
            )
            continue

        choice = _best_food_combo(active_foods, per_slot_carb, per_slot_fluid, per_slot_sodium)
        if choice:
            schedule.append(
                FuelingAction(
                    minute_offset=m,
                    action=_format_clock(req.session.planned_start_iso, m),
                    food_name=choice.name,
                    serving=choice.serving_desc,
                    carbs_g=round(choice.carbs_g, 1),
                    sodium_mg=round(choice.sodium_mg, 0),
                    fluid_ml=round(choice.fluid_ml, 0),
                    notes=f"Target this around every 15 min. Slot target: {per_slot_carb:.1f} g carbs.",
                )
            )
        else:
            schedule.append(
                FuelingAction(
                    minute_offset=m,
                    action=_format_clock(req.session.planned_start_iso, m),
                    food_name="Carb mix + drink",
                    serving="Custom",
                    carbs_g=round(per_slot_carb, 1),
                    sodium_mg=round(per_slot_sodium, 0),
                    fluid_ml=round(per_slot_fluid, 0),
                    notes="No foods selected; using macro slot targets.",
                )
            )
    return schedule


def predict(req: PredictionRequest, foods: Optional[List[FoodItem]] = None) -> PredictionResponse:
    low, high, notes = _confidence_band(req)
    base_carb_h, load_notes = _base_carbs_per_hour(req)
    strategies = [
        _recommendation(req, StrategyType.conservative, base_carb_h),
        _recommendation(req, StrategyType.balanced, base_carb_h),
        _recommendation(req, StrategyType.aggressive, base_carb_h),
    ]

    rationale = [
        f"Sport-specific multiplier applied for {req.session.sport.value}.",
        "Environment load includes temperature, humidity, altitude, and terrain.",
        "GI risk includes carb density, intensity, heat, and tolerance profile.",
        "Outputs are shown in conservative/balanced/aggressive strategies.",
    ] + load_notes
    balanced = [s for s in strategies if s.strategy == StrategyType.balanced][0]
    schedule = build_fueling_schedule(req, balanced, foods=foods)

    return PredictionResponse(
        recommendation_id=str(uuid.uuid4()),
        strategies=strategies,
        confidence_low=low,
        confidence_high=high,
        uncertainty_notes=notes,
        rationale=rationale,
        fueling_schedule=schedule,
    )


def simulate(req: SimulationRequest, foods: Optional[List[FoodItem]] = None) -> SimulationResponse:
    baseline = predict(req.base_request, foods=foods)

    modified = req.base_request.model_copy(deep=True)
    modified.environment.temperature_c += req.hotter_by_c
    modified.session.duration_minutes += req.longer_by_minutes
    modified.session.intensity_rpe = _clamp(modified.session.intensity_rpe + req.intensity_delta_rpe, 1, 10)

    simulated = predict(modified, foods=foods)

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
