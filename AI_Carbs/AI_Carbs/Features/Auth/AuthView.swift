import SwiftUI
struct AuthView: View {
    @EnvironmentObject private var store: AppStore

    @State private var email = ""
    @State private var password = ""
    @State private var isRegister = false
    @State private var showAdvancedServerTools = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("FuelOS Endurance")
                    .font(.largeTitle.weight(.bold))
                Text("Simple flow, elite fueling output.")
                    .foregroundStyle(.secondary)

                TextField("Email", text: $email)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.emailAddress)
                    .textFieldStyle(.roundedBorder)

                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)

                HStack(spacing: 12) {
                    Button(isRegister ? "Create Account" : "Sign In") {
                        Task {
                            if isRegister {
                                await store.register(email: email, password: password)
                            } else {
                                await store.login(email: email, password: password)
                            }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(email.isEmpty || password.count < 8 || store.isLoading)

                    Button(isRegister ? "Switch to Sign In" : "Switch to Register") {
                        isRegister.toggle()
                    }
                    .buttonStyle(.bordered)
                }

                Button(showAdvancedServerTools ? "Hide Connection Tools" : "Connection Help") {
                    showAdvancedServerTools.toggle()
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)

                if showAdvancedServerTools {
                    GroupBox("Connection Diagnostics") {
                        VStack(alignment: .leading, spacing: 10) {
                            SettingsBaseURLView()
                            Button("Test Connection") {
                                Task { await store.testConnection() }
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                }

                if !store.errorMessage.isEmpty {
                    Text(store.errorMessage)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if !store.serverStatus.isEmpty {
                    Text(store.serverStatus)
                        .foregroundStyle(.green)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Spacer()
            }
            .padding()
        }
    }
}

struct SettingsBaseURLView: View {
    @EnvironmentObject private var store: AppStore
    @State private var localURL = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Server URL (Advanced)")
                .font(.headline)
            TextField("http://127.0.0.1:8000", text: $localURL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)
            Button("Save API URL") {
                store.baseURL = localURL
                store.persistBaseURL()
            }
            .buttonStyle(.bordered)
        }
        .onAppear { localURL = store.baseURL }
    }
}
