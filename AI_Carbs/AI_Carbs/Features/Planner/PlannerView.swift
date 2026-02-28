import SwiftUI
struct PlannerView: View {
    @EnvironmentObject private var store: AppStore
    @State private var state = PlannerState()
    @State private var selectedFoodIDs: Set<Int> = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Session Planner")
                        .font(.title2.weight(.bold))

                    PlannerSessionCard(state: $state)
                    PlannerEnvironmentCard(state: $state)
                    PlannerFoodPicker(foods: store.foods, selectedIDs: $selectedFoodIDs)

                    Button("Generate Fuel Strategy") {
                        state.selectedFoodIDs = Array(selectedFoodIDs)
                        Task { await store.predict(plan: state) }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(store.isLoading)

                    if let prediction = store.prediction {
                        PredictionCard(response: prediction)
                    }

                    if !store.errorMessage.isEmpty {
                        Text(store.errorMessage)
                            .foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .navigationTitle("Plan")
            .task {
                if store.foods.isEmpty {
                    await store.loadFoods()
                }
                if selectedFoodIDs.isEmpty {
                    let defaults = ["Isotonic Drink 500ml", "Energy Gel 25", "Chews Serving"]
                    let picked = store.foods.filter { defaults.contains($0.name) }.map(\.id)
                    if !picked.isEmpty {
                        selectedFoodIDs = Set(picked)
                    }
                }
            }
        }
    }
}

struct PlannerSessionCard: View {
    @Binding var state: PlannerState

    var body: some View {
        GroupBox("Session") {
            VStack(spacing: 12) {
                Picker("Sport", selection: $state.sport) {
                    ForEach(SportOption.allCases, id: \.self) { sport in
                        Text(sport.title).tag(sport)
                    }
                }
                .pickerStyle(.menu)
                .onChange(of: state.sport) { _, _ in
                    if !state.supportedIntensityModes.contains(state.intensityMode) {
                        state.intensityMode = state.supportedIntensityModes.first ?? .rpe
                    }
                }

                Picker("Session Type", selection: $state.sessionType) {
                    ForEach(SessionType.allCases, id: \.self) { type in
                        Text(type.title).tag(type)
                    }
                }
                .pickerStyle(.segmented)

                LabeledNumberField(title: "Duration (min)", value: $state.durationMinutes, precision: 0)
                LabeledNumberField(title: "RPE", value: $state.rpe, precision: 1)

                Picker("Intensity Input", selection: $state.intensityMode) {
                    ForEach(state.supportedIntensityModes, id: \.self) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)

                if state.showHeartRateFields {
                    LabeledNumberField(title: "Target HR", value: $state.targetHR, precision: 0)
                    if state.sessionType == .completed {
                        LabeledNumberField(title: "Average HR", value: $state.avgHR, precision: 0)
                        LabeledNumberField(title: "Max HR", value: $state.maxHR, precision: 0)
                    }
                }

                if state.showPaceFields {
                    LabeledNumberField(title: "Target Pace (sec/km)", value: $state.targetPace, precision: 0)
                }

                if state.showPowerFields {
                    LabeledNumberField(title: "Target Power (W)", value: $state.targetPower, precision: 0)
                    if state.sessionType == .completed {
                        LabeledNumberField(title: "Average Power (W)", value: $state.avgPower, precision: 0)
                        LabeledNumberField(title: "Normalized Power (W)", value: $state.normPower, precision: 0)
                    }
                }

                LabeledNumberField(title: "Distance (km)", value: $state.distanceKm, precision: 1)
                LabeledNumberField(title: "Elevation Gain (m)", value: $state.elevationM, precision: 0)

                Toggle("Race Day", isOn: $state.raceDay)
                Toggle("Indoor", isOn: $state.indoor)
            }
        }
    }
}

struct PlannerEnvironmentCard: View {
    @Binding var state: PlannerState

    var body: some View {
        GroupBox("Environment") {
            VStack(spacing: 12) {
                LabeledNumberField(title: "Temperature (C)", value: $state.temperatureC, precision: 1)
                LabeledNumberField(title: "Humidity (%)", value: $state.humidityPct, precision: 0)
                LabeledNumberField(title: "Altitude (m)", value: $state.altitudeM, precision: 0)
                LabeledNumberField(title: "Terrain Factor", value: $state.terrainFactor, precision: 2)
                Picker("Mode", selection: $state.scienceModeStrict) {
                    Text("Practical").tag(false)
                    Text("Strict Science").tag(true)
                }
                .pickerStyle(.segmented)
            }
        }
    }
}

struct PlannerFoodPicker: View {
    let foods: [FoodItem]
    @Binding var selectedIDs: Set<Int>

    var body: some View {
        GroupBox("Plan Foods") {
            VStack(alignment: .leading, spacing: 8) {
                if foods.isEmpty {
                    Text("Food library unavailable. Check connection and retry.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(foods.prefix(20), id: \.id) { item in
                        Toggle("\(item.name) (\(Int(item.carbsG))g)", isOn: bindingFor(id: item.id))
                    }
                }
            }
        }
    }

    private func bindingFor(id: Int) -> Binding<Bool> {
        Binding(
            get: { selectedIDs.contains(id) },
            set: { enabled in
                if enabled { selectedIDs.insert(id) } else { selectedIDs.remove(id) }
            }
        )
    }
}

struct PredictionCard: View {
    let response: PredictionResponse

    var body: some View {
        GroupBox("Output") {
            VStack(alignment: .leading, spacing: 12) {
                if let best = response.strategies.first(where: { $0.strategy == "balanced" }) ?? response.strategies.first {
                    HStack {
                        MetricTile(title: "Carbs", value: "\(format(best.carbsGPerHour, 1)) g/h")
                        MetricTile(title: "Hydration", value: "\(format(best.hydrationMlPerHour, 0)) ml/h")
                        MetricTile(title: "Sodium", value: "\(format(best.sodiumMgPerHour, 0)) mg/h")
                    }
                }

                ForEach(response.strategies, id: \.strategy) { s in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(s.strategy.capitalized).font(.headline)
                        Text("\(format(s.carbsGPerHour, 1)) g/h, GI risk \(format(s.giRiskScore, 2))/10")
                            .foregroundStyle(.secondary)
                    }
                }

                if !response.fuelingSchedule.isEmpty {
                    Divider()
                    Text("Timed Fueling")
                        .font(.headline)
                    ForEach(response.fuelingSchedule, id: \.minuteOffset) { event in
                        Text("T+\(event.minuteOffset)m: \(event.foodName) - \(format(event.carbsG, 0))g")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func format(_ value: Double, _ precision: Int) -> String {
        String(format: "%.*f", precision, value)
    }
}
