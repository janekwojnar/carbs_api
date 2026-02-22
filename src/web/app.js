const tokenKey = "efa_token";
const emailKey = "efa_email";
let analyticsChart = null;
const pageErrorBoxId = "pageError";

function n(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function asNum(id) {
  const raw = String(n(id) || "").trim().replace(",", ".");
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function boolVal(id) {
  return n(id) === "true";
}

function parseFoodIds(raw) {
  const arr = String(raw || "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x > 0);
  return arr.length ? arr : null;
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

function showPageError(msg) {
  const el = document.getElementById(pageErrorBoxId);
  if (el) {
    el.innerHTML = `<div class="err">${msg}</div>`;
  }
}

function authHeaders(includeJson = true) {
  const token = getToken();
  if (!token) throw new Error("Please login first.");
  const headers = { Authorization: `Bearer ${token}` };
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

async function getJson(url, includeAuth = false) {
  const res = await fetch(url, { method: "GET", headers: includeAuth ? authHeaders(false) : undefined });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sendJson(url, payload, includeAuth = false, method = "POST") {
  const headers = includeAuth ? authHeaders(true) : { "Content-Type": "application/json" };
  const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function profilePayloadFromReg() {
  return {
    body_mass_kg: asNum("reg_mass"),
    body_fat_percent: asNum("reg_bf"),
    vo2max: asNum("reg_vo2"),
    lactate_threshold_pct: asNum("reg_lt"),
    gi_tolerance_score: asNum("reg_gi"),
    bike_ftp_w: asNum("reg_bike_ftp"),
    run_ftp_w: asNum("reg_run_ftp"),
    run_threshold_pace_sec_per_km: asNum("reg_run_thr_pace"),
    bike_lt1_hr_bpm: asNum("reg_bike_lt1"),
    bike_lt2_hr_bpm: asNum("reg_bike_lt2"),
    run_lt1_hr_bpm: asNum("reg_run_lt1"),
    run_lt2_hr_bpm: asNum("reg_run_lt2"),
    max_carb_absorption_g_h: asNum("reg_max_carb"),
    gut_training_level: asNum("reg_gut"),
    sweat_rate_l_h: asNum("reg_sweat"),
    sodium_loss_mg_l: asNum("reg_sodium_loss"),
    default_temperature_c: asNum("reg_temp"),
    default_humidity_pct: asNum("reg_hum"),
    default_altitude_m: asNum("reg_alt"),
    default_terrain_factor: asNum("reg_terrain"),
    weekly_training_load_hours: asNum("reg_load"),
  };
}

function registrationPayload() {
  return {
    email: n("email").trim().toLowerCase(),
    password: n("password"),
    ...profilePayloadFromReg(),
  };
}

function fillFromProfile(profile) {
  const set = (id, value) => {
    if (value !== null && value !== undefined && document.getElementById(id)) {
      document.getElementById(id).value = value;
    }
  };

  set("mass", profile.body_mass_kg);
  set("bf", profile.body_fat_percent);
  set("vo2", profile.vo2max);
  set("lt", profile.lactate_threshold_pct);
  set("gi", profile.gi_tolerance_score);
  set("bike_ftp", profile.bike_ftp_w);
  set("run_ftp", profile.run_ftp_w);
  set("run_thr_pace", profile.run_threshold_pace_sec_per_km);
  set("bike_lt1", profile.bike_lt1_hr_bpm);
  set("bike_lt2", profile.bike_lt2_hr_bpm);
  set("run_lt1", profile.run_lt1_hr_bpm);
  set("run_lt2", profile.run_lt2_hr_bpm);
  set("max_carb", profile.max_carb_absorption_g_h);
  set("gut", profile.gut_training_level);
  set("sweat", profile.sweat_rate_l_h);
  set("sodium_loss", profile.sodium_loss_mg_l);
  set("temp", profile.default_temperature_c);
  set("hum", profile.default_humidity_pct);
  set("alt", profile.default_altitude_m);
  set("terrain", profile.default_terrain_factor);
  set("load", profile.weekly_training_load_hours);

  set("reg_mass", profile.body_mass_kg);
  set("reg_bf", profile.body_fat_percent);
  set("reg_vo2", profile.vo2max);
  set("reg_lt", profile.lactate_threshold_pct);
  set("reg_gi", profile.gi_tolerance_score);
  set("reg_bike_ftp", profile.bike_ftp_w);
  set("reg_run_ftp", profile.run_ftp_w);
  set("reg_run_thr_pace", profile.run_threshold_pace_sec_per_km);
  set("reg_bike_lt1", profile.bike_lt1_hr_bpm);
  set("reg_bike_lt2", profile.bike_lt2_hr_bpm);
  set("reg_run_lt1", profile.run_lt1_hr_bpm);
  set("reg_run_lt2", profile.run_lt2_hr_bpm);
  set("reg_max_carb", profile.max_carb_absorption_g_h);
  set("reg_gut", profile.gut_training_level);
  set("reg_sweat", profile.sweat_rate_l_h);
  set("reg_sodium_loss", profile.sodium_loss_mg_l);
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
      sweat_rate_l_h: asNum("sweat"),
      sodium_loss_mg_l: asNum("sodium_loss"),
      bike_ftp_w: asNum("bike_ftp"),
      run_ftp_w: asNum("run_ftp"),
      run_threshold_pace_sec_per_km: asNum("run_thr_pace"),
      bike_lt1_hr_bpm: asNum("bike_lt1"),
      bike_lt2_hr_bpm: asNum("bike_lt2"),
      run_lt1_hr_bpm: asNum("run_lt1"),
      run_lt2_hr_bpm: asNum("run_lt2"),
      max_carb_absorption_g_h: asNum("max_carb"),
      gut_training_level: asNum("gut"),
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
      planned_start_iso: n("start_iso") || null,
    },
    environment: {
      temperature_c: asNum("temp"),
      humidity_pct: asNum("hum"),
      altitude_m: asNum("alt"),
      terrain_factor: asNum("terrain"),
    },
    science_mode: boolVal("science"),
    selected_food_ids: parseFoodIds(n("food_ids")),
  };
}

function renderPrediction(data, heading = "Recommendation") {
  const balanced = data.strategies.find((s) => s.strategy === "balanced");
  const notes = (data.uncertainty_notes || []).map((x) => `<li>${x}</li>`).join("");
  const rationale = (data.rationale || []).map((x) => `<li>${x}</li>`).join("");
  const rows = (data.strategies || []).map((s) => `
    <tr>
      <td>${s.strategy}</td><td>${s.carbs_g_per_hour}</td><td>${s.hydration_ml_per_hour}</td>
      <td>${s.sodium_mg_per_hour}</td><td>${s.pre_workout_carbs_g}/${s.during_workout_carbs_g_total}/${s.post_workout_carbs_g}</td><td>${s.gi_risk_score}</td>
    </tr>`).join("");
  const plan = (data.fueling_schedule || []).map((x) => `
    <tr>
      <td>${x.action}</td><td>${x.food_name}</td><td>${x.serving}</td><td>${x.carbs_g}</td><td>${x.fluid_ml}</td><td>${x.sodium_mg}</td><td>${x.notes}</td>
    </tr>`).join("");

  document.getElementById("result").innerHTML = `
    <div class="grid4">
      <div class="kpi"><div>${heading}</div><div class="v">${balanced ? balanced.carbs_g_per_hour : "-"} g/h</div></div>
      <div class="kpi"><div>Hydration</div><div class="v">${balanced ? balanced.hydration_ml_per_hour : "-"} ml/h</div></div>
      <div class="kpi"><div>Sodium</div><div class="v">${balanced ? balanced.sodium_mg_per_hour : "-"} mg/h</div></div>
      <div class="kpi"><div>GI Risk</div><div class="v">${balanced ? balanced.gi_risk_score : "-"} / 10</div></div>
    </div>
    <table class="table">
      <thead><tr><th>Strategy</th><th>Carbs</th><th>Hydration</th><th>Sodium</th><th>Pre/During/Post</th><th>GI</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="notes"><strong>Confidence:</strong> ${data.confidence_low} - ${data.confidence_high}</div>
    <div class="notes"><strong>Uncertainty:</strong><ul>${notes || "<li>None</li>"}</ul></div>
    <div class="notes"><strong>Rationale:</strong><ul>${rationale || "<li>None</li>"}</ul></div>
    <h3>Timed Fuel Plan</h3>
    <table class="table">
      <thead><tr><th>Time</th><th>Food/Drink</th><th>Serving</th><th>Carbs g</th><th>Fluid ml</th><th>Sodium mg</th><th>Notes</th></tr></thead>
      <tbody>${plan || "<tr><td colspan='7'>No schedule</td></tr>"}</tbody>
    </table>
  `;
}

async function runRegister() {
  try {
    const data = await sendJson("/api/v1/auth/register", registrationPayload(), false);
    setAuth(data.access_token, data.user.email);
    fillFromProfile(data.profile || {});
    await loadFoods();
    document.getElementById("result").innerHTML = '<div class="notes">Account created with advanced defaults.</div>';
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function runLogin() {
  try {
    const data = await sendJson("/api/v1/auth/login", { email: n("email").trim().toLowerCase(), password: n("password") }, false);
    setAuth(data.access_token, data.user.email);
    fillFromProfile(data.profile || {});
    await Promise.all([refreshIntegrations(), loadWorkouts(), refreshAnalytics(), loadFoods()]);
    document.getElementById("result").innerHTML = '<div class="notes">Logged in and defaults loaded.</div>';
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function saveProfileDefaults() {
  try {
    const data = await sendJson("/api/v1/profile", profilePayloadFromReg(), true, "PUT");
    fillFromProfile(data.profile || {});
    document.getElementById("result").innerHTML = '<div class="notes">Profile defaults saved.</div>';
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function runPredict() {
  try {
    const data = await sendJson("/api/v1/predict", buildPredictionPayload(), true);
    renderPrediction(data, "Recommendation");
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function runSimulate() {
  try {
    const data = await sendJson("/api/v1/simulate", {
      base_request: buildPredictionPayload(),
      hotter_by_c: 5,
      longer_by_minutes: 20,
      intensity_delta_rpe: 0.7,
    }, true);
    renderPrediction(data.simulated, "Simulated");
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function saveWorkout() {
  try {
    await sendJson("/api/v1/workouts", {
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
      completed_carbs_g: Math.round((asNum("duration") / 60) * Math.max(50, asNum("max_carb") || 90)),
      temperature_c: asNum("temp"),
      humidity_pct: asNum("hum"),
      notes: "Saved from prediction form",
    }, true);
    await Promise.all([loadWorkouts(), refreshAnalytics()]);
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function loadFoods() {
  try {
    const data = await getJson("/api/v1/foods?scope=all", true);
    const rows = (data.items || []).map((f) => `
      <tr><td>${f.id}</td><td>${f.name}</td><td>${f.category}</td><td>${f.serving_desc}</td><td>${f.carbs_g}</td><td>${f.sodium_mg}</td><td>${f.fluid_ml}</td><td>${f.is_builtin ? "builtin" : "custom"}</td></tr>
    `).join("");
    document.getElementById("foodsTable").innerHTML = `
      <table class="table">
        <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Serving</th><th>Carbs</th><th>Sodium</th><th>Fluid</th><th>Type</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='8'>No foods</td></tr>"}</tbody>
      </table>
      <div class="notes">Use IDs in \"Food IDs (comma)\" for schedule planning.</div>`;
  } catch (err) {
    document.getElementById("foodsTable").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function addFood() {
  try {
    await sendJson("/api/v1/foods", {
      name: n("food_name"),
      category: n("food_cat"),
      serving_desc: n("food_serving"),
      carbs_g: asNum("food_carbs"),
      sodium_mg: asNum("food_sodium"),
      fluid_ml: asNum("food_fluid"),
      caffeine_mg: asNum("food_caffeine") || 0,
    }, true);
    await loadFoods();
  } catch (err) {
    document.getElementById("foodsTable").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function loadWorkouts() {
  try {
    const data = await getJson("/api/v1/workouts?limit=25", true);
    const rows = (data.items || []).map((w) => `
      <tr><td>${w.sport}</td><td>${w.status}</td><td>${w.source}</td><td>${w.duration_minutes || ""}</td><td>${w.avg_heart_rate_bpm || ""}</td><td>${w.avg_power_watts || ""}</td><td>${w.distance_km || ""}</td><td>${w.completed_carbs_g || ""}</td></tr>
    `).join("");
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
      <div class="kpi"><div>Distance</div><div class="v">${Math.round(s.total_distance_km || 0)} km</div></div>`;

    if (typeof Chart === "undefined") throw new Error("Chart.js failed to load.");
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
          { label: "Carbs", data: c.carbs_g || [], borderColor: "#06d6a0", yAxisID: "y3" },
          { label: "Duration", data: c.total_minutes || [], borderColor: "#f4a261", yAxisID: "y3" },
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
    await sendJson(`/api/v1/integrations/${provider}/token`, { access_token: token }, true);
    await refreshIntegrations();
  } catch (err) {
    document.getElementById("integrationsStatus").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function syncProvider(provider, kind) {
  try {
    const data = await sendJson(`/api/v1/integrations/${provider}/sync?kind=${kind}`, {}, true);
    document.getElementById("integrationsStatus").textContent = `Synced ${data.synced} ${provider} ${kind} workouts.`;
    await Promise.all([loadWorkouts(), refreshAnalytics()]);
  } catch (err) {
    document.getElementById("integrationsStatus").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function refreshIntegrations() {
  try {
    const data = await getJson("/api/v1/integrations", true);
    const txt = (data.items || []).map((i) => `${i.provider}: ${i.connected ? "connected" : "not connected"}`).join(" | ");
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
    await Promise.all([refreshIntegrations(), loadWorkouts(), refreshAnalytics(), loadFoods()]);
  } catch {
    clearAuth();
  }
}

function bind(id, handler) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element: ${id}`);
  el.addEventListener("click", handler);
}

function initPage() {
  try {
    bind("registerBtn", runRegister);
    bind("loginBtn", runLogin);
    bind("saveProfileBtn", saveProfileDefaults);
    bind("logoutBtn", clearAuth);
    bind("predictBtn", runPredict);
    bind("simulateBtn", runSimulate);
    bind("saveWorkoutBtn", saveWorkout);
    bind("loadWorkoutsBtn", loadWorkouts);
    bind("refreshAnalyticsBtn", refreshAnalytics);
    bind("addFoodBtn", addFood);
    bind("loadFoodsBtn", loadFoods);
    bind("saveStravaTokenBtn", () => saveIntegrationToken("strava", "strava_token"));
    bind("syncStravaCompletedBtn", () => syncProvider("strava", "completed"));
    bind("saveGarminTokenBtn", () => saveIntegrationToken("garmin_connect", "garmin_token"));
    bind("syncGarminPlannedBtn", () => syncProvider("garmin_connect", "planned"));
    bind("syncGarminCompletedBtn", () => syncProvider("garmin_connect", "completed"));
    bind("refreshIntegrationsBtn", refreshIntegrations);
    syncAuthState();
    bootstrapUser();
  } catch (err) {
    showPageError(`Initialization failed: ${String(err)}`);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage);
} else {
  initPage();
}
