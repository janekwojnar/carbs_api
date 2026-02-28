import SwiftUI

struct ContentView: View {
    @StateObject private var store = AppStore()

    var body: some View {
        Group {
            if store.isAuthenticated {
                MainTabView()
                    .environmentObject(store)
            } else {
                AuthView()
                    .environmentObject(store)
            }
        }
        .task {
            await store.bootstrap()
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            PlannerView()
                .tabItem { Label("Plan", systemImage: "figure.run") }
            WorkoutsView()
                .tabItem { Label("Workouts", systemImage: "list.bullet.rectangle") }
            AnalyticsView()
                .tabItem { Label("Analytics", systemImage: "chart.xyaxis.line") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}

#Preview {
    ContentView()
}
