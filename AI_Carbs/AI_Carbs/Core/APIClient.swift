import Foundation
struct APIClient {
    func request<T: Decodable, B: Encodable>(
        method: String,
        path: String,
        body: B,
        baseURL: String,
        token: String?
    ) async throws -> T {
        try await perform(method: method, path: path, body: body, baseURL: baseURL, token: token)
    }

    func request<T: Decodable>(
        method: String,
        path: String,
        baseURL: String,
        token: String?
    ) async throws -> T {
        try await perform(method: method, path: path, body: Optional<String>.none, baseURL: baseURL, token: token)
    }

    private func perform<T: Decodable, B: Encodable>(
        method: String,
        path: String,
        body: B?,
        baseURL: String,
        token: String?
    ) async throws -> T {
        guard let url = URL(string: baseURL.trimmingCharacters(in: .whitespacesAndNewlines) + path) else {
            throw APIError(message: "Invalid API URL", statusCode: nil)
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(message: "No HTTP response", statusCode: nil)
        }

        if !(200...299).contains(http.statusCode) {
            if let detail = try? JSONDecoder().decode(ErrorEnvelope.self, from: data) {
                throw APIError(message: detail.detail, statusCode: http.statusCode)
            }
            throw APIError(message: "Request failed (\(http.statusCode))", statusCode: http.statusCode)
        }

        if T.self == SimpleOK.self, data.isEmpty {
            return SimpleOK(ok: true) as! T
        }

        return try JSONDecoder().decode(T.self, from: data)
    }
}

struct APIError: Error {
    let message: String
    let statusCode: Int?
}
