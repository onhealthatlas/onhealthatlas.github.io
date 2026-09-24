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

  // ---------------------------------------------------------------
  // Language / translation
  // ---------------------------------------------------------------
  let currentLang = "en"; // 'en' | 'fr' — must be declared before controls are added

  const STRINGS = {
    en: {
      pageTitle: "Ontario Mortgage Values Map",
      subtitle: "Ontario & 15 census metropolitan areas, 2012–2025",
      metricLoanValue: "Loan value",
      metricMonthlyPayment: "Monthly payment",
      granularityQuarterly: "Quarterly",
      granularityYearly: "Yearly",
      playTitle: "Play",
      pauseTitle: "Pause",
      sliderAriaLabel: "Time period",
      inflationLabel: "Inflation-adjusted",
      inflationHint: "Show values in chained 2017 dollars",
      nodataText: "Outside these 15 CMAs – province-wide data only",
      sourceNote: "Source: Equifax Canada, via Canada Mortgage and Housing Corporation (data as of March 2026). Values are quarterly averages; seasonal effects are not removed. Inflation adjustment uses the Canada All-items Consumer Price Index (Bank of Canada / Statistics Canada Table 18-10-0004-01), rebased to a 2017 annual average of 100.",
      detailCloseTitle: "Close",
      provinceHeading: "Ontario",
      provinceWarning: "Only province-wide data is available for this area – it falls outside the 15 tracked metropolitan areas.",
      provinceDetailNote: "Province-wide average – outside the 15 tracked metropolitan areas.",
      noData: "No data",
      perMonthSuffix: " /mo",
      perMonthSuffixTight: "/mo",
      nominalDollars: "nominal dollars",
      realDollars: "chained 2017 dollars",
      nominalParenthetical: "nominal (current-year) dollars",
      realParenthetical: "inflation-adjusted, chained 2017 dollars",
      altNominal: "nominal",
      altReal: "chained 2017",
      quarterlyChartLabel: "Quarterly",
      yearlyChartLabel: "Yearly"
    },
    fr: {
      pageTitle: "Carte des valeurs hypothécaires de l'Ontario",
      subtitle: "Ontario et 15 régions métropolitaines de recensement, 2012–2025",
      metricLoanValue: "Valeur du prêt",
      metricMonthlyPayment: "Versement mensuel",
      granularityQuarterly: "Trimestriel",
      granularityYearly: "Annuel",
      playTitle: "Lecture",
      pauseTitle: "Pause",
      sliderAriaLabel: "Période",
      inflationLabel: "Corrigé de l'inflation",
      inflationHint: "Afficher les valeurs en dollars enchaînés de 2017",
      nodataText: "À l'extérieur de ces 15 RMR – données à l'échelle provinciale seulement",
      sourceNote: "Source : Equifax Canada, par l'entremise de la Société canadienne d'hypothèques et de logement (données en date de mars 2026). Les valeurs sont des moyennes trimestrielles; les effets saisonniers ne sont pas éliminés. La correction de l'inflation utilise l'Indice des prix à la consommation, ensemble (Canada) (Banque du Canada / Statistique Canada, tableau 18-10-0004-01), rebasé de sorte que la moyenne annuelle de 2017 soit égale à 100.",
      detailCloseTitle: "Fermer",
      provinceHeading: "Ontario",
      provinceWarning: "Seules les données à l'échelle provinciale sont disponibles pour ce secteur – il se situe à l'extérieur des 15 régions métropolitaines de recensement suivies.",
      provinceDetailNote: "Moyenne à l'échelle provinciale – à l'extérieur des 15 régions métropolitaines de recensement suivies.",
      noData: "Aucune donnée",
      perMonthSuffix: " /mois",
      perMonthSuffixTight: "/mois",
      nominalDollars: "dollars nominaux",
      realDollars: "dollars enchaînés de 2017",
      nominalParenthetical: "dollars nominaux (année courante)",
      realParenthetical: "corrigé de l'inflation, dollars enchaînés de 2017",
      altNominal: "nominal",
      altReal: "enchaîné 2017",
      quarterlyChartLabel: "Trimestriel",
      yearlyChartLabel: "Annuel"
    }
  };
  function T(key) { return STRINGS[currentLang][key]; }

  const METRIC_LABELS = {
    loanValue: { en: "Average value of new mortgage loans", fr: "Valeur moyenne des nouveaux prêts hypothécaires" },
    monthlyPayment: { en: "Average scheduled monthly payment", fr: "Versement mensuel prévu moyen" }
  };
  function metricLabel(mkey) { return METRIC_LABELS[mkey][currentLang]; }

  const fmtCurrencyFull = {
    en: new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }),
    fr: new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
  };
  const fmtCurrencyCompact = {
    en: new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", notation: "compact", maximumFractionDigits: 1 }),
    fr: new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", notation: "compact", maximumFractionDigits: 1 })
  };

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

  // ---- Native MapLibre control strings (zoom/compass/globe/popup close) ----
  // MapLibre has no public "setLocale" API, so we read its private default
  // dictionary once (English) and swap in a French one on toggle. Guarded
  // so a future MapLibre upgrade that removes this private API just skips
  // translating the native control tooltips rather than breaking anything.
  const NATIVE_LOCALE_EN = Object.assign({}, map._locale || {});
  const NATIVE_LOCALE_FR = {
    "AttributionControl.ToggleAttribution": "Afficher/masquer l'attribution",
    "AttributionControl.MapFeedback": "Commentaires sur la carte",
    "GeolocateControl.FindMyLocation": "Me localiser",
    "GeolocateControl.LocationNotAvailable": "Position non disponible",
    "LogoControl.Title": "Logo MapLibre",
    "Map.Title": "Carte",
    "Marker.Title": "Repère de carte",
    "NavigationControl.ResetBearing": "Réinitialiser l'orientation vers le nord",
    "NavigationControl.ZoomIn": "Zoom avant",
    "NavigationControl.ZoomOut": "Zoom arrière",
    "Popup.Close": "Fermer",
    "GlobeControl.Enable": "Activer le globe",
    "GlobeControl.Disable": "Désactiver le globe",
    "ScaleControl.Feet": "pi",
    "ScaleControl.Meters": "m",
    "ScaleControl.Kilometers": "km",
    "ScaleControl.Miles": "mi",
    "ScaleControl.NauticalMiles": "mn",
    "TerrainControl.Enable": "Activer le relief",
    "TerrainControl.Disable": "Désactiver le relief"
  };

  function applyMapControlLocale(lang) {
    if (typeof map._getUIString !== "function") return;
    map._locale = Object.assign({}, lang === "fr" ? NATIVE_LOCALE_FR : NATIVE_LOCALE_EN);

    // GlobeControl and the popup close button re-read map._locale on their
    // own (on the next projection toggle / popup update), so they pick up
    // the new language automatically. NavigationControl sets its button
    // titles once at creation time, so those need a manual refresh here.
    const zoomInBtn = document.querySelector(".maplibregl-ctrl-zoom-in");
    const zoomOutBtn = document.querySelector(".maplibregl-ctrl-zoom-out");
    const compassBtn = document.querySelector(".maplibregl-ctrl-compass");
    if (zoomInBtn) {
      const txt = map._getUIString("NavigationControl.ZoomIn");
      zoomInBtn.title = txt; zoomInBtn.setAttribute("aria-label", txt);
    }
    if (zoomOutBtn) {
      const txt = map._getUIString("NavigationControl.ZoomOut");
      zoomOutBtn.title = txt; zoomOutBtn.setAttribute("aria-label", txt);
    }
    if (compassBtn) {
      const txt = map._getUIString("NavigationControl.ResetBearing");
      compassBtn.title = txt; compassBtn.setAttribute("aria-label", txt);
    }
    const globeBtn = document.querySelector(".maplibregl-ctrl-globe, .maplibregl-ctrl-globe-enabled");
    if (globeBtn) {
      const key = globeBtn.classList.contains("maplibregl-ctrl-globe-enabled") ? "GlobeControl.Disable" : "GlobeControl.Enable";
      globeBtn.title = map._getUIString(key);
    }
  }

  // ---- EN/FR toggle button, stacked under the globe control ----
  let langToggleButton = null;

  function updateLangToggleButton() {
    if (!langToggleButton) return;
    const showsFrenchOption = currentLang === "en";
    langToggleButton.textContent = showsFrenchOption ? "FR" : "EN";
    const label = showsFrenchOption ? "Switch to French" : "Revenir à l'anglais";
    langToggleButton.title = label;
    langToggleButton.setAttribute("aria-label", label);
  }

  class LanguageToggleControl {
    onAdd(mapInstance) {
      this._map = mapInstance;
      this._container = document.createElement("div");
      this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
      this._button = document.createElement("button");
      this._button.type = "button";
      this._button.style.fontSize = "11px";
      this._button.style.fontWeight = "700";
      this._button.style.fontFamily = "inherit";
      this._button.style.color = "#333";
      this._button.style.lineHeight = "29px";
      this._button.style.textAlign = "center";
      this._button.addEventListener("click", () => {
        applyLanguage(currentLang === "en" ? "fr" : "en");
      });
      this._container.appendChild(this._button);
      langToggleButton = this._button;
      updateLangToggleButton();
      return this._container;
    }
    onRemove() {
      if (this._container && this._container.parentNode) {
        this._container.parentNode.removeChild(this._container);
      }
      if (langToggleButton === this._button) langToggleButton = null;
      this._map = undefined;
    }
  }

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
  if (typeof maplibregl.GlobeControl === "function") {
    map.addControl(new maplibregl.GlobeControl(), "top-right");
  }
  map.addControl(new LanguageToggleControl(), "top-right");
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
    const qPart = currentLang === "fr" ? key.slice(4).replace("Q", "T") : key.slice(4);
    return key.slice(0, 4) + " " + qPart; // '2019Q3' -> '2019 Q3' ('2019 T3' in French)
  }
  function quarterKeyDisplay(key) {
    return currentLang === "fr" ? key.replace("Q", "T") : key;
  }
  function currentDomain() {
    return state.real ? currentMetric().domain.real : currentMetric().domain.nominal;
  }
  function formatMetricValue(val) {
    return formatValueForMetric(state.metric, val);
  }
  function formatValueForMetric(mkey, val) {
    if (val == null) return T("noData");
    const txt = fmtCurrencyFull[currentLang].format(val);
    return mkey === "monthlyPayment" ? txt + T("perMonthSuffix") : txt;
  }
  function valueAt(metric, id, granularity, real, key) {
    const fld = granularity === "quarter" ? (real ? "realQ" : "nominalQ") : (real ? "realY" : "nominalY");
    return metric.geographies[id][fld][key];
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

    // Reserve room for the floating left control panel. The right-hand
    // detail panel is a real layout sidebar (see #mapWrap/#detailPanel in
    // the HTML), so it shrinks the map's own container when open rather
    // than overlapping it — no extra padding needed for it here.
    map.fitBounds(ONTARIO_BOUNDS, { padding: { top: 40, bottom: 40, left: 360, right: 40 }, duration: 0 });

    initControls();
    render();
    initInteractions();
    applyLanguage(currentLang); // sync all UI text now that the panel/data exist
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
      updateLegend(domain);
    }

    document.getElementById("periodLabel").textContent = periodLabel(key);
    document.getElementById("periodSub").textContent = state.real ? T("realDollars") : T("nominalDollars");

    const slider = document.getElementById("periodSlider");
    const list = periodList();
    slider.max = String(list.length - 1);
    slider.value = String(state.periodIndex);
    document.getElementById("rangeStart").textContent = periodLabel(list[0]);
    document.getElementById("rangeEnd").textContent = periodLabel(list[list.length - 1]);

    refreshSelection();
  }

  function updateLegend(domain) {
    const grad = "linear-gradient(to right, " + RAMP.join(",") + ")";
    document.getElementById("legendGradient").style.background = grad;
    const suffix = state.metric === "monthlyPayment" ? T("perMonthSuffixTight") : "";
    document.getElementById("legendMin").textContent = fmtCurrencyCompact[currentLang].format(domain[0]) + suffix;
    document.getElementById("legendMax").textContent = fmtCurrencyCompact[currentLang].format(domain[1]) + suffix;
    document.getElementById("legendTitle").textContent = metricLabel(state.metric);
  }

  // ---------------------------------------------------------------
  // Language toggle: applies translated text across the whole page
  // ---------------------------------------------------------------
  function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.title = T("pageTitle");

    const subtitleEl = document.getElementById("subtitleText");
    if (subtitleEl) subtitleEl.textContent = T("subtitle");

    const metricSeg = document.getElementById("metricSeg");
    if (metricSeg) {
      const loanBtn = metricSeg.querySelector('[data-val="loanValue"]');
      const payBtn = metricSeg.querySelector('[data-val="monthlyPayment"]');
      if (loanBtn) loanBtn.textContent = T("metricLoanValue");
      if (payBtn) payBtn.textContent = T("metricMonthlyPayment");
    }

    const granSeg = document.getElementById("granularitySeg");
    if (granSeg) {
      const qBtn = granSeg.querySelector('[data-val="quarter"]');
      const yBtn = granSeg.querySelector('[data-val="year"]');
      if (qBtn) qBtn.textContent = T("granularityQuarterly");
      if (yBtn) yBtn.textContent = T("granularityYearly");
    }

    const slider = document.getElementById("periodSlider");
    if (slider) slider.setAttribute("aria-label", T("sliderAriaLabel"));

    updatePlayButtonLabel();

    const inflationLabelEl = document.getElementById("inflationLabel");
    if (inflationLabelEl) inflationLabelEl.textContent = T("inflationLabel");
    const inflationHintEl = document.getElementById("inflationHint");
    if (inflationHintEl) inflationHintEl.textContent = T("inflationHint");

    const nodataTextEl = document.getElementById("nodataText");
    if (nodataTextEl) nodataTextEl.textContent = T("nodataText");

    const sourceNoteEl = document.getElementById("source-note");
    if (sourceNoteEl) sourceNoteEl.textContent = T("sourceNote");

    const detailCloseEl = document.getElementById("detailClose");
    if (detailCloseEl) {
      detailCloseEl.title = T("detailCloseTitle");
      detailCloseEl.setAttribute("aria-label", T("detailCloseTitle"));
    }

    if (DATA) {
      document.getElementById("panelTitle").textContent = metricLabel(state.metric);
      lastColorKey = null; // force the legend title/min/max to re-render in the new language
      render(); // refreshes legend text, period label/units, and (via refreshSelection) any open popup/detail panel
    }

    updateLangToggleButton();
    applyMapControlLocale(lang);
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
        document.getElementById("panelTitle").textContent = metricLabel(state.metric);
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

  function updatePlayButtonLabel() {
    const btn = document.getElementById("playBtn");
    if (!btn) return;
    const label = state.playing ? T("pauseTitle") : T("playTitle");
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  function togglePlay() {
    if (state.playing) { stopPlaying(); return; }
    state.playing = true;
    document.getElementById("playBtn").textContent = "❚❚";
    updatePlayButtonLabel();
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
    updatePlayButtonLabel();
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
      // The detail panel is a real layout sidebar outside the map
      // container (see #mapWrap), so the container's own width already
      // excludes it — no popup-position hack needed here.
      const cmaHits = map.queryRenderedFeatures(e.point, { layers: ["cma-fill"] });
      if (cmaHits.length) {
        const id = String(cmaHits[0].properties.CMAUID);
        selectGeography("cma", id, e.lngLat);
        return;
      }
      const provHits = map.queryRenderedFeatures(e.point, { layers: ["province-fill"] });
      if (provHits.length) {
        selectGeography("province", "ON", e.lngLat);
        return;
      }
      closeSelection();
    });

    document.getElementById("detailClose").addEventListener("click", closeSelection);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ---------------------------------------------------------------
  // Selection (popup + right-hand detail panel), kept live across
  // slider moves, play ticks, and toggle changes.
  // ---------------------------------------------------------------
  let selected = null; // { kind: 'cma' | 'province', id }
  let activePopup = null;
  let suppressPopupClose = false;

  function destroyPopup() {
    if (activePopup) {
      suppressPopupClose = true;
      activePopup.remove();
      suppressPopupClose = false;
      activePopup = null;
    }
  }

  function closeSelection() {
    destroyPopup();
    selected = null;
    hideDetailPanel();
  }

  function selectGeography(kind, id, lngLat) {
    destroyPopup();
    selected = { kind, id };
    activePopup = new maplibregl.Popup({
      className: "mm-popup",
      closeOnClick: false,
      maxWidth: kind === "cma" ? "260px" : "270px"
    })
      .setLngLat(lngLat)
      .setHTML(popupHTML(kind, id))
      .addTo(map);
    activePopup.on("close", () => {
      if (suppressPopupClose) return;
      selected = null;
      activePopup = null;
      hideDetailPanel();
    });
    showDetailPanel(kind, id);
  }

  function refreshSelection() {
    if (!selected || !DATA) return;
    if (activePopup) activePopup.setHTML(popupHTML(selected.kind, selected.id));
    updateDetailPanelContent(selected.kind, selected.id);
  }

  function provinceNoteText(mkey) {
    const label = metricLabel(mkey);
    const paren = state.real ? T("realParenthetical") : T("nominalParenthetical");
    if (currentLang === "fr") {
      return label + " à l'échelle de l'Ontario (" + paren + ")";
    }
    const lower = label.charAt(0).toLowerCase() + label.slice(1);
    return "Ontario-wide " + lower + " (" + paren + ")";
  }

  function popupHTML(kind, id) {
    const key = currentPeriodKey();
    const field = fieldName();
    const label = periodLabel(key);
    const metric = currentMetric();
    const dmTxt = state.real ? T("realParenthetical") : T("nominalParenthetical");

    if (kind === "cma") {
      const geo = metric.geographies[id];
      const val = geo[field][key];
      return (
        '<h3>' + escapeHtml(geo.name) + '</h3>' +
        '<div class="mm-period">' + escapeHtml(label) + '</div>' +
        '<div class="mm-value">' + formatMetricValue(val) + '</div>' +
        '<div class="mm-note">' + escapeHtml(metricLabel(state.metric)) + ' (' + escapeHtml(dmTxt) + ')</div>'
      );
    }

    const val = metric.geographies.ON[field][key];
    return (
      '<h3>' + escapeHtml(T("provinceHeading")) + '</h3>' +
      '<p class="mm-warn">' + escapeHtml(T("provinceWarning")) + '</p>' +
      '<div class="mm-period">' + escapeHtml(label) + '</div>' +
      '<div class="mm-value">' + formatMetricValue(val) + '</div>' +
      '<div class="mm-note">' + escapeHtml(provinceNoteText(state.metric)) + '</div>'
    );
  }

  // ---------------------------------------------------------------
  // Right-hand detail panel: all data (both metrics, both
  // granularities) for the selected geography.
  // ---------------------------------------------------------------
  function showDetailPanel(kind, id) {
    document.getElementById("detailPanel").classList.add("visible");
    updateDetailPanelContent(kind, id);
    requestAnimationFrame(() => map.resize());
  }
  function hideDetailPanel() {
    document.getElementById("detailPanel").classList.remove("visible");
    requestAnimationFrame(() => map.resize());
  }

  function sparkline(values, opts) {
    const w = opts.width || 288;
    const h = opts.height || 46;
    const pad = 4;
    const n = values.length;
    const finite = values.filter((v) => v != null);
    if (!finite.length || n < 2) {
      return '<svg class="spark" width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"></svg>';
    }
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const span = max - min || 1;
    const stepX = (w - pad * 2) / (n - 1);

    let path = "";
    let drawing = false;
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v == null) { drawing = false; continue; }
      const x = pad + i * stepX;
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      path += (drawing ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
      drawing = true;
    }

    let marker = "";
    const hi = opts.highlightIndex;
    if (hi != null && hi >= 0 && hi < n && values[hi] != null) {
      const x = pad + hi * stepX;
      const y = pad + (1 - (values[hi] - min) / span) * (h - pad * 2);
      marker = '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="#0d366b" stroke="#fff" stroke-width="1.5"/>';
    }

    return (
      '<svg class="spark" width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<path d="' + path.trim() + '" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      marker +
      '</svg>'
    );
  }

  function updateDetailPanelContent(kind, id) {
    if (!DATA) return;
    const key = currentPeriodKey();
    const label = periodLabel(key);
    const yearOfKey = key.slice(0, 4);
    const name = kind === "province" ? T("provinceHeading") : DATA.metrics.loanValue.geographies[id].name;

    document.getElementById("detailTitle").textContent = name;
    document.getElementById("detailSub").textContent = label + " · " + (state.real ? T("realDollars") : T("nominalDollars"));
    document.getElementById("detailNote").textContent = kind === "province" ? T("provinceDetailNote") : "";

    const quarterHighlightIndex = state.granularity === "quarter" ? DATA.quarters.indexOf(key) : null;
    const yearHighlightIndex = DATA.years.indexOf(yearOfKey);

    let html = "";
    ["loanValue", "monthlyPayment"].forEach((mkey) => {
      const metric = DATA.metrics[mkey];
      const geo = metric.geographies[id];
      const curVal = valueAt(metric, id, state.granularity, state.real, key);
      const altVal = valueAt(metric, id, state.granularity, !state.real, key);
      const altLabel = state.real ? T("altNominal") : T("altReal");

      const qSeries = DATA.quarters.map((q) => geo[state.real ? "realQ" : "nominalQ"][q]);
      const ySeries = DATA.years.map((y) => geo[state.real ? "realY" : "nominalY"][y]);

      const qStart = quarterKeyDisplay(DATA.quarters[0]);
      const qEnd = quarterKeyDisplay(DATA.quarters[DATA.quarters.length - 1]);

      html +=
        '<div class="metric-block">' +
          '<div class="metric-block-title">' + escapeHtml(metricLabel(mkey)) + '</div>' +
          '<div class="metric-current">' +
            '<span class="mc-value">' + formatValueForMetric(mkey, curVal) + '</span>' +
            (altVal == null ? "" : '<span class="mc-alt">(' + formatValueForMetric(mkey, altVal) + " " + escapeHtml(altLabel) + ')</span>') +
          '</div>' +
          '<div class="chart-block">' +
            '<div class="chart-label">' + escapeHtml(T("quarterlyChartLabel")) + ', ' + qStart + '–' + qEnd + '</div>' +
            sparkline(qSeries, { highlightIndex: quarterHighlightIndex }) +
          '</div>' +
          '<div class="chart-block">' +
            '<div class="chart-label">' + escapeHtml(T("yearlyChartLabel")) + ', ' + DATA.years[0] + '–' + DATA.years[DATA.years.length - 1] + '</div>' +
            sparkline(ySeries, { highlightIndex: yearHighlightIndex }) +
          '</div>' +
        '</div>';
    });

    document.getElementById("detailBody").innerHTML = html;
  }
})();
