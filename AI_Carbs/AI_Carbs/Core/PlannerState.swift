import Foundation
// MARK: - Planner State

enum SportOption: String, CaseIterable {
    case running
    case cycling
    case swimming
    case hiking
    case trail_running
    case gym
    case hiit
    case hyrox

    var title: String {
        switch self {
        case .trail_running: return "Trail Running"
        default: return rawValue.capitalized
        }
    }

    var supportsPower: Bool {
        self == .cycling || self == .hyrox
    }

    var supportsPace: Bool {
        self == .running || self == .trail_running || self == .hiking
    }
}

enum SessionType: String, CaseIterable {
    case planned
    case completed

    var title: String { rawValue.capitalized }
}

enum IntensityMode: String, CaseIterable {
    case rpe
    case hr
    case pace
    case power

    var title: String { rawValue.uppercased() }
}

struct PlannerState {
    var sport: SportOption = .running
    var sessionType: SessionType = .planned
    var durationMinutes: Double = 90
    var rpe: Double = 5
    var indoor = false
    var raceDay = false

    var intensityMode: IntensityMode = .hr
    var targetHR: Double = 145
    var avgHR: Double = 145
    var maxHR: Double = 185
    var targetPace: Double = 320
    var targetPower: Double = 250
    var avgPower: Double = 245
    var normPower: Double = 260

    var distanceKm: Double = 18
    var elevationM: Double = 200

    var temperatureC: Double = 18
    var humidityPct: Double = 55
    var altitudeM: Double = 100
    var terrainFactor: Double = 1.0

    var scienceModeStrict = false
    var selectedFoodIDs: [Int] = []

    var supportedIntensityModes: [IntensityMode] {
        var modes: [IntensityMode] = [.rpe, .hr]
        if sport.supportsPace { modes.append(.pace) }
        if sport.supportsPower { modes.append(.power) }
        return modes
    }

    var showHeartRateFields: Bool {
        intensityMode == .hr || sessionType == .completed
    }

    var showPaceFields: Bool {
        intensityMode == .pace && sport.supportsPace
    }

    var showPowerFields: Bool {
        sport.supportsPower && (intensityMode == .power || sessionType == .completed)
    }

    func toPredictionRequest(with profile: AthleteProfile) -> PredictionRequestBody {
        PredictionRequestBody(
            profile: profile.toPayload(),
            session: SessionPayload(
                sport: sport.rawValue,
                durationMinutes: Int(durationMinutes),
                intensityRpe: rpe,
                indoor: indoor,
                raceDay: raceDay,
                weeklyTrainingLoadHours: profile.weeklyTrainingLoadHours,
                avgHeartRateBpm: sessionType == .completed ? avgHR : nil,
                maxHeartRateBpm: sessionType == .completed ? maxHR : nil,
                avgPowerWatts: (sport.supportsPower && sessionType == .completed) ? avgPower : nil,
                normalizedPowerWatts: (sport.supportsPower && sessionType == .completed) ? normPower : nil,
                avgCadence: nil,
                distanceKm: distanceKm,
                elevationGainM: elevationM,
                plannedOrCompleted: sessionType.rawValue,
                plannedStartIso: nil,
                intensityMode: intensityMode.rawValue,
                targetHeartRateBpm: intensityMode == .hr ? targetHR : nil,
                targetPowerWatts: (intensityMode == .power && sport.supportsPower) ? targetPower : nil,
                targetPaceSecPerKm: (intensityMode == .pace && sport.supportsPace) ? targetPace : nil
            ),
            environment: EnvironmentPayload(
                temperatureC: temperatureC,
                humidityPct: humidityPct,
                altitudeM: altitudeM,
                terrainFactor: terrainFactor
            ),
            scienceMode: scienceModeStrict,
            selectedFoodIds: selectedFoodIDs
        )
    }
}
