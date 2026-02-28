import SwiftUI
// MARK: - Analytics

struct AnalyticsView: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let summary = store.analyticsSummary {
                        GroupBox("Last 30 Days") {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Sessions: \(summary.sessions)")
                                Text("Avg duration: \(String(format: "%.0f", summary.avgDurationMinutes)) min")
                                Text("Avg HR: \(String(format: "%.0f", summary.avgHeartRateBpm)) bpm")
                                Text("Avg power: \(String(format: "%.0f", summary.avgPowerWatts)) W")
                                Text("Total distance: \(String(format: "%.1f", summary.totalDistanceKm)) km")
                                Text("Total carbs logged: \(String(format: "%.0f", summary.totalCarbsG)) g")
                            }
                        }
                    }

                    if let charts = store.analyticsCharts {
                        GroupBox("Trends") {
                            VStack(alignment: .leading, spacing: 8) {
                                MiniSeries(title: "Carbs (g)", values: charts.carbsG)
                                MiniSeries(title: "Avg HR", values: charts.avgHr)
                                MiniSeries(title: "Distance (km)", values: charts.distanceKm)
                                MiniSeries(title: "Minutes", values: charts.totalMinutes)
                            }
                        }
                    }

                    Button("Refresh") {
                        Task { await store.loadAnalytics() }
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            }
            .navigationTitle("Analytics")
            .task { await store.loadAnalytics() }
        }
    }
}

struct MiniSeries: View {
    let title: String
    let values: [Double]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.headline)
            if values.isEmpty {
                Text("No data").foregroundStyle(.secondary)
            } else {
                Text("Latest: \(String(format: "%.1f", values.last ?? 0))")
                    .foregroundStyle(.secondary)
            }
        }
    }
}
