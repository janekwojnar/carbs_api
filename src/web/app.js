const tokenKey = "efa_token";
const emailKey = "efa_email";
let analyticsChart = null;

function n(id) {
  return document.getElementById(id).value;
}

function asNum(id) {
  const v = Number(n(id));
  return Number.isFinite(v) ? v : null;
}

function boolVal(id) {
  return n(id) === "true";
}

function getToken() {
  return localStorage.getItem(tokenKey) || "";
}

function setAuth(token, email) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(emailKey, email);
  syncAuthState();
}

function clearAuth() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(emailKey);
  syncAuthState();
}

function syncAuthState() {
  const email = localStorage.getItem(emailKey);
  document.getElementById("authState").textContent = email ? `Logged in as ${email}` : "Not logged in";
}

function authHeaders(includeJson = true) {
  const token = getToken();
  if (!token) {
    throw new Error("Please login first.");
  }
  const headers = { Authorization: `Bearer ${token}` };
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function getJson(url, includeAuth = false) {
  const res = await fetch(url, {
    method: "GET",
    headers: includeAuth ? authHeaders(false) : undefined,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

async function postJson(url, payload, includeAuth = false, method = "POST") {
  const headers = includeAuth ? authHeaders(true) : { "Content-Type": "application/json" };
  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

function registrationPayload() {
  return {
    email: n("email").trim().toLowerCase(),
    password: n("password"),
    body_mass_kg: asNum("reg_mass"),
    body_fat_percent: asNum("reg_bf"),
    vo2max: asNum("reg_vo2"),
    lactate_threshold_pct: asNum("reg_lt"),
    gi_tolerance_score: asNum("reg_gi"),
    default_temperature_c: asNum("reg_temp"),
    default_humidity_pct: asNum("reg_hum"),
    default_altitude_m: asNum("reg_alt"),
    default_terrain_factor: asNum("reg_terrain"),
    weekly_training_load_hours: asNum("reg_load"),
  };
}

function fillFromProfile(profile) {
  const set = (id, value) => {
    if (value !== null && value !== undefined) document.getElementById(id).value = value;
  };
  set("mass", profile.body_mass_kg);
  set("bf", profile.body_fat_percent);
  set("vo2", profile.vo2max);
  set("lt", profile.lactate_threshold_pct);
  set("gi", profile.gi_tolerance_score);
  set("temp", profile.default_temperature_c);
  set("hum", profile.default_humidity_pct);
  set("alt", profile.default_altitude_m);
  set("terrain", profile.default_terrain_factor);
  set("load", profile.weekly_training_load_hours);
  if (profile.default_indoor !== undefined) {
    document.getElementById("indoor").value = profile.default_indoor ? "true" : "false";
  }

  set("reg_mass", profile.body_mass_kg);
  set("reg_bf", profile.body_fat_percent);
  set("reg_vo2", profile.vo2max);
  set("reg_lt", profile.lactate_threshold_pct);
  set("reg_gi", profile.gi_tolerance_score);
  set("reg_temp", profile.default_temperature_c);
  set("reg_hum", profile.default_humidity_pct);
  set("reg_alt", profile.default_altitude_m);
  set("reg_terrain", profile.default_terrain_factor);
  set("reg_load", profile.weekly_training_load_hours);
}

function buildPredictionPayload() {
  return {
    profile: {
      body_mass_kg: asNum("mass"),
      body_fat_percent: asNum("bf"),
      vo2max: asNum("vo2"),
      lactate_threshold_pct: asNum("lt"),
      gi_tolerance_score: asNum("gi"),
      stress_score: asNum("stress"),
      sleep_hours: asNum("sleep"),
      hrv_score: asNum("hrv"),
      injury_or_illness_flag: false,
      menstrual_context: null,
    },
    session: {
      sport: n("sport"),
      duration_minutes: asNum("duration"),
      intensity_rpe: asNum("rpe"),
      indoor: boolVal("indoor"),
      race_day: boolVal("race"),
      weekly_training_load_hours: asNum("load"),
      avg_heart_rate_bpm: asNum("avg_hr"),
      max_heart_rate_bpm: asNum("max_hr"),
      avg_power_watts: asNum("avg_power"),
      normalized_power_watts: asNum("np"),
      avg_cadence: asNum("cad"),
      distance_km: asNum("dist"),
      elevation_gain_m: asNum("elev"),
      planned_or_completed: "planned",
    },
    environment: {
      temperature_c: asNum("temp"),
      humidity_pct: asNum("hum"),
      altitude_m: asNum("alt"),
      terrain_factor: asNum("terrain"),
    },
    science_mode: boolVal("science"),
  };
}

function renderPrediction(data, heading = "Recommendation") {
  const balanced = data.strategies.find((s) => s.strategy === "balanced");
  const notes = (data.uncertainty_notes || []).map((x) => `<li>${x}</li>`).join("");
  const rationale = (data.rationale || []).map((x) => `<li>${x}</li>`).join("");
  const rows = data.strategies
    .map(
      (s) => `
    <tr>
      <td>${s.strategy}</td>
      <td>${s.carbs_g_per_hour}</td>
      <td>${s.hydration_ml_per_hour}</td>
      <td>${s.sodium_mg_per_hour}</td>
      <td>${s.pre_workout_carbs_g} / ${s.during_workout_carbs_g_total} / ${s.post_workout_carbs_g}</td>
      <td>${s.gi_risk_score}</td>
    </tr>`
    )
    .join("");

  document.getElementById("result").innerHTML = `
    <div class="grid4">
      <div class="kpi"><div>${heading}</div><div class="v">${balanced.carbs_g_per_hour} g/h</div></div>
      <div class="kpi"><div>Hydration</div><div class="v">${balanced.hydration_ml_per_hour} ml/h</div></div>
      <div class="kpi"><div>Sodium</div><div class="v">${balanced.sodium_mg_per_hour} mg/h</div></div>
      <div class="kpi"><div>GI Risk</div><div class="v">${balanced.gi_risk_score} / 10</div></div>
    </div>
    <table class="table">
      <thead>
        <tr><th>Strategy</th><th>Carbs g/h</th><th>Hydration ml/h</th><th>Sodium mg/h</th><th>Pre / During / Post g</th><th>GI Risk</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="notes"><strong>Confidence:</strong> ${data.confidence_low} - ${data.confidence_high}</div>
    <div class="notes"><strong>Uncertainty:</strong><ul>${notes || "<li>None</li>"}</ul></div>
    <div class="notes"><strong>Rationale:</strong><ul>${rationale || "<li>None</li>"}</ul></div>
  `;
}

async function runRegister() {
  try {
    const data = await postJson("/api/v1/auth/register", registrationPayload(), false);
    setAuth(data.access_token, data.user.email);
    fillFromProfile(data.profile || {});
    document.getElementById("result").innerHTML = '<div class="notes">Account created with default profile.</div>';
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function runLogin() {
  try {
    const data = await postJson(
      "/api/v1/auth/login",
      { email: n("email").trim().toLowerCase(), password: n("password") },
      false
    );
    setAuth(data.access_token, data.user.email);
    fillFromProfile(data.profile || {});
    document.getElementById("result").innerHTML = '<div class="notes">Logged in and defaults loaded.</div>';
    await refreshIntegrations();
    await refreshAnalytics();
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function saveProfileDefaults() {
  try {
    const payload = {
      body_mass_kg: asNum("reg_mass"),
      body_fat_percent: asNum("reg_bf"),
      vo2max: asNum("reg_vo2"),
      lactate_threshold_pct: asNum("reg_lt"),
      gi_tolerance_score: asNum("reg_gi"),
      default_temperature_c: asNum("reg_temp"),
      default_humidity_pct: asNum("reg_hum"),
      default_altitude_m: asNum("reg_alt"),
      default_terrain_factor: asNum("reg_terrain"),
      weekly_training_load_hours: asNum("reg_load"),
      default_indoor: boolVal("indoor"),
    };
    const data = await postJson("/api/v1/profile", payload, true, "PUT");
    fillFromProfile(data.profile || {});
    document.getElementById("result").innerHTML = '<div class="notes">Profile defaults saved.</div>';
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function runPredict() {
  try {
    const data = await postJson("/api/v1/predict", buildPredictionPayload(), true);
    renderPrediction(data, "Recommendation");
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function runSimulate() {
  try {
    const payload = {
      base_request: buildPredictionPayload(),
      hotter_by_c: 5,
      longer_by_minutes: 20,
      intensity_delta_rpe: 0.7,
    };
    const data = await postJson("/api/v1/simulate", payload, true);
    renderPrediction(data.simulated, "Simulated (+5C, +20m, +0.7 RPE)");
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function saveWorkout() {
  try {
    const payload = {
      source: "manual",
      sport: n("sport"),
      status: "completed",
      duration_minutes: asNum("duration"),
      intensity_rpe: asNum("rpe"),
      avg_heart_rate_bpm: asNum("avg_hr"),
      max_heart_rate_bpm: asNum("max_hr"),
      avg_power_watts: asNum("avg_power"),
      normalized_power_watts: asNum("np"),
      avg_cadence: asNum("cad"),
      distance_km: asNum("dist"),
      elevation_gain_m: asNum("elev"),
      completed_carbs_g: Math.round((asNum("duration") / 60) * 70),
      temperature_c: asNum("temp"),
      humidity_pct: asNum("hum"),
      notes: "Saved from prediction form",
    };
    await postJson("/api/v1/workouts", payload, true);
    await loadWorkouts();
    await refreshAnalytics();
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function loadWorkouts() {
  try {
    const data = await getJson("/api/v1/workouts?limit=20", true);
    const rows = (data.items || [])
      .map(
        (w) => `
      <tr>
        <td>${w.sport}</td><td>${w.status}</td><td>${w.source}</td><td>${w.duration_minutes || ""}</td>
        <td>${w.avg_heart_rate_bpm || ""}</td><td>${w.avg_power_watts || ""}</td><td>${w.distance_km || ""}</td><td>${w.completed_carbs_g || ""}</td>
      </tr>`
      )
      .join("");
    document.getElementById("workoutsTable").innerHTML = `
      <table class="table">
        <thead><tr><th>Sport</th><th>Status</th><th>Source</th><th>Duration</th><th>Avg HR</th><th>Avg Power</th><th>Distance</th><th>Carbs g</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='8'>No workouts</td></tr>"}</tbody>
      </table>`;
  } catch (err) {
    document.getElementById("workoutsTable").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function refreshAnalytics() {
  try {
    const [summaryData, chartData] = await Promise.all([
      getJson("/api/v1/analytics/summary?days=30", true),
      getJson("/api/v1/analytics/charts?days=30", true),
    ]);

    const s = summaryData.summary || {};
    document.getElementById("summaryKpis").innerHTML = `
      <div class="kpi"><div>Sessions</div><div class="v">${Math.round(s.sessions || 0)}</div></div>
      <div class="kpi"><div>Avg HR</div><div class="v">${Math.round(s.avg_heart_rate_bpm || 0)} bpm</div></div>
      <div class="kpi"><div>Avg Power</div><div class="v">${Math.round(s.avg_power_watts || 0)} W</div></div>
      <div class="kpi"><div>Total Distance</div><div class="v">${Math.round(s.total_distance_km || 0)} km</div></div>
    `;

    const c = chartData.charts || {};
    const ctx = document.getElementById("analyticsChart").getContext("2d");
    if (analyticsChart) analyticsChart.destroy();
    analyticsChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: c.labels || [],
        datasets: [
          { label: "Avg HR", data: c.avg_hr || [], borderColor: "#0b7f9f", yAxisID: "y1" },
          { label: "Avg Power", data: c.avg_power || [], borderColor: "#118ab2", yAxisID: "y2" },
          { label: "Carbs (g)", data: c.carbs_g || [], borderColor: "#06d6a0", yAxisID: "y3" },
          { label: "Duration (min)", data: c.total_minutes || [], borderColor: "#f4a261", yAxisID: "y3" },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        scales: {
          y1: { type: "linear", position: "left" },
          y2: { type: "linear", position: "right", grid: { drawOnChartArea: false } },
          y3: { type: "linear", position: "right", grid: { drawOnChartArea: false } },
        },
      },
    });
  } catch (err) {
    document.getElementById("summaryKpis").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function saveIntegrationToken(provider, inputId) {
  try {
    const token = n(inputId).trim();
    if (!token) throw new Error("Token is required");
    await postJson(`/api/v1/integrations/${provider}/token`, { access_token: token }, true);
    await refreshIntegrations();
  } catch (err) {
    document.getElementById("integrationsStatus").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function syncProvider(provider, kind) {
  try {
    const data = await postJson(`/api/v1/integrations/${provider}/sync?kind=${kind}`, {}, true);
    document.getElementById("integrationsStatus").textContent = `Synced ${data.synced} ${provider} ${kind} workouts.`;
    await loadWorkouts();
    await refreshAnalytics();
  } catch (err) {
    document.getElementById("integrationsStatus").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function refreshIntegrations() {
  try {
    const data = await getJson("/api/v1/integrations", true);
    const txt = (data.items || [])
      .map((i) => `${i.provider}: ${i.connected ? "connected" : "not connected"}`)
      .join(" | ");
    document.getElementById("integrationsStatus").textContent = txt || "No integrations";
  } catch (err) {
    document.getElementById("integrationsStatus").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function bootstrapUser() {
  if (!getToken()) return;
  try {
    const data = await getJson("/api/v1/auth/me", true);
    fillFromProfile(data.profile || {});
    await refreshIntegrations();
    await loadWorkouts();
    await refreshAnalytics();
  } catch {
    clearAuth();
  }
}

document.getElementById("registerBtn").addEventListener("click", runRegister);
document.getElementById("loginBtn").addEventListener("click", runLogin);
document.getElementById("saveProfileBtn").addEventListener("click", saveProfileDefaults);
document.getElementById("logoutBtn").addEventListener("click", clearAuth);
document.getElementById("predictBtn").addEventListener("click", runPredict);
document.getElementById("simulateBtn").addEventListener("click", runSimulate);
document.getElementById("saveWorkoutBtn").addEventListener("click", saveWorkout);
document.getElementById("loadWorkoutsBtn").addEventListener("click", loadWorkouts);
document.getElementById("refreshAnalyticsBtn").addEventListener("click", refreshAnalytics);
document.getElementById("saveStravaTokenBtn").addEventListener("click", () => saveIntegrationToken("strava", "strava_token"));
document.getElementById("syncStravaCompletedBtn").addEventListener("click", () => syncProvider("strava", "completed"));
document.getElementById("saveGarminTokenBtn").addEventListener("click", () => saveIntegrationToken("garmin_connect", "garmin_token"));
document.getElementById("syncGarminPlannedBtn").addEventListener("click", () => syncProvider("garmin_connect", "planned"));
document.getElementById("syncGarminCompletedBtn").addEventListener("click", () => syncProvider("garmin_connect", "completed"));
document.getElementById("refreshIntegrationsBtn").addEventListener("click", refreshIntegrations);

syncAuthState();
bootstrapUser();
