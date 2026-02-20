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

function buildPayload() {
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
      menstrual_context: null
    },
    session: {
      sport: n("sport"),
      duration_minutes: asNum("duration"),
      intensity_rpe: asNum("rpe"),
      indoor: boolVal("indoor"),
      race_day: boolVal("race"),
      weekly_training_load_hours: asNum("load")
    },
    environment: {
      temperature_c: asNum("temp"),
      humidity_pct: asNum("hum"),
      altitude_m: asNum("alt"),
      terrain_factor: asNum("terrain")
    },
    science_mode: boolVal("science")
  };
}

function strategyRows(strategies) {
  return strategies.map((s) => `
    <tr>
      <td>${s.strategy}</td>
      <td>${s.carbs_g_per_hour}</td>
      <td>${s.hydration_ml_per_hour}</td>
      <td>${s.sodium_mg_per_hour}</td>
      <td>${s.pre_workout_carbs_g} / ${s.during_workout_carbs_g_total} / ${s.post_workout_carbs_g}</td>
      <td>${s.gi_risk_score}</td>
    </tr>
  `).join("");
}

function renderPrediction(data, heading = "Recommendation") {
  const balanced = data.strategies.find((s) => s.strategy === "balanced");
  const notes = (data.uncertainty_notes || []).map((x) => `<li>${x}</li>`).join("");
  const rationale = (data.rationale || []).map((x) => `<li>${x}</li>`).join("");

  document.getElementById("result").innerHTML = `
    <div class="kpi"><div>${heading}</div><div class="v">${balanced.carbs_g_per_hour} g/h</div><div>Balanced carbs target</div></div>
    <div class="grid3" style="margin-top:10px;">
      <div class="kpi"><div>Hydration</div><div class="v">${balanced.hydration_ml_per_hour} ml/h</div></div>
      <div class="kpi"><div>Sodium</div><div class="v">${balanced.sodium_mg_per_hour} mg/h</div></div>
      <div class="kpi"><div>GI Risk</div><div class="v">${balanced.gi_risk_score} / 10</div></div>
    </div>

    <table class="table">
      <thead>
        <tr><th>Strategy</th><th>Carbs g/h</th><th>Hydration ml/h</th><th>Sodium mg/h</th><th>Pre / During / Post g</th><th>GI Risk</th></tr>
      </thead>
      <tbody>${strategyRows(data.strategies)}</tbody>
    </table>

    <div class="notes"><strong>Confidence:</strong> ${data.confidence_low} - ${data.confidence_high}</div>
    <div class="notes"><strong>Uncertainty notes:</strong><ul>${notes || "<li>None</li>"}</ul></div>
    <div class="notes"><strong>Explainability:</strong><ul>${rationale || "<li>Model rationale unavailable.</li>"}</ul></div>
  `;
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function runPredict() {
  try {
    const payload = buildPayload();
    const data = await postJson("/api/v1/predict", payload);
    renderPrediction(data, "Recommendation");
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

async function runSimulate() {
  try {
    const base = buildPayload();
    const payload = {
      base_request: base,
      hotter_by_c: 5,
      longer_by_minutes: 20,
      intensity_delta_rpe: 0.7
    };
    const data = await postJson("/api/v1/simulate", payload);
    renderPrediction(data.simulated, "Simulated Recommendation (+5C, +20m, +0.7 RPE)");

    const extra = document.createElement("div");
    extra.className = "notes";
    extra.innerHTML = `<strong>Delta summary:</strong><ul>${data.delta_summary.map((d) => `<li>${d}</li>`).join("")}</ul>`;
    document.getElementById("result").appendChild(extra);
  } catch (err) {
    document.getElementById("result").innerHTML = `<div class="err">${String(err)}</div>`;
  }
}

document.getElementById("predictBtn").addEventListener("click", runPredict);
document.getElementById("simulateBtn").addEventListener("click", runSimulate);
