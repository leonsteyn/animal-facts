// ── Habitat configuration ──────────────────────────────────
const HABITAT_CONFIG = {
  "Rainforest":         { color: "#27ae60", emoji: "🌿" },
  "Desert":             { color: "#e67e22", emoji: "🏜️" },
  "Savannah":           { color: "#d4a017", emoji: "🌾" },
  "Polar Regions":      { color: "#2980b9", emoji: "❄️" },
  "Ocean & Coral Reef": { color: "#0077b6", emoji: "🌊" },
  "Rivers & Wetlands":  { color: "#16a085", emoji: "💧" },
  "Mountains":          { color: "#8e44ad", emoji: "⛰️" },
  "Woodlands":          { color: "#5d8a3c", emoji: "🌳" },
};

const IUCN_LABELS = {
  LC: "Least Concern",
  NT: "Near Threatened",
  VU: "Vulnerable",
  EN: "Endangered",
  CR: "Critically Endangered",
  EW: "Extinct in Wild",
  EX: "Extinct",
  DD: "Data Deficient",
};

const IUCN_COLORS = {
  LC: "#27ae60", NT: "#f39c12", VU: "#e67e22",
  EN: "#e74c3c", CR: "#c0392b", EW: "#8e44ad",
  EX: "#2c3e50", DD: "#95a5a6",
};

// URL of the Mrs Steyn's Games landing page
const HOME_URL = "https://mrssteynsgames.netlify.app";

// ── Helpers ───────────────────────────────────────────────
function getHabitatColor(habitat) {
  return (HABITAT_CONFIG[habitat] || {}).color || "#718096";
}

function getHabitatEmoji(habitat) {
  return (HABITAT_CONFIG[habitat] || {}).emoji || "🐾";
}

function getAnimalsByHabitat(habitat) {
  return ANIMALS
    .filter(a => a.habitat === habitat)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── Header ────────────────────────────────────────────────
function buildHeader(activeHabitat) {
  const el = document.getElementById("site-header");
  if (!el) return;

  const pills = Object.entries(HABITAT_CONFIG).map(([name, cfg]) => {
    const active = name === activeHabitat ? " active" : "";
    return `<a href="habitat.html?h=${encodeURIComponent(name)}"
               class="habitat-pill${active}"
               style="background:${cfg.color}">${cfg.emoji} ${name}</a>`;
  }).join("");

  el.innerHTML = `
    <h1>🐾 Animal Facts</h1>
    <p class="subtitle">Explore the Animal Kingdom · Years 5–6</p>
    <nav class="habitat-pills">${pills}</nav>
  `;
}

// ── GeoChart ──────────────────────────────────────────────
function drawAnimalGeoChart(divId, animal, color) {
  const el = document.getElementById(divId);
  if (!el) return;

  // Arctic / ocean animals with no specific countries — show grey world map
  if (!animal.mapCountries || animal.mapCountries.length === 0) {
    const data = google.visualization.arrayToDataTable([["Country", "Value"]]);
    const chart = new google.visualization.GeoChart(el);
    chart.draw(data, {
      region: "world",
      displayMode: "regions",
      colorAxis: { colors: [color, color] },
      backgroundColor: "#c8dff0",
      datalessRegionColor: "#e0e0e0",
      legend: "none",
      enableRegionInteractivity: false,
      tooltip: { trigger: "none" },
      width: 200, height: 150,
    });
    return;
  }

  const rows = [["Country", "Value"], ...animal.mapCountries.map(c => [c.toUpperCase(), 1])];
  const data = google.visualization.arrayToDataTable(rows);
  const chart = new google.visualization.GeoChart(el);
  chart.draw(data, {
    region: animal.mapRegion || "world",
    displayMode: "regions",
    colorAxis: { colors: [color, color] },
    backgroundColor: "#c8dff0",
    datalessRegionColor: "#e0e0e0",
    legend: "none",
    enableRegionInteractivity: false,
    tooltip: { trigger: "none" },
    width: 200, height: 150,
  });
}

// ── Wikipedia photo ───────────────────────────────────────
async function fetchAnimalPhoto(wikiTitle, imgEl, fallbackEl) {
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`
    );
    const data = await resp.json();
    if (data.thumbnail && data.thumbnail.source) {
      imgEl.src = data.thumbnail.source;
      imgEl.style.display = "block";
      if (fallbackEl) fallbackEl.style.display = "none";
    }
  } catch (e) { /* keep emoji fallback */ }
}

// ── Build animal card HTML ────────────────────────────────
function buildCardHTML(animal, chartSuffix) {
  const color    = getHabitatColor(animal.habitat);
  const lightBg  = hexToRgba(color, 0.08);
  const iucnColor = IUCN_COLORS[animal.iucn] || "#95a5a6";
  const iucnLabel = IUCN_LABELS[animal.iucn] || animal.iucn;
  const suffix   = chartSuffix || animal.name.replace(/\s+/g, "-").toLowerCase();
  const chartId  = "geo-chart-" + suffix;
  const imgId    = "animal-photo-" + suffix;
  const fbId     = "animal-fb-" + suffix;

  return `
    <div class="animal-card">
      <div class="card-header" style="background:${color}">
        <h2>${animal.emoji} ${animal.name}</h2>
        <div class="card-badges">
          <span class="badge-habitat">${getHabitatEmoji(animal.habitat)} ${animal.habitat}</span>
          <span class="badge-iucn" style="background:${iucnColor}">${iucnLabel}</span>
        </div>
      </div>

      <div class="card-visuals">
        <div class="visual-block">
          <span class="visual-label">📸 Animal Photo</span>
          <div class="animal-photo-box">
            <img id="${imgId}" class="animal-photo" alt="${animal.name}">
            <span id="${fbId}" class="animal-emoji-fallback">${animal.emoji}</span>
          </div>
        </div>
        <div class="visual-block">
          <span class="visual-label">🗺️ Where in the World?</span>
          <div class="geo-chart-container" id="${chartId}"></div>
        </div>
      </div>

      <div class="card-facts">
        <div class="fact-cell">
          <div class="fact-label">Classification</div>
          <div class="fact-value">🔬 ${animal.classification}</div>
        </div>
        <div class="fact-cell">
          <div class="fact-label">Diet</div>
          <div class="fact-value">🍽️ ${animal.diet}</div>
        </div>
        <div class="fact-cell">
          <div class="fact-label">Habitat</div>
          <div class="fact-value" style="color:${color}">${getHabitatEmoji(animal.habitat)} ${animal.habitat}</div>
        </div>
        <div class="fact-cell">
          <div class="fact-label">Size</div>
          <div class="fact-value">📏 ${animal.size}</div>
        </div>
        <div class="fact-cell full-width">
          <div class="fact-label">Distribution</div>
          <div class="fact-value">📍 ${animal.distributionText}</div>
        </div>
      </div>

      <div class="fun-fact-banner" style="background:${lightBg}">
        ⭐ <strong>Fun Fact:</strong> ${animal.fact}
      </div>
    </div>
  `;
}

// Render a single card and trigger its photo + chart
function renderCard(animal, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const suffix = animal.name.replace(/\s+/g, "-").toLowerCase();
  container.innerHTML = buildCardHTML(animal, suffix);

  const imgEl = document.getElementById("animal-photo-" + suffix);
  const fbEl  = document.getElementById("animal-fb-"    + suffix);
  fetchAnimalPhoto(animal.wikiTitle, imgEl, fbEl);

  const color = getHabitatColor(animal.habitat);
  const chartId = "geo-chart-" + suffix;
  if (typeof google !== "undefined" && google.visualization) {
    drawAnimalGeoChart(chartId, animal, color);
  } else {
    window._pendingCharts = window._pendingCharts || [];
    window._pendingCharts.push({ chartId, animal, color });
  }
}

// Called by Google Charts loader callback
function onGoogleChartsReady() {
  if (window._pendingCharts) {
    window._pendingCharts.forEach(({ chartId, animal, color }) => {
      drawAnimalGeoChart(chartId, animal, color);
    });
    window._pendingCharts = [];
  }
  if (window._onChartsReady) window._onChartsReady();
}
