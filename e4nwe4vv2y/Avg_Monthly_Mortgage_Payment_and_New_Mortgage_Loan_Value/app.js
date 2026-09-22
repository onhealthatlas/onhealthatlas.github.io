(function () {
  "use strict";

  // ---- pmtiles protocol (matches the base style's tile source) ----
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  // Sequential blue ramp, light -> dark (13 steps)
  const RAMP = [
    "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
    "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"
  ];
  const NO_DATA_COLOR = "#e2e4e8";

  const ONTARIO_BOUNDS = [[-95.5, 41.5], [-73.8, 57.0]];

  const STYLE_URL = window.MORTGAGE_MAP_STYLE_URL || "https://www.onhealthatlas.ca/e4nwe4vv2y/Globe_Light/style.json";
  const DATA_BASE = window.MORTGAGE_MAP_DATA_BASE || "data/";

  const map = new maplibregl.Map({
    container: "map",
    style: STYLE_URL,
    center: [-85, 50],
    zoom: 4.3,
    pitch: 0,
    bearing: 0,
    hash: true,
    attributionControl: { compact: true }
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

  map.on("error", (e) => {
    console.error("Map error:", e && e.error ? e.error : e);
  });

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  const state = {
    metric: "loanValue",    // 'loanValue' | 'monthlyPayment'
    granularity: "quarter", // 'quarter' | 'year'
    real: false,             // false = nominal $, true = chained 2017 $
    periodIndex: 0,
    playing: false,
    playTimer: null
  };

  let DATA = null;
  let CMA_IDS = [];
  let lastColorKey = null; // tracks whether fill-color expression matches current metric+dollar mode
  let hoveredId = null;

  const fmtCurrencyFull = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  const fmtCurrencyCompact = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", notation: "compact", maximumFractionDigits: 1 });

  function currentMetric() {
    return DATA.metrics[state.metric];
  }
  function fieldName() {
    if (state.granularity === "quarter") return state.real ? "realQ" : "nominalQ";
    return state.real ? "realY" : "nominalY";
  }
  function periodList() {
    return state.granularity === "quarter" ? DATA.quarters : DATA.years;
  }
  function currentPeriodKey() {
    const list = periodList();
    const idx = Math.min(state.periodIndex, list.length - 1);
    return list[idx];
  }
  function periodLabel(key) {
    if (state.granularity === "year") return key;
    return key.slice(0, 4) + " " + key.slice(4); // '2019Q3' -> '2019 Q3'
  }
  function currentDomain() {
    return state.real ? currentMetric().domain.real : currentMetric().domain.nominal;
  }
  function formatMetricValue(val) {
    if (val == null) return "No data";
    const txt = fmtCurrencyFull.format(val);
    return state.metric === "monthlyPayment" ? txt + " /mo" : txt;
  }

  // ---------------------------------------------------------------
  // Data + layers
  // ---------------------------------------------------------------
  const dataReady = fetch(DATA_BASE + "mortgage_data.json").then((r) => r.json());
  const styleReady = new Promise((resolve) => {
    if (map.isStyleLoaded()) resolve();
    else map.once("load", resolve);
  });

  Promise.all([dataReady, styleReady]).then(([data]) => {
    DATA = data;
    CMA_IDS = Object.keys(data.metrics.loanValue.geographies).filter((id) => id !== "ON");

    map.addSource("ontario-province", { type: "geojson", data: DATA_BASE + "ontario_province.geojson" });
    map.addSource("ontario-cmas", { type: "geojson", data: DATA_BASE + "ontario_cmas.geojson", promoteId: "CMAUID" });

    const beforeId = map.getLayer("waterway_line_label") ? "waterway_line_label" : undefined;

    map.addLayer({
      id: "province-fill",
      type: "fill",
      source: "ontario-province",
      paint: { "fill-color": "#c7cee0", "fill-opacity": 0.45 }
    }, beforeId);

    map.addLayer({
      id: "province-outline",
      type: "line",
      source: "ontario-province",
      paint: { "line-color": "#5b6b8c", "line-width": 1.1 }
    }, beforeId);

    map.addLayer({
      id: "cma-fill",
      type: "fill",
      source: "ontario-cmas",
      paint: { "fill-color": NO_DATA_COLOR, "fill-opacity": 0.9 }
    }, beforeId);

    map.addLayer({
      id: "cma-outline",
      type: "line",
      source: "ontario-cmas",
      paint: {
        "line-color": "#0d366b",
        "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.75, 0.9]
      }
    }, beforeId);

    map.fitBounds(ONTARIO_BOUNDS, { padding: { top: 40, bottom: 40, left: 360, right: 40 }, duration: 0 });

    document.getElementById("panelTitle").textContent = currentMetric().label;
    initControls();
    render();
    initInteractions();
  });

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  function buildFillExpression(domain) {
    const [min, max] = domain;
    const n = RAMP.length;
    const stops = [];
    for (let i = 0; i < n; i++) {
      const v = min + ((max - min) * i) / (n - 1);
      stops.push(v, RAMP[i]);
    }
    return [
      "case",
      ["<", ["coalesce", ["feature-state", "value"], -1], 0], NO_DATA_COLOR,
      ["interpolate", ["linear"], ["feature-state", "value"], ...stops]
    ];
  }

  function render() {
    const key = currentPeriodKey();
    const field = fieldName();
    const domain = currentDomain();
    const metric = currentMetric();

    CMA_IDS.forEach((id) => {
      const v = metric.geographies[id][field][key];
      map.setFeatureState({ source: "ontario-cmas", id }, { value: v == null ? -1 : v });
    });

    const colorKey = state.metric + "|" + state.real;
    if (lastColorKey !== colorKey) {
      map.setPaintProperty("cma-fill", "fill-color", buildFillExpression(domain));
      lastColorKey = colorKey;
      updateLegend(domain, metric);
    }

    document.getElementById("periodLabel").textContent = periodLabel(key);
    document.getElementById("periodSub").textContent = state.real ? "chained 2017$" : "nominal $";

    const slider = document.getElementById("periodSlider");
    const list = periodList();
    slider.max = String(list.length - 1);
    slider.value = String(state.periodIndex);
    document.getElementById("rangeStart").textContent = periodLabel(list[0]);
    document.getElementById("rangeEnd").textContent = periodLabel(list[list.length - 1]);
  }

  function updateLegend(domain, metric) {
    const grad = "linear-gradient(to right, " + RAMP.join(",") + ")";
    document.getElementById("legendGradient").style.background = grad;
    const suffix = state.metric === "monthlyPayment" ? "/mo" : "";
    document.getElementById("legendMin").textContent = fmtCurrencyCompact.format(domain[0]) + suffix;
    document.getElementById("legendMax").textContent = fmtCurrencyCompact.format(domain[1]) + suffix;
    document.getElementById("legendTitle").textContent = metric.label;
  }

  // ---------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------
  function initControls() {
    const metricSeg = document.getElementById("metricSeg");
    metricSeg.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const newMetric = btn.dataset.val;
        if (newMetric === state.metric) return;
        state.metric = newMetric;
        lastColorKey = null; // force color + legend rescale
        metricSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
        document.getElementById("panelTitle").textContent = currentMetric().label;
        render();
      });
    });

    const seg = document.getElementById("granularitySeg");
    seg.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const newGran = btn.dataset.val;
        if (newGran === state.granularity) return;
        stopPlaying();
        const oldList = periodList();
        const fraction = oldList.length > 1 ? state.periodIndex / (oldList.length - 1) : 0;
        state.granularity = newGran;
        const newList = periodList();
        state.periodIndex = Math.round(fraction * (newList.length - 1));
        seg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
        render();
      });
    });

    const slider = document.getElementById("periodSlider");
    slider.addEventListener("input", () => {
      stopPlaying();
      state.periodIndex = parseInt(slider.value, 10);
      render();
    });

    document.getElementById("realToggle").addEventListener("change", (e) => {
      state.real = e.target.checked;
      lastColorKey = null; // force color rescale
      render();
    });

    document.getElementById("playBtn").addEventListener("click", togglePlay);
  }

  function togglePlay() {
    if (state.playing) { stopPlaying(); return; }
    state.playing = true;
    document.getElementById("playBtn").textContent = "❚❚";
    state.playTimer = setInterval(() => {
      const list = periodList();
      state.periodIndex = (state.periodIndex + 1) % list.length;
      render();
    }, 750);
  }
  function stopPlaying() {
    if (state.playTimer) clearInterval(state.playTimer);
    state.playTimer = null;
    state.playing = false;
    document.getElementById("playBtn").textContent = "▶";
  }

  // ---------------------------------------------------------------
  // Click / hover interactions
  // ---------------------------------------------------------------
  function initInteractions() {
    map.on("mousemove", "cma-fill", (e) => {
      map.getCanvas().style.cursor = "pointer";
      if (!e.features.length) return;
      const id = e.features[0].id;
      if (hoveredId !== null && hoveredId !== id) {
        map.setFeatureState({ source: "ontario-cmas", id: hoveredId }, { hover: false });
      }
      hoveredId = id;
      map.setFeatureState({ source: "ontario-cmas", id: hoveredId }, { hover: true });
    });
    map.on("mouseleave", "cma-fill", () => {
      map.getCanvas().style.cursor = "";
      if (hoveredId !== null) {
        map.setFeatureState({ source: "ontario-cmas", id: hoveredId }, { hover: false });
      }
      hoveredId = null;
    });
    map.on("mousemove", "province-fill", () => {
      if (!hoveredId) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "province-fill", () => {
      if (!hoveredId) map.getCanvas().style.cursor = "";
    });

    map.on("click", (e) => {
      const key = currentPeriodKey();
      const field = fieldName();
      const label = periodLabel(key);
      const metric = currentMetric();
      const dmTxt = state.real ? "inflation-adjusted, chained 2017 dollars" : "nominal (current-year) dollars";
      const metricLower = metric.label.charAt(0).toLowerCase() + metric.label.slice(1);

      const cmaHits = map.queryRenderedFeatures(e.point, { layers: ["cma-fill"] });
      if (cmaHits.length) {
        const f = cmaHits[0];
        const id = String(f.properties.CMAUID);
        const geo = metric.geographies[id];
        const val = geo[field][key];
        new maplibregl.Popup({ className: "mm-popup", maxWidth: "260px" })
          .setLngLat(e.lngLat)
          .setHTML(
            '<h3>' + escapeHtml(geo.name) + '</h3>' +
            '<div class="mm-period">' + escapeHtml(label) + '</div>' +
            '<div class="mm-value">' + formatMetricValue(val) + '</div>' +
            '<div class="mm-note">' + escapeHtml(metric.label) + ' (' + dmTxt + ')</div>'
          )
          .addTo(map);
        return;
      }

      const provHits = map.queryRenderedFeatures(e.point, { layers: ["province-fill"] });
      if (provHits.length) {
        const val = metric.geographies.ON[field][key];
        new maplibregl.Popup({ className: "mm-popup", maxWidth: "270px" })
          .setLngLat(e.lngLat)
          .setHTML(
            '<h3>Ontario</h3>' +
            '<p class="mm-warn">Only province-wide data is available for this area — it falls outside the 15 tracked metropolitan areas.</p>' +
            '<div class="mm-period">' + escapeHtml(label) + '</div>' +
            '<div class="mm-value">' + formatMetricValue(val) + '</div>' +
            '<div class="mm-note">Ontario-wide ' + escapeHtml(metricLower) + ' (' + dmTxt + ')</div>'
          )
          .addTo(map);
      }
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();
