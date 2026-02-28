import Foundation
// MARK: - Models

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
}

struct UserDTO: Codable {
    let id: Int
    let email: String
}

struct AuthEnvelope: Codable {
    let accessToken: String
    let tokenType: String
    let user: UserDTO
    let profile: ProfileDTO

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case user
        case profile
    }
}

struct MeEnvelope: Codable {
    let user: UserDTO
    let profile: ProfileDTO
}

struct ProfileEnvelope: Codable {
    let profile: ProfileDTO
}

struct FoodsEnvelope: Codable {
    let items: [FoodItem]
}

struct FoodEnvelope: Codable {
    let item: FoodItem
}

struct IntegrationsEnvelope: Codable {
    let items: [IntegrationStatus]
}

struct OAuthStartEnvelope: Codable {
    let authorizeURL: String

    enum CodingKeys: String, CodingKey {
        case authorizeURL = "authorize_url"
    }
}

struct SyncEnvelope: Codable {
    let synced: Int
}

struct WorkoutsEnvelope: Codable {
    let items: [Workout]
}

struct WorkoutEnvelope: Codable {
    let item: Workout
}

struct FuelEventsEnvelope: Codable {
    let items: [FuelEvent]
}

struct FuelEventEnvelope: Codable {
    let item: FuelEvent
}

struct AnalyticsSummaryEnvelope: Codable {
    let summary: AnalyticsSummary
}

struct AnalyticsChartsEnvelope: Codable {
    let charts: AnalyticsCharts
}

struct ErrorEnvelope: Codable {
    let detail: String
}

struct HealthEnvelope: Codable {
    let ok: Bool
    let service: String
    let version: String
}

struct SimpleOK: Codable {
    let ok: Bool
}

struct ProfileDTO: Codable {
    let bodyMassKg: Double?
    let bodyFatPercent: Double?
    let vo2max: Double?
    let lactateThresholdPct: Double?
    let giToleranceScore: Double?
    let sweatRateLH: Double?
    let sodiumLossMgL: Double?
    let defaultTemperatureC: Double?
    let defaultHumidityPct: Double?
    let defaultAltitudeM: Double?
    let defaultTerrainFactor: Double?
    let weeklyTrainingLoadHours: Double?
    let bikeFtpW: Double?
    let runFtpW: Double?
    let runThresholdPaceSecPerKm: Double?
    let bikeLt1HrBpm: Double?
    let bikeLt2HrBpm: Double?
    let runLt1HrBpm: Double?
    let runLt2HrBpm: Double?
    let maxCarbAbsorptionGH: Double?
    let gutTrainingLevel: Double?

    enum CodingKeys: String, CodingKey {
        case bodyMassKg = "body_mass_kg"
        case bodyFatPercent = "body_fat_percent"
        case vo2max
        case lactateThresholdPct = "lactate_threshold_pct"
        case giToleranceScore = "gi_tolerance_score"
        case sweatRateLH = "sweat_rate_l_h"
        case sodiumLossMgL = "sodium_loss_mg_l"
        case defaultTemperatureC = "default_temperature_c"
        case defaultHumidityPct = "default_humidity_pct"
        case defaultAltitudeM = "default_altitude_m"
        case defaultTerrainFactor = "default_terrain_factor"
        case weeklyTrainingLoadHours = "weekly_training_load_hours"
        case bikeFtpW = "bike_ftp_w"
        case runFtpW = "run_ftp_w"
        case runThresholdPaceSecPerKm = "run_threshold_pace_sec_per_km"
        case bikeLt1HrBpm = "bike_lt1_hr_bpm"
        case bikeLt2HrBpm = "bike_lt2_hr_bpm"
        case runLt1HrBpm = "run_lt1_hr_bpm"
        case runLt2HrBpm = "run_lt2_hr_bpm"
        case maxCarbAbsorptionGH = "max_carb_absorption_g_h"
        case gutTrainingLevel = "gut_training_level"
    }
}

struct AthleteProfile {
    var bodyMassKg: Double? = 75
    var bodyFatPercent: Double? = 12
    var vo2max: Double? = 55
    var lactateThresholdPct: Double? = 86
    var giToleranceScore: Double? = 6
    var sweatRateLh: Double? = 0.8
    var sodiumLossMgl: Double? = 900

    var defaultTemperatureC: Double? = 18
    var defaultHumidityPct: Double? = 55
    var defaultAltitudeM: Double? = 100
    var defaultTerrainFactor: Double? = 1.0
    var weeklyTrainingLoadHours: Double? = 12

    var bikeFtpW: Double? = 300
    var runFtpW: Double? = nil
    var runThresholdPaceSecPerKm: Double? = 255
    var bikeLt1HrBpm: Double? = 140
    var bikeLt2HrBpm: Double? = 170
    var runLt1HrBpm: Double? = 145
    var runLt2HrBpm: Double? = 176
    var maxCarbAbsorptionGH: Double? = 100
    var gutTrainingLevel: Double? = 7

    static func fromProfileDict(_ dto: ProfileDTO) -> AthleteProfile {
        AthleteProfile(
            bodyMassKg: dto.bodyMassKg,
            bodyFatPercent: dto.bodyFatPercent,
            vo2max: dto.vo2max,
            lactateThresholdPct: dto.lactateThresholdPct,
            giToleranceScore: dto.giToleranceScore,
            sweatRateLh: dto.sweatRateLH,
            sodiumLossMgl: dto.sodiumLossMgL,
            defaultTemperatureC: dto.defaultTemperatureC,
            defaultHumidityPct: dto.defaultHumidityPct,
            defaultAltitudeM: dto.defaultAltitudeM,
            defaultTerrainFactor: dto.defaultTerrainFactor,
            weeklyTrainingLoadHours: dto.weeklyTrainingLoadHours,
            bikeFtpW: dto.bikeFtpW,
            runFtpW: dto.runFtpW,
            runThresholdPaceSecPerKm: dto.runThresholdPaceSecPerKm,
            bikeLt1HrBpm: dto.bikeLt1HrBpm,
            bikeLt2HrBpm: dto.bikeLt2HrBpm,
            runLt1HrBpm: dto.runLt1HrBpm,
            runLt2HrBpm: dto.runLt2HrBpm,
            maxCarbAbsorptionGH: dto.maxCarbAbsorptionGH,
            gutTrainingLevel: dto.gutTrainingLevel
        )
    }

    func toProfileUpdate() -> ProfileUpdateBody {
        ProfileUpdateBody(
            bodyMassKg: bodyMassKg,
            bodyFatPercent: bodyFatPercent,
            vo2max: vo2max,
            lactateThresholdPct: lactateThresholdPct,
            giToleranceScore: giToleranceScore,
            sweatRateLH: sweatRateLh,
            sodiumLossMgL: sodiumLossMgl,
            defaultTemperatureC: defaultTemperatureC,
            defaultHumidityPct: defaultHumidityPct,
            defaultAltitudeM: defaultAltitudeM,
            defaultTerrainFactor: defaultTerrainFactor,
            weeklyTrainingLoadHours: weeklyTrainingLoadHours,
            defaultIndoor: nil,
            bikeFtpW: bikeFtpW,
            runFtpW: runFtpW,
            runThresholdPaceSecPerKm: runThresholdPaceSecPerKm,
            bikeLt1HrBpm: bikeLt1HrBpm,
            bikeLt2HrBpm: bikeLt2HrBpm,
            runLt1HrBpm: runLt1HrBpm,
            runLt2HrBpm: runLt2HrBpm,
            maxCarbAbsorptionGH: maxCarbAbsorptionGH,
            gutTrainingLevel: gutTrainingLevel
        )
    }

    func toPayload() -> ProfilePayload {
        ProfilePayload(
            bodyMassKg: bodyMassKg ?? 75,
            bodyFatPercent: bodyFatPercent,
            vo2max: vo2max,
            lactateThresholdPct: lactateThresholdPct,
            giToleranceScore: giToleranceScore ?? 5,
            menstrualContext: nil,
            stressScore: 3,
            injuryOrIllnessFlag: false,
            sleepHours: 7.5,
            hrvScore: 60,
            sweatRateLH: sweatRateLh,
            sodiumLossMgL: sodiumLossMgl,
            bikeFtpW: bikeFtpW,
            runFtpW: runFtpW,
            runThresholdPaceSecPerKm: runThresholdPaceSecPerKm,
            bikeLt1HrBpm: bikeLt1HrBpm,
            bikeLt2HrBpm: bikeLt2HrBpm,
            runLt1HrBpm: runLt1HrBpm,
            runLt2HrBpm: runLt2HrBpm,
            maxCarbAbsorptionGH: maxCarbAbsorptionGH,
            gutTrainingLevel: gutTrainingLevel ?? 6
        )
    }
}

struct ProfileUpdateBody: Codable {
    let bodyMassKg: Double?
    let bodyFatPercent: Double?
    let vo2max: Double?
    let lactateThresholdPct: Double?
    let giToleranceScore: Double?
    let sweatRateLH: Double?
    let sodiumLossMgL: Double?
    let defaultTemperatureC: Double?
    let defaultHumidityPct: Double?
    let defaultAltitudeM: Double?
    let defaultTerrainFactor: Double?
    let weeklyTrainingLoadHours: Double?
    let defaultIndoor: Bool?
    let bikeFtpW: Double?
    let runFtpW: Double?
    let runThresholdPaceSecPerKm: Double?
    let bikeLt1HrBpm: Double?
    let bikeLt2HrBpm: Double?
    let runLt1HrBpm: Double?
    let runLt2HrBpm: Double?
    let maxCarbAbsorptionGH: Double?
    let gutTrainingLevel: Double?

    enum CodingKeys: String, CodingKey {
        case bodyMassKg = "body_mass_kg"
        case bodyFatPercent = "body_fat_percent"
        case vo2max
        case lactateThresholdPct = "lactate_threshold_pct"
        case giToleranceScore = "gi_tolerance_score"
        case sweatRateLH = "sweat_rate_l_h"
        case sodiumLossMgL = "sodium_loss_mg_l"
        case defaultTemperatureC = "default_temperature_c"
        case defaultHumidityPct = "default_humidity_pct"
        case defaultAltitudeM = "default_altitude_m"
        case defaultTerrainFactor = "default_terrain_factor"
        case weeklyTrainingLoadHours = "weekly_training_load_hours"
        case defaultIndoor = "default_indoor"
        case bikeFtpW = "bike_ftp_w"
        case runFtpW = "run_ftp_w"
        case runThresholdPaceSecPerKm = "run_threshold_pace_sec_per_km"
        case bikeLt1HrBpm = "bike_lt1_hr_bpm"
        case bikeLt2HrBpm = "bike_lt2_hr_bpm"
        case runLt1HrBpm = "run_lt1_hr_bpm"
        case runLt2HrBpm = "run_lt2_hr_bpm"
        case maxCarbAbsorptionGH = "max_carb_absorption_g_h"
        case gutTrainingLevel = "gut_training_level"
    }
}

struct ProfilePayload: Codable {
    let bodyMassKg: Double
    let bodyFatPercent: Double?
    let vo2max: Double?
    let lactateThresholdPct: Double?
    let giToleranceScore: Double
    let menstrualContext: String?
    let stressScore: Double
    let injuryOrIllnessFlag: Bool
    let sleepHours: Double?
    let hrvScore: Double?
    let sweatRateLH: Double?
    let sodiumLossMgL: Double?
    let bikeFtpW: Double?
    let runFtpW: Double?
    let runThresholdPaceSecPerKm: Double?
    let bikeLt1HrBpm: Double?
    let bikeLt2HrBpm: Double?
    let runLt1HrBpm: Double?
    let runLt2HrBpm: Double?
    let maxCarbAbsorptionGH: Double?
    let gutTrainingLevel: Double

    enum CodingKeys: String, CodingKey {
        case bodyMassKg = "body_mass_kg"
        case bodyFatPercent = "body_fat_percent"
        case vo2max
        case lactateThresholdPct = "lactate_threshold_pct"
        case giToleranceScore = "gi_tolerance_score"
        case menstrualContext = "menstrual_context"
        case stressScore = "stress_score"
        case injuryOrIllnessFlag = "injury_or_illness_flag"
        case sleepHours = "sleep_hours"
        case hrvScore = "hrv_score"
        case sweatRateLH = "sweat_rate_l_h"
        case sodiumLossMgL = "sodium_loss_mg_l"
        case bikeFtpW = "bike_ftp_w"
        case runFtpW = "run_ftp_w"
        case runThresholdPaceSecPerKm = "run_threshold_pace_sec_per_km"
        case bikeLt1HrBpm = "bike_lt1_hr_bpm"
        case bikeLt2HrBpm = "bike_lt2_hr_bpm"
        case runLt1HrBpm = "run_lt1_hr_bpm"
        case runLt2HrBpm = "run_lt2_hr_bpm"
        case maxCarbAbsorptionGH = "max_carb_absorption_g_h"
        case gutTrainingLevel = "gut_training_level"
    }
}

struct SessionPayload: Codable {
    let sport: String
    let durationMinutes: Int
    let intensityRpe: Double
    let indoor: Bool
    let raceDay: Bool
    let weeklyTrainingLoadHours: Double?
    let avgHeartRateBpm: Double?
    let maxHeartRateBpm: Double?
    let avgPowerWatts: Double?
    let normalizedPowerWatts: Double?
    let avgCadence: Double?
    let distanceKm: Double?
    let elevationGainM: Double?
    let plannedOrCompleted: String
    let plannedStartIso: String?
    let intensityMode: String
    let targetHeartRateBpm: Double?
    let targetPowerWatts: Double?
    let targetPaceSecPerKm: Double?

    enum CodingKeys: String, CodingKey {
        case sport
        case durationMinutes = "duration_minutes"
        case intensityRpe = "intensity_rpe"
        case indoor
        case raceDay = "race_day"
        case weeklyTrainingLoadHours = "weekly_training_load_hours"
        case avgHeartRateBpm = "avg_heart_rate_bpm"
        case maxHeartRateBpm = "max_heart_rate_bpm"
        case avgPowerWatts = "avg_power_watts"
        case normalizedPowerWatts = "normalized_power_watts"
        case avgCadence = "avg_cadence"
        case distanceKm = "distance_km"
        case elevationGainM = "elevation_gain_m"
        case plannedOrCompleted = "planned_or_completed"
        case plannedStartIso = "planned_start_iso"
        case intensityMode = "intensity_mode"
        case targetHeartRateBpm = "target_heart_rate_bpm"
        case targetPowerWatts = "target_power_watts"
        case targetPaceSecPerKm = "target_pace_sec_per_km"
    }
}

struct EnvironmentPayload: Codable {
    let temperatureC: Double
    let humidityPct: Double
    let altitudeM: Double
    let terrainFactor: Double

    enum CodingKeys: String, CodingKey {
        case temperatureC = "temperature_c"
        case humidityPct = "humidity_pct"
        case altitudeM = "altitude_m"
        case terrainFactor = "terrain_factor"
    }
}

struct PredictionRequestBody: Codable {
    let profile: ProfilePayload
    let session: SessionPayload
    let environment: EnvironmentPayload
    let scienceMode: Bool
    let selectedFoodIds: [Int]

    enum CodingKeys: String, CodingKey {
        case profile
        case session
        case environment
        case scienceMode = "science_mode"
        case selectedFoodIds = "selected_food_ids"
    }
}

struct Strategy: Codable {
    let strategy: String
    let carbsGPerHour: Double
    let hydrationMlPerHour: Double
    let sodiumMgPerHour: Double
    let preWorkoutCarbsG: Double
    let duringWorkoutCarbsGTotal: Double
    let postWorkoutCarbsG: Double
    let giRiskScore: Double

    enum CodingKeys: String, CodingKey {
        case strategy
        case carbsGPerHour = "carbs_g_per_hour"
        case hydrationMlPerHour = "hydration_ml_per_hour"
        case sodiumMgPerHour = "sodium_mg_per_hour"
        case preWorkoutCarbsG = "pre_workout_carbs_g"
        case duringWorkoutCarbsGTotal = "during_workout_carbs_g_total"
        case postWorkoutCarbsG = "post_workout_carbs_g"
        case giRiskScore = "gi_risk_score"
    }
}

struct FuelingAction: Codable {
    let minuteOffset: Int
    let action: String
    let foodName: String
    let serving: String
    let carbsG: Double
    let sodiumMg: Double
    let fluidMl: Double
    let notes: String

    enum CodingKeys: String, CodingKey {
        case minuteOffset = "minute_offset"
        case action
        case foodName = "food_name"
        case serving
        case carbsG = "carbs_g"
        case sodiumMg = "sodium_mg"
        case fluidMl = "fluid_ml"
        case notes
    }
}

struct PredictionResponse: Codable {
    let recommendationId: String
    let strategies: [Strategy]
    let confidenceLow: Double
    let confidenceHigh: Double
    let uncertaintyNotes: [String]
    let rationale: [String]
    let fuelingSchedule: [FuelingAction]

    enum CodingKeys: String, CodingKey {
        case recommendationId = "recommendation_id"
        case strategies
        case confidenceLow = "confidence_low"
        case confidenceHigh = "confidence_high"
        case uncertaintyNotes = "uncertainty_notes"
        case rationale
        case fuelingSchedule = "fueling_schedule"
    }
}

struct FoodItem: Codable {
    let id: Int
    let name: String
    let category: String
    let servingDesc: String
    let carbsG: Double
    let sodiumMg: Double
    let fluidMl: Double
    let caffeineMg: Double
    let isBuiltin: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case category
        case servingDesc = "serving_desc"
        case carbsG = "carbs_g"
        case sodiumMg = "sodium_mg"
        case fluidMl = "fluid_ml"
        case caffeineMg = "caffeine_mg"
        case isBuiltin = "is_builtin"
    }
}

struct FoodDraft: Codable {
    var name: String
    var category: String
    var servingDesc: String
    var carbsG: Double
    var sodiumMg: Double
    var fluidMl: Double
    var caffeineMg: Double

    enum CodingKeys: String, CodingKey {
        case name
        case category
        case servingDesc = "serving_desc"
        case carbsG = "carbs_g"
        case sodiumMg = "sodium_mg"
        case fluidMl = "fluid_ml"
        case caffeineMg = "caffeine_mg"
    }
}

struct IntegrationStatus: Codable {
    let provider: String
    let connected: Bool
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case provider
        case connected
        case updatedAt = "updated_at"
    }
}

struct Workout: Codable {
    let id: Int
    let source: String
    let externalId: String?
    let sport: String
    let status: String
    let startTime: String?
    let durationMinutes: Double?
    let intensityRpe: Double?
    let avgHeartRateBpm: Double?
    let maxHeartRateBpm: Double?
    let avgPowerWatts: Double?
    let normalizedPowerWatts: Double?
    let avgCadence: Double?
    let distanceKm: Double?
    let elevationGainM: Double?
    let tss: Double?
    let completedCarbsG: Double?
    let completedFluidsMl: Double?
    let completedSodiumMg: Double?
    let temperatureC: Double?
    let humidityPct: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case source
        case externalId = "external_id"
        case sport
        case status
        case startTime = "start_time"
        case durationMinutes = "duration_minutes"
        case intensityRpe = "intensity_rpe"
        case avgHeartRateBpm = "avg_heart_rate_bpm"
        case maxHeartRateBpm = "max_heart_rate_bpm"
        case avgPowerWatts = "avg_power_watts"
        case normalizedPowerWatts = "normalized_power_watts"
        case avgCadence = "avg_cadence"
        case distanceKm = "distance_km"
        case elevationGainM = "elevation_gain_m"
        case tss
        case completedCarbsG = "completed_carbs_g"
        case completedFluidsMl = "completed_fluids_ml"
        case completedSodiumMg = "completed_sodium_mg"
        case temperatureC = "temperature_c"
        case humidityPct = "humidity_pct"
        case notes
    }
}

struct WorkoutUpdate: Codable {
    let durationMinutes: Double?
    let intensityRpe: Double?
    let avgHeartRateBpm: Double?
    let maxHeartRateBpm: Double?
    let avgPowerWatts: Double?
    let normalizedPowerWatts: Double?
    let avgCadence: Double?
    let distanceKm: Double?
    let elevationGainM: Double?
    let tss: Double?
    let completedCarbsG: Double?
    let completedFluidsMl: Double?
    let completedSodiumMg: Double?
    let temperatureC: Double?
    let humidityPct: Double?
    let notes: String?
    let startTime: String?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case durationMinutes = "duration_minutes"
        case intensityRpe = "intensity_rpe"
        case avgHeartRateBpm = "avg_heart_rate_bpm"
        case maxHeartRateBpm = "max_heart_rate_bpm"
        case avgPowerWatts = "avg_power_watts"
        case normalizedPowerWatts = "normalized_power_watts"
        case avgCadence = "avg_cadence"
        case distanceKm = "distance_km"
        case elevationGainM = "elevation_gain_m"
        case tss
        case completedCarbsG = "completed_carbs_g"
        case completedFluidsMl = "completed_fluids_ml"
        case completedSodiumMg = "completed_sodium_mg"
        case temperatureC = "temperature_c"
        case humidityPct = "humidity_pct"
        case notes
        case startTime = "start_time"
        case status
    }
}

struct FuelEvent: Codable {
    let id: Int
    let workoutId: Int
    let minuteOffset: Int
    let eventTimeIso: String?
    let foodName: String?
    let carbsG: Double
    let fluidMl: Double
    let sodiumMg: Double
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case workoutId = "workout_id"
        case minuteOffset = "minute_offset"
        case eventTimeIso = "event_time_iso"
        case foodName = "food_name"
        case carbsG = "carbs_g"
        case fluidMl = "fluid_ml"
        case sodiumMg = "sodium_mg"
        case notes
    }
}

struct FuelEventDraft: Codable {
    var minuteOffset: Int
    var eventTimeIso: String?
    var foodName: String?
    var carbsG: Double
    var fluidMl: Double
    var sodiumMg: Double
    var notes: String?

    enum CodingKeys: String, CodingKey {
        case minuteOffset = "minute_offset"
        case eventTimeIso = "event_time_iso"
        case foodName = "food_name"
        case carbsG = "carbs_g"
        case fluidMl = "fluid_ml"
        case sodiumMg = "sodium_mg"
        case notes
    }
}

struct AnalyticsSummary: Codable {
    let sessions: Int
    let avgDurationMinutes: Double
    let avgHeartRateBpm: Double
    let avgPowerWatts: Double
    let avgRpe: Double
    let totalDistanceKm: Double
    let totalCarbsG: Double

    enum CodingKeys: String, CodingKey {
        case sessions
        case avgDurationMinutes = "avg_duration_minutes"
        case avgHeartRateBpm = "avg_heart_rate_bpm"
        case avgPowerWatts = "avg_power_watts"
        case avgRpe = "avg_rpe"
        case totalDistanceKm = "total_distance_km"
        case totalCarbsG = "total_carbs_g"
    }
}

struct AnalyticsCharts: Codable {
    let labels: [String]
    let avgHr: [Double]
    let avgPower: [Double]
    let totalMinutes: [Double]
    let carbsG: [Double]
    let distanceKm: [Double]

    enum CodingKeys: String, CodingKey {
        case labels
        case avgHr = "avg_hr"
        case avgPower = "avg_power"
        case totalMinutes = "total_minutes"
        case carbsG = "carbs_g"
        case distanceKm = "distance_km"
    }
}
