const tokenKey = "efa_token";
const emailKey = "efa_email";

let analyticsChart = null;
let currentProfile = {};
let foodsCache = [];
let selectedFoodIds = new Set();
let latestPrediction = null;

function byId(id) {
  return document.getElementById(id);
}

function value(id) {
  const el = byId(id);
  return el ? el.value : "";
}

function asNum(id) {
  const raw = String(value(id) || "").trim().replace(",", ".");
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function asBool(id) {
  return value(id) === "true";
}

function asIsoFromLocal(id) {
  const raw = value(id);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function setPageError(msg) {
  byId("pageError").innerHTML = `<div class="err">${msg}</div>`;
}

function setInfo(elId, msg) {
  const el = byId(elId);
  if (el) el.textContent = msg;
}

function getToken() {
  return localStorage.getItem(tokenKey) || "";
}

function setAuth(token, email) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(emailKey, email);
  renderAuthState();
}

function clearAuth() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(emailKey);
  currentProfile = {};
  renderAuthState();
}

function renderAuthState() {
  const email = localStorage.getItem(emailKey);
  byId("authState").textContent = email ? `Logged in as ${email}` : "Not logged in";
  byId("authPill").textContent = email ? `Signed in: ${email}` : "Not logged in";
  if (email && byId("account_email")) byId("account_email").value = email;
}

function authHeaders(includeJson = true) {
  const token = getToken();
  if (!token) throw new Error("Please login first.");
  const headers = { Authorization: `Bearer ${token}` };
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

async function getJson(url, auth = false) {
  return requestJson(url, {
    method: "GET",
    headers: auth ? authHeaders(false) : undefined,
  });
}

async function sendJson(url, payload, auth = false, method = "POST") {
  return requestJson(url, {
    method,
    headers: auth ? authHeaders(true) : { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function setTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${tab}`);
  });
}

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });
}

function sportModes(sport) {
  if (["running", "trail_running", "hiking", "swimming"].includes(sport)) return ["pace", "hr", "rpe"];
  if (["cycling", "hyrox"].includes(sport)) return ["power", "hr", "rpe"];
  return ["hr", "rpe", "power"];
}

function fillSelect(id, options, selected) {
  const el = byId(id);
  if (!el) return;
  el.innerHTML = "";
  options.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o.toUpperCase();
    el.appendChild(opt);
  });
  el.value = options.includes(selected) ? selected : options[0];
}

function updatePlannerVisibility() {
  const sport = value("plan_sport");
  const modes = sportModes(sport);
  const currentMode = value("plan_intensity_mode");
  fillSelect("plan_intensity_mode", modes, currentMode);

  const mode = value("plan_intensity_mode");
  const completed = value("plan_status") === "completed";

  byId("wrap_rpe").classList.toggle("hidden", mode !== "rpe");
  byId("wrap_target_hr").classList.toggle("hidden", mode !== "hr");
  byId("wrap_target_power").classList.toggle("hidden", mode !== "power");
  byId("wrap_target_pace").classList.toggle("hidden", mode !== "pace");
  byId("wrap_max_hr").classList.toggle("hidden", mode !== "hr" && !completed);

  document.querySelectorAll(".completed-only").forEach((el) => {
    el.classList.toggle("hidden", !completed);
  });

  if (!modes.includes("pace")) byId("wrap_target_pace").classList.add("hidden");
  if (!modes.includes("power")) byId("wrap_target_power").classList.add("hidden");
}

function settingsPayload() {
  return {
    body_mass_kg: asNum("set_mass"),
    body_fat_percent: asNum("set_body_fat"),
    vo2max: asNum("set_vo2max"),
    lactate_threshold_pct: asNum("set_lt_pct"),
    gi_tolerance_score: asNum("set_gi_tolerance"),
    weekly_training_load_hours: asNum("set_weekly_load"),
    bike_ftp_w: asNum("set_bike_ftp"),
    run_ftp_w: asNum("set_run_ftp"),
    run_threshold_pace_sec_per_km: asNum("set_run_thr_pace"),
    bike_lt1_hr_bpm: asNum("set_bike_lt1"),
    bike_lt2_hr_bpm: asNum("set_bike_lt2"),
    run_lt1_hr_bpm: asNum("set_run_lt1"),
    run_lt2_hr_bpm: asNum("set_run_lt2"),
    max_carb_absorption_g_h: asNum("set_max_carb"),
    gut_training_level: asNum("set_gut_training"),
    sweat_rate_l_h: asNum("set_sweat_rate"),
    sodium_loss_mg_l: asNum("set_sodium_loss"),
    default_temperature_c: asNum("set_def_temp"),
    default_humidity_pct: asNum("set_def_humidity"),
    default_altitude_m: asNum("set_def_altitude"),
    default_terrain_factor: asNum("set_def_terrain"),
  };
}

function fillSettings(profile) {
  const map = {
    set_mass: profile.body_mass_kg,
    set_body_fat: profile.body_fat_percent,
    set_vo2max: profile.vo2max,
    set_lt_pct: profile.lactate_threshold_pct,
    set_gi_tolerance: profile.gi_tolerance_score,
    set_weekly_load: profile.weekly_training_load_hours,
    set_bike_ftp: profile.bike_ftp_w,
    set_run_ftp: profile.run_ftp_w,
    set_run_thr_pace: profile.run_threshold_pace_sec_per_km,
    set_bike_lt1: profile.bike_lt1_hr_bpm,
    set_bike_lt2: profile.bike_lt2_hr_bpm,
    set_run_lt1: profile.run_lt1_hr_bpm,
    set_run_lt2: profile.run_lt2_hr_bpm,
    set_max_carb: profile.max_carb_absorption_g_h,
    set_gut_training: profile.gut_training_level,
    set_sweat_rate: profile.sweat_rate_l_h,
    set_sodium_loss: profile.sodium_loss_mg_l,
    set_def_temp: profile.default_temperature_c,
    set_def_humidity: profile.default_humidity_pct,
    set_def_altitude: profile.default_altitude_m,
    set_def_terrain: profile.default_terrain_factor,
  };

  Object.entries(map).forEach(([id, val]) => {
    if (val !== null && val !== undefined && byId(id)) byId(id).value = val;
  });

  if (profile.default_temperature_c !== undefined) byId("plan_temp").value = profile.default_temperature_c;
  if (profile.default_humidity_pct !== undefined) byId("plan_humidity").value = profile.default_humidity_pct;
  if (profile.default_altitude_m !== undefined) byId("plan_altitude").value = profile.default_altitude_m;
  if (profile.default_terrain_factor !== undefined) byId("plan_terrain").value = profile.default_terrain_factor;
}

function deriveRpeFromMode(profile) {
  const mode = value("plan_intensity_mode");
  if (mode === "rpe") return asNum("plan_rpe") || 6;

  if (mode === "hr") {
    const target = asNum("plan_target_hr");
    const maxHr = asNum("plan_max_hr") || profile.run_lt2_hr_bpm || profile.bike_lt2_hr_bpm || 180;
    if (target && maxHr) return Math.min(10, Math.max(1, 2 + (target / maxHr) * 8));
  }

  if (mode === "power") {
    const sport = value("plan_sport");
    const target = asNum("plan_target_power");
    const ftp = sport === "cycling" || sport === "hyrox" ? profile.bike_ftp_w : profile.run_ftp_w;
    if (target && ftp) return Math.min(10, Math.max(1, 2 + (target / ftp) * 7.8));
  }

  if (mode === "pace") {
    const target = asNum("plan_target_pace");
    const threshold = profile.run_threshold_pace_sec_per_km;
    if (target && threshold) return Math.min(10, Math.max(1, 2 + (threshold / target) * 7.5));
  }

  return 6;
}

function buildPredictionPayload() {
  const profile = settingsPayload();
  profile.stress_score = asNum("plan_stress") || 3;
  profile.sleep_hours = asNum("plan_sleep");
  profile.hrv_score = asNum("plan_hrv");
  profile.injury_or_illness_flag = false;
  profile.menstrual_context = null;

  const mode = value("plan_intensity_mode");
  const status = value("plan_status");

  return {
    profile,
    session: {
      sport: value("plan_sport"),
      duration_minutes: asNum("plan_duration") || 60,
      intensity_rpe: deriveRpeFromMode(profile),
      indoor: asBool("plan_indoor"),
      race_day: asBool("plan_race_day"),
      weekly_training_load_hours: profile.weekly_training_load_hours,
      avg_heart_rate_bpm: status === "completed" ? asNum("plan_avg_hr") : null,
      max_heart_rate_bpm: asNum("plan_max_hr"),
      avg_power_watts: status === "completed" ? asNum("plan_avg_power") : null,
      normalized_power_watts: status === "completed" ? asNum("plan_np") : null,
      avg_cadence: status === "completed" ? asNum("plan_cadence") : null,
      distance_km: asNum("plan_distance"),
      elevation_gain_m: asNum("plan_elevation"),
      planned_or_completed: status,
      planned_start_iso: asIsoFromLocal("plan_start_time"),
      intensity_mode: mode,
      target_heart_rate_bpm: mode === "hr" ? asNum("plan_target_hr") : null,
      target_power_watts: mode === "power" ? asNum("plan_target_power") : null,
      target_pace_sec_per_km: mode === "pace" ? asNum("plan_target_pace") : null,
    },
    environment: {
      temperature_c: asNum("plan_temp") || 20,
      humidity_pct: asNum("plan_humidity") || 55,
      altitude_m: asNum("plan_altitude") || 100,
      terrain_factor: asNum("plan_terrain") || 1,
    },
    science_mode: asBool("plan_science_mode"),
    selected_food_ids: selectedFoodIds.size ? Array.from(selectedFoodIds) : null,
  };
}

function renderResult(data, title = "Fuel Plan") {
  latestPrediction = data;
  const balanced = (data.strategies || []).find((s) => s.strategy === "balanced");
  const strategyRows = (data.strategies || []).map((s) => `
    <tr>
      <td>${s.strategy}</td>
      <td>${s.carbs_g_per_hour}</td>
      <td>${s.hydration_ml_per_hour}</td>
      <td>${s.sodium_mg_per_hour}</td>
      <td>${s.pre_workout_carbs_g} / ${s.during_workout_carbs_g_total} / ${s.post_workout_carbs_g}</td>
      <td>${s.gi_risk_score}</td>
    </tr>`).join("");

  const scheduleRows = (data.fueling_schedule || []).map((s) => `
    <tr>
      <td>${s.action}</td>
      <td>${s.food_name}</td>
      <td>${s.serving}</td>
      <td>${s.carbs_g}</td>
      <td>${s.fluid_ml}</td>
      <td>${s.sodium_mg}</td>
      <td>${s.notes}</td>
    </tr>`).join("");

  byId("result").innerHTML = `
    <div class="kpi-grid">
      <div class="kpi"><div>${title}</div><div class="v">${balanced ? balanced.carbs_g_per_hour : "-"} g/h</div></div>
      <div class="kpi"><div>Hydration</div><div class="v">${balanced ? balanced.hydration_ml_per_hour : "-"} ml/h</div></div>
      <div class="kpi"><div>Sodium</div><div class="v">${balanced ? balanced.sodium_mg_per_hour : "-"} mg/h</div></div>
      <div class="kpi"><div>GI Risk</div><div class="v">${balanced ? balanced.gi_risk_score : "-"} / 10</div></div>
    </div>

    <table class="table">
      <thead><tr><th>Strategy</th><th>Carbs g/h</th><th>Hydration ml/h</th><th>Sodium mg/h</th><th>Pre / During / Post g</th><th>GI Risk</th></tr></thead>
      <tbody>${strategyRows}</tbody>
    </table>

    <p><strong>Confidence:</strong> ${data.confidence_low} - ${data.confidence_high}</p>

    <h3>Exact Timed Fueling</h3>
    <table class="table">
      <thead><tr><th>Time</th><th>Food</th><th>Serving</th><th>Carbs</th><th>Fluid</th><th>Sodium</th><th>Notes</th></tr></thead>
      <tbody>${scheduleRows || "<tr><td colspan='7'>No schedule generated.</td></tr>"}</tbody>
    </table>
  `;
}

function renderFoodsTable() {
  const rows = foodsCache.map((f) => `
    <tr>
      <td>${f.id}</td><td>${f.name}</td><td>${f.category}</td><td>${f.serving_desc}</td>
      <td>${f.carbs_g}</td><td>${f.sodium_mg}</td><td>${f.fluid_ml}</td><td>${f.is_builtin ? "builtin" : "custom"}</td>
    </tr>`).join("");

  byId("foodsTable").innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Serving</th><th>Carbs</th><th>Sodium</th><th>Fluid</th><th>Type</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='8'>No foods found</td></tr>"}</tbody>
      </table>
    </div>
  `;
}

function renderFoodPicker() {
  const picker = byId("foodPicker");
  if (!picker) return;
  const sorted = [...foodsCache].sort((a, b) => Number(b.carbs_g) - Number(a.carbs_g)).slice(0, 18);
  picker.innerHTML = "";

  sorted.forEach((f) => {
    const label = document.createElement("label");
    label.className = "food-chip";
    label.innerHTML = `
      <input type="checkbox" data-food-id="${f.id}" ${selectedFoodIds.has(f.id) ? "checked" : ""} />
      <span>${f.name} (${f.carbs_g}g)</span>
    `;
    picker.appendChild(label);
  });

  picker.querySelectorAll("input[type='checkbox']").forEach((el) => {
    el.addEventListener("change", (e) => {
      const id = Number(e.target.getAttribute("data-food-id"));
      if (e.target.checked) selectedFoodIds.add(id);
      else selectedFoodIds.delete(id);
    });
  });
}

async function loadFoods() {
  const data = await getJson("/api/v1/foods?scope=all", true);
  foodsCache = data.items || [];
  foodsCache.forEach((f) => {
    if (!selectedFoodIds.size && f.is_builtin && ["gel", "drink"].includes(f.category)) selectedFoodIds.add(f.id);
  });
  renderFoodsTable();
  renderFoodPicker();
}

async function addCustomFood() {
  await sendJson(
    "/api/v1/foods",
    {
      name: value("food_name"),
      category: value("food_category"),
      serving_desc: value("food_serving"),
      carbs_g: asNum("food_carbs"),
      sodium_mg: asNum("food_sodium"),
      fluid_ml: asNum("food_fluid"),
      caffeine_mg: asNum("food_caffeine") || 0,
    },
    true
  );
  await loadFoods();
}

async function refreshIntegrations() {
  const data = await getJson("/api/v1/integrations", true);
  const items = data.items || [];
  const strava = items.find((i) => i.provider === "strava");
  const garmin = items.find((i) => i.provider === "garmin_connect");

  byId("stravaStatus").textContent = strava
    ? `${strava.connected ? "Connected" : "Not connected"}${strava.oauth_ready ? "" : " (OAuth not configured on server)"}`
    : "Unavailable";
  byId("garminStatus").textContent = garmin
    ? `${garmin.connected ? "Connected" : "Not connected"}${garmin.oauth_ready ? "" : " (OAuth not configured on server)"}`
    : "Unavailable";
}

async function connectProvider(provider) {
  const data = await sendJson(`/api/v1/integrations/${provider}/oauth/start`, {}, true);
  if (!data.authorize_url) throw new Error("Missing authorize URL");
  window.location.href = data.authorize_url;
}

async function syncProvider(provider, kind) {
  const data = await sendJson(`/api/v1/integrations/${provider}/sync?kind=${kind}`, {}, true);
  setInfo("integrationsStatus", `Synced ${data.synced} ${provider} ${kind} workouts.`);
  await Promise.all([loadWorkouts(), refreshAnalytics()]);
}

async function saveSettings() {
  const data = await sendJson("/api/v1/profile", settingsPayload(), true, "PUT");
  currentProfile = data.profile || {};
  fillSettings(currentProfile);
  setInfo("settingsStatus", "User settings saved.");
}

async function runPredict() {
  const data = await sendJson("/api/v1/predict", buildPredictionPayload(), true);
  renderResult(data, "Recommendation");
  setTab("planner");
}

async function runSimulate() {
  const payload = {
    base_request: buildPredictionPayload(),
    hotter_by_c: 5,
    longer_by_minutes: 20,
    intensity_delta_rpe: 0.7,
  };
  const data = await sendJson("/api/v1/simulate", payload, true);
  renderResult(data.simulated, "Simulated");
  setTab("planner");
}

async function saveWorkout() {
  const payload = buildPredictionPayload();
  const carbs = latestPrediction?.strategies?.find((s) => s.strategy === "balanced")?.during_workout_carbs_g_total || null;
  await sendJson(
    "/api/v1/workouts",
    {
      source: "manual",
      sport: payload.session.sport,
      status: payload.session.planned_or_completed,
      start_time: payload.session.planned_start_iso,
      duration_minutes: payload.session.duration_minutes,
      intensity_rpe: payload.session.intensity_rpe,
      avg_heart_rate_bpm: payload.session.avg_heart_rate_bpm,
      max_heart_rate_bpm: payload.session.max_heart_rate_bpm,
      avg_power_watts: payload.session.avg_power_watts,
      normalized_power_watts: payload.session.normalized_power_watts,
      avg_cadence: payload.session.avg_cadence,
      distance_km: payload.session.distance_km,
      elevation_gain_m: payload.session.elevation_gain_m,
      completed_carbs_g: carbs,
      temperature_c: payload.environment.temperature_c,
      humidity_pct: payload.environment.humidity_pct,
      notes: "Saved from planner",
    },
    true
  );
  await Promise.all([loadWorkouts(), refreshAnalytics()]);
}

async function loadWorkouts() {
  const data = await getJson("/api/v1/workouts?limit=25", true);
  const rows = (data.items || [])
    .map((w) => `
      <tr>
        <td>${w.sport}</td><td>${w.status}</td><td>${w.source}</td><td>${w.duration_minutes || ""}</td>
        <td>${w.avg_heart_rate_bpm || ""}</td><td>${w.avg_power_watts || ""}</td><td>${w.distance_km || ""}</td><td>${w.completed_carbs_g || ""}</td>
      </tr>`)
    .join("");
  byId("workoutsTable").innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Sport</th><th>Status</th><th>Source</th><th>Duration</th><th>Avg HR</th><th>Avg Power</th><th>Distance</th><th>Carbs</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='8'>No workouts yet</td></tr>"}</tbody>
      </table>
    </div>
  `;
}

async function refreshAnalytics() {
  const [summaryData, chartData] = await Promise.all([
    getJson("/api/v1/analytics/summary?days=30", true),
    getJson("/api/v1/analytics/charts?days=30", true),
  ]);

  const s = summaryData.summary || {};
  byId("summaryKpis").innerHTML = `
    <div class="kpi"><div>Sessions</div><div class="v">${Math.round(s.sessions || 0)}</div></div>
    <div class="kpi"><div>Avg HR</div><div class="v">${Math.round(s.avg_heart_rate_bpm || 0)} bpm</div></div>
    <div class="kpi"><div>Avg Power</div><div class="v">${Math.round(s.avg_power_watts || 0)} W</div></div>
    <div class="kpi"><div>Distance</div><div class="v">${Math.round(s.total_distance_km || 0)} km</div></div>
  `;

  if (typeof Chart === "undefined") throw new Error("Chart.js did not load.");
  const c = chartData.charts || {};
  const ctx = byId("analyticsChart").getContext("2d");
  if (analyticsChart) analyticsChart.destroy();

  analyticsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: c.labels || [],
      datasets: [
        { label: "Avg HR", data: c.avg_hr || [], borderColor: "#0f8ea8", yAxisID: "y1" },
        { label: "Avg Power", data: c.avg_power || [], borderColor: "#ff6f3c", yAxisID: "y2" },
        { label: "Carbs (g)", data: c.carbs_g || [], borderColor: "#15b389", yAxisID: "y3" },
        { label: "Duration (min)", data: c.total_minutes || [], borderColor: "#5565ff", yAxisID: "y3" },
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
}

function handleOauthReturnParams() {
  const p = new URLSearchParams(window.location.search);
  const provider = p.get("oauth_provider");
  const status = p.get("oauth_status");
  const message = p.get("oauth_message");
  if (!provider || !status) return;

  const text = `OAuth ${provider}: ${status}${message ? ` (${message})` : ""}`;
  setInfo("integrationsStatus", text);
  setTab("integrations");
  history.replaceState({}, document.title, window.location.pathname);
}

async function registerUser() {
  const payload = {
    email: value("account_email").trim().toLowerCase(),
    password: value("account_password"),
    ...settingsPayload(),
  };
  const data = await sendJson("/api/v1/auth/register", payload, false);
  setAuth(data.access_token, data.user.email);
  currentProfile = data.profile || {};
  fillSettings(currentProfile);
  await Promise.all([loadFoods(), refreshIntegrations(), loadWorkouts(), refreshAnalytics()]);
}

async function loginUser() {
  const payload = { email: value("account_email").trim().toLowerCase(), password: value("account_password") };
  const data = await sendJson("/api/v1/auth/login", payload, false);
  setAuth(data.access_token, data.user.email);
  currentProfile = data.profile || {};
  fillSettings(currentProfile);
  await Promise.all([loadFoods(), refreshIntegrations(), loadWorkouts(), refreshAnalytics()]);
}

async function bootstrap() {
  renderAuthState();
  setupTabs();
  updatePlannerVisibility();
  handleOauthReturnParams();

  if (!getToken()) return;
  const me = await getJson("/api/v1/auth/me", true);
  currentProfile = me.profile || {};
  fillSettings(currentProfile);
  await Promise.all([loadFoods(), refreshIntegrations(), loadWorkouts(), refreshAnalytics()]);
}

function bind(id, fn) {
  const el = byId(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  el.addEventListener("click", async () => {
    try {
      await fn();
    } catch (err) {
      setPageError(String(err));
    }
  });
}

function bindChange(id, fn) {
  const el = byId(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  el.addEventListener("change", fn);
}

function init() {
  try {
    bind("registerBtn", registerUser);
    bind("loginBtn", loginUser);
    bind("logoutBtn", async () => clearAuth());
    bind("saveSettingsBtn", saveSettings);

    bind("predictBtn", runPredict);
    bind("simulateBtn", runSimulate);
    bind("saveWorkoutBtn", saveWorkout);

    bind("addFoodBtn", addCustomFood);
    bind("loadFoodsBtn", loadFoods);

    bind("connectStravaBtn", async () => connectProvider("strava"));
    bind("syncStravaCompletedBtn", async () => syncProvider("strava", "completed"));

    bind("connectGarminBtn", async () => connectProvider("garmin_connect"));
    bind("syncGarminPlannedBtn", async () => syncProvider("garmin_connect", "planned"));
    bind("syncGarminCompletedBtn", async () => syncProvider("garmin_connect", "completed"));

    bind("refreshAnalyticsBtn", refreshAnalytics);
    bind("loadWorkoutsBtn", loadWorkouts);

    bindChange("plan_sport", updatePlannerVisibility);
    bindChange("plan_status", updatePlannerVisibility);
    bindChange("plan_intensity_mode", updatePlannerVisibility);

    bootstrap().catch((err) => {
      setPageError(String(err));
      clearAuth();
    });
  } catch (err) {
    setPageError(`Initialization failed: ${String(err)}`);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
