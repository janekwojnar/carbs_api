import Foundation
import Combine
@MainActor
final class AppStore: ObservableObject {
    @Published var baseURL: String = UserDefaults.standard.string(forKey: "api_base_url") ?? AppStore.defaultBaseURL()
    @Published var token: String = UserDefaults.standard.string(forKey: "access_token") ?? ""
    @Published var userEmail: String = UserDefaults.standard.string(forKey: "user_email") ?? ""
    @Published var profile = AthleteProfile()

    @Published var isLoading = false
    @Published var errorMessage = ""
    @Published var serverStatus = ""
    @Published var isServerReachable = true

    @Published var prediction: PredictionResponse?
    @Published var workouts: [Workout] = []
    @Published var selectedWorkoutId: Int?
    @Published var workoutFuelEvents: [FuelEvent] = []
    @Published var foods: [FoodItem] = []
    @Published var integrations: [IntegrationStatus] = []
    @Published var analyticsSummary: AnalyticsSummary?
    @Published var analyticsCharts: AnalyticsCharts?

    private let client = APIClient()
    private static let cloudBaseURL = "https://carbs-api.onrender.com"

    var isAuthenticated: Bool { !token.isEmpty }

    init() {
        if isLocalDevURL(baseURL) {
            baseURL = Self.cloudBaseURL
            persistBaseURL()
        }
    }

    private static func defaultBaseURL() -> String {
        if let configured = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           !configured.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return configured
        }
        return cloudBaseURL
    }

    func bootstrap() async {
        _ = await ensureReachableAndFailover()
        if !token.isEmpty, await refreshMe() {
            await loadAll()
        }
    }

    func persistAuth() {
        UserDefaults.standard.set(token, forKey: "access_token")
        UserDefaults.standard.set(userEmail, forKey: "user_email")
    }

    func persistBaseURL() {
        UserDefaults.standard.set(baseURL, forKey: "api_base_url")
    }

    func logout() {
        token = ""
        userEmail = ""
        prediction = nil
        workouts = []
        workoutFuelEvents = []
        integrations = []
        analyticsSummary = nil
        analyticsCharts = nil
        persistAuth()
    }

    func testConnection() async {
        isLoading = true
        errorMessage = ""
        if await ensureReachableAndFailover() {
            serverStatus = "Server reachable at \(baseURL)"
            isServerReachable = true
        } else {
            isServerReachable = false
            serverStatus = ""
            errorMessage = "Could not connect to backend. Please try again in a moment."
        }
        isLoading = false
    }

    func register(email: String, password: String) async {
        await runRequest {
            let req = RegisterRequest(email: email, password: password)
            let response: AuthEnvelope = try await client.request(
                method: "POST",
                path: "/api/v1/auth/register",
                body: req,
                baseURL: baseURL,
                token: nil
            )
            token = response.accessToken
            userEmail = response.user.email
            profile = AthleteProfile.fromProfileDict(response.profile)
            persistAuth()
            await loadAll()
        }
    }

    func login(email: String, password: String) async {
        await runRequest {
            let req = LoginRequest(email: email, password: password)
            let response: AuthEnvelope = try await client.request(
                method: "POST",
                path: "/api/v1/auth/login",
                body: req,
                baseURL: baseURL,
                token: nil
            )
            token = response.accessToken
            userEmail = response.user.email
            profile = AthleteProfile.fromProfileDict(response.profile)
            persistAuth()
            await loadAll()
        }
    }

    func refreshMe() async -> Bool {
        guard isAuthenticated else { return false }
        return await runRequest {
            let response: MeEnvelope = try await client.request(
                method: "GET",
                path: "/api/v1/auth/me",
                baseURL: baseURL,
                token: token
            )
            userEmail = response.user.email
            profile = AthleteProfile.fromProfileDict(response.profile)
            persistAuth()
        }
    }

    func saveProfile() async {
        guard isAuthenticated else { return }
        await runRequest {
            let payload = profile.toProfileUpdate()
            let response: ProfileEnvelope = try await client.request(
                method: "PUT",
                path: "/api/v1/profile",
                body: payload,
                baseURL: baseURL,
                token: token
            )
            profile = AthleteProfile.fromProfileDict(response.profile)
        }
    }

    func predict(plan: PlannerState) async {
        guard isAuthenticated else { return }
        await runRequest {
            let request = plan.toPredictionRequest(with: profile)
            let response: PredictionResponse = try await client.request(
                method: "POST",
                path: "/api/v1/predict",
                body: request,
                baseURL: baseURL,
                token: token
            )
            prediction = response
        }
    }

    func loadAll() async {
        await loadFoods()
        await loadWorkouts()
        await loadIntegrations()
        await loadAnalytics()
    }

    func loadFoods() async {
        guard isAuthenticated else { return }
        await runRequest {
            let response: FoodsEnvelope = try await client.request(
                method: "GET",
                path: "/api/v1/foods?scope=all",
                baseURL: baseURL,
                token: token
            )
            foods = response.items
        }
    }

    func addFood(_ draft: FoodDraft) async {
        guard isAuthenticated else { return }
        await runRequest {
            let response: FoodEnvelope = try await client.request(
                method: "POST",
                path: "/api/v1/foods",
                body: draft,
                baseURL: baseURL,
                token: token
            )
            foods.append(response.item)
        }
    }

    func deleteFood(id: Int) async {
        guard isAuthenticated else { return }
        await runRequest {
            let _: SimpleOK = try await client.request(
                method: "DELETE",
                path: "/api/v1/foods/\(id)",
                baseURL: baseURL,
                token: token
            )
            foods.removeAll { $0.id == id }
        }
    }

    func loadWorkouts() async {
        guard isAuthenticated else { return }
        await runRequest {
            let response: WorkoutsEnvelope = try await client.request(
                method: "GET",
                path: "/api/v1/workouts?limit=120",
                baseURL: baseURL,
                token: token
            )
            workouts = response.items
            if selectedWorkoutId == nil {
                selectedWorkoutId = workouts.first?.id
            }
        }
    }

    func loadFuelEvents() async {
        guard isAuthenticated, let workoutId = selectedWorkoutId else { return }
        await runRequest {
            let response: FuelEventsEnvelope = try await client.request(
                method: "GET",
                path: "/api/v1/workouts/\(workoutId)/fueling",
                baseURL: baseURL,
                token: token
            )
            workoutFuelEvents = response.items.sorted { $0.minuteOffset < $1.minuteOffset }
            await loadWorkouts()
        }
    }

    func addFuelEvent(_ draft: FuelEventDraft) async {
        guard isAuthenticated, let workoutId = selectedWorkoutId else { return }
        await runRequest {
            let _: FuelEventEnvelope = try await client.request(
                method: "POST",
                path: "/api/v1/workouts/\(workoutId)/fueling",
                body: draft,
                baseURL: baseURL,
                token: token
            )
            await loadFuelEvents()
        }
    }

    func deleteFuelEvent(id: Int) async {
        guard isAuthenticated, let workoutId = selectedWorkoutId else { return }
        await runRequest {
            let _: SimpleOK = try await client.request(
                method: "DELETE",
                path: "/api/v1/workouts/\(workoutId)/fueling/\(id)",
                baseURL: baseURL,
                token: token
            )
            await loadFuelEvents()
        }
    }

    func saveWorkoutTotals(carbs: Double, fluid: Double, sodium: Double, notes: String) async {
        guard isAuthenticated, let workoutId = selectedWorkoutId else { return }
        await runRequest {
            let update = WorkoutUpdate(
                durationMinutes: nil,
                intensityRpe: nil,
                avgHeartRateBpm: nil,
                maxHeartRateBpm: nil,
                avgPowerWatts: nil,
                normalizedPowerWatts: nil,
                avgCadence: nil,
                distanceKm: nil,
                elevationGainM: nil,
                tss: nil,
                completedCarbsG: carbs,
                completedFluidsMl: fluid,
                completedSodiumMg: sodium,
                temperatureC: nil,
                humidityPct: nil,
                notes: notes.isEmpty ? nil : notes,
                startTime: nil,
                status: nil
            )
            let _: WorkoutEnvelope = try await client.request(
                method: "PUT",
                path: "/api/v1/workouts/\(workoutId)",
                body: update,
                baseURL: baseURL,
                token: token
            )
            await loadWorkouts()
        }
    }

    func loadIntegrations() async {
        guard isAuthenticated else { return }
        await runRequest {
            let response: IntegrationsEnvelope = try await client.request(
                method: "GET",
                path: "/api/v1/integrations",
                baseURL: baseURL,
                token: token
            )
            integrations = response.items
        }
    }

    func oauthStartURL(provider: String) async -> URL? {
        guard isAuthenticated else { return nil }
        if isLocalDevURL(baseURL), !(await ensureReachableAndFailover()) {
            errorMessage = "Could not connect to backend."
            return nil
        }
        do {
            let response: OAuthStartEnvelope = try await client.request(
                method: "POST",
                path: "/api/v1/integrations/\(provider)/oauth/start?client=ios",
                baseURL: baseURL,
                token: token
            )
            return URL(string: response.authorizeURL)
        } catch {
            errorMessage = parseAPIError(error)
            return nil
        }
    }

    func sync(provider: String, kind: String) async {
        guard isAuthenticated else { return }
        await runRequest {
            let path = "/api/v1/integrations/\(provider)/sync?kind=\(kind)&limit=80"
            let _: SyncEnvelope = try await client.request(
                method: "POST",
                path: path,
                baseURL: baseURL,
                token: token
            )
            await loadWorkouts()
            await loadIntegrations()
        }
    }

    func loadAnalytics() async {
        guard isAuthenticated else { return }
        await runRequest {
            let summary: AnalyticsSummaryEnvelope = try await client.request(
                method: "GET",
                path: "/api/v1/analytics/summary?days=30",
                baseURL: baseURL,
                token: token
            )
            let charts: AnalyticsChartsEnvelope = try await client.request(
                method: "GET",
                path: "/api/v1/analytics/charts?days=30",
                baseURL: baseURL,
                token: token
            )
            analyticsSummary = summary.summary
            analyticsCharts = charts.charts
        }
    }

    @discardableResult
    private func runRequest(_ action: () async throws -> Void) async -> Bool {
        isLoading = true
        errorMessage = ""
        if !isServerReachable, !(await ensureReachableAndFailover()) {
            errorMessage = "Backend is currently unavailable."
            isLoading = false
            return false
        }
        if isLocalDevURL(baseURL) {
            _ = await ensureReachableAndFailover()
        }
        do {
            try await action()
            isServerReachable = true
            isLoading = false
            return true
        } catch {
            if isConnectivityError(error), await ensureReachableAndFailover() {
                errorMessage = "Connected to cloud backend. Please retry."
                isLoading = false
                return false
            }
            errorMessage = parseAPIError(error)
            isServerReachable = !isConnectivityError(error)
        }
        isLoading = false
        return false
    }

    private func parseAPIError(_ error: Error) -> String {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .cannotConnectToHost, .timedOut, .cannotFindHost:
                return "Could not connect to \(baseURL)."
            case .notConnectedToInternet:
                return "No internet/network route to \(baseURL)."
            default:
                return urlError.localizedDescription
            }
        }
        if let apiError = error as? APIError {
            if apiError.statusCode == 401, isAuthenticated {
                logout()
                return "Session expired. Please sign in again."
            }
            return apiError.message
        }
        return error.localizedDescription
    }

    private func isConnectivityError(_ error: Error) -> Bool {
        guard let urlError = error as? URLError else { return false }
        switch urlError.code {
        case .cannotConnectToHost, .timedOut, .cannotFindHost, .networkConnectionLost:
            return true
        default:
            return false
        }
    }

    private func ping(_ url: String) async -> Bool {
        do {
            let _: HealthEnvelope = try await client.request(
                method: "GET",
                path: "/api/v1/health",
                baseURL: url,
                token: nil
            )
            return true
        } catch {
            return false
        }
    }

    private func isLocalDevURL(_ url: String) -> Bool {
        let lower = url.lowercased()
        return lower.contains("127.0.0.1") || lower.contains("localhost")
    }

    @discardableResult
    private func ensureReachableAndFailover() async -> Bool {
        if await ping(baseURL) {
            isServerReachable = true
            return true
        }

        // Auto-heal from stale local dev URL to cloud backend for normal users.
        if baseURL != Self.cloudBaseURL, await ping(Self.cloudBaseURL) {
            baseURL = Self.cloudBaseURL
            persistBaseURL()
            isServerReachable = true
            serverStatus = "Switched to cloud backend."
            return true
        }

        isServerReachable = false
        return false
    }
}
