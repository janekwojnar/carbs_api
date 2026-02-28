import SwiftUI
// MARK: - Settings

struct SettingsView: View {
    @EnvironmentObject private var store: AppStore
    @State private var foodDraft = FoodDraft(name: "", category: "gel", servingDesc: "1 serving", carbsG: 25, sodiumMg: 120, fluidMl: 0, caffeineMg: 0)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    GroupBox("Account") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Signed in as \(store.userEmail)")
                            Button("Logout", role: .destructive) {
                                store.logout()
                            }
                        }
                    }

                    GroupBox("API") {
                        VStack(alignment: .leading, spacing: 10) {
                            SettingsBaseURLView()
                            Button("Test Connection") {
                                Task { await store.testConnection() }
                            }
                            .buttonStyle(.bordered)
                            if !store.serverStatus.isEmpty {
                                Text(store.serverStatus)
                                    .foregroundStyle(.green)
                            }
                        }
                    }

                    GroupBox("Athlete Defaults") {
                        VStack(spacing: 12) {
                            LabeledNumberField(title: "Mass (kg)", value: $store.profile.bodyMassKg.doubleBinding, precision: 1)
                            LabeledNumberField(title: "Body Fat (%)", value: $store.profile.bodyFatPercent.doubleBinding, precision: 1)
                            LabeledNumberField(title: "VO2max", value: $store.profile.vo2max.doubleBinding, precision: 1)
                            LabeledNumberField(title: "LT %", value: $store.profile.lactateThresholdPct.doubleBinding, precision: 1)
                            LabeledNumberField(title: "GI Tolerance", value: $store.profile.giToleranceScore.doubleBinding, precision: 1)
                            LabeledNumberField(title: "Bike FTP (W)", value: $store.profile.bikeFtpW.doubleBinding, precision: 0)
                            LabeledNumberField(title: "Run Threshold Pace (sec/km)", value: $store.profile.runThresholdPaceSecPerKm.doubleBinding, precision: 0)
                            LabeledNumberField(title: "Run LT1 HR", value: $store.profile.runLt1HrBpm.doubleBinding, precision: 0)
                            LabeledNumberField(title: "Run LT2 HR", value: $store.profile.runLt2HrBpm.doubleBinding, precision: 0)
                            LabeledNumberField(title: "Max Carb Absorption g/h", value: $store.profile.maxCarbAbsorptionGH.doubleBinding, precision: 0)
                            LabeledNumberField(title: "Sweat Rate L/h", value: $store.profile.sweatRateLh.doubleBinding, precision: 2)
                            LabeledNumberField(title: "Sodium Loss mg/L", value: $store.profile.sodiumLossMgl.doubleBinding, precision: 0)
                            Button("Save Defaults") {
                                Task { await store.saveProfile() }
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }

                    GroupBox("Custom Food Database") {
                        VStack(spacing: 12) {
                            TextField("Name", text: $foodDraft.name)
                                .textFieldStyle(.roundedBorder)
                            TextField("Category", text: $foodDraft.category)
                                .textFieldStyle(.roundedBorder)
                            TextField("Serving", text: $foodDraft.servingDesc)
                                .textFieldStyle(.roundedBorder)
                            LabeledNumberField(title: "Carbs (g)", value: $foodDraft.carbsG, precision: 0)
                            LabeledNumberField(title: "Sodium (mg)", value: $foodDraft.sodiumMg, precision: 0)
                            LabeledNumberField(title: "Fluid (ml)", value: $foodDraft.fluidMl, precision: 0)
                            LabeledNumberField(title: "Caffeine (mg)", value: $foodDraft.caffeineMg, precision: 0)
                            Button("Add Food") {
                                Task { await store.addFood(foodDraft) }
                                foodDraft = FoodDraft(name: "", category: "gel", servingDesc: "1 serving", carbsG: 25, sodiumMg: 120, fluidMl: 0, caffeineMg: 0)
                            }
                            .buttonStyle(.bordered)

                            ForEach(store.foods.filter { !$0.isBuiltin }, id: \.id) { food in
                                HStack {
                                    Text("\(food.name) - \(Int(food.carbsG))g")
                                    Spacer()
                                    Button(role: .destructive) {
                                        Task { await store.deleteFood(id: food.id) }
                                    } label: {
                                        Image(systemName: "trash")
                                    }
                                }
                                Divider()
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
            .navigationTitle("Settings")
            .task {
                _ = await store.refreshMe()
                await store.loadFoods()
            }
        }
    }
}
