import SwiftUI
import SafariServices
struct WorkoutsView: View {
    @EnvironmentObject private var store: AppStore
    @State private var fuelDraft = FuelEventDraft(minuteOffset: 15, eventTimeIso: nil, foodName: "Energy Gel", carbsG: 25, fluidMl: 0, sodiumMg: 120, notes: nil)
    @State private var manualCarbs = 0.0
    @State private var manualFluids = 0.0
    @State private var manualSodium = 0.0
    @State private var notes = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    GroupBox("Connected Platforms") {
                        VStack(alignment: .leading, spacing: 10) {
                            IntegrationRow(provider: "strava", title: "Strava")
                            IntegrationRow(provider: "garmin_connect", title: "Garmin Connect")
                        }
                    }

                    GroupBox("Imported Workouts") {
                        if store.workouts.isEmpty {
                            Text("No workouts yet. Connect and sync first.")
                                .foregroundStyle(.secondary)
                        } else {
                            Picker("Select Workout", selection: Binding(
                                get: { store.selectedWorkoutId ?? 0 },
                                set: { newValue in
                                    store.selectedWorkoutId = newValue
                                    Task {
                                        await store.loadFuelEvents()
                                        syncTotalsFromSelection()
                                    }
                                }
                            )) {
                                ForEach(store.workouts, id: \.id) { w in
                                    Text("#\(w.id) \(w.sport.capitalized) \(Int(w.durationMinutes ?? 0))m").tag(w.id)
                                }
                            }
                            .pickerStyle(.menu)

                            if let w = selectedWorkout {
                                Text("Totals: \(Int(w.completedCarbsG ?? 0))g carbs, \(Int(w.completedFluidsMl ?? 0))ml fluid, \(Int(w.completedSodiumMg ?? 0))mg sodium")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    if store.selectedWorkoutId != nil {
                        GroupBox("Add Fuel Event") {
                            VStack(spacing: 12) {
                                LabeledNumberField(title: "Minute Offset", value: $fuelDraft.minuteOffset.doubleBinding, precision: 0)
                                TextField("Food", text: Binding($fuelDraft.foodName, replacingNilWith: ""))
                                    .textFieldStyle(.roundedBorder)
                                LabeledNumberField(title: "Carbs (g)", value: $fuelDraft.carbsG, precision: 0)
                                LabeledNumberField(title: "Fluid (ml)", value: $fuelDraft.fluidMl, precision: 0)
                                LabeledNumberField(title: "Sodium (mg)", value: $fuelDraft.sodiumMg, precision: 0)
                                TextField("Notes", text: Binding($fuelDraft.notes, replacingNilWith: ""))
                                    .textFieldStyle(.roundedBorder)

                                HStack {
                                    Button("Add Event") {
                                        Task { await store.addFuelEvent(fuelDraft) }
                                    }
                                    .buttonStyle(.borderedProminent)

                                    Button("Reload") {
                                        Task { await store.loadFuelEvents() }
                                    }
                                    .buttonStyle(.bordered)
                                }
                            }
                        }

                        GroupBox("Fueling Timeline") {
                            if store.workoutFuelEvents.isEmpty {
                                Text("No fueling events added yet.")
                                    .foregroundStyle(.secondary)
                            } else {
                                ForEach(store.workoutFuelEvents, id: \.id) { event in
                                    HStack {
                                        VStack(alignment: .leading) {
                                            Text("T+\(event.minuteOffset)m \(event.foodName ?? "Fuel")")
                                            Text("\(Int(event.carbsG))g / \(Int(event.fluidMl))ml / \(Int(event.sodiumMg))mg")
                                                .foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        Button(role: .destructive) {
                                            Task { await store.deleteFuelEvent(id: event.id) }
                                        } label: {
                                            Image(systemName: "trash")
                                        }
                                    }
                                    Divider()
                                }
                            }
                        }

                        GroupBox("Manual Totals") {
                            VStack(spacing: 12) {
                                LabeledNumberField(title: "Completed Carbs (g)", value: $manualCarbs, precision: 0)
                                LabeledNumberField(title: "Completed Fluids (ml)", value: $manualFluids, precision: 0)
                                LabeledNumberField(title: "Completed Sodium (mg)", value: $manualSodium, precision: 0)
                                TextField("Notes", text: $notes)
                                    .textFieldStyle(.roundedBorder)
                                Button("Save Totals") {
                                    Task {
                                        await store.saveWorkoutTotals(
                                            carbs: manualCarbs,
                                            fluid: manualFluids,
                                            sodium: manualSodium,
                                            notes: notes
                                        )
                                    }
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }

                    if !store.errorMessage.isEmpty {
                        Text(store.errorMessage)
                            .foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .navigationTitle("Workouts")
            .task {
                await store.loadIntegrations()
                await store.loadWorkouts()
                await store.loadFuelEvents()
                syncTotalsFromSelection()
            }
        }
    }

    private var selectedWorkout: Workout? {
        store.workouts.first { $0.id == store.selectedWorkoutId }
    }

    private func syncTotalsFromSelection() {
        guard let workout = selectedWorkout else { return }
        manualCarbs = workout.completedCarbsG ?? 0
        manualFluids = workout.completedFluidsMl ?? 0
        manualSodium = workout.completedSodiumMg ?? 0
        notes = workout.notes ?? ""
    }
}

struct IntegrationRow: View {
    @EnvironmentObject private var store: AppStore
    let provider: String
    let title: String

    @State private var oauthURL: IdentifiedURL?

    var body: some View {
        let status = store.integrations.first { $0.provider == provider }
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title).font(.headline)
                Spacer()
                Text(status?.connected == true ? "Connected" : "Not Connected")
                    .foregroundStyle(status?.connected == true ? .green : .secondary)
            }
            HStack {
                Button("Connect") {
                    Task {
                        if let url = await store.oauthStartURL(provider: provider) {
                            oauthURL = IdentifiedURL(url: url)
                        }
                    }
                }
                .buttonStyle(.bordered)

                Button("Sync Completed") {
                    Task { await store.sync(provider: provider, kind: "completed") }
                }
                .buttonStyle(.borderedProminent)

                Button("Sync Planned") {
                    Task { await store.sync(provider: provider, kind: "planned") }
                }
                .buttonStyle(.bordered)
            }
        }
        .sheet(item: $oauthURL, onDismiss: {
            Task {
                await store.loadIntegrations()
                await store.loadWorkouts()
            }
        }) { identified in
            SafariSheet(url: identified.url)
        }
    }
}

struct SafariSheet: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
