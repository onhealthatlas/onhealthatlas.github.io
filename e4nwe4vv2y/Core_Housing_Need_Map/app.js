/* ======================================================================
   Core Housing Need in Ontario – interactive map
   Built on top of the Ontario's Health Atlas "Globe Light" MapLibre style.
   ====================================================================== */

/* ---------------------------------------------------------------------
   0. i18n
   --------------------------------------------------------------------- */

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

const CMA_NAME_FR_OVERRIDES = {
  "580": "Grand Sudbury"
};

const STRINGS = {
  en: {
    docTitle: "Core Housing Need in Ontario",
    title: "Core housing need",
    subtitle: "Ontario & 16 census metropolitan areas, 2018–2024",
    metric_pct: "Incidence (%)",
    metric_num: "Number of households",
    unit: "annual estimate",
    legend_label_pct: "INCIDENCE OF HOUSEHOLDS IN CORE HOUSING NEED",
    legend_label_num: "NUMBER OF HOUSEHOLDS IN CORE HOUSING NEED",
    outside_note: "Grey areas fall outside the 16 CMAs shown – Ontario-wide data only.",
    chart_subtitle: "2018–2024",
    chart_pct_label: "Incidence of core housing need (%)",
    chart_num_label: "Number of households in core housing need",
    footer_1: "Source: Statistics Canada, Canadian Income Survey, via the Canada Mortgage and Housing Corporation Housing Data Portal. Data last updated May 2026.",
    footer_2: "Some CMA–year estimates are not published due to data quality (too few observations or high variability) and appear as gaps.",
    ontario_name: "Ontario",
    popup_year: "Year",
    popup_pct: "Households in core housing need",
    popup_num: "Number of households",
    popup_na: "Not available (data suppressed)",
    popup_outside_title: "Outside the 16 CMAs",
    popup_outside_note: "Only Ontario-wide (province-level) figures are available for this area – census metropolitan area-level data has not been published here.",
    popup_ontario_pct: "Ontario incidence",
    popup_ontario_num: "Ontario households",
    play_label: "Play",
    pause_label: "Pause",
    lang_button_label: "Switch to French",
    chart_no_data: "Data not available for this measure",
    tooltip_na: "Not available"
  },
  fr: {
    docTitle: "Besoin de logement de base en Ontario",
    title: "Besoin de logement de base",
    subtitle: "Ontario et 16 régions métropolitaines de recensement, 2018–2024",
    metric_pct: "Incidence (%)",
    metric_num: "Nombre de ménages",
    unit: "estimation annuelle",
    legend_label_pct: "INCIDENCE DES MÉNAGES AYANT UN BESOIN DE LOGEMENT DE BASE",
    legend_label_num: "NOMBRE DE MÉNAGES AYANT UN BESOIN DE LOGEMENT DE BASE",
    outside_note: "Les zones grises sont situées hors des 16 RMR illustrées – données provinciales seulement.",
    chart_subtitle: "2018–2024",
    chart_pct_label: "Incidence du besoin de logement de base (%)",
    chart_num_label: "Nombre de ménages ayant un besoin de logement de base",
    footer_1: "Source : Statistique Canada, Enquête canadienne sur le revenu, par l'intermédiaire du portail de données sur le logement de la Société canadienne d'hypothèques et de logement. Données mises à jour en mai 2026.",
    footer_2: "Certaines estimations RMR–année ne sont pas publiées en raison de la qualité des données (trop peu d'observations ou grande variabilité) et apparaissent comme des lacunes.",
    ontario_name: "Ontario",
    popup_year: "Année",
    popup_pct: "Ménages ayant un besoin de logement de base",
    popup_num: "Nombre de ménages",
    popup_na: "Non disponible (donnée supprimée)",
    popup_outside_title: "À l'extérieur des 16 RMR",
    popup_outside_note: "Seules les données provinciales sont disponibles pour cette zone – aucune donnée à l'échelle de la région métropolitaine de recensement n'a été publiée ici.",
    popup_ontario_pct: "Incidence en Ontario",
    popup_ontario_num: "Ménages en Ontario",
    play_label: "Lecture",
    pause_label: "Pause",
    lang_button_label: "Passer à l'anglais",
    chart_no_data: "Données non disponibles pour cette mesure",
    tooltip_na: "Non disponible"
  }
};

let lang = "en";
function t(key) {
  return STRINGS[lang][key];
}

/* ---------------------------------------------------------------------
   1. State
   --------------------------------------------------------------------- */

const state = {
  metric: "pct",          // 'pct' | 'num'
  yearIndex: YEARS.length - 1,
  selection: null, // null | {type:'cma', uid} | {type:'ontario', uid: null}
  playing: false,
  playTimer: null,
  hoverYearIndex: null
};

function currentYear() {
  return YEARS[state.yearIndex];
}

/* Data pulled from the two GeoJSON sources, keyed for quick lookup */
const DATA = {
  cma: {},      // uid -> { name, pct: {year:val}, pctQ: {...}, num: {...}, numQ: {...} }
  ontario: null
};

/* ---------------------------------------------------------------------
   2. Colour ramp (dataviz skill: single-hue sequential, blue 100->700)
   --------------------------------------------------------------------- */

const RAMP_HEX = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
  "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"
];
const METRIC_DOMAIN = { pct: [5, 25], num: [0, 500000] };
const NO_DATA_COLOR = "#e2e4e8";

function colorExpression(metric, year) {
  const prop = metric + "_" + year;
  const [lo, hi] = METRIC_DOMAIN[metric];
  const n = RAMP_HEX.length;
  const stops = [];
  for (let i = 0; i < n; i++) {
    const val = lo + ((hi - lo) * i) / (n - 1);
    stops.push(val, RAMP_HEX[i]);
  }
  return [
    "case",
    ["==", ["get", prop], null],
    NO_DATA_COLOR,
    ["interpolate", ["linear"], ["get", prop], ...stops]
  ];
}

/* ---------------------------------------------------------------------
   3. Formatting helpers
   --------------------------------------------------------------------- */

function formatPct(v) {
  if (v === null || v === undefined) return null;
  const s = v.toFixed(1);
  // French uses a non-breaking space before "%" -- a plain space here would
  // let the browser wrap the number and the sign onto separate lines.
  return lang === "fr" ? s.replace(".", ",") + " %" : s + "%";
}

function formatNum(v) {
  if (v === null || v === undefined) return null;
  const locale = lang === "fr" ? "fr-CA" : "en-CA";
  return new Intl.NumberFormat(locale).format(v);
}

function metricValue(entity, metric, year) {
  if (!entity) return null;
  const table = metric === "pct" ? entity.pct : entity.num;
  return table[year] === undefined ? null : table[year];
}

/* ---------------------------------------------------------------------
   4. Map setup
   --------------------------------------------------------------------- */

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

const ONTARIO_BOUNDS = [
  [-95.5, 41.5],
  [-73.8, 57.0]
];

const hadInitialHash = !!location.hash && location.hash.length > 1;

const map = new maplibregl.Map({
  container: "map",
  style: "style.json",
  center: [-84.5, 43.2],
  zoom: 4.4,
  pitch: 0,
  bearing: 0,
  hash: true,
  attributionControl: { compact: true }
});
window.chnMap = map; // exposed for debugging / console use

map.on("style.load", () => {
  map.setProjection({ type: "globe" });
  if (!hadInitialHash) {
    // The floating left panel overlaps the map, so it needs left padding.
    // The right-hand chart pane is a real layout sidebar (see #mapWrap /
    // #rightPane in the HTML) that already shrinks the map container's
    // own width, so it needs no padding of its own here.
    map.fitBounds(ONTARIO_BOUNDS, {
      padding: { top: 40, bottom: 40, left: 360, right: 40 },
      duration: 0
    });
  }
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

if (typeof maplibregl.GlobeControl === "function") {
  map.addControl(new maplibregl.GlobeControl(), "top-right");
}

/* Custom EN/FR control, added last so it sits directly below the globe toggle */
class LanguageControl {
  onAdd(mapInstance) {
    this._map = mapInstance;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this._button = document.createElement("button");
    this._button.type = "button";
    this._button.className = "lang-ctrl-btn";
    this._button.textContent = "FR";
    this._button.setAttribute("aria-label", STRINGS.en.lang_button_label);
    this._button.addEventListener("click", () => toggleLanguage());
    this._container.appendChild(this._button);
    return this._container;
  }
  onRemove() {
    if (this._container.parentNode) this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
  updateLabel() {
    this._button.textContent = lang === "en" ? "FR" : "EN";
    this._button.setAttribute("aria-label", t("lang_button_label"));
  }
}
const langControl = new LanguageControl();
map.addControl(langControl, "top-right");

map.on("error", (e) => {
  console.error("Map error:", e && e.error ? e.error : e);
});

/* ---------------------------------------------------------------------
   5. Load the two data sources independently (for chart + popup use;
      the map itself reads the same files directly through style.json)
   --------------------------------------------------------------------- */

Promise.all([
  fetch("data/cmas.geojson").then((r) => r.json()),
  fetch("data/ontario.geojson").then((r) => r.json())
]).then(([cmaGj, onGj]) => {
  cmaGj.features.forEach((f) => {
    const p = f.properties;
    const pct = {}, pctQ = {}, num = {}, numQ = {};
    YEARS.forEach((y) => {
      pct[y] = p["pct_" + y];
      pctQ[y] = p["pct_q_" + y];
      num[y] = p["num_" + y];
      numQ[y] = p["num_q_" + y];
    });
    DATA.cma[p.CMAUID] = { uid: p.CMAUID, name: p.name, pct, pctQ, num, numQ };
  });

  const op = onGj.features[0].properties;
  const opct = {}, opctQ = {}, onum = {}, onumQ = {};
  YEARS.forEach((y) => {
    opct[y] = op["pct_" + y];
    opctQ[y] = op["pct_q_" + y];
    onum[y] = op["num_" + y];
    onumQ[y] = op["num_q_" + y];
  });
  DATA.ontario = { name: "Ontario", pct: opct, pctQ: opctQ, num: onum, numQ: onumQ };

  renderChart();
  updateChartTitle();
});

/* ---------------------------------------------------------------------
   6. Map paint updates
   --------------------------------------------------------------------- */

function updateMapColors() {
  if (!map.getLayer("cma-fill")) return;
  map.setPaintProperty("cma-fill", "fill-color", colorExpression(state.metric, currentYear()));
}

map.on("load", () => {
  updateMapColors();
  // The right-hand pane stays closed until the user clicks a CMA or Ontario.
});

/* ---------------------------------------------------------------------
   7. Hover + click interaction
   --------------------------------------------------------------------- */

let hoveredCmaId = null;

map.on("mousemove", "cma-fill", (e) => {
  map.getCanvas().style.cursor = "pointer";
  if (!e.features.length) return;
  const id = e.features[0].id;
  if (hoveredCmaId !== null && hoveredCmaId !== id) {
    map.setFeatureState({ source: "cmas-data", id: hoveredCmaId }, { hover: false });
  }
  hoveredCmaId = id;
  map.setFeatureState({ source: "cmas-data", id: hoveredCmaId }, { hover: true });
});

map.on("mouseleave", "cma-fill", () => {
  map.getCanvas().style.cursor = "";
  if (hoveredCmaId !== null) {
    map.setFeatureState({ source: "cmas-data", id: hoveredCmaId }, { hover: false });
  }
  hoveredCmaId = null;
});

map.on("mouseenter", "ontario-fill", () => {
  map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "ontario-fill", () => {
  map.getCanvas().style.cursor = "";
});

let activePopup = null;
let suppressPopupClose = false;

function openSelection(sel) {
  state.selection = sel;
  rightPaneEl.classList.add("is-open");
  map.resize();
  updateChartTitle();
  renderChart();
}

function closeSelection() {
  state.selection = null;
  rightPaneEl.classList.remove("is-open");
  if (activePopup) {
    suppressPopupClose = true;
    activePopup.remove();
    activePopup = null;
    suppressPopupClose = false;
  }
  map.resize();
}

map.on("click", (e) => {
  const cmaHits = map.queryRenderedFeatures(e.point, { layers: ["cma-fill"] });
  if (cmaHits.length) {
    const f = cmaHits[0];
    const uid = f.properties.CMAUID;
    openSelection({ type: "cma", uid });
    showCmaPopup(uid, e.lngLat);
    return;
  }
  const onHits = map.queryRenderedFeatures(e.point, { layers: ["ontario-fill"] });
  if (onHits.length) {
    openSelection({ type: "ontario", uid: null });
    showOntarioPopup(e.lngLat);
    return;
  }
  // Click outside Ontario entirely: close the popup and the right-hand pane.
  closeSelection();
});

document.getElementById("rp-close").addEventListener("click", () => {
  closeSelection();
});

/* ---------------------------------------------------------------------
   8. Popups
   --------------------------------------------------------------------- */

function cmaDisplayName(uid) {
  const entry = DATA.cma[uid];
  if (!entry) return "";
  if (lang === "fr" && CMA_NAME_FR_OVERRIDES[uid]) return CMA_NAME_FR_OVERRIDES[uid];
  return entry.name;
}

function buildCmaPopupHtml(uid) {
  const entry = DATA.cma[uid];
  const year = currentYear();
  const pctVal = metricValue(entry, "pct", year);
  const numVal = metricValue(entry, "num", year);
  const pctText = pctVal === null ? t("popup_na") : formatPct(pctVal);
  const numText = numVal === null ? t("popup_na") : formatNum(numVal);
  const pctClass = "value" + (pctVal === null ? " is-na" : "");
  const numClass = "value" + (numVal === null ? " is-na" : "");

  return `
    <div class="chn-popup-title">${escapeHtml(cmaDisplayName(uid))}</div>
    <div class="chn-popup-year">${escapeHtml(t("popup_year"))}: ${year}</div>
    <div class="chn-popup-row"><span class="label">${escapeHtml(t("popup_pct"))}</span><span class="${pctClass}">${escapeHtml(pctText)}</span></div>
    <div class="chn-popup-row"><span class="label">${escapeHtml(t("popup_num"))}</span><span class="${numClass}">${escapeHtml(numText)}</span></div>
  `;
}

function buildOntarioPopupHtml() {
  const year = currentYear();
  const pctVal = metricValue(DATA.ontario, "pct", year);
  const numVal = metricValue(DATA.ontario, "num", year);
  const pctText = pctVal === null ? t("popup_na") : formatPct(pctVal);
  const numText = numVal === null ? t("popup_na") : formatNum(numVal);
  const pctClass = "value" + (pctVal === null ? " is-na" : "");
  const numClass = "value" + (numVal === null ? " is-na" : "");

  return `
    <div class="chn-popup-title">${escapeHtml(t("popup_outside_title"))}</div>
    <div class="chn-popup-year">${escapeHtml(t("popup_year"))}: ${year}</div>
    <div class="chn-popup-row"><span class="label">${escapeHtml(t("popup_ontario_pct"))}</span><span class="${pctClass}">${escapeHtml(pctText)}</span></div>
    <div class="chn-popup-row"><span class="label">${escapeHtml(t("popup_ontario_num"))}</span><span class="${numClass}">${escapeHtml(numText)}</span></div>
    <div class="chn-popup-note">${escapeHtml(t("popup_outside_note"))}</div>
  `;
}

function showCmaPopup(uid, lngLat) {
  if (activePopup) {
    suppressPopupClose = true;
    activePopup.remove();
    suppressPopupClose = false;
  }
  activePopup = new maplibregl.Popup({ closeButton: true, maxWidth: "260px", className: "chn-popup" })
    .setLngLat(lngLat)
    .setHTML(buildCmaPopupHtml(uid))
    .addTo(map);
  activePopup._chnType = "cma";
  activePopup._chnUid = uid;
  activePopup.on("close", onPopupClosed);
}

function showOntarioPopup(lngLat) {
  if (activePopup) {
    suppressPopupClose = true;
    activePopup.remove();
    suppressPopupClose = false;
  }
  activePopup = new maplibregl.Popup({ closeButton: true, maxWidth: "260px", className: "chn-popup" })
    .setLngLat(lngLat)
    .setHTML(buildOntarioPopupHtml())
    .addTo(map);
  activePopup._chnType = "ontario";
  activePopup.on("close", onPopupClosed);
}

/* Fires whenever a popup is removed, whether by the user clicking its own
   × button, or programmatically (a new popup replacing it, or closeSelection
   tearing it down). Only a genuine user dismissal should also close the
   right-hand pane, so it's guarded by suppressPopupClose. */
function onPopupClosed() {
  if (suppressPopupClose) return;
  activePopup = null;
  closeSelection();
}

function refreshActivePopup() {
  if (!activePopup) return;
  if (activePopup._chnType === "cma") {
    activePopup.setHTML(buildCmaPopupHtml(activePopup._chnUid));
  } else {
    activePopup.setHTML(buildOntarioPopupHtml());
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ---------------------------------------------------------------------
   9. Left panel: metric toggle, slider, legend
   --------------------------------------------------------------------- */

const yearDisplay = document.getElementById("year-display");
const yearSlider = document.getElementById("year-slider");
const legendMin = document.getElementById("legend-min");
const legendMax = document.getElementById("legend-max");
const legendLabelEl = document.getElementById("t-legend-label");
const metricPctBtn = document.getElementById("metric-pct");
const metricNumBtn = document.getElementById("metric-num");

function updateLegend() {
  const [lo, hi] = METRIC_DOMAIN[state.metric];
  if (state.metric === "pct") {
    legendMin.textContent = formatPct(lo);
    legendMax.textContent = formatPct(hi);
    legendLabelEl.textContent = t("legend_label_pct");
  } else {
    legendMin.textContent = formatNum(lo);
    legendMax.textContent = formatNum(hi);
    legendLabelEl.textContent = t("legend_label_num");
  }
}

function setMetric(metric) {
  state.metric = metric;
  metricPctBtn.classList.toggle("is-active", metric === "pct");
  metricNumBtn.classList.toggle("is-active", metric === "num");
  updateLegend();
  updateMapColors();
}

metricPctBtn.addEventListener("click", () => setMetric("pct"));
metricNumBtn.addEventListener("click", () => setMetric("num"));

function setYearIndex(idx) {
  state.yearIndex = idx;
  yearSlider.value = String(idx);
  yearDisplay.textContent = String(currentYear());
  updateMapColors();
  refreshActivePopup();
  renderChart();
}

yearSlider.addEventListener("input", (e) => {
  stopPlay();
  setYearIndex(parseInt(e.target.value, 10));
});

/* Play / pause auto-advance through the years */
const playBtn = document.getElementById("play-btn");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");

function startPlay() {
  if (state.playing) return;
  state.playing = true;
  playIcon.style.display = "none";
  pauseIcon.style.display = "";
  state.playTimer = setInterval(() => {
    const next = (state.yearIndex + 1) % YEARS.length;
    setYearIndex(next);
  }, 1200);
}

function stopPlay() {
  if (!state.playing) return;
  state.playing = false;
  playIcon.style.display = "";
  pauseIcon.style.display = "none";
  clearInterval(state.playTimer);
  state.playTimer = null;
}

playBtn.addEventListener("click", () => {
  if (state.playing) stopPlay();
  else startPlay();
});

/* ---------------------------------------------------------------------
   10. Charts (right-hand pane)
   --------------------------------------------------------------------- */

const chartTitleEl = document.getElementById("chart-title");
const chartPctSvg = document.getElementById("chart-pct");
const chartNumSvg = document.getElementById("chart-num");
const chartPctCurrentEl = document.getElementById("chart-pct-current");
const chartNumCurrentEl = document.getElementById("chart-num-current");
const rightPaneEl = document.getElementById("rightPane");

function updateChartTitle() {
  if (!state.selection) return;
  if (state.selection.type === "cma") {
    chartTitleEl.textContent = cmaDisplayName(state.selection.uid);
  } else {
    chartTitleEl.textContent = t("ontario_name");
  }
}

function currentEntity() {
  if (!state.selection) return null;
  if (state.selection.type === "cma") return DATA.cma[state.selection.uid];
  return DATA.ontario;
}

const CHART_W = 300;
const CHART_H = 90;
const CHART_PAD_L = 4;
const CHART_PAD_R = 4;
const CHART_PAD_T = 10;
const CHART_PAD_B = 16;

function buildSeries(entity, metric) {
  const table = metric === "pct" ? entity.pct : entity.num;
  return YEARS.map((y) => ({ year: y, value: table[y] === undefined ? null : table[y] }));
}

function xForIndex(i) {
  const innerW = CHART_W - CHART_PAD_L - CHART_PAD_R;
  return CHART_PAD_L + (innerW * i) / (YEARS.length - 1);
}

function renderMiniChart(svg, series, metric) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const values = series.map((d) => d.value).filter((v) => v !== null);
  if (values.length === 0) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(CHART_W / 2));
    text.setAttribute("y", String(CHART_H / 2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "axis-label");
    text.textContent = t("chart_no_data");
    svg.appendChild(text);
    return;
  }

  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= Math.max(1, Math.abs(lo) * 0.1);
    hi += Math.max(1, Math.abs(hi) * 0.1);
  } else {
    const pad = (hi - lo) * 0.15;
    lo -= pad;
    hi += pad;
  }
  if (metric === "pct" && lo < 0) lo = 0;
  if (metric === "num" && lo < 0) lo = 0;

  const innerH = CHART_H - CHART_PAD_T - CHART_PAD_B;
  function yFor(v) {
    return CHART_PAD_T + innerH - ((v - lo) / (hi - lo)) * innerH;
  }

  const svgns = "http://www.w3.org/2000/svg";

  // baseline
  const baseline = document.createElementNS(svgns, "line");
  baseline.setAttribute("class", "baseline");
  baseline.setAttribute("x1", String(CHART_PAD_L));
  baseline.setAttribute("x2", String(CHART_W - CHART_PAD_R));
  baseline.setAttribute("y1", String(CHART_H - CHART_PAD_B));
  baseline.setAttribute("y2", String(CHART_H - CHART_PAD_B));
  svg.appendChild(baseline);

  // path, broken into contiguous non-null runs
  let d = "";
  let drawing = false;
  series.forEach((pt, i) => {
    if (pt.value === null) {
      drawing = false;
      return;
    }
    const x = xForIndex(i);
    const y = yFor(pt.value);
    d += (drawing ? "L" : "M") + x.toFixed(2) + "," + y.toFixed(2) + " ";
    drawing = true;
  });
  if (d) {
    const path = document.createElementNS(svgns, "path");
    path.setAttribute("class", "series-line");
    path.setAttribute("d", d.trim());
    svg.appendChild(path);
  }

  // points
  series.forEach((pt, i) => {
    if (pt.value === null) return;
    const x = xForIndex(i);
    const y = yFor(pt.value);
    const isCurrent = i === state.yearIndex;
    const c = document.createElementNS(svgns, "circle");
    c.setAttribute("cx", x.toFixed(2));
    c.setAttribute("cy", y.toFixed(2));
    c.setAttribute("r", isCurrent ? "4" : "2.5");
    c.setAttribute("class", "series-point" + (isCurrent ? " is-current" : ""));
    svg.appendChild(c);
  });

  // start / end year labels
  [0, YEARS.length - 1].forEach((i) => {
    const label = document.createElementNS(svgns, "text");
    label.setAttribute("x", String(xForIndex(i)));
    label.setAttribute("y", String(CHART_H - 2));
    label.setAttribute("text-anchor", i === 0 ? "start" : "end");
    label.setAttribute("class", "axis-label");
    label.textContent = String(series[i].year);
    svg.appendChild(label);
  });

  // hit areas per year, so clicking a point on the chart jumps to that year
  const sliceW = (CHART_W - CHART_PAD_L - CHART_PAD_R) / (YEARS.length - 1);
  series.forEach((pt, i) => {
    const rect = document.createElementNS(svgns, "rect");
    const x = xForIndex(i) - sliceW / 2;
    rect.setAttribute("x", String(Math.max(0, x)));
    rect.setAttribute("y", "0");
    rect.setAttribute("width", String(sliceW));
    rect.setAttribute("height", String(CHART_H));
    rect.setAttribute("class", "hit-area");
    rect.addEventListener("click", () => {
      stopPlay();
      setYearIndex(i);
    });
    svg.appendChild(rect);
  });
}

function renderChart() {
  const entity = currentEntity();
  if (!entity) return;
  renderMiniChart(chartPctSvg, buildSeries(entity, "pct"), "pct");
  renderMiniChart(chartNumSvg, buildSeries(entity, "num"), "num");

  const pctVal = metricValue(entity, "pct", currentYear());
  const numVal = metricValue(entity, "num", currentYear());
  chartPctCurrentEl.textContent = pctVal === null ? t("popup_na") : formatPct(pctVal);
  chartNumCurrentEl.textContent = numVal === null ? t("popup_na") : formatNum(numVal);
  chartPctCurrentEl.classList.toggle("is-na", pctVal === null);
  chartNumCurrentEl.classList.toggle("is-na", numVal === null);
}

/* ---------------------------------------------------------------------
   12. Language toggle
   --------------------------------------------------------------------- */

function applyLanguage() {
  document.documentElement.lang = lang;
  document.title = t("docTitle");
  document.getElementById("t-title").textContent = t("title");
  document.getElementById("t-subtitle").textContent = t("subtitle");
  metricPctBtn.textContent = t("metric_pct");
  metricNumBtn.textContent = t("metric_num");
  document.getElementById("t-unit").textContent = t("unit");
  document.getElementById("t-outside-note").textContent = t("outside_note");
  document.getElementById("t-chart-subtitle").textContent = t("chart_subtitle");
  document.getElementById("t-chart-pct-label").textContent = t("chart_pct_label");
  document.getElementById("t-chart-num-label").textContent = t("chart_num_label");
  document.getElementById("t-footer-1").textContent = t("footer_1");
  document.getElementById("t-footer-2").textContent = t("footer_2");
  playBtn.setAttribute("aria-label", state.playing ? t("pause_label") : t("play_label"));
  updateLegend();
  updateChartTitle();
  renderChart();
  refreshActivePopup();
  langControl.updateLabel();
}

function toggleLanguage() {
  lang = lang === "en" ? "fr" : "en";
  applyLanguage();
}

/* ---------------------------------------------------------------------
   13. Init
   --------------------------------------------------------------------- */

applyLanguage();
