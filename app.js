const STORAGE_KEY = "crypto-calendar-events-v1";
const NOTES_STORAGE_KEY = "crypto-calendar-notes-v1";
const MEXC_STORAGE_KEY = "crypto-calendar-mexc-config-v2";
const MEXC_SESSION_KEY = "crypto-calendar-mexc-session-v2";
const FAVORITES_STORAGE_KEY = "crypto-calendar-favorites-v1";
const ALERTS_STORAGE_KEY = "crypto-calendar-alerts-v1";
const SYMBOL_JOURNAL_STORAGE_KEY = "crypto-calendar-symbol-journal-v1";
const WATCHLISTS_STORAGE_KEY = "crypto-calendar-watchlists-v1";
const GOALS_STORAGE_KEY = "crypto-calendar-goals-v1";
const HABITS_STORAGE_KEY = "crypto-calendar-habits-v1";
const API_BASE_URL = window.location.origin;
const MEXC_MARKET_WS_URL = "wss://wbs-api.mexc.com/ws";
const DEFAULT_FIAT_CURRENCY = "PHP";
const DEFAULT_USDT_TO_PHP_RATE = 56;
const LEGACY_DEMO_NOTES = new Set([
  "Funding wallet top-up",
  "Spot buy during retrace",
  "Momentum scalp",
  "Moved to cold wallet",
  "Transferred between sub-accounts",
  "Swing entry after breakout",
]);

const state = {
  currentMonth: new Date(),
  selectedDate: formatDateKey(new Date()),
  events: loadEvents().filter((entry) => entry.type === "trade"),
  notesByDate: loadNotes(),
  pricesBySymbol: {},
  openPositions: [],
  markets: [],
  marketType: "spot",
  marketView: "spot",
  favorites: loadFavorites(),
  alerts: loadAlerts(),
  symbolJournal: loadSymbolJournal(),
  watchlists: loadWatchlists(),
  goals: loadGoals(),
  habitsByDate: loadHabits(),
  selectedWatchlist: "all",
  filters: {
    symbol: "",
    side: "all",
    result: "all",
    marketType: "all",
    startDate: "",
    endDate: "",
  },
  replayIndexByDate: {},
  tradeHistorySort: {
    key: "executedAt",
    direction: "desc",
  },
  currentWindow: "overview",
  currentSidebarPane: "day",
  user: null,
  profileLoaded: false,
  chartZoom: 1,
  chartOffset: 0,
  chartHoverIndex: -1,
  chartVisibleSeries: [],
  calendarHeatmapMode: false,
  activeDrawerSymbol: "",
  fiatCurrency: DEFAULT_FIAT_CURRENCY,
  usdtToPhpRate: DEFAULT_USDT_TO_PHP_RATE,
};

const monthLabel = document.getElementById("monthLabel");
const overviewWindowTab = document.getElementById("overviewWindowTab");
const marketsWindowTab = document.getElementById("marketsWindowTab");
const overviewWindow = document.getElementById("overviewWindow");
const marketsWindow = document.getElementById("marketsWindow");
const sidebar = document.getElementById("sidebar");
const sidebarTabDay = document.getElementById("sidebarTabDay");
const sidebarTabNotes = document.getElementById("sidebarTabNotes");
const sidebarTabMexc = document.getElementById("sidebarTabMexc");
const sidebarTabAi = document.getElementById("sidebarTabAi");
const sidebarTabImport = document.getElementById("sidebarTabImport");
const sidebarPaneDay = document.getElementById("sidebarPaneDay");
const sidebarPaneNotes = document.getElementById("sidebarPaneNotes");
const sidebarPaneMexc = document.getElementById("sidebarPaneMexc");
const sidebarPaneAi = document.getElementById("sidebarPaneAi");
const sidebarPaneImport = document.getElementById("sidebarPaneImport");
const mobileDockOverview = document.getElementById("mobileDockOverview");
const mobileDockMarkets = document.getElementById("mobileDockMarkets");
const mobileDockDay = document.getElementById("mobileDockDay");
const mobileDockMexc = document.getElementById("mobileDockMexc");
const mobileDockAi = document.getElementById("mobileDockAi");
const onboardingModal = document.getElementById("onboardingModal");
const onboardingBackdrop = document.getElementById("onboardingBackdrop");
const closeOnboardingButton = document.getElementById("closeOnboardingButton");
const startOnboardingButton = document.getElementById("startOnboardingButton");
const skipOnboardingButton = document.getElementById("skipOnboardingButton");
const calendarGrid = document.getElementById("calendarGrid");
const weekdayRow = document.getElementById("weekdayRow");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const selectedDateEvents = document.getElementById("selectedDateEvents");
const selectedDateTotal = document.getElementById("selectedDateTotal");
const syncStatus = document.getElementById("syncStatus");
const dayNoteForm = document.getElementById("dayNoteForm");
const jsonInput = document.getElementById("jsonInput");
const mexcForm = document.getElementById("mexcForm");
const marketSymbolInput = document.getElementById("marketSymbolInput");
const marketIntervalSelect = document.getElementById("marketIntervalSelect");
const loadChartButton = document.getElementById("loadChartButton");
const useMexcSymbolsButton = document.getElementById("useMexcSymbolsButton");
const toggleLiveChartButton = document.getElementById("toggleLiveChartButton");
const marketSymbolChips = document.getElementById("marketSymbolChips");
const marketSearchInput = document.getElementById("marketSearchInput");
const marketListStatus = document.getElementById("marketListStatus");
const marketList = document.getElementById("marketList");
const marketTabFavorites = document.getElementById("marketTabFavorites");
const marketTabSpot = document.getElementById("marketTabSpot");
const marketTabFutures = document.getElementById("marketTabFutures");
const marketTabGainers = document.getElementById("marketTabGainers");
const marketTabLosers = document.getElementById("marketTabLosers");
const marketTabVolume = document.getElementById("marketTabVolume");
const favoriteCurrentSymbolButton = document.getElementById("favoriteCurrentSymbolButton");
const addAlertButton = document.getElementById("addAlertButton");
const marketChartStatus = document.getElementById("marketChartStatus");
const marketChartTitle = document.getElementById("marketChartTitle");
const marketChartMeta = document.getElementById("marketChartMeta");
const marketChartPrice = document.getElementById("marketChartPrice");
const mobileTradeSymbol = document.getElementById("mobileTradeSymbol");
const mobileTradeMeta = document.getElementById("mobileTradeMeta");
const mobileTradePrice = document.getElementById("mobileTradePrice");
const mobileTradeChange = document.getElementById("mobileTradeChange");
const marketChartLiveBadge = document.getElementById("marketChartLiveBadge");
const marketChartCanvas = document.getElementById("marketChartCanvas");
const calendarModeButton = document.getElementById("calendarModeButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const resetViewButton = document.getElementById("resetViewButton");
const enableNotificationsButton = document.getElementById("enableNotificationsButton");
const watchlistSelect = document.getElementById("watchlistSelect");
const watchlistNameInput = document.getElementById("watchlistNameInput");
const createWatchlistButton = document.getElementById("createWatchlistButton");
const saveCurrentToWatchlistButton = document.getElementById("saveCurrentToWatchlistButton");
const deleteWatchlistButton = document.getElementById("deleteWatchlistButton");
const openChartModalButton = document.getElementById("openChartModalButton");
const chartModal = document.getElementById("chartModal");
const chartModalBackdrop = document.getElementById("chartModalBackdrop");
const closeChartModalButton = document.getElementById("closeChartModalButton");
const chartModalTitle = document.getElementById("chartModalTitle");
const chartModalCanvas = document.getElementById("chartModalCanvas");
const symbolDrawer = document.getElementById("symbolDrawer");
const symbolDrawerBackdrop = document.getElementById("symbolDrawerBackdrop");
const closeSymbolDrawerButton = document.getElementById("closeSymbolDrawerButton");
const symbolDrawerTitle = document.getElementById("symbolDrawerTitle");
const symbolDrawerStats = document.getElementById("symbolDrawerStats");
const symbolDrawerJournal = document.getElementById("symbolDrawerJournal");
const symbolDrawerOpenChartButton = document.getElementById("symbolDrawerOpenChartButton");
const symbolDrawerAddAlertButton = document.getElementById("symbolDrawerAddAlertButton");
const symbolDrawerSaveWatchlistButton = document.getElementById("symbolDrawerSaveWatchlistButton");
const equityCurveCanvas = document.getElementById("equityCurveCanvas");
const dailyPnlCanvas = document.getElementById("dailyPnlCanvas");
const monthlyReviewGrid = document.getElementById("monthlyReviewGrid");
const symbolPnlTable = document.getElementById("symbolPnlTable");
const tradeHistoryTable = document.getElementById("tradeHistoryTable");
const riskMetricsGrid = document.getElementById("riskMetricsGrid");
const insightsGrid = document.getElementById("insightsGrid");
const symbolPerformanceTable = document.getElementById("symbolPerformanceTable");
const tradeReplayPanel = document.getElementById("tradeReplayPanel");
const filterSymbolInput = document.getElementById("filterSymbolInput");
const filterSideSelect = document.getElementById("filterSideSelect");
const filterResultSelect = document.getElementById("filterResultSelect");
const filterMarketTypeSelect = document.getElementById("filterMarketTypeSelect");
const filterStartDateInput = document.getElementById("filterStartDateInput");
const filterEndDateInput = document.getElementById("filterEndDateInput");
const clearFiltersButton = document.getElementById("clearFiltersButton");
const goalsForm = document.getElementById("goalsForm");
const goalMonthlyPnlInput = document.getElementById("goalMonthlyPnlInput");
const goalMaxLossInput = document.getElementById("goalMaxLossInput");
const goalMaxTradesInput = document.getElementById("goalMaxTradesInput");
const habitTagSelect = document.getElementById("habitTagSelect");
const saveHabitButton = document.getElementById("saveHabitButton");
const goalsStatus = document.getElementById("goalsStatus");
const habitSummary = document.getElementById("habitSummary");
const exportCsvButton = document.getElementById("exportCsvButton");
const exportJsonButton = document.getElementById("exportJsonButton");
const printReportButton = document.getElementById("printReportButton");
const runMonthlyAiReviewButton = document.getElementById("runMonthlyAiReviewButton");
const monthlyAiStatus = document.getElementById("monthlyAiStatus");
const monthlyAiResult = document.getElementById("monthlyAiResult");
const chartHoverInfo = document.getElementById("chartHoverInfo");
const indicatorVolume = document.getElementById("indicatorVolume");
const indicatorEma20 = document.getElementById("indicatorEma20");
const indicatorEma50 = document.getElementById("indicatorEma50");
const miniChartsGrid = document.getElementById("miniChartsGrid");
const symbolAnalytics = document.getElementById("symbolAnalytics");
const alertForm = document.getElementById("alertForm");
const alertsList = document.getElementById("alertsList");
const alertSymbolInput = document.getElementById("alertSymbolInput");
const alertPriceInput = document.getElementById("alertPriceInput");
const alertCurrencyHint = document.getElementById("alertCurrencyHint");
const symbolJournalForm = document.getElementById("symbolJournalForm");
const symbolJournalSymbol = document.getElementById("symbolJournalSymbol");
const symbolJournalNotes = document.getElementById("symbolJournalNotes");
const analyzeLiveChartButton = document.getElementById("analyzeLiveChartButton");
const aiChartForm = document.getElementById("aiChartForm");
const chartImageInput = document.getElementById("chartImageInput");
const chartContextInput = document.getElementById("chartContextInput");
const chartPreviewWrap = document.getElementById("chartPreviewWrap");
const chartPreviewImage = document.getElementById("chartPreviewImage");
const aiChartStatus = document.getElementById("aiChartStatus");
const aiChartResult = document.getElementById("aiChartResult");
const installAppButton = document.getElementById("installAppButton");
const fieldToggles = document.querySelectorAll(".field-toggle");
const loginGate = document.getElementById("loginGate");
const appShell = document.getElementById("appShell");
const loginStatus = document.getElementById("loginStatus");
const googleButton = document.getElementById("googleButton");
const userEmail = document.getElementById("userEmail");
const statUnrealizedPnl = document.getElementById("statUnrealizedPnl");
const statUnrealizedPnlSub = document.getElementById("statUnrealizedPnlSub");
const statRealizedPnl = document.getElementById("statRealizedPnl");
const statRealizedPnlSub = document.getElementById("statRealizedPnlSub");
const statTradeCount = document.getElementById("statTradeCount");
const statTradeCountSub = document.getElementById("statTradeCountSub");
const statWinRate = document.getElementById("statWinRate");
const statWinRateSub = document.getElementById("statWinRateSub");
const statBestDay = document.getElementById("statBestDay");
const statBestDaySub = document.getElementById("statBestDaySub");
const statWorstDay = document.getElementById("statWorstDay");
const statWorstDaySub = document.getElementById("statWorstDaySub");
const statMonthPnl = document.getElementById("statMonthPnl");
const statMonthPnlSub = document.getElementById("statMonthPnlSub");
const openPositionsList = document.getElementById("openPositionsList");
const portfolioSnapshotGrid = document.getElementById("portfolioSnapshotGrid");
const portfolioHoldingsList = document.getElementById("portfolioHoldingsList");
const portfolioRateLabel = document.getElementById("portfolioRateLabel");
const phpRateStatus = document.getElementById("phpRateStatus");
const refreshPhpRateButton = document.getElementById("refreshPhpRateButton");
let dashboardInitialized = false;
let marketChartTimer = null;
let marketChartLiveEnabled = true;
let marketChartRefreshMs = 5000;
let marketChartRequestId = 0;
let marketChartSocket = null;
let marketChartPingTimer = null;
let marketChartReconnectTimer = null;
let marketChartSeries = [];
let marketChartHoverBound = false;
let marketChartDragState = null;
let profileSaveTimer = null;
let installPromptEvent = null;
const DEFAULT_MARKET_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "BNBUSDT"];

bootstrap();

overviewWindowTab?.addEventListener("click", () => switchMainWindow("overview"));
marketsWindowTab?.addEventListener("click", () => switchMainWindow("markets"));
sidebarTabDay?.addEventListener("click", () => switchSidebarPane("day"));
sidebarTabNotes?.addEventListener("click", () => switchSidebarPane("notes"));
sidebarTabMexc?.addEventListener("click", () => switchSidebarPane("mexc"));
sidebarTabAi?.addEventListener("click", () => switchSidebarPane("ai"));
sidebarTabImport?.addEventListener("click", () => switchSidebarPane("import"));
mobileDockOverview?.addEventListener("click", () => switchMainWindow("overview"));
mobileDockMarkets?.addEventListener("click", () => switchMainWindow("markets"));
mobileDockDay?.addEventListener("click", () => {
  switchMainWindow("overview");
  switchSidebarPane("day");
  scrollSidebarIntoView();
});
mobileDockMexc?.addEventListener("click", () => {
  switchSidebarPane("mexc");
  scrollSidebarIntoView();
});
mobileDockAi?.addEventListener("click", () => {
  switchSidebarPane("ai");
  scrollSidebarIntoView();
});
mobileTradeSymbol?.addEventListener("click", () => openSymbolDrawer(String(marketSymbolInput?.value || "").trim().toUpperCase()));
mobileTradePrice?.addEventListener("click", () => openSymbolDrawer(String(marketSymbolInput?.value || "").trim().toUpperCase()));
onboardingBackdrop?.addEventListener("click", closeOnboarding);
closeOnboardingButton?.addEventListener("click", closeOnboarding);
startOnboardingButton?.addEventListener("click", () => {
  closeOnboarding();
  switchSidebarPane("mexc");
  scrollSidebarIntoView();
});
skipOnboardingButton?.addEventListener("click", completeOnboarding);

document.getElementById("prevMonthButton").addEventListener("click", () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderStats();
  renderCalendar();
  renderPerformanceCharts();
});

document.getElementById("nextMonthButton").addEventListener("click", () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderStats();
  renderCalendar();
  renderPerformanceCharts();
});

document.getElementById("todayButton").addEventListener("click", () => {
  state.currentMonth = new Date();
  state.selectedDate = formatDateKey(new Date());
  renderStats();
  renderCalendar();
  renderSelectedDate();
  hydrateDayNoteForm();
  renderPerformanceCharts();
});

document.getElementById("resetButton").addEventListener("click", () => {
  state.events = [];
  persistEvents();
  renderStats();
  renderCalendar();
  renderSelectedDate();
  renderSymbolAnalytics();
  renderMiniCharts();
  renderPerformanceCharts();
  syncStatus.textContent = "Local calendar data cleared on this browser.";
});

document.getElementById("importButton").addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON must be an array");
    }

    const normalized = parsed.map(normalizeEvent);
    state.events = [...state.events, ...normalized];
    recalculateRealizedPnl();
    persistEvents();
    jsonInput.value = "";
    renderStats();
    renderCalendar();
    renderSelectedDate();
    renderSymbolAnalytics();
    renderMiniCharts();
    renderPerformanceCharts();
    syncStatus.textContent = `Imported ${normalized.length} activities into your calendar.`;
  } catch (error) {
    syncStatus.textContent = `Import failed: ${error.message}`;
  }
});

dayNoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(dayNoteForm);
  const date = String(formData.get("date") || "").trim();
  const note = String(formData.get("notes") || "").trim();
  if (!date) {
    return;
  }

  if (note) {
    state.notesByDate[date] = note;
  } else {
    delete state.notesByDate[date];
  }

  persistNotes();
  renderCalendar();
  renderSelectedDate();
  syncStatus.textContent = note ? "Day note saved." : "Day note cleared.";
});
document.getElementById("clearNoteButton").addEventListener("click", clearSelectedDayNote);

document.getElementById("syncButton").addEventListener("click", syncMexc);
document.getElementById("clearKeysButton").addEventListener("click", clearMexcKeys);
document.getElementById("logoutButton").addEventListener("click", logout);
if (loadChartButton) {
  loadChartButton.addEventListener("click", loadMarketChart);
}
if (useMexcSymbolsButton) {
  useMexcSymbolsButton.addEventListener("click", useMexcSymbolsForChart);
}
if (toggleLiveChartButton) {
  toggleLiveChartButton.addEventListener("click", toggleLiveChart);
}
if (marketSearchInput) {
  marketSearchInput.addEventListener("input", renderMarketList);
}
marketTabFavorites?.addEventListener("click", () => switchMarketView("favorites"));
marketTabSpot?.addEventListener("click", () => switchMarketView("spot"));
marketTabFutures?.addEventListener("click", () => switchMarketView("futures"));
marketTabGainers?.addEventListener("click", () => switchMarketView("gainers"));
marketTabLosers?.addEventListener("click", () => switchMarketView("losers"));
marketTabVolume?.addEventListener("click", () => switchMarketView("volume"));
favoriteCurrentSymbolButton?.addEventListener("click", toggleCurrentFavorite);
addAlertButton?.addEventListener("click", seedAlertFormFromCurrentSymbol);
indicatorVolume?.addEventListener("change", redrawCurrentChart);
indicatorEma20?.addEventListener("change", redrawCurrentChart);
indicatorEma50?.addEventListener("change", redrawCurrentChart);
zoomInButton?.addEventListener("click", () => adjustChartZoom(1.25));
zoomOutButton?.addEventListener("click", () => adjustChartZoom(0.8));
resetViewButton?.addEventListener("click", resetChartViewport);
enableNotificationsButton?.addEventListener("click", enableAlertNotifications);
watchlistSelect?.addEventListener("change", handleWatchlistChange);
createWatchlistButton?.addEventListener("click", createWatchlistFolder);
saveCurrentToWatchlistButton?.addEventListener("click", saveCurrentSymbolToWatchlist);
deleteWatchlistButton?.addEventListener("click", deleteCurrentWatchlist);
filterSymbolInput?.addEventListener("input", handleFiltersChanged);
filterSideSelect?.addEventListener("change", handleFiltersChanged);
filterResultSelect?.addEventListener("change", handleFiltersChanged);
filterMarketTypeSelect?.addEventListener("change", handleFiltersChanged);
filterStartDateInput?.addEventListener("change", handleFiltersChanged);
filterEndDateInput?.addEventListener("change", handleFiltersChanged);
clearFiltersButton?.addEventListener("click", clearFilters);
chartImageInput.addEventListener("change", handleChartPreview);
openChartModalButton?.addEventListener("click", openChartModal);
chartModalBackdrop?.addEventListener("click", closeChartModal);
closeChartModalButton?.addEventListener("click", closeChartModal);
calendarModeButton?.addEventListener("click", toggleCalendarHeatmap);
symbolDrawerBackdrop?.addEventListener("click", closeSymbolDrawer);
closeSymbolDrawerButton?.addEventListener("click", closeSymbolDrawer);
symbolDrawerOpenChartButton?.addEventListener("click", () => {
  if (!state.activeDrawerSymbol) {
    return;
  }
  marketSymbolInput.value = state.activeDrawerSymbol;
  switchMainWindow("markets");
  closeSymbolDrawer();
  renderMarketList();
  renderMarketSymbolChips();
  loadMarketChart();
});
symbolDrawerAddAlertButton?.addEventListener("click", () => {
  if (!state.activeDrawerSymbol) {
    return;
  }
  alertSymbolInput.value = state.activeDrawerSymbol;
  seedAlertFormFromCurrentSymbol();
  switchSidebarPane("day");
  closeSymbolDrawer();
});
symbolDrawerSaveWatchlistButton?.addEventListener("click", () => {
  if (!state.activeDrawerSymbol) {
    return;
  }
  marketSymbolInput.value = state.activeDrawerSymbol;
  saveCurrentSymbolToWatchlist();
});
exportCsvButton?.addEventListener("click", exportTradesCsv);
exportJsonButton?.addEventListener("click", exportWorkspaceJson);
printReportButton?.addEventListener("click", () => window.print());
runMonthlyAiReviewButton?.addEventListener("click", runMonthlyAiReview);
installAppButton?.addEventListener("click", installPwaApp);
goalsForm?.addEventListener("submit", saveGoals);
saveHabitButton?.addEventListener("click", saveHabitTagForSelectedDate);
refreshPhpRateButton?.addEventListener("click", () => {
  fetchLivePhpRate(true);
});
fieldToggles.forEach((button) => {
  button.addEventListener("click", () => toggleSecretField(button));
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
  installAppButton?.classList.remove("is-hidden");
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
  installAppButton?.classList.add("is-hidden");
});

mexcForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const config = readMexcForm();
  persistMexcConfig(config);
  applyCurrencyPreferences(config);
  renderMarketSymbolChips();
  renderMarketList();
  renderStats();
  renderCalendar();
  renderSelectedDate();
  renderOpenPositions();
  renderSymbolAnalytics();
  renderPerformanceCharts();
  renderMiniCharts();
  renderMarketChartSummary();
  syncStatus.textContent = config.apiKey
    ? `${config.rememberKeys ? "MEXC keys remembered on this device." : "MEXC keys saved for this browser session only."} Money values now display in pesos.`
    : "Saved with empty keys. Add keys before syncing. Money values will display in pesos.";
});

aiChartForm.addEventListener("submit", analyzeChartScreenshot);
alertForm?.addEventListener("submit", saveAlert);
symbolJournalForm?.addEventListener("submit", saveSymbolJournal);
document.getElementById("clearSymbolJournalButton")?.addEventListener("click", clearSymbolJournal);
analyzeLiveChartButton?.addEventListener("click", analyzeCurrentChartCanvas);
document.addEventListener("visibilitychange", handleChartVisibilityChange);

function renderWeekdays() {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  weekdayRow.innerHTML = weekdays.map((day) => `<div class="weekday-cell">${day}</div>`).join("");
}

async function bootstrap() {
  registerServiceWorker();
  hydrateMexcForm();
  applyCurrencyPreferences(loadMexcConfig());
  setDefaultSyncRange();
  window.setTimeout(() => document.getElementById("appSplash")?.classList.add("is-hidden"), 700);
  const session = await restoreSession();

  if (session?.authenticated) {
    state.user = session.user || null;
    showAuthenticatedApp(session.user);
    await hydrateCloudProfile();
    initializeDashboard();
    return;
  }

  showLoginGate();
  initializeGoogleLogin();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch {
    // Ignore registration failures in unsupported or restricted environments.
  }
}

async function installPwaApp() {
  if (!installPromptEvent) {
    syncStatus.textContent = "On iPhone, use Share then Add to Home Screen. On Android, use your browser install option if it appears.";
    return;
  }

  installPromptEvent.prompt();
  const choice = await installPromptEvent.userChoice.catch(() => null);
  if (choice?.outcome === "accepted") {
    installAppButton?.classList.add("is-hidden");
  }
  installPromptEvent = null;
}

function initializeDashboard() {
  if (dashboardInitialized) {
    return;
  }

  dashboardInitialized = true;
  recalculateRealizedPnl();
  renderWeekdays();
  renderStats();
  renderCalendar();
  renderSelectedDate();
  hydrateDayNoteForm();
  renderWatchlistOptions();
  hydrateGoalsForm();
  renderMarketSymbolChips();
  updateLiveChartUi();
  renderMarketChartSummary();
  updateMobileTradeBar();
  updateAlertCurrencyHint();
  hydrateSymbolJournal();
  renderAlerts();
  renderPortfolioSnapshot();
  renderSymbolAnalytics();
  renderMiniCharts();
  renderPerformanceCharts();
  renderHabitSummary();
  renderTradeReplay();
  loadMarketCatalog();
  loadMarketChart();
  fetchLivePhpRate(false);
  switchMainWindow(state.currentWindow || "overview");
  switchSidebarPane(state.currentSidebarPane || "day");
  if (!state.goals.onboardingCompleted) {
    openOnboarding();
  }
}

function switchMainWindow(view) {
  state.currentWindow = view;
  const isOverview = view === "overview";
  overviewWindow?.classList.toggle("is-active", isOverview);
  marketsWindow?.classList.toggle("is-active", !isOverview);
  overviewWindowTab.className = isOverview ? "button button-primary" : "button button-ghost";
  marketsWindowTab.className = isOverview ? "button button-ghost" : "button button-primary";
  updateMobileDockState();
  scheduleProfileSave();
}

function switchSidebarPane(view) {
  state.currentSidebarPane = view;
  const paneMap = {
    day: [sidebarTabDay, sidebarPaneDay],
    notes: [sidebarTabNotes, sidebarPaneNotes],
    mexc: [sidebarTabMexc, sidebarPaneMexc],
    ai: [sidebarTabAi, sidebarPaneAi],
    import: [sidebarTabImport, sidebarPaneImport],
  };

  Object.entries(paneMap).forEach(([key, pair]) => {
    const [tab, pane] = pair;
    const active = key === view;
    tab?.classList.toggle("button-primary", active);
    tab?.classList.toggle("button-ghost", !active);
    pane?.classList.toggle("is-active", active);
  });
  updateMobileDockState();
  scheduleProfileSave();
}

function updateMobileDockState() {
  mobileDockOverview?.classList.toggle("is-active", state.currentWindow === "overview");
  mobileDockMarkets?.classList.toggle("is-active", state.currentWindow === "markets");
  mobileDockDay?.classList.toggle("is-active", state.currentSidebarPane === "day");
  mobileDockMexc?.classList.toggle("is-active", state.currentSidebarPane === "mexc");
  mobileDockAi?.classList.toggle("is-active", state.currentSidebarPane === "ai");
}

function scrollSidebarIntoView() {
  sidebar?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openOnboarding() {
  onboardingModal?.classList.remove("is-hidden");
}

function closeOnboarding() {
  onboardingModal?.classList.add("is-hidden");
}

function completeOnboarding() {
  state.goals.onboardingCompleted = true;
  persistGoals();
  closeOnboarding();
}

function openChartModal() {
  if (!chartModal || !chartModalCanvas) {
    return;
  }

  chartModal.classList.remove("is-hidden");
  chartModalTitle.textContent = `${marketSymbolInput.value} ${marketIntervalSelect.value} Full Screen`;
  drawCandlesOnCanvas(chartModalCanvas, marketChartSeries, marketSymbolInput.value, marketIntervalSelect.value);
}

function closeChartModal() {
  chartModal?.classList.add("is-hidden");
}

function renderStats() {
  if (
    !statRealizedPnl ||
    !statRealizedPnlSub ||
    !statTradeCount ||
    !statTradeCountSub ||
    !statWinRate ||
    !statWinRateSub ||
    !statBestDay ||
    !statBestDaySub ||
    !statWorstDay ||
    !statWorstDaySub ||
    !statMonthPnl ||
    !statMonthPnlSub
  ) {
    return;
  }

  const events = getFilteredEvents();
  const realizedTotal = events.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);
  const unrealizedTotal = state.openPositions.reduce((sum, entry) => sum + entry.unrealizedPnl, 0);
  const realizedTrades = events.filter((entry) => entry.side === "sell");
  const winners = realizedTrades.filter((entry) => getRealizedPnl(entry) > 0);
  const visibleMonthKey = `${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((entry) => entry.date.startsWith(visibleMonthKey));
  const monthPnl = monthEvents.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);
  const dayTotals = getDailyRealizedTotals(events);
  const bestDay = dayTotals.length > 0 ? dayTotals.reduce((best, entry) => (entry.pnl > best.pnl ? entry : best)) : null;
  const worstDay = dayTotals.length > 0 ? dayTotals.reduce((worst, entry) => (entry.pnl < worst.pnl ? entry : worst)) : null;
  const winRate = realizedTrades.length > 0 ? (winners.length / realizedTrades.length) * 100 : 0;

  if (statUnrealizedPnl) {
    statUnrealizedPnl.textContent = formatSignedMoney(unrealizedTotal);
    statUnrealizedPnl.className = unrealizedTotal > 0 ? "positive-text" : unrealizedTotal < 0 ? "negative-text" : "";
  }
  if (statUnrealizedPnlSub) {
    statUnrealizedPnlSub.textContent = state.openPositions.length > 0 ? `${state.openPositions.length} open position${state.openPositions.length === 1 ? "" : "s"}` : "Needs fresh market prices";
  }

  statRealizedPnl.textContent = formatSignedMoney(realizedTotal);
  statRealizedPnl.className = realizedTotal > 0 ? "positive-text" : realizedTotal < 0 ? "negative-text" : "";
  statRealizedPnlSub.textContent = `${realizedTrades.length} realized sell trade${realizedTrades.length === 1 ? "" : "s"}`;

  statTradeCount.textContent = String(events.length);
  statTradeCountSub.textContent = `${events.filter((entry) => entry.side === "buy").length} buys, ${events.filter((entry) => entry.side === "sell").length} sells`;

  statWinRate.textContent = `${winRate.toFixed(1)}%`;
  statWinRateSub.textContent = `${winners.length} winning sell${winners.length === 1 ? "" : "s"} out of ${realizedTrades.length}`;

  statBestDay.textContent = bestDay ? formatShortDate(bestDay.date) : "None";
  statBestDaySub.textContent = bestDay ? formatSignedMoney(bestDay.pnl) : "No realized results yet";

  statWorstDay.textContent = worstDay ? formatShortDate(worstDay.date) : "None";
  statWorstDaySub.textContent = worstDay ? formatSignedMoney(worstDay.pnl) : "No realized results yet";

  statMonthPnl.textContent = formatSignedMoney(monthPnl);
  statMonthPnl.className = monthPnl > 0 ? "positive-text" : monthPnl < 0 ? "negative-text" : "";
  statMonthPnlSub.textContent = `${monthEvents.length} trade${monthEvents.length === 1 ? "" : "s"} in ${new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(state.currentMonth)}`;
  renderOpenPositions();
  renderPortfolioSnapshot();
}

function renderCalendar() {
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

  monthLabel.textContent = monthFormatter.format(firstDay);

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);

    const dateKey = formatDateKey(day);
    const dayEvents = getEventsForDate(dateKey, true);
    const daySummary = summarizeTrades(dayEvents);
    const dayTotal = dayEvents.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);
    const isOtherMonth = day.getMonth() !== month;
    const isToday = dateKey === formatDateKey(new Date());
    const isSelected = dateKey === state.selectedDate;
    const heatClass = state.calendarHeatmapMode ? getHeatmapClass(dayTotal) : "";

    cells.push(`
      <button class="calendar-day ${isOtherMonth ? "is-other-month" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""} ${heatClass}" data-date="${dateKey}">
        <div class="day-top">
          <span class="day-number">${day.getDate()}</span>
          <span class="day-count">${dayEvents.length} trade${dayEvents.length === 1 ? "" : "s"}</span>
        </div>
        <div class="day-preview">
          ${dayEvents.length === 0 ? `<span class="event-chip muted-chip">No trades</span>` : `
            <span class="pnl-chip ${daySummary.pnlClass}">${daySummary.label}</span>
            <span class="event-chip ${daySummary.pnlClass}">${daySummary.value}</span>
          `}
          ${state.notesByDate[dateKey] ? `<span class="note-chip">Note</span>` : ""}
        </div>
      </button>
    `);
  }

  calendarGrid.innerHTML = cells.join("");

  calendarGrid.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      renderCalendar();
      renderSelectedDate();
      hydrateDayNoteForm();
    });
  });
}

function renderSelectedDate() {
  const events = getEventsForDate(state.selectedDate, true);
  const summary = summarizeTrades(events);
  const dayNote = state.notesByDate[state.selectedDate] || "";
  const parsedDate = new Date(`${state.selectedDate}T00:00:00`);
  const readableDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);

  selectedDateLabel.textContent = readableDate;
  selectedDateTotal.textContent = events.length === 0 ? "No trades" : `${summary.label} ${summary.value}`;

  if (events.length === 0) {
    selectedDateEvents.className = "event-list";
    selectedDateEvents.innerHTML = `
      ${dayNote ? `<article class="day-note-card"><h3>Your Note</h3><div class="event-notes">${escapeHtml(dayNote)}</div></article>` : ""}
      <div class="empty-state">No trades on this day yet.</div>
    `;
    renderTradeReplay();
    return;
  }

  selectedDateEvents.className = "event-list";
  selectedDateEvents.innerHTML = `
    ${dayNote ? `<article class="day-note-card"><h3>Your Note</h3><div class="event-notes">${escapeHtml(dayNote)}</div></article>` : ""}
    ${events
      .sort((left, right) => (left.executedAt || "").localeCompare(right.executedAt || ""))
      .map((entry) => `
        <article class="event-item ${entry.type}">
          <div class="event-header-row">
            <div class="event-meta">
              <span class="event-type">${entry.side ? escapeHtml(entry.side) : "trade"}</span>
              <span>${escapeHtml(entry.asset)}</span>
            </div>
            <button class="delete-button" data-id="${escapeHtml(entry.id)}" type="button">Delete</button>
          </div>
          <h3>${formatAmount(entry.amount)} ${escapeHtml(entry.asset)}</h3>
          <div class="trade-stats">
            <span>Price: ${formatMoney(entry.price)}</span>
            <span>Value: ${formatMoney(entry.quoteAmount)}</span>
            <span class="${getRealizedPnl(entry) >= 0 ? "positive-text" : "negative-text"}">Realized P/L: ${formatSignedMoney(getRealizedPnl(entry))}</span>
          </div>
          <div class="event-notes">${entry.notes ? escapeHtml(entry.notes) : "No exchange note."}</div>
        </article>
      `)
      .join("")}
  `;

  selectedDateEvents.querySelectorAll(".delete-button").forEach((button) => {
    button.addEventListener("click", () => {
      deleteActivity(button.dataset.id);
    });
  });
  renderTradeReplay();
}

function toggleCalendarHeatmap() {
  state.calendarHeatmapMode = !state.calendarHeatmapMode;
  if (calendarModeButton) {
    calendarModeButton.textContent = state.calendarHeatmapMode ? "Heatmap On" : "Heatmap Off";
    calendarModeButton.className = state.calendarHeatmapMode ? "button button-primary" : "button button-ghost";
  }
  renderCalendar();
}

function getHeatmapClass(dayTotal) {
  if (dayTotal >= 100) {
    return "heat-strong-positive";
  }
  if (dayTotal > 0) {
    return "heat-positive";
  }
  if (dayTotal <= -100) {
    return "heat-strong-negative";
  }
  if (dayTotal < 0) {
    return "heat-negative";
  }
  return "";
}

async function syncMexc() {
  syncStatus.textContent = "Syncing only your MEXC trades...";

  try {
    const config = readMexcForm();
    if (!config.apiKey || !config.apiSecret) {
      throw new Error("Please add your MEXC API key and secret first");
    }

    persistMexcConfig(config);

    const response = await fetch(`${API_BASE_URL}/api/mexc/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        apiBase: config.apiBase,
        symbols: config.symbols,
        startDate: config.startDate,
        endDate: config.endDate,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Sync request failed");
    }

    const normalized = payload.activities.map(normalizeEvent).filter((entry) => entry.type === "trade");
    state.events = mergeEvents(state.events.filter((entry) => entry.type === "trade"), normalized);
    state.pricesBySymbol = payload.prices || {};
    recalculateRealizedPnl();
    persistEvents();
    await fetchLivePhpRate(false);
    renderStats();
    renderCalendar();
    renderSelectedDate();
    renderPortfolioSnapshot();
    renderSymbolAnalytics();
    renderMiniCharts();
    renderPerformanceCharts();
    syncStatus.textContent = `Synced ${normalized.length} trades from MEXC.`;
  } catch (error) {
    syncStatus.textContent = `MEXC sync unavailable: ${error.message}`;
  }
}

async function restoreSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
      credentials: "same-origin",
    });
    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

async function hydrateCloudProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      credentials: "same-origin",
    });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    mergeCloudProfileIntoState(payload.profile || {});
    persistEvents();
    persistNotes(true);
    persistFavorites(true);
    persistAlerts(true);
    persistSymbolJournal(true);
    persistWatchlists(true);
    persistGoals(true);
    persistHabits(true);
    state.profileLoaded = true;
  } catch {
    state.profileLoaded = false;
  }
}

function mergeCloudProfileIntoState(profile) {
  const remoteEvents = Array.isArray(profile.events) ? profile.events.map(normalizeEvent).filter((entry) => entry.type === "trade") : [];
  const localEvents = Array.isArray(state.events) ? state.events.map(normalizeEvent).filter((entry) => entry.type === "trade") : [];
  state.events = mergeEvents(remoteEvents, localEvents);

  state.notesByDate = {
    ...(profile.notesByDate && typeof profile.notesByDate === "object" ? profile.notesByDate : {}),
    ...state.notesByDate,
  };

  state.favorites = [...new Set([
    ...(Array.isArray(profile.favorites) ? profile.favorites : []),
    ...state.favorites,
  ].map((entry) => String(entry || "").trim().toUpperCase()).filter(Boolean))];

  const remoteAlerts = Array.isArray(profile.alerts) ? profile.alerts : [];
  state.alerts = dedupeById([...remoteAlerts, ...state.alerts]);

  state.symbolJournal = {
    ...(profile.symbolJournal && typeof profile.symbolJournal === "object" ? profile.symbolJournal : {}),
    ...state.symbolJournal,
  };
  state.watchlists = sanitizeWatchlists(profile.watchlists && typeof profile.watchlists === "object" ? profile.watchlists : state.watchlists);
  if (profile.goals && typeof profile.goals === "object") {
    state.goals = { ...state.goals, ...profile.goals };
  }
  if (profile.habitsByDate && typeof profile.habitsByDate === "object") {
    state.habitsByDate = profile.habitsByDate;
  }

  const preferences = profile.preferences && typeof profile.preferences === "object" ? profile.preferences : {};
  if (preferences.currentWindow === "overview" || preferences.currentWindow === "markets") {
    state.currentWindow = preferences.currentWindow;
  }
  if (["day", "notes", "mexc", "ai", "import"].includes(preferences.currentSidebarPane)) {
    state.currentSidebarPane = preferences.currentSidebarPane;
  }
  if (preferences.marketType === "spot" || preferences.marketType === "futures") {
    state.marketType = preferences.marketType;
  }
  if (["favorites", "spot", "futures", "gainers", "losers", "volume"].includes(preferences.marketView)) {
    state.marketView = preferences.marketView;
  }
  if (preferences.selectedWatchlist && (preferences.selectedWatchlist === "all" || preferences.selectedWatchlist in state.watchlists)) {
    state.selectedWatchlist = preferences.selectedWatchlist;
  }
  if (preferences.fiatCurrency === "PHP") {
    state.fiatCurrency = "PHP";
  }
  if (Number(preferences.usdtToPhpRate) > 0) {
    state.usdtToPhpRate = Number(preferences.usdtToPhpRate);
  }
}

function scheduleProfileSave() {
  if (!state.user) {
    return;
  }

  if (profileSaveTimer) {
    window.clearTimeout(profileSaveTimer);
  }

  profileSaveTimer = window.setTimeout(() => {
    saveProfileToCloud().catch(() => {});
  }, 600);
}

async function saveProfileToCloud() {
  if (!state.user) {
    return;
  }

  const profile = {
    events: state.events,
    notesByDate: state.notesByDate,
    favorites: state.favorites,
    alerts: state.alerts,
    symbolJournal: state.symbolJournal,
    watchlists: state.watchlists,
    goals: state.goals,
    habitsByDate: state.habitsByDate,
    preferences: {
      currentWindow: state.currentWindow,
      currentSidebarPane: state.currentSidebarPane,
      marketType: state.marketType,
      marketView: state.marketView,
      selectedWatchlist: state.selectedWatchlist,
      fiatCurrency: state.fiatCurrency,
      usdtToPhpRate: state.usdtToPhpRate,
    },
  };

  await fetch(`${API_BASE_URL}/api/profile`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
}

function initializeGoogleLogin() {
  const clientId = document
    .querySelector('meta[name="google-signin-client_id"]')
    ?.content?.trim();

  if (!clientId || clientId === "%GOOGLE_CLIENT_ID%") {
    loginStatus.textContent = "Set GOOGLE_CLIENT_ID on the server before Google sign-in can work.";
    return;
  }

  const start = () => {
    if (!window.google?.accounts?.id) {
      window.setTimeout(start, 150);
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    googleButton.innerHTML = "";
    window.google.accounts.id.renderButton(googleButton, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: 280,
    });
    loginStatus.textContent = "Sign in with Google to continue.";
  };

  start();
}

async function handleGoogleCredential(response) {
  loginStatus.textContent = "Verifying Google sign-in...";

  try {
    const authResponse = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        credential: response.credential,
      }),
    });
    const payload = await authResponse.json();

    if (!authResponse.ok || !payload.authenticated) {
      throw new Error(payload.error || "Google sign-in failed");
    }

    state.user = payload.user || null;
    showAuthenticatedApp(payload.user);
    await hydrateCloudProfile();
    initializeDashboard();
  } catch (error) {
    loginStatus.textContent = `Google login failed: ${error.message}`;
  }
}

function showAuthenticatedApp(user) {
  loginGate.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  userEmail.textContent = user?.email || "Signed in";
}

function showLoginGate() {
  appShell.classList.add("is-hidden");
  loginGate.classList.remove("is-hidden");
}

async function logout() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "same-origin",
    });
  } finally {
    state.user = null;
    state.profileLoaded = false;
    userEmail.textContent = "Not signed in";
    showLoginGate();
    loginStatus.textContent = "Signed out. Sign in with Google to continue.";
    initializeGoogleLogin();
  }
}

function loadEvents() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const cleaned = parsed
      .map(normalizeEvent)
      .filter((entry) => !isLegacyDemoEvent(entry) && entry.type === "trade");
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch {
    return [];
  }
}

function loadMexcConfig() {
  const sessionConfig = parseStoredConfig(sessionStorage.getItem(MEXC_SESSION_KEY));
  const localConfig = parseStoredConfig(localStorage.getItem(MEXC_STORAGE_KEY));
  const merged = { ...localConfig, ...sessionConfig };

  return {
    apiKey: String(merged.apiKey || "").trim(),
    apiSecret: String(merged.apiSecret || "").trim(),
    apiBase: String(merged.apiBase || "https://api.mexc.com").trim(),
    symbols: String(merged.symbols || "").trim(),
    startDate: String(merged.startDate || "").trim(),
    endDate: String(merged.endDate || "").trim(),
    fiatCurrency: DEFAULT_FIAT_CURRENCY,
    usdtToPhpRate: Number(merged.usdtToPhpRate || DEFAULT_USDT_TO_PHP_RATE) > 0
      ? Number(merged.usdtToPhpRate || DEFAULT_USDT_TO_PHP_RATE)
      : DEFAULT_USDT_TO_PHP_RATE,
    rememberKeys: Boolean(localConfig.apiKey || localConfig.apiSecret),
  };
}

function parseStoredConfig(rawValue) {
  try {
    return JSON.parse(rawValue || "{}");
  } catch {
    return {};
  }
}

function hydrateMexcForm() {
  const config = loadMexcConfig();
  mexcForm.elements.apiKey.value = config.apiKey;
  mexcForm.elements.apiSecret.value = config.apiSecret;
  mexcForm.elements.apiBase.value = config.apiBase;
  mexcForm.elements.symbols.value = config.symbols;
  mexcForm.elements.startDate.value = config.startDate;
  mexcForm.elements.endDate.value = config.endDate;
  if (mexcForm.elements.fiatCurrency) {
    mexcForm.elements.fiatCurrency.value = config.fiatCurrency;
  }
  if (mexcForm.elements.usdtToPhpRate) {
    mexcForm.elements.usdtToPhpRate.value = config.usdtToPhpRate;
  }
  mexcForm.elements.rememberKeys.checked = config.rememberKeys;
}

function hydrateDayNoteForm() {
  dayNoteForm.elements.date.value = state.selectedDate;
  dayNoteForm.elements.notes.value = state.notesByDate[state.selectedDate] || "";
}

function clearMexcKeys() {
  localStorage.removeItem(MEXC_STORAGE_KEY);
  sessionStorage.removeItem(MEXC_SESSION_KEY);
  mexcForm.reset();
  mexcForm.elements.apiBase.value = "https://api.mexc.com";
  if (mexcForm.elements.fiatCurrency) {
    mexcForm.elements.fiatCurrency.value = DEFAULT_FIAT_CURRENCY;
  }
  if (mexcForm.elements.usdtToPhpRate) {
    mexcForm.elements.usdtToPhpRate.value = DEFAULT_USDT_TO_PHP_RATE;
  }
  applyCurrencyPreferences(loadMexcConfig());
  setDefaultSyncRange();
  resetSecretFieldStates();
  renderStats();
  renderCalendar();
  renderSelectedDate();
  renderOpenPositions();
  renderSymbolAnalytics();
  renderPerformanceCharts();
  renderMiniCharts();
  renderMarketChartSummary();
  syncStatus.textContent = "Stored MEXC keys and sync settings cleared from this browser. Peso display stays enabled.";
}

function clearSelectedDayNote() {
  delete state.notesByDate[state.selectedDate];
  persistNotes();
  hydrateDayNoteForm();
  renderCalendar();
  renderSelectedDate();
  syncStatus.textContent = "Day note cleared.";
}

function readMexcForm() {
  const formData = new FormData(mexcForm);
  return {
    apiKey: String(formData.get("apiKey") || "").trim(),
    apiSecret: String(formData.get("apiSecret") || "").trim(),
    apiBase: String(formData.get("apiBase") || "https://api.mexc.com").trim(),
    symbols: String(formData.get("symbols") || "").trim().toUpperCase(),
    startDate: String(formData.get("startDate") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    fiatCurrency: DEFAULT_FIAT_CURRENCY,
    usdtToPhpRate: Number(formData.get("usdtToPhpRate") || DEFAULT_USDT_TO_PHP_RATE) > 0
      ? Number(formData.get("usdtToPhpRate") || DEFAULT_USDT_TO_PHP_RATE)
      : DEFAULT_USDT_TO_PHP_RATE,
    rememberKeys: formData.get("rememberKeys") === "on",
  };
}

function persistMexcConfig(config) {
  const sharedConfig = {
    apiBase: config.apiBase,
    symbols: config.symbols,
    startDate: config.startDate,
    endDate: config.endDate,
    fiatCurrency: DEFAULT_FIAT_CURRENCY,
    usdtToPhpRate: Number(config.usdtToPhpRate || DEFAULT_USDT_TO_PHP_RATE) > 0
      ? Number(config.usdtToPhpRate || DEFAULT_USDT_TO_PHP_RATE)
      : DEFAULT_USDT_TO_PHP_RATE,
  };

  sessionStorage.setItem(MEXC_SESSION_KEY, JSON.stringify({
    ...sharedConfig,
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  }));

  if (config.rememberKeys) {
    localStorage.setItem(MEXC_STORAGE_KEY, JSON.stringify({
      ...sharedConfig,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
    }));
  } else {
    localStorage.setItem(MEXC_STORAGE_KEY, JSON.stringify(sharedConfig));
  }
}

function applyCurrencyPreferences(config) {
  state.fiatCurrency = DEFAULT_FIAT_CURRENCY;
  state.usdtToPhpRate = Number(config?.usdtToPhpRate || DEFAULT_USDT_TO_PHP_RATE) > 0
    ? Number(config?.usdtToPhpRate || DEFAULT_USDT_TO_PHP_RATE)
    : DEFAULT_USDT_TO_PHP_RATE;
  scheduleProfileSave();
}

async function fetchLivePhpRate(showStatus = false) {
  try {
    if (showStatus && phpRateStatus) {
      phpRateStatus.textContent = "Updating live PHP rate...";
    }
    const response = await fetch(`${API_BASE_URL}/api/fx/usdt-php`, {
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not update PHP rate");
    }
    const nextRate = Number(payload.rate || 0);
    if (nextRate > 0) {
      state.usdtToPhpRate = nextRate;
      if (mexcForm?.elements?.usdtToPhpRate) {
        mexcForm.elements.usdtToPhpRate.value = String(nextRate);
      }
      persistMexcConfig(readMexcForm());
      renderMarketChartSummary();
      updateAlertCurrencyHint();
      renderStats();
      renderCalendar();
      renderSelectedDate();
      renderOpenPositions();
      renderPortfolioSnapshot();
      renderAlerts();
      renderSymbolAnalytics();
      renderPerformanceCharts();
      renderMiniCharts();
      if (phpRateStatus) {
        phpRateStatus.textContent = `Live PHP rate updated: 1 USDT ≈ ${formatPlainNumber(nextRate, 2)} PHP.`;
      }
    }
  } catch (error) {
    if (showStatus && phpRateStatus) {
      phpRateStatus.textContent = `Live PHP rate unavailable: ${error.message}`;
    }
  }
}

function updateAlertCurrencyHint() {
  if (alertCurrencyHint) {
    alertCurrencyHint.textContent = `Alert targets are entered in pesos and converted automatically using 1 USDT ≈ ${formatPlainNumber(state.usdtToPhpRate, 2)} PHP.`;
  }
}

function toggleSecretField(button) {
  const fieldName = button.dataset.target;
  const input = mexcForm.elements[fieldName];
  const showValue = input.type === "password";
  input.type = showValue ? "text" : "password";
  button.textContent = showValue ? "Hide" : "Show";
}

function resetSecretFieldStates() {
  fieldToggles.forEach((button) => {
    const input = mexcForm.elements[button.dataset.target];
    input.type = "password";
    button.textContent = "Show";
  });
}

function handleChartPreview() {
  const file = chartImageInput.files?.[0];
  if (!file) {
    chartPreviewWrap.classList.add("is-hidden");
    chartPreviewImage.removeAttribute("src");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    chartPreviewImage.src = reader.result;
    chartPreviewWrap.classList.remove("is-hidden");
  };
  reader.readAsDataURL(file);
}

async function analyzeChartScreenshot(event) {
  event.preventDefault();
  const file = chartImageInput.files?.[0];
  if (!file) {
    aiChartStatus.textContent = "Choose a chart screenshot first.";
    return;
  }

  try {
    const imageDataUrl = await fileToDataUrl(file);
    await submitChartAnalysis(imageDataUrl, chartContextInput.value.trim());
  } catch (error) {
    aiChartStatus.textContent = `AI chart review unavailable: ${error.message}`;
    aiChartResult.textContent = "No analysis yet.";
  }
}

async function submitChartAnalysis(imageDataUrl, context) {
  aiChartStatus.textContent = "Analyzing chart screenshot...";
  aiChartResult.textContent = "Working on the chart review...";

  const response = await fetch(`${API_BASE_URL}/api/ai/chart-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      imageDataUrl,
      context,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Chart analysis failed");
  }

  aiChartStatus.textContent = "Chart analysis ready.";
  aiChartResult.textContent = payload.analysis || "No analysis returned.";
}

async function runMonthlyAiReview() {
  if (!monthlyAiStatus || !monthlyAiResult) {
    return;
  }

  try {
    const monthKey = `${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, "0")}`;
    const monthEvents = state.events.filter((entry) => entry.date.startsWith(monthKey));
    if (monthEvents.length === 0) {
      monthlyAiStatus.textContent = "Sync trades for this month first.";
      monthlyAiResult.textContent = "No AI monthly review yet.";
      return;
    }

    monthlyAiStatus.textContent = "Reviewing this month with AI...";
    monthlyAiResult.textContent = "Summarizing your month...";

    const response = await fetch(`${API_BASE_URL}/api/ai/monthly-review`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        month: monthKey,
        stats: buildMonthlyAiPayload(monthEvents),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Monthly AI review failed");
    }

    monthlyAiStatus.textContent = "AI monthly review ready.";
    monthlyAiResult.textContent = payload.analysis || "No monthly review returned.";
  } catch (error) {
    monthlyAiStatus.textContent = `Monthly AI review unavailable: ${error.message}`;
    monthlyAiResult.textContent = "No AI monthly review yet.";
  }
}

function buildMonthlyAiPayload(monthEvents) {
  const sells = monthEvents.filter((entry) => entry.side === "sell");
  const wins = sells.filter((entry) => getRealizedPnl(entry) > 0).length;
  const totalRealized = monthEvents.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);
  const bySymbol = [...groupTradesBySymbol(monthEvents).values()].map((group) => ({
    symbol: group.symbol,
    trades: group.trades.length,
    realized: group.trades.reduce((sum, entry) => sum + getRealizedPnl(entry), 0),
  }));
  const notes = Object.entries(state.notesByDate)
    .filter(([date]) => date.startsWith(`${monthEvents[0]?.date?.slice(0, 7) || ""}`))
    .map(([date, note]) => ({ date, note }));

  return {
    totalTrades: monthEvents.length,
    realizedPnl: totalRealized,
    sellWinRate: sells.length > 0 ? (wins / sells.length) * 100 : 0,
    topSymbols: bySymbol.sort((a, b) => Math.abs(b.realized) - Math.abs(a.realized)).slice(0, 8),
    dayNotes: notes,
  };
}

function exportTradesCsv() {
  const rows = [
    ["date", "executedAt", "symbol", "side", "amount", "price", "quoteAmount", "realizedPnl"],
    ...state.events.map((entry) => [
      entry.date,
      entry.executedAt || "",
      entry.asset,
      entry.side,
      entry.amount,
      entry.price,
      entry.quoteAmount,
      getRealizedPnl(entry),
    ]),
  ];
  downloadFile(`crypto-trades-${formatDateKey(new Date())}.csv`, rows.map((row) => row.map(csvEscape).join(",")).join("\n"), "text/csv;charset=utf-8");
}

function exportWorkspaceJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    events: state.events,
    notesByDate: state.notesByDate,
    favorites: state.favorites,
    alerts: state.alerts,
    watchlists: state.watchlists,
    symbolJournal: state.symbolJournal,
  };
  downloadFile(`crypto-workspace-${formatDateKey(new Date())}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function enableAlertNotifications() {
  if (!("Notification" in window)) {
    syncStatus.textContent = "This browser does not support notifications.";
    return;
  }

  if (Notification.permission === "granted") {
    syncStatus.textContent = "Notifications are already enabled.";
    return;
  }

  const permission = await Notification.requestPermission();
  syncStatus.textContent = permission === "granted"
    ? "Notifications enabled for price alerts."
    : "Notification permission was not granted.";
}

async function showServiceWorkerNotification(title, body) {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return;
  }

  await registration.showNotification(title, {
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "crypto-calendar-alert",
  });
}

function renderWatchlistOptions() {
  if (!watchlistSelect) {
    return;
  }

  const names = ["all", ...Object.keys(state.watchlists)];
  if (!names.includes(state.selectedWatchlist)) {
    state.selectedWatchlist = "all";
  }

  watchlistSelect.innerHTML = names.map((name) => `
    <option value="${escapeHtml(name)}"${name === state.selectedWatchlist ? " selected" : ""}>${escapeHtml(name === "all" ? "All Symbols" : name)}</option>
  `).join("");
}

function handleWatchlistChange() {
  state.selectedWatchlist = String(watchlistSelect?.value || "all");
  renderMarketList();
  scheduleProfileSave();
}

function createWatchlistFolder() {
  const name = String(watchlistNameInput?.value || "").trim();
  if (!name) {
    return;
  }

  if (!state.watchlists[name]) {
    state.watchlists[name] = [];
  }
  state.selectedWatchlist = name;
  if (watchlistNameInput) {
    watchlistNameInput.value = "";
  }
  persistWatchlists();
  renderWatchlistOptions();
  renderMarketList();
}

function saveCurrentSymbolToWatchlist() {
  const listName = state.selectedWatchlist;
  const symbol = String(marketSymbolInput?.value || "").trim().toUpperCase();
  if (!symbol || !listName || listName === "all") {
    syncStatus.textContent = "Choose or create a watchlist folder first.";
    return;
  }

  state.watchlists[listName] = [...new Set([...(state.watchlists[listName] || []), symbol])];
  persistWatchlists();
  renderWatchlistOptions();
  renderMarketList();
  syncStatus.textContent = `${symbol} added to ${listName}.`;
}

function deleteCurrentWatchlist() {
  const listName = state.selectedWatchlist;
  if (!listName || listName === "all") {
    return;
  }

  delete state.watchlists[listName];
  state.selectedWatchlist = "all";
  persistWatchlists();
  renderWatchlistOptions();
  renderMarketList();
}

function adjustChartZoom(multiplier) {
  state.chartZoom = Math.min(4, Math.max(1, state.chartZoom * multiplier));
  state.chartOffset = Math.max(0, Math.min(state.chartOffset, getMaxChartOffset()));
  redrawCurrentChart();
}

function resetChartViewport() {
  state.chartZoom = 1;
  state.chartOffset = 0;
  state.chartHoverIndex = -1;
  redrawCurrentChart();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.readAsDataURL(file);
  });
}

async function loadMarketChart() {
  if (!marketSymbolInput || !marketIntervalSelect || !marketChartCanvas) {
    return;
  }

  const symbol = String(marketSymbolInput.value || "").trim().toUpperCase() || "BTCUSDT";
  const interval = String(marketIntervalSelect.value || "4h").trim();
  const requestId = ++marketChartRequestId;
  if (marketChartStatus) {
    marketChartStatus.textContent = `Loading ${symbol} ${interval} chart from MEXC...`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/mexc/klines?type=${encodeURIComponent(state.marketType)}&symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=80`, {
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not load chart");
    }

    if (requestId !== marketChartRequestId) {
      return;
    }

    const resolvedSymbol = String(payload.symbol || symbol).toUpperCase();
    marketChartSeries = Array.isArray(payload.klines) ? payload.klines.slice(-80) : [];
    state.chartOffset = Math.max(0, Math.min(state.chartOffset, getMaxChartOffset()));
    state.chartHoverIndex = -1;
    drawMarketChart(marketChartSeries, resolvedSymbol, interval);
    renderMarketChartSummary();
    if (marketChartStatus) {
      marketChartStatus.textContent = marketChartLiveEnabled
        ? `Live ${resolvedSymbol} ${interval} chart is streaming from MEXC in peso view.`
        : `Loaded ${resolvedSymbol} ${interval} chart from MEXC in peso view.`;
    }
    syncMarketChartTimer();
    syncMarketChartStream(resolvedSymbol, interval);
    updateMobileTradeBar(resolvedSymbol);
    renderSymbolAnalytics();
    renderMiniCharts();
    checkAlertsForSymbol(resolvedSymbol, getLastChartPrice());
  } catch (error) {
    if (requestId !== marketChartRequestId) {
      return;
    }
    if (marketChartStatus) {
      marketChartStatus.textContent = `Chart unavailable: ${error.message}`;
    }
    stopLiveMarketChart();
    clearMarketChart();
  }
}

function useMexcSymbolsForChart() {
  if (!marketSymbolInput) {
    return;
  }

  const symbols = String(mexcForm?.elements?.symbols?.value || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (symbols.length === 0) {
    if (marketChartStatus) {
      marketChartStatus.textContent = "Add spot symbols in the MEXC sync section first, or type a symbol manually.";
    }
    return;
  }

  marketSymbolInput.value = symbols[0].toUpperCase();
  if (symbolJournalSymbol) {
    symbolJournalSymbol.value = marketSymbolInput.value;
  }
  hydrateSymbolJournal();
  renderMarketSymbolChips();
  renderMarketList();
  renderSymbolAnalytics();
  loadMarketChart();
}

function redrawCurrentChart() {
  if (!marketChartSeries.length || !marketSymbolInput || !marketIntervalSelect) {
    return;
  }

  drawMarketChart(marketChartSeries, marketSymbolInput.value, marketIntervalSelect.value);
}

function renderMarketSymbolChips() {
  if (!marketSymbolChips || !marketSymbolInput) {
    return;
  }

  const savedSymbols = String(mexcForm?.elements?.symbols?.value || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const activeSymbol = String(marketSymbolInput.value || "").trim().toUpperCase() || "BTCUSDT";
  const symbols = [...new Set([activeSymbol, ...savedSymbols, ...DEFAULT_MARKET_SYMBOLS])].slice(0, 12);

  marketSymbolChips.innerHTML = symbols
    .map((symbol) => `
      <button
        type="button"
        class="symbol-chip-button ${symbol === activeSymbol ? "is-active" : ""}"
        data-symbol="${escapeHtml(symbol)}"
      >
        ${escapeHtml(symbol)}
      </button>
    `)
    .join("");

  marketSymbolChips.querySelectorAll(".symbol-chip-button").forEach((button) => {
    button.addEventListener("click", () => {
      const symbol = String(button.dataset.symbol || "").trim().toUpperCase();
      if (!symbol) {
        return;
      }

      marketSymbolInput.value = symbol;
      renderMarketSymbolChips();
      renderMarketList();
      loadMarketChart();
    });
  });
}

async function loadMarketCatalog() {
  if (!marketList || !marketListStatus) {
    return;
  }

  marketListStatus.textContent = `Loading ${state.marketType} symbols...`;

  try {
    const response = await fetch(`${API_BASE_URL}/api/mexc/markets?type=${encodeURIComponent(state.marketType)}`, {
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not load markets");
    }

    state.markets = Array.isArray(payload.markets) ? payload.markets : [];
    renderMarketList();
    renderMiniCharts();
    marketListStatus.textContent = `Loaded ${state.markets.length} ${state.marketType} symbols.`;
  } catch (error) {
    marketListStatus.textContent = `Market list unavailable: ${error.message}`;
    if (marketList) {
      marketList.innerHTML = "";
    }
  }
}

function renderMarketList() {
  if (!marketList) {
    return;
  }

  const activeSymbol = String(marketSymbolInput?.value || "").trim().toUpperCase();
  const query = String(marketSearchInput?.value || "").trim().toUpperCase();
  const source = Array.isArray(state.markets) ? state.markets : [];
  let filtered = source
    .filter((entry) => {
      if (!query) {
        return true;
      }

      return (
        String(entry.symbol || "").includes(query) ||
        String(entry.baseAsset || "").includes(query) ||
        String(entry.quoteAsset || "").includes(query)
      );
    });

  if (state.selectedWatchlist !== "all") {
    const selectedSymbols = state.watchlists[state.selectedWatchlist] || [];
    filtered = filtered.filter((entry) => selectedSymbols.includes(entry.symbol));
  }

  if (state.marketView === "favorites") {
    filtered = filtered.filter((entry) => state.favorites.includes(entry.symbol));
  } else if (state.marketView === "gainers") {
    filtered = [...filtered].sort((left, right) => Number(right.priceChangePercent || 0) - Number(left.priceChangePercent || 0));
  } else if (state.marketView === "losers") {
    filtered = [...filtered].sort((left, right) => Number(left.priceChangePercent || 0) - Number(right.priceChangePercent || 0));
  } else if (state.marketView === "volume") {
    filtered = [...filtered].sort((left, right) => Number(right.quoteVolume || 0) - Number(left.quoteVolume || 0));
  }

  filtered = filtered.slice(0, 120);
  renderMarketTabs();

  if (filtered.length === 0) {
    marketList.innerHTML = `<div class="empty-state">No symbols matched your search.</div>`;
    return;
  }

  marketList.innerHTML = filtered
    .map((entry) => {
      const change = Number(entry.priceChangePercent || 0);
      const changeClass = change > 0 ? "positive-text" : change < 0 ? "negative-text" : "muted";
      return `
        <article
          class="market-row ${entry.symbol === activeSymbol ? "is-active" : ""}"
          data-symbol="${escapeHtml(entry.symbol)}"
        >
          <div class="market-symbol">
            <div class="alert-item-row">
              <strong>${escapeHtml(entry.symbol)}</strong>
              <button type="button" class="star-button ${state.favorites.includes(entry.symbol) ? "is-active" : ""}" data-star-symbol="${escapeHtml(entry.symbol)}">&#9733;</button>
            </div>
            <span>${escapeHtml(entry.baseAsset)}/${escapeHtml(entry.quoteAsset)}</span>
          </div>
          <div class="market-metric">${formatCompactPrice(entry.lastPrice)}</div>
          <div class="market-metric ${changeClass}">${formatPercent(entry.priceChangePercent)}</div>
          <div class="market-metric">${formatCompactVolume(entry.quoteVolume)}</div>
        </article>
      `;
    })
    .join("");

  marketList.querySelectorAll(".market-row").forEach((button) => {
    button.addEventListener("click", () => {
      const symbol = String(button.dataset.symbol || "").trim().toUpperCase();
      if (!symbol) {
        return;
      }

      marketSymbolInput.value = symbol;
      symbolJournalSymbol.value = symbol;
      hydrateSymbolJournal();
      renderMarketSymbolChips();
      renderMarketList();
      renderSymbolAnalytics();
      loadMarketChart();
    });

    button.addEventListener("dblclick", () => {
      openSymbolDrawer(String(button.dataset.symbol || "").trim().toUpperCase());
    });
  });

  marketList.querySelectorAll(".star-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavoriteSymbol(String(button.dataset.starSymbol || "").trim().toUpperCase());
    });
  });
}

function switchMarketView(view) {
  state.marketView = view;
  state.marketType = view === "futures" ? "futures" : "spot";
  renderMarketTabs();
  loadMarketCatalog();
  if (state.marketType === "futures" && marketSymbolInput) {
    marketSymbolInput.value = normalizeChartSymbol(marketSymbolInput.value, "futures");
  }
  if (state.marketType === "spot" && marketSymbolInput) {
    marketSymbolInput.value = normalizeChartSymbol(marketSymbolInput.value, "spot");
  }
  renderMarketSymbolChips();
  renderMarketList();
  updateMobileTradeBar();
  loadMarketChart();
}

function renderMarketTabs() {
  const tabs = {
    favorites: marketTabFavorites,
    spot: marketTabSpot,
    futures: marketTabFutures,
    gainers: marketTabGainers,
    losers: marketTabLosers,
    volume: marketTabVolume,
  };

  Object.entries(tabs).forEach(([key, element]) => {
    if (!element) {
      return;
    }
    element.className = key === state.marketView ? "button button-primary" : "button button-ghost";
  });
}

function updateMobileTradeBar(nextSymbol) {
  const symbol = String(nextSymbol || marketSymbolInput?.value || "BTCUSDT").trim().toUpperCase();
  const market = state.markets.find((entry) => entry.symbol === symbol);
  if (mobileTradeSymbol) {
    mobileTradeSymbol.textContent = symbol || "BTCUSDT";
  }
  renderMarketChartSummary();
  if (mobileTradePrice) {
    const lastPrice = getLastChartPrice() || Number(market?.lastPrice || 0);
    mobileTradePrice.textContent = lastPrice > 0 ? formatCompactPrice(lastPrice) : "--";
  }
  if (mobileTradeChange) {
    const change = Number(market?.priceChangePercent || 0);
    mobileTradeChange.textContent = formatPercent(change);
    mobileTradeChange.className = `mobile-trade-change ${change > 0 ? "positive-text" : change < 0 ? "negative-text" : "muted"}`;
  }
}

function openSymbolDrawer(symbol) {
  const resolvedSymbol = String(symbol || marketSymbolInput?.value || "").trim().toUpperCase();
  if (!resolvedSymbol || !symbolDrawer) {
    return;
  }

  state.activeDrawerSymbol = resolvedSymbol;
  const market = state.markets.find((entry) => entry.symbol === resolvedSymbol);
  const trades = state.events.filter((entry) => String(entry.asset || "").toUpperCase() === normalizeChartSymbol(resolvedSymbol, "spot"));
  const realized = trades.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);
  const position = state.openPositions.find((entry) => entry.symbol === normalizeChartSymbol(resolvedSymbol, "spot"));
  if (symbolDrawerTitle) {
    symbolDrawerTitle.textContent = resolvedSymbol;
  }
  if (symbolDrawerStats) {
    symbolDrawerStats.innerHTML = [
      ["Last Price", formatCompactPrice(Number(market?.lastPrice || getLastChartPrice() || 0))],
      ["24H Change", formatPercent(Number(market?.priceChangePercent || 0))],
      ["Trades", String(trades.length)],
      ["Realized", formatSignedMoney(realized)],
      ["Open Qty", formatAmount(position?.quantity || 0)],
      ["Volume", formatCompactVolume(Number(market?.quoteVolume || 0))],
    ].map(([label, value]) => `
      <article class="analytics-item">
        <span class="muted">${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }
  if (symbolDrawerJournal) {
    symbolDrawerJournal.textContent = state.symbolJournal[resolvedSymbol] || "No journal note for this symbol yet.";
    symbolDrawerJournal.className = state.symbolJournal[resolvedSymbol] ? "ai-result" : "ai-result empty-state";
  }
  symbolDrawer.classList.remove("is-hidden");
}

function closeSymbolDrawer() {
  symbolDrawer?.classList.add("is-hidden");
  state.activeDrawerSymbol = "";
}

function toggleCurrentFavorite() {
  toggleFavoriteSymbol(String(marketSymbolInput?.value || "").trim().toUpperCase());
}

function toggleFavoriteSymbol(symbol) {
  if (!symbol) {
    return;
  }

  state.favorites = state.favorites.includes(symbol)
    ? state.favorites.filter((entry) => entry !== symbol)
    : [...state.favorites, symbol];
  persistFavorites();
  renderMarketSymbolChips();
  renderMarketList();
  renderMiniCharts();
  updateMobileTradeBar();
}

function seedAlertFormFromCurrentSymbol() {
  if (!alertSymbolInput) {
    return;
  }

  alertSymbolInput.value = String(marketSymbolInput?.value || "").trim().toUpperCase();
  if (alertPriceInput) {
    alertPriceInput.value = formatInputDecimal(convertQuoteToFiat(getLastChartPrice() || 0), 2);
  }
}

function saveAlert(event) {
  event.preventDefault();
  const symbol = String(alertSymbolInput?.value || "").trim().toUpperCase();
  const targetPhp = Number(alertPriceInput?.value || 0);
  const direction = String(document.getElementById("alertDirectionSelect")?.value || "above");
  const note = String(document.getElementById("alertNoteInput")?.value || "").trim();
  if (!symbol || !targetPhp) {
    return;
  }

  const price = targetPhp / Math.max(Number(state.usdtToPhpRate || DEFAULT_USDT_TO_PHP_RATE), 0.0001);

  state.alerts.push({
    id: crypto.randomUUID(),
    symbol,
    price,
    targetPhp,
    direction,
    note,
    marketType: state.marketType,
    triggered: false,
  });
  persistAlerts();
  renderAlerts();
  alertForm.reset();
}

function renderAlerts() {
  if (!alertsList) {
    return;
  }

  if (state.alerts.length === 0) {
    alertsList.className = "event-list empty-state";
    alertsList.textContent = "No active alerts yet.";
    return;
  }

  alertsList.className = "event-list";
  alertsList.innerHTML = state.alerts.map((alert) => `
    <article class="event-item">
      <div class="alert-item-row">
        <div>
          <div class="event-meta">
            <span class="event-type">${escapeHtml(alert.direction)}</span>
            <span>${escapeHtml(alert.symbol)}</span>
          </div>
          <div class="event-notes">${formatMoney(alert.price)} <span class="muted">(${formatPlainNumber(alert.price, 6)} USDT)</span> ${alert.note ? `- ${escapeHtml(alert.note)}` : ""}</div>
        </div>
        <button class="delete-button" type="button" data-alert-id="${escapeHtml(alert.id)}">${alert.triggered ? "Triggered" : "Delete"}</button>
      </div>
    </article>
  `).join("");

  alertsList.querySelectorAll("[data-alert-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.alerts = state.alerts.filter((entry) => entry.id !== button.dataset.alertId);
      persistAlerts();
      renderAlerts();
    });
  });
}

function checkAlertsForSymbol(symbol, price) {
  if (!symbol || !price) {
    return;
  }

  let changed = false;
  state.alerts = state.alerts.map((alert) => {
    if (alert.triggered || alert.symbol !== symbol) {
      return alert;
    }

    const shouldTrigger =
      (alert.direction === "above" && price >= alert.price) ||
      (alert.direction === "below" && price <= alert.price);
    if (!shouldTrigger) {
      return alert;
    }

    changed = true;
    syncStatus.textContent = `Alert hit: ${symbol} crossed ${alert.direction} ${formatMoney(alert.price)}.`;
    notifyAlertTriggered(alert, price);
    return { ...alert, triggered: true };
  });

  if (changed) {
    persistAlerts();
    renderAlerts();
  }
}

function renderSymbolAnalytics() {
  if (!symbolAnalytics) {
    return;
  }

  const symbol = String(marketSymbolInput?.value || "").trim().toUpperCase();
  const trades = state.events.filter((entry) => String(entry.asset || "").toUpperCase() === normalizeChartSymbol(symbol, "spot"));
  const realized = trades.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);
  const sells = trades.filter((entry) => entry.side === "sell");
  const wins = sells.filter((entry) => getRealizedPnl(entry) > 0).length;
  const position = state.openPositions.find((entry) => entry.symbol === normalizeChartSymbol(symbol, "spot"));

  symbolAnalytics.innerHTML = [
    ["Trades", String(trades.length)],
    ["Realized P/L", formatSignedMoney(realized)],
    ["Win Rate", sells.length > 0 ? `${((wins / sells.length) * 100).toFixed(1)}%` : "0.0%"],
    ["Open Qty", position ? formatAmount(position.quantity) : "0"],
    ["Avg Cost", position ? formatMoney(position.averageCost) : formatMoney(0)],
    ["Unrealized", position ? formatSignedMoney(position.unrealizedPnl) : formatSignedMoney(0)],
  ].map(([label, value]) => `
    <article class="analytics-item">
      <span class="muted">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

function renderMiniCharts() {
  if (!miniChartsGrid) {
    return;
  }

  const symbols = state.favorites.slice(0, 4);
  if (symbols.length === 0) {
    miniChartsGrid.innerHTML = `<div class="empty-state">Star a few symbols to build your mini chart board.</div>`;
    return;
  }

  miniChartsGrid.innerHTML = symbols.map((symbol, index) => `
    <article class="mini-chart-card">
      <div class="mini-chart-head">
        <strong>${escapeHtml(symbol)}</strong>
        <button type="button" class="button button-ghost" data-open-mini="${escapeHtml(symbol)}">Open</button>
      </div>
      <canvas id="miniChartCanvas${index}" class="mini-chart-canvas" width="320" height="120"></canvas>
    </article>
  `).join("");

  symbols.forEach((symbol, index) => {
    const canvas = document.getElementById(`miniChartCanvas${index}`);
    const market = state.markets.find((entry) => entry.symbol === symbol);
    drawMiniSparkline(canvas, market);
  });

  miniChartsGrid.querySelectorAll("[data-open-mini]").forEach((button) => {
    button.addEventListener("click", () => {
      marketSymbolInput.value = String(button.dataset.openMini || "").trim().toUpperCase();
      renderMarketList();
      renderMarketSymbolChips();
      renderSymbolAnalytics();
      loadMarketChart();
    });
  });
}

function drawMiniSparkline(canvas, market) {
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  const values = marketChartSeries.length > 0 && String(marketSymbolInput?.value || "").trim().toUpperCase() === market?.symbol
    ? marketChartSeries.map((entry) => Number(entry[4] || 0))
    : [Number(market?.lastPrice || 0) * 0.96, Number(market?.lastPrice || 0) * 0.985, Number(market?.lastPrice || 0)];
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  context.strokeStyle = Number(market?.priceChangePercent || 0) >= 0 ? "#44d7b6" : "#ff8a80";
  context.lineWidth = 2;
  context.beginPath();
  values.forEach((value, index) => {
    const x = (canvas.width / Math.max(values.length - 1, 1)) * index;
    const y = canvas.height - ((value - min) / (max - min || 1)) * (canvas.height - 16) - 8;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function hydrateSymbolJournal() {
  if (!symbolJournalSymbol || !symbolJournalNotes) {
    return;
  }

  const symbol = String(marketSymbolInput?.value || symbolJournalSymbol.value || "").trim().toUpperCase();
  symbolJournalSymbol.value = symbol;
  symbolJournalNotes.value = state.symbolJournal[symbol] || "";
}

function saveSymbolJournal(event) {
  event.preventDefault();
  const symbol = String(symbolJournalSymbol?.value || "").trim().toUpperCase();
  if (!symbol) {
    return;
  }
  const notes = String(symbolJournalNotes?.value || "").trim();
  if (notes) {
    state.symbolJournal[symbol] = notes;
  } else {
    delete state.symbolJournal[symbol];
  }
  persistSymbolJournal();
  syncStatus.textContent = `Saved journal note for ${symbol}.`;
}

function clearSymbolJournal() {
  const symbol = String(symbolJournalSymbol?.value || "").trim().toUpperCase();
  if (!symbol) {
    return;
  }
  delete state.symbolJournal[symbol];
  persistSymbolJournal();
  hydrateSymbolJournal();
}

async function analyzeCurrentChartCanvas() {
  if (!marketChartCanvas) {
    return;
  }

  const dataUrl = marketChartCanvas.toDataURL("image/png");
  chartPreviewImage.src = dataUrl;
  chartPreviewWrap.classList.remove("is-hidden");
  chartContextInput.value = `${marketSymbolInput.value} ${marketIntervalSelect.value} ${capitalize(state.marketType)} market.`;

  await submitChartAnalysis(dataUrl, chartContextInput.value.trim());
}

function renderPerformanceCharts() {
  drawEquityCurve();
  drawDailyPnlBars();
  renderMonthlyReview();
  renderSymbolPnlTable();
  renderTradeHistoryTable();
  renderRiskMetrics();
  renderInsights();
  renderSymbolPerformanceTable();
}

function renderMonthlyReview() {
  if (!monthlyReviewGrid) {
    return;
  }

  const monthKey = `${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthEvents = getFilteredEvents().filter((entry) => entry.date.startsWith(monthKey));
  const sells = monthEvents.filter((entry) => entry.side === "sell");
  const realized = monthEvents.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);
  const wins = sells.filter((entry) => getRealizedPnl(entry) > 0).length;
  const dayTotals = getDailyRealizedTotals(monthEvents);
  const bestDay = dayTotals.length > 0 ? dayTotals.reduce((best, entry) => (entry.pnl > best.pnl ? entry : best)) : null;
  const worstDay = dayTotals.length > 0 ? dayTotals.reduce((worst, entry) => (entry.pnl < worst.pnl ? entry : worst)) : null;
  const avgSell = sells.length > 0 ? sells.reduce((sum, entry) => sum + getRealizedPnl(entry), 0) / sells.length : 0;

  monthlyReviewGrid.innerHTML = [
    ["Month Realized", formatSignedMoney(realized), realized],
    ["Sell Win Rate", sells.length > 0 ? `${((wins / sells.length) * 100).toFixed(1)}%` : "0.0%", sells.length > 0 ? wins / sells.length : 0],
    ["Best Day", bestDay ? `${formatShortDate(bestDay.date)} ${formatSignedMoney(bestDay.pnl)}` : "No realized day yet", bestDay?.pnl || 0],
    ["Worst Day", worstDay ? `${formatShortDate(worstDay.date)} ${formatSignedMoney(worstDay.pnl)}` : "No losing day yet", worstDay?.pnl || 0],
    ["Sell Average", formatSignedMoney(avgSell), avgSell],
    ["Trade Count", `${monthEvents.length} trades`, monthEvents.length],
  ].map(([label, value, numeric]) => `
    <article class="analytics-item">
      <span class="muted">${escapeHtml(String(label))}</span>
      <strong class="${Number(numeric) > 0 ? "positive-text" : Number(numeric) < 0 ? "negative-text" : ""}">${escapeHtml(String(value))}</strong>
    </article>
  `).join("");
}

function renderSymbolPnlTable() {
  if (!symbolPnlTable) {
    return;
  }

  const rows = [...groupTradesBySymbol(getFilteredEvents()).values()]
    .map((group) => {
      const sellCount = group.trades.filter((entry) => entry.side === "sell").length;
      const winCount = group.trades.filter((entry) => entry.side === "sell" && getRealizedPnl(entry) > 0).length;
      return {
        symbol: group.symbol,
        realized: group.trades.reduce((sum, entry) => sum + getRealizedPnl(entry), 0),
        trades: group.trades.length,
        winRate: sellCount > 0 ? (winCount / sellCount) * 100 : 0,
        openQty: state.openPositions.find((entry) => entry.symbol === group.symbol)?.quantity || 0,
      };
    })
    .sort((left, right) => Math.abs(right.realized) - Math.abs(left.realized))
    .slice(0, 10);

  if (rows.length === 0) {
    symbolPnlTable.innerHTML = `<div class="empty-state">Sync trades to see which symbols perform best.</div>`;
    return;
  }

  symbolPnlTable.innerHTML = `
    <div class="table-head">
      <span>Symbol</span>
      <span>Realized</span>
      <span>Trades</span>
      <span>Open Qty</span>
    </div>
    ${rows.map((row) => `
      <div class="table-row">
        <span><strong>${escapeHtml(row.symbol)}</strong><br /><span class="muted">${row.winRate.toFixed(1)}% win</span></span>
        <span class="${row.realized > 0 ? "positive-text" : row.realized < 0 ? "negative-text" : ""}">${formatSignedMoney(row.realized)}</span>
        <span>${row.trades}</span>
        <span>${formatAmount(row.openQty)}</span>
      </div>
    `).join("")}
  `;
}

function renderTradeHistoryTable() {
  if (!tradeHistoryTable) {
    return;
  }

  const rows = getSortedTradeHistoryRows().slice(0, 16);
  if (rows.length === 0) {
    tradeHistoryTable.innerHTML = `<div class="empty-state">Your synced trades will appear here.</div>`;
    return;
  }

  tradeHistoryTable.innerHTML = `
    <div class="table-head">
      ${renderTradeHistorySortButton("Date", "executedAt")}
      ${renderTradeHistorySortButton("Symbol", "asset")}
      ${renderTradeHistorySortButton("Side", "side")}
      ${renderTradeHistorySortButton("Realized", "realizedPnl")}
    </div>
    ${rows.map((entry) => `
      <div class="table-row">
        <span>
          <strong>${escapeHtml(formatDateTime(Date.parse(entry.executedAt || `${entry.date}T00:00:00Z`) || 0))}</strong><br />
          <span class="muted">${escapeHtml(entry.date)}</span>
        </span>
        <span>
          <strong>${escapeHtml(entry.asset)}</strong><br />
          <span class="muted">${formatAmount(entry.amount)} @ ${formatMoney(entry.price)}</span>
        </span>
        <span>
          <span class="event-type">${escapeHtml(entry.side || "trade")}</span><br />
          <span class="muted">${formatMoney(entry.quoteAmount)}</span>
        </span>
        <span class="${getRealizedPnl(entry) > 0 ? "positive-text" : getRealizedPnl(entry) < 0 ? "negative-text" : ""}">
          <strong>${formatSignedMoney(getRealizedPnl(entry))}</strong>
        </span>
      </div>
    `).join("")}
  `;

  tradeHistoryTable.querySelectorAll("[data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextKey = String(button.dataset.sortKey || "");
      if (!nextKey) {
        return;
      }
      if (state.tradeHistorySort.key === nextKey) {
        state.tradeHistorySort.direction = state.tradeHistorySort.direction === "asc" ? "desc" : "asc";
      } else {
        state.tradeHistorySort.key = nextKey;
        state.tradeHistorySort.direction = nextKey === "asset" || nextKey === "side" ? "asc" : "desc";
      }
      renderTradeHistoryTable();
    });
  });
}

function renderTradeHistorySortButton(label, key) {
  const active = state.tradeHistorySort.key === key;
  const arrow = active ? (state.tradeHistorySort.direction === "asc" ? "↑" : "↓") : "";
  return `<button class="button ${active ? "button-primary" : "button-ghost"}" type="button" data-sort-key="${escapeHtml(key)}">${escapeHtml(label)} ${arrow}</button>`;
}

function getSortedTradeHistoryRows() {
  const rows = [...getFilteredEvents()];
  const key = state.tradeHistorySort.key;
  const factor = state.tradeHistorySort.direction === "asc" ? 1 : -1;

  rows.sort((left, right) => {
    let comparison = 0;
    if (key === "asset" || key === "side") {
      comparison = String(left[key] || "").localeCompare(String(right[key] || ""));
    } else if (key === "realizedPnl") {
      comparison = getRealizedPnl(left) - getRealizedPnl(right);
    } else {
      const leftValue = Date.parse(left.executedAt || `${left.date}T00:00:00Z`) || 0;
      const rightValue = Date.parse(right.executedAt || `${right.date}T00:00:00Z`) || 0;
      comparison = leftValue - rightValue;
    }
    return comparison * factor;
  });

  return rows;
}

function renderRiskMetrics() {
  if (!riskMetricsGrid) {
    return;
  }

  const events = getFilteredEvents();
  const sells = events.filter((entry) => entry.side === "sell");
  const wins = sells.filter((entry) => getRealizedPnl(entry) > 0).map((entry) => getRealizedPnl(entry));
  const losses = sells.filter((entry) => getRealizedPnl(entry) < 0).map((entry) => Math.abs(getRealizedPnl(entry)));
  const avgWin = wins.length ? wins.reduce((sum, value) => sum + value, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((sum, value) => sum + value, 0) / losses.length : 0;
  const profitFactor = avgLoss > 0 ? wins.reduce((sum, value) => sum + value, 0) / losses.reduce((sum, value) => sum + value, 0) : 0;
  const expectancy = sells.length > 0 ? events.filter((entry) => entry.side === "sell").reduce((sum, entry) => sum + getRealizedPnl(entry), 0) / sells.length : 0;
  const drawdown = calculateMaxDrawdown(events);
  const streaks = calculateWinLossStreaks(sells);

  riskMetricsGrid.innerHTML = [
    ["Profit Factor", profitFactor > 0 ? profitFactor.toFixed(2) : "0.00"],
    ["Average Win", formatSignedMoney(avgWin)],
    ["Average Loss", avgLoss > 0 ? formatSignedMoney(-avgLoss) : formatSignedMoney(0)],
    ["Expectancy", formatSignedMoney(expectancy)],
    ["Max Drawdown", drawdown < 0 ? formatSignedMoney(drawdown) : formatSignedMoney(0)],
    ["Best Streak", `${streaks.bestWin}W / ${streaks.bestLoss}L`],
  ].map(([label, value]) => `
    <article class="analytics-item">
      <span class="muted">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

function renderInsights() {
  if (!insightsGrid) {
    return;
  }

  const events = getFilteredEvents();
  const grouped = [...groupTradesBySymbol(events).values()]
    .map((group) => ({
      symbol: group.symbol,
      realized: group.trades.reduce((sum, entry) => sum + getRealizedPnl(entry), 0),
      trades: group.trades.length,
    }))
    .sort((left, right) => right.realized - left.realized);
  const bestSymbol = grouped[0];
  const worstSymbol = [...grouped].sort((left, right) => left.realized - right.realized)[0];
  const dayTotals = getDailyRealizedTotals(events).sort((left, right) => right.pnl - left.pnl);
  const habits = summarizeHabitTags();

  insightsGrid.innerHTML = [
    ["Best Symbol", bestSymbol ? `${bestSymbol.symbol} ${formatSignedMoney(bestSymbol.realized)}` : "No data yet"],
    ["Worst Symbol", worstSymbol ? `${worstSymbol.symbol} ${formatSignedMoney(worstSymbol.realized)}` : "No data yet"],
    ["Best Day", dayTotals[0] ? `${formatShortDate(dayTotals[0].date)} ${formatSignedMoney(dayTotals[0].pnl)}` : "No data yet"],
    ["Top Habit Tag", habits[0] ? `${formatHabitLabel(habits[0][0])} (${habits[0][1]})` : "No tags yet"],
  ].map(([label, value]) => `
    <article class="analytics-item">
      <span class="muted">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

function renderSymbolPerformanceTable() {
  if (!symbolPerformanceTable) {
    return;
  }

  const rows = [...groupTradesBySymbol(getFilteredEvents()).values()]
    .map((group) => {
      const sells = group.trades.filter((entry) => entry.side === "sell");
      const wins = sells.filter((entry) => getRealizedPnl(entry) > 0).length;
      return {
        symbol: group.symbol,
        trades: group.trades.length,
        realized: group.trades.reduce((sum, entry) => sum + getRealizedPnl(entry), 0),
        winRate: sells.length ? ((wins / sells.length) * 100).toFixed(1) : "0.0",
      };
    })
    .sort((left, right) => Math.abs(right.realized) - Math.abs(left.realized))
    .slice(0, 12);

  if (rows.length === 0) {
    symbolPerformanceTable.innerHTML = `<div class="empty-state">Sync trades to build symbol performance history.</div>`;
    return;
  }

  symbolPerformanceTable.innerHTML = `
    <div class="table-head">
      <span>Symbol</span>
      <span>Trades</span>
      <span>Win Rate</span>
      <span>Realized</span>
    </div>
    ${rows.map((row) => `
      <div class="table-row">
        <span><strong>${escapeHtml(row.symbol)}</strong></span>
        <span>${row.trades}</span>
        <span>${row.winRate}%</span>
        <span class="${row.realized > 0 ? "positive-text" : row.realized < 0 ? "negative-text" : ""}">${formatSignedMoney(row.realized)}</span>
      </div>
    `).join("")}
  `;
}

function drawEquityCurve() {
  if (!equityCurveCanvas) {
    return;
  }

  const context = equityCurveCanvas.getContext("2d");
  context.clearRect(0, 0, equityCurveCanvas.width, equityCurveCanvas.height);
  const dayTotals = getDailyRealizedTotals(getFilteredEvents()).sort((left, right) => left.date.localeCompare(right.date));
  if (dayTotals.length === 0) {
    drawEmptyCanvasMessage(context, equityCurveCanvas, "Sync trades to see your equity curve.");
    return;
  }

  const cumulative = [];
  let running = 0;
  dayTotals.forEach((entry) => {
    running += entry.pnl;
    cumulative.push(running);
  });

  drawLineCanvas(context, equityCurveCanvas, cumulative, "#7dc4ff");
}

function drawDailyPnlBars() {
  if (!dailyPnlCanvas) {
    return;
  }

  const context = dailyPnlCanvas.getContext("2d");
  context.clearRect(0, 0, dailyPnlCanvas.width, dailyPnlCanvas.height);
  const dayTotals = getDailyRealizedTotals(getFilteredEvents()).sort((left, right) => left.date.localeCompare(right.date));
  if (dayTotals.length === 0) {
    drawEmptyCanvasMessage(context, dailyPnlCanvas, "Your daily realized P/L will appear here.");
    return;
  }

  const width = dailyPnlCanvas.width;
  const height = dailyPnlCanvas.height;
  const padding = 20;
  const zeroY = height / 2;
  const maxAbs = Math.max(...dayTotals.map((entry) => Math.abs(entry.pnl)), 1);
  const barWidth = Math.max(8, (width - padding * 2) / dayTotals.length - 6);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.beginPath();
  context.moveTo(padding, zeroY);
  context.lineTo(width - padding, zeroY);
  context.stroke();

  dayTotals.forEach((entry, index) => {
    const x = padding + index * ((width - padding * 2) / dayTotals.length) + 3;
    const barHeight = Math.abs(entry.pnl) / maxAbs * (height / 2 - padding);
    const y = entry.pnl >= 0 ? zeroY - barHeight : zeroY;
    context.fillStyle = entry.pnl >= 0 ? "rgba(68,215,182,0.85)" : "rgba(255,138,128,0.85)";
    context.fillRect(x, y, barWidth, barHeight);
  });
}

function drawLineCanvas(context, canvas, values, strokeStyle) {
  const width = canvas.width;
  const height = canvas.height;
  const padding = 20;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  context.strokeStyle = strokeStyle;
  context.lineWidth = 2.4;
  context.beginPath();
  values.forEach((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function drawEmptyCanvasMessage(context, canvas, message) {
  context.fillStyle = "rgba(158,178,202,0.9)";
  context.font = "14px Space Grotesk, sans-serif";
  context.textAlign = "center";
  context.fillText(message, canvas.width / 2, canvas.height / 2);
}

function normalizeChartSymbol(symbol, marketType) {
  const raw = String(symbol || "").trim().toUpperCase();
  if (marketType === "futures") {
    if (raw.includes("_")) {
      return raw;
    }
    if (raw.endsWith("USDT")) {
      return `${raw.slice(0, -4)}_USDT`;
    }
  }

  return raw.replaceAll("_", "");
}

function getLastChartPrice() {
  const last = marketChartSeries[marketChartSeries.length - 1];
  return Number(last?.[4] || 0);
}

function calculateEmaSeries(candles, period) {
  const multiplier = 2 / (period + 1);
  let previous = null;
  return candles.map((entry) => {
    const close = Number(entry.close || 0);
    previous = previous == null ? close : (close - previous) * multiplier + previous;
    return previous;
  });
}

function drawLineSeries(context, values, maxPrice, priceRange, chartHeight, padding, chartWidth, strokeStyle) {
  if (!Array.isArray(values) || values.length === 0) {
    return;
  }

  const step = chartWidth / Math.max(values.length - 1, 1);
  context.strokeStyle = strokeStyle;
  context.lineWidth = 1.6;
  context.beginPath();
  values.forEach((value, index) => {
    const x = padding.left + step * index;
    const y = padding.top + ((maxPrice - value) / priceRange) * chartHeight;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function bindChartHover(candles, symbol, interval, maxPrice, priceRange, chartHeight, padding, gap) {
  if (!marketChartCanvas || marketChartHoverBound) {
    return;
  }

  marketChartHoverBound = true;
  marketChartCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    adjustChartZoom(event.deltaY < 0 ? 1.1 : 0.9);
  }, { passive: false });

  marketChartCanvas.addEventListener("mousedown", (event) => {
    marketChartDragState = {
      startX: event.clientX,
      startOffset: state.chartOffset,
    };
  });

  window.addEventListener("mouseup", () => {
    marketChartDragState = null;
  });

  marketChartCanvas.addEventListener("mousemove", (event) => {
    if (marketChartDragState) {
      const deltaX = event.clientX - marketChartDragState.startX;
      const shift = Math.round(deltaX / 24);
      state.chartOffset = Math.max(0, Math.min(getMaxChartOffset(), marketChartDragState.startOffset - shift));
      redrawCurrentChart();
      return;
    }

    const activeCandles = Array.isArray(marketChartSeries) && marketChartSeries.length > 0
      ? state.chartVisibleSeries
      : candles;

    if (!Array.isArray(activeCandles) || activeCandles.length === 0) {
      return;
    }

    const rect = marketChartCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * marketChartCanvas.width;
    const dynamicGap = (marketChartCanvas.width - padding.left - padding.right) / activeCandles.length;
    const index = Math.max(0, Math.min(activeCandles.length - 1, Math.round((x - padding.left) / dynamicGap)));
    const candle = activeCandles[index];
    if (!candle || !chartHoverInfo) {
      return;
    }

    state.chartHoverIndex = index;
    redrawCurrentChart();
    chartHoverInfo.textContent = `${marketSymbolInput.value} ${marketIntervalSelect.value} | ${formatDateTime(candle.time)} | O ${formatCompactPrice(candle.open)} H ${formatCompactPrice(candle.high)} L ${formatCompactPrice(candle.low)} C ${formatCompactPrice(candle.close)} V ${formatCompactVolume(candle.volume)}`;
  });

  marketChartCanvas.addEventListener("mouseleave", () => {
    state.chartHoverIndex = -1;
    redrawCurrentChart();
    if (chartHoverInfo) {
      chartHoverInfo.textContent = "Hover the chart to inspect candle values.";
    }
  });
}

function clearMarketChart() {
  if (!marketChartCanvas) {
    return;
  }

  const context = marketChartCanvas.getContext("2d");
  context.clearRect(0, 0, marketChartCanvas.width, marketChartCanvas.height);
  if (marketChartTitle) {
    marketChartTitle.textContent = "Chart unavailable";
  }
  if (marketChartPrice) {
    marketChartPrice.textContent = "Last: --";
  }
  marketChartSeries = [];
}

function drawMarketChart(klines, symbol, interval) {
  if (!marketChartCanvas) {
    return;
  }

  drawCandlesOnCanvas(marketChartCanvas, klines, symbol, interval);
}

function drawCandlesOnCanvas(canvas, klines, symbol, interval) {
  if (!canvas) {
    return;
  }

  if (!Array.isArray(klines) || klines.length === 0) {
    if (canvas === marketChartCanvas) {
      clearMarketChart();
    }
    throw new Error("No candles returned");
  }

  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 20, right: 70, bottom: 28, left: 14 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const normalized = klines.map((entry) => ({
    time: Number(entry[0]),
    open: Number(entry[1]),
    high: Number(entry[2]),
    low: Number(entry[3]),
    close: Number(entry[4]),
    volume: Number(entry[5] || 0),
  }));
  const visibleCandles = canvas === marketChartCanvas ? getVisibleCandles(normalized) : normalized;
  const lows = visibleCandles.map((entry) => entry.low);
  const highs = visibleCandles.map((entry) => entry.high);
  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);
  const priceRange = Math.max(maxPrice - minPrice, maxPrice * 0.002);
  const candleWidth = Math.max(4, chartWidth / visibleCandles.length * 0.62);
  const gap = chartWidth / visibleCandles.length;

  context.clearRect(0, 0, width, height);

  if (indicatorVolume?.checked) {
    const volumeMax = Math.max(...visibleCandles.map((entry) => entry.volume), 1);
    visibleCandles.forEach((entry, index) => {
      const x = padding.left + gap * index + gap / 2;
      const barHeight = (entry.volume / volumeMax) * 56;
      context.fillStyle = entry.close >= entry.open ? "rgba(68,215,182,0.18)" : "rgba(255,138,128,0.18)";
      context.fillRect(x - candleWidth / 2, height - padding.bottom - barHeight, candleWidth, barHeight);
    });
  }

  for (let row = 0; row < 5; row += 1) {
    const y = padding.top + (chartHeight / 4) * row;
    context.strokeStyle = "rgba(255,255,255,0.08)";
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();

    const price = maxPrice - (priceRange / 4) * row;
    context.fillStyle = "rgba(158,178,202,0.9)";
    context.font = "12px IBM Plex Mono, monospace";
    context.textAlign = "left";
    context.fillText(formatMoney(price), width - padding.right + 8, y + 4);
  }

  visibleCandles.forEach((entry, index) => {
    const x = padding.left + gap * index + gap / 2;
    const openY = padding.top + ((maxPrice - entry.open) / priceRange) * chartHeight;
    const closeY = padding.top + ((maxPrice - entry.close) / priceRange) * chartHeight;
    const highY = padding.top + ((maxPrice - entry.high) / priceRange) * chartHeight;
    const lowY = padding.top + ((maxPrice - entry.low) / priceRange) * chartHeight;
    const rising = entry.close >= entry.open;

    context.strokeStyle = rising ? "#44d7b6" : "#ff8a80";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x, highY);
    context.lineTo(x, lowY);
    context.stroke();

    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(2, Math.abs(closeY - openY));
    context.fillStyle = rising ? "rgba(68,215,182,0.9)" : "rgba(255,138,128,0.9)";
    context.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  });

  if (indicatorEma20?.checked) {
    drawLineSeries(context, calculateEmaSeries(visibleCandles, 20), maxPrice, priceRange, chartHeight, padding, chartWidth, "#f7b955");
  }
  if (indicatorEma50?.checked) {
    drawLineSeries(context, calculateEmaSeries(visibleCandles, 50), maxPrice, priceRange, chartHeight, padding, chartWidth, "#7dc4ff");
  }

  drawTradeMarkers(context, visibleCandles, symbol, maxPrice, priceRange, chartHeight, padding, gap);

  if (canvas === marketChartCanvas) {
    state.chartVisibleSeries = visibleCandles;
    drawCrosshairOverlay(context, visibleCandles, maxPrice, priceRange, chartHeight, padding, gap);
  }

  const last = visibleCandles[visibleCandles.length - 1];
  if (canvas === marketChartCanvas && marketChartTitle) {
    marketChartTitle.textContent = `${symbol} ${interval}`;
  }
  if (canvas === marketChartCanvas && marketChartPrice) {
    marketChartPrice.textContent = `Last: ${formatMoney(last.close)}`;
  }
  if (canvas === marketChartCanvas) {
    bindChartHover(visibleCandles, symbol, interval, maxPrice, priceRange, chartHeight, padding, gap);
  }
}

function getVisibleCandles(normalized) {
  const count = Math.max(18, Math.round(normalized.length / state.chartZoom));
  const maxOffset = Math.max(0, normalized.length - count);
  const start = Math.min(maxOffset, Math.max(0, state.chartOffset));
  return normalized.slice(start, start + count);
}

function getMaxChartOffset() {
  const count = Math.max(18, Math.round(marketChartSeries.length / state.chartZoom));
  return Math.max(0, marketChartSeries.length - count);
}

function drawCrosshairOverlay(context, candles, maxPrice, priceRange, chartHeight, padding, gap) {
  const index = state.chartHoverIndex;
  if (index < 0 || index >= candles.length) {
    return;
  }

  const candle = candles[index];
  const x = padding.left + gap * index + gap / 2;
  const y = padding.top + ((maxPrice - candle.close) / priceRange) * chartHeight;
  context.save();
  context.strokeStyle = "rgba(247,185,85,0.5)";
  context.setLineDash([5, 5]);
  context.beginPath();
  context.moveTo(x, padding.top);
  context.lineTo(x, padding.top + chartHeight);
  context.moveTo(padding.left, y);
  context.lineTo(padding.left + gap * candles.length, y);
  context.stroke();
  context.restore();
}

function drawTradeMarkers(context, normalized, symbol, maxPrice, priceRange, chartHeight, padding, gap) {
  const tradeSymbol = normalizeChartSymbol(symbol, "spot");
  const candleSpan = getFallbackCandleSpan(normalized);
  const matchingTrades = state.events.filter((entry) => String(entry.asset || "").toUpperCase() === tradeSymbol);

  matchingTrades.forEach((trade) => {
    const tradeTime = Date.parse(trade.executedAt || `${trade.date}T00:00:00Z`) || 0;
    const candleIndex = normalized.findIndex((candle, index) => {
      const currentStart = candle.time;
      const nextStart = normalized[index + 1]?.time || currentStart + candleSpan;
      return tradeTime >= currentStart && tradeTime < nextStart;
    });

    if (candleIndex < 0) {
      return;
    }

    const x = padding.left + gap * candleIndex + gap / 2;
    const price = Number(trade.price || normalized[candleIndex].close || 0);
    const y = padding.top + ((maxPrice - price) / priceRange) * chartHeight;

    context.beginPath();
    context.fillStyle = trade.side === "buy" ? "#7dc4ff" : "#ffca6b";
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#07111d";
    context.lineWidth = 1.5;
    context.stroke();
  });
}

function getFallbackCandleSpan(normalized) {
  if (normalized.length > 1) {
    return Math.max(60_000, normalized[1].time - normalized[0].time);
  }
  return 4 * 60 * 60 * 1000;
}

function toggleLiveChart() {
  marketChartLiveEnabled = !marketChartLiveEnabled;
  updateLiveChartUi();
  syncMarketChartTimer();
  syncMarketChartStream();

  if (marketChartLiveEnabled) {
    loadMarketChart();
    return;
  }

  if (marketChartStatus) {
    marketChartStatus.textContent = "Live chart paused. Press Live On to resume moving candles.";
  }
}

function updateLiveChartUi() {
  if (toggleLiveChartButton) {
    toggleLiveChartButton.textContent = marketChartLiveEnabled ? "Live On" : "Live Off";
    toggleLiveChartButton.className = marketChartLiveEnabled ? "button button-primary" : "button button-ghost";
  }

  if (marketChartLiveBadge) {
    marketChartLiveBadge.textContent = marketChartLiveEnabled ? "Live" : "Paused";
    marketChartLiveBadge.classList.toggle("is-off", !marketChartLiveEnabled);
  }

  renderMarketTabs();
  renderMarketSymbolChips();
  renderMarketList();
}

function syncMarketChartTimer() {
  if (marketChartTimer) {
    window.clearInterval(marketChartTimer);
    marketChartTimer = null;
  }
}

function stopLiveMarketChart() {
  if (marketChartTimer) {
    window.clearInterval(marketChartTimer);
    marketChartTimer = null;
  }

  stopMarketChartSocket();
}

function syncMarketChartStream(nextSymbol, nextInterval) {
  if (!marketChartLiveEnabled || document.hidden) {
    stopMarketChartSocket();
    return;
  }

  if (state.marketType === "futures") {
    stopMarketChartSocket();
    if (marketChartStatus) {
      marketChartStatus.textContent = `Loaded ${normalizeChartSymbol(nextSymbol || marketSymbolInput?.value, "futures")} ${nextInterval || marketIntervalSelect?.value || "4h"} futures chart from MEXC.`;
    }
    return;
  }

  const symbol = String(nextSymbol || marketSymbolInput?.value || "").trim().toUpperCase() || "BTCUSDT";
  const interval = String(nextInterval || marketIntervalSelect?.value || "4h").trim();
  const streamName = buildMarketKlineStream(symbol, interval, state.marketType);
  if (!streamName) {
    stopMarketChartSocket();
    return;
  }

  const socketReadyForStream =
    marketChartSocket &&
    marketChartSocket.readyState === WebSocket.OPEN &&
    marketChartSocket.datasetSymbol === symbol &&
    marketChartSocket.datasetInterval === interval;

  if (socketReadyForStream) {
    return;
  }

  stopMarketChartSocket();

  const socket = new WebSocket(MEXC_MARKET_WS_URL);
  socket.datasetSymbol = normalizeChartSymbol(symbol, state.marketType);
  socket.datasetInterval = interval;
  socket.datasetMarketType = state.marketType;
  marketChartSocket = socket;

  socket.addEventListener("open", () => {
    if (marketChartSocket !== socket) {
      socket.close();
      return;
    }

    if (state.marketType === "futures") {
      socket.send(streamName);
    } else {
      socket.send(JSON.stringify({
        method: "SUBSCRIPTION",
        params: [streamName],
      }));
    }

    marketChartPingTimer = window.setInterval(() => {
      if (marketChartSocket === socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ method: "PING" }));
      }
    }, 20000);

    if (marketChartStatus) {
      marketChartStatus.textContent = `Live ${symbol} ${interval} stream connected.`;
    }
  });

  socket.addEventListener("message", (event) => {
    if (marketChartSocket !== socket) {
      return;
    }

    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    if (payload.msg === "PONG" || payload.code === 0) {
      return;
    }

    if (state.marketType === "futures") {
      if (payload.channel !== "push.kline" || String(payload.symbol || "").toUpperCase() !== normalizeChartSymbol(symbol, "futures")) {
        return;
      }
      applyLiveKlineUpdate(payload.data, symbol, interval, "futures");
      return;
    }

    if (!payload.publicspotkline || String(payload.symbol || "").toUpperCase() !== symbol) {
      return;
    }

    applyLiveKlineUpdate(payload.publicspotkline, symbol, interval, "spot");
  });

  socket.addEventListener("close", () => {
    if (marketChartSocket === socket) {
      marketChartSocket = null;
      clearMarketChartSocketTimers();

      if (marketChartLiveEnabled && !document.hidden) {
        marketChartReconnectTimer = window.setTimeout(() => {
          syncMarketChartStream(symbol, interval);
        }, 2000);
      }
    }
  });

  socket.addEventListener("error", () => {
    if (marketChartStatus) {
      marketChartStatus.textContent = "Live stream connection had a problem. Reconnecting...";
    }
  });
}

function stopMarketChartSocket() {
  clearMarketChartSocketTimers();

  if (!marketChartSocket) {
    return;
  }

  const socket = marketChartSocket;
  marketChartSocket = null;
  if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
    socket.close();
  }
}

function clearMarketChartSocketTimers() {
  if (marketChartPingTimer) {
    window.clearInterval(marketChartPingTimer);
    marketChartPingTimer = null;
  }

  if (marketChartReconnectTimer) {
    window.clearTimeout(marketChartReconnectTimer);
    marketChartReconnectTimer = null;
  }
}

function buildMarketKlineStream(symbol, interval, marketType) {
  const map = {
    "1m": "Min1",
    "5m": "Min5",
    "15m": "Min15",
    "30m": "Min30",
    "60m": "Min60",
    "4h": "Hour4",
    "1d": "Day1",
    "1W": "Week1",
  };

  const streamInterval = map[interval];
  if (!streamInterval) {
    return "";
  }

  if (marketType === "futures") {
    return JSON.stringify({
      method: "sub.kline",
      param: {
        symbol: normalizeChartSymbol(symbol, "futures"),
        interval: streamInterval,
      },
    });
  }

  return `spot@public.kline.v3.api.pb@${symbol}@${streamInterval}`;
}

function applyLiveKlineUpdate(kline, symbol, interval, marketType) {
  const nextCandle = marketType === "futures"
    ? [
        Number(kline.t || 0) * 1000,
        Number(kline.o || 0),
        Number(kline.h || 0),
        Number(kline.l || 0),
        Number(kline.c || 0),
        Number(kline.q || 0),
      ]
    : [
        Number(kline.windowstart || 0) * 1000,
        Number(kline.openingprice || 0),
        Number(kline.highestprice || 0),
        Number(kline.lowestprice || 0),
        Number(kline.closingprice || 0),
        Number(kline.volume || 0),
      ];

  if (!nextCandle[0]) {
    return;
  }

  const nextSeries = [...marketChartSeries];
  const existingIndex = nextSeries.findIndex((entry) => Number(entry[0]) === nextCandle[0]);
  if (existingIndex >= 0) {
    nextSeries[existingIndex] = nextCandle;
  } else {
    nextSeries.push(nextCandle);
  }

  marketChartSeries = nextSeries.slice(-80);
  drawMarketChart(marketChartSeries, symbol, interval);

  if (marketChartStatus) {
    marketChartStatus.textContent = `Live ${symbol} ${interval} chart is streaming from MEXC.`;
  }
  checkAlertsForSymbol(symbol, Number(nextCandle[4] || 0));
}

function handleChartVisibilityChange() {
  if (document.hidden) {
    stopLiveMarketChart();
    return;
  }

  syncMarketChartTimer();
  if (marketChartLiveEnabled) {
    loadMarketChart();
  }
}

function setDefaultSyncRange() {
  if (!mexcForm.elements.startDate.value) {
    mexcForm.elements.startDate.value = shiftDateKey(new Date(), -30);
  }
  if (!mexcForm.elements.endDate.value) {
    mexcForm.elements.endDate.value = formatDateKey(new Date());
  }
}

function persistEvents(skipCloud = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  if (!skipCloud) {
    scheduleProfileSave();
  }
}

function loadNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistNotes(skipCloud = false) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(state.notesByDate));
  if (!skipCloud) {
    scheduleProfileSave();
  }
}

function loadGoals() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) || "{}");
    return {
      monthlyPnlTarget: Number(parsed.monthlyPnlTarget || 0),
      maxLossLimit: Number(parsed.maxLossLimit || 0),
      maxTradesPerDay: Number(parsed.maxTradesPerDay || 0),
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
    };
  } catch {
    return {
      monthlyPnlTarget: 0,
      maxLossLimit: 0,
      maxTradesPerDay: 0,
      onboardingCompleted: false,
    };
  }
}

function persistGoals(skipCloud = false) {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(state.goals));
  if (!skipCloud) {
    scheduleProfileSave();
  }
}

function loadHabits() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistHabits(skipCloud = false) {
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(state.habitsByDate));
  if (!skipCloud) {
    scheduleProfileSave();
  }
}

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry || "").trim().toUpperCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function persistFavorites(skipCloud = false) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favorites));
  if (!skipCloud) {
    scheduleProfileSave();
  }
}

function loadWatchlists() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WATCHLISTS_STORAGE_KEY) || "{\"Main\":[]}");
    return sanitizeWatchlists(parsed);
  } catch {
    return { Main: [] };
  }
}

function sanitizeWatchlists(value) {
  const source = value && typeof value === "object" ? value : {};
  const entries = Object.entries(source).map(([name, symbols]) => [
    String(name || "").trim(),
    Array.isArray(symbols) ? [...new Set(symbols.map((entry) => String(entry || "").trim().toUpperCase()).filter(Boolean))] : [],
  ]).filter(([name]) => Boolean(name));
  if (entries.length === 0) {
    return { Main: [] };
  }
  return Object.fromEntries(entries);
}

function persistWatchlists(skipCloud = false) {
  localStorage.setItem(WATCHLISTS_STORAGE_KEY, JSON.stringify(state.watchlists));
  if (!skipCloud) {
    scheduleProfileSave();
  }
}

function hydrateGoalsForm() {
  if (goalMonthlyPnlInput) {
    goalMonthlyPnlInput.value = state.goals.monthlyPnlTarget || "";
  }
  if (goalMaxLossInput) {
    goalMaxLossInput.value = state.goals.maxLossLimit || "";
  }
  if (goalMaxTradesInput) {
    goalMaxTradesInput.value = state.goals.maxTradesPerDay || "";
  }
}

function saveGoals(event) {
  event.preventDefault();
  state.goals.monthlyPnlTarget = Number(goalMonthlyPnlInput?.value || 0);
  state.goals.maxLossLimit = Number(goalMaxLossInput?.value || 0);
  state.goals.maxTradesPerDay = Number(goalMaxTradesInput?.value || 0);
  persistGoals();
  goalsStatus.textContent = "Goals saved.";
  renderInsights();
}

function saveHabitTagForSelectedDate() {
  const tag = String(habitTagSelect?.value || "").trim();
  if (!tag) {
    return;
  }
  state.habitsByDate[state.selectedDate] = [...new Set([...(state.habitsByDate[state.selectedDate] || []), tag])];
  persistHabits();
  renderHabitSummary();
  renderInsights();
  goalsStatus.textContent = `Saved ${formatHabitLabel(tag)} for ${formatShortDate(state.selectedDate)}.`;
}

function renderHabitSummary() {
  if (!habitSummary) {
    return;
  }
  const entries = Object.entries(state.habitsByDate).filter(([, tags]) => Array.isArray(tags) && tags.length > 0);
  if (entries.length === 0) {
    habitSummary.className = "event-list empty-state";
    habitSummary.textContent = "No habit tags saved yet.";
    return;
  }
  habitSummary.className = "event-list";
  habitSummary.innerHTML = entries.slice(-6).reverse().map(([date, tags]) => `
    <article class="event-item">
      <div class="event-meta">
        <span class="event-type">habit</span>
        <span>${escapeHtml(formatShortDate(date))}</span>
      </div>
      <div class="trade-stats">
        ${tags.map((tag) => `<span class="event-chip muted-chip">${escapeHtml(formatHabitLabel(tag))}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function summarizeHabitTags() {
  const counts = new Map();
  Object.values(state.habitsByDate).forEach((tags) => {
    (Array.isArray(tags) ? tags : []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function formatHabitLabel(tag) {
  return String(tag || "").split("-").map((part) => capitalize(part)).join(" ");
}

function renderTradeReplay() {
  if (!tradeReplayPanel) {
    return;
  }
  const events = getEventsForDate(state.selectedDate, true).sort((left, right) => (left.executedAt || "").localeCompare(right.executedAt || ""));
  if (events.length === 0) {
    tradeReplayPanel.className = "event-list empty-state";
    tradeReplayPanel.textContent = "Pick a day with trades to review them one by one.";
    return;
  }

  const index = Math.min(events.length - 1, Math.max(0, state.replayIndexByDate[state.selectedDate] || 0));
  state.replayIndexByDate[state.selectedDate] = index;
  const entry = events[index];
  tradeReplayPanel.className = "event-list";
  tradeReplayPanel.innerHTML = `
    <article class="event-item">
      <div class="event-meta">
        <span class="event-type">replay</span>
        <span>${index + 1} / ${events.length}</span>
      </div>
      <h3>${escapeHtml(entry.asset)} ${escapeHtml(entry.side || "trade")}</h3>
      <div class="trade-stats">
        <span>Time: ${escapeHtml(formatDateTime(Date.parse(entry.executedAt || `${entry.date}T00:00:00Z`) || 0))}</span>
        <span>Qty: ${formatAmount(entry.amount)}</span>
        <span>Price: ${formatMoney(entry.price)}</span>
        <span class="${getRealizedPnl(entry) >= 0 ? "positive-text" : "negative-text"}">Realized: ${formatSignedMoney(getRealizedPnl(entry))}</span>
      </div>
      <div class="stack-row">
        <button class="button button-ghost" type="button" data-replay-step="-1">Previous</button>
        <button class="button button-secondary" type="button" data-replay-open="${escapeHtml(entry.asset)}">Open Symbol</button>
        <button class="button button-ghost" type="button" data-replay-step="1">Next</button>
      </div>
    </article>
  `;
  tradeReplayPanel.querySelectorAll("[data-replay-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.replayStep || 0);
      state.replayIndexByDate[state.selectedDate] = Math.min(events.length - 1, Math.max(0, index + step));
      renderTradeReplay();
    });
  });
  tradeReplayPanel.querySelector("[data-replay-open]")?.addEventListener("click", () => {
    marketSymbolInput.value = String(entry.asset || "").toUpperCase();
    switchMainWindow("markets");
    loadMarketChart();
  });
}

function loadAlerts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAlerts(skipCloud = false) {
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(state.alerts));
  if (!skipCloud) {
    scheduleProfileSave();
  }
}

function loadSymbolJournal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SYMBOL_JOURNAL_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistSymbolJournal(skipCloud = false) {
  localStorage.setItem(SYMBOL_JOURNAL_STORAGE_KEY, JSON.stringify(state.symbolJournal));
  if (!skipCloud) {
    scheduleProfileSave();
  }
}

function dedupeById(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = String(item?.id || crypto.randomUUID?.() || Math.random());
    map.set(key, item);
  });
  return [...map.values()];
}

function notifyAlertTriggered(alert, livePrice) {
  const summary = `${alert.symbol} moved ${alert.direction} ${formatMoney(alert.price)}. Last ${formatMoney(livePrice)}.`;
  playAlertTone();
  showServiceWorkerNotification("Crypto Calendar Alert", summary).catch(() => {});

  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    new Notification("Crypto Calendar Alert", { body: summary });
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Crypto Calendar Alert", { body: summary });
      }
    }).catch(() => {});
  }
}

function playAlertTone() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
  oscillator.onended = () => context.close().catch(() => {});
}

function groupTradesBySymbol(events) {
  return events.reduce((groups, entry) => {
    const symbol = String(entry.asset || "").toUpperCase();
    if (!groups.has(symbol)) {
      groups.set(symbol, { symbol, trades: [] });
    }
    groups.get(symbol).trades.push(entry);
    return groups;
  }, new Map());
}

function calculateMaxDrawdown(events) {
  const dayTotals = getDailyRealizedTotals(events).sort((left, right) => left.date.localeCompare(right.date));
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  dayTotals.forEach((entry) => {
    equity += entry.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - peak);
  });
  return maxDrawdown;
}

function calculateWinLossStreaks(sells) {
  let bestWin = 0;
  let bestLoss = 0;
  let currentWin = 0;
  let currentLoss = 0;
  sells.forEach((entry) => {
    if (getRealizedPnl(entry) > 0) {
      currentWin += 1;
      currentLoss = 0;
    } else if (getRealizedPnl(entry) < 0) {
      currentLoss += 1;
      currentWin = 0;
    }
    bestWin = Math.max(bestWin, currentWin);
    bestLoss = Math.max(bestLoss, currentLoss);
  });
  return { bestWin, bestLoss };
}

function getFilteredEvents() {
  return state.events.filter((entry) => {
    if (state.filters.symbol && !String(entry.asset || "").toUpperCase().includes(state.filters.symbol)) {
      return false;
    }
    if (state.filters.side !== "all" && entry.side !== state.filters.side) {
      return false;
    }
    if (state.filters.result === "wins" && getRealizedPnl(entry) <= 0) {
      return false;
    }
    if (state.filters.result === "losses" && getRealizedPnl(entry) >= 0) {
      return false;
    }
    if (state.filters.marketType === "spot" && String(entry.asset || "").includes("_")) {
      return false;
    }
    if (state.filters.marketType === "futures" && !String(entry.asset || "").includes("_")) {
      return false;
    }
    if (state.filters.startDate && entry.date < state.filters.startDate) {
      return false;
    }
    if (state.filters.endDate && entry.date > state.filters.endDate) {
      return false;
    }
    return true;
  });
}

function handleFiltersChanged() {
  state.filters = {
    symbol: String(filterSymbolInput?.value || "").trim().toUpperCase(),
    side: String(filterSideSelect?.value || "all"),
    result: String(filterResultSelect?.value || "all"),
    marketType: String(filterMarketTypeSelect?.value || "all"),
    startDate: String(filterStartDateInput?.value || ""),
    endDate: String(filterEndDateInput?.value || ""),
  };
  renderStats();
  renderCalendar();
  renderSelectedDate();
  renderPerformanceCharts();
}

function clearFilters() {
  state.filters = { symbol: "", side: "all", result: "all", marketType: "all", startDate: "", endDate: "" };
  if (filterSymbolInput) filterSymbolInput.value = "";
  if (filterSideSelect) filterSideSelect.value = "all";
  if (filterResultSelect) filterResultSelect.value = "all";
  if (filterMarketTypeSelect) filterMarketTypeSelect.value = "all";
  if (filterStartDateInput) filterStartDateInput.value = "";
  if (filterEndDateInput) filterEndDateInput.value = "";
  handleFiltersChanged();
}

function renderTradeHistorySortButton(label, key) {
  const active = state.tradeHistorySort.key === key;
  const arrow = active ? (state.tradeHistorySort.direction === "asc" ? "^" : "v") : "";
  return `<button class="button ${active ? "button-primary" : "button-ghost"}" type="button" data-sort-key="${escapeHtml(key)}">${escapeHtml(label)} ${arrow}</button>`;
}

function getEventsForDate(dateKey, filtered = false) {
  const source = filtered ? getFilteredEvents() : state.events;
  return source.filter((entry) => entry.date === dateKey);
}

function normalizeEvent(entry) {
  const normalizedDate = String(entry.date || "").slice(0, 10);
  if (!normalizedDate || Number.isNaN(new Date(normalizedDate).valueOf())) {
    throw new Error("Each event needs a valid date in YYYY-MM-DD format");
  }

  return {
    id: entry.id || crypto.randomUUID(),
    date: normalizedDate,
    type: String(entry.type || "trade").toLowerCase(),
    asset: String(entry.asset || "UNKNOWN").toUpperCase(),
    amount: Number(entry.amount || 0),
    side: String(entry.side || "").toLowerCase(),
    price: Number(entry.price || 0),
    quoteAmount: Number(entry.quoteAmount || 0),
    baseAsset: String(entry.baseAsset || entry.asset || "").toUpperCase(),
    fee: Number(entry.fee || 0),
    feeAsset: String(entry.feeAsset || "").toUpperCase(),
    isMaker: Boolean(entry.isMaker),
    executedAt: String(entry.executedAt || entry.date || ""),
    realizedPnl: Number(entry.realizedPnl || 0),
    notes: String(entry.notes || "").trim(),
  };
}

function isLegacyDemoEvent(entry) {
  return LEGACY_DEMO_NOTES.has(entry.notes);
}

function mergeEvents(existing, incoming) {
  const byId = new Map(existing.map((entry) => [entry.id, entry]));
  incoming.forEach((entry) => byId.set(entry.id, entry));
  return [...byId.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function deleteActivity(id) {
  const beforeCount = state.events.length;
  state.events = state.events.filter((entry) => entry.id !== id);
  if (state.events.length === beforeCount) {
    return;
  }

  recalculateRealizedPnl();
  persistEvents();
  renderStats();
  renderCalendar();
  renderSelectedDate();
  hydrateDayNoteForm();
  renderSymbolAnalytics();
  renderPerformanceCharts();
  renderMiniCharts();
  syncStatus.textContent = "Trade deleted from your calendar.";
}

function formatDateKey(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function shiftDateKey(date, offsetDays) {
  const next = new Date(date);
  next.setDate(next.getDate() + offsetDays);
  return formatDateKey(next);
}

function formatAmount(amount) {
  const numeric = Number(amount || 0);
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

function formatMoney(amount) {
  const numeric = convertQuoteToFiat(amount);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: state.fiatCurrency || DEFAULT_FIAT_CURRENCY,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatSignedMoney(amount) {
  const numeric = Number(amount || 0);
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(numeric))}`;
}

function formatPercent(value) {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}%`;
}

function formatCompactPrice(value) {
  const numeric = convertQuoteToFiat(value);
  const maximumFractionDigits = numeric >= 1000 ? 2 : numeric >= 1 ? 4 : 6;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: state.fiatCurrency || DEFAULT_FIAT_CURRENCY,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(numeric);
}

function convertQuoteToFiat(amount) {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if ((state.fiatCurrency || DEFAULT_FIAT_CURRENCY) === "PHP") {
    return numeric * Math.max(Number(state.usdtToPhpRate || DEFAULT_USDT_TO_PHP_RATE), 0);
  }
  return numeric;
}

function formatPlainNumber(value, maximumFractionDigits = 2) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("en-US", { maximumFractionDigits });
}

function formatInputDecimal(value, maximumFractionDigits = 2) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  return numeric.toFixed(maximumFractionDigits);
}

function getMoneyDisplayLabel() {
  return `${state.fiatCurrency || DEFAULT_FIAT_CURRENCY} view (${formatPlainNumber(state.usdtToPhpRate, 2)} PHP per USDT)`;
}

function renderMarketChartSummary() {
  if (marketChartMeta) {
    marketChartMeta.textContent = getMoneyDisplayLabel();
  }
  if (mobileTradeMeta) {
    mobileTradeMeta.textContent = getMoneyDisplayLabel();
  }
  if (portfolioRateLabel) {
    portfolioRateLabel.textContent = getMoneyDisplayLabel();
  }
}

function renderPortfolioSnapshot() {
  if (!portfolioSnapshotGrid || !portfolioHoldingsList) {
    return;
  }

  const openPositions = [...state.openPositions];
  const totalMarketValue = openPositions.reduce((sum, entry) => sum + Number(entry.marketValue || 0), 0);
  const totalCost = openPositions.reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0);
  const totalUnrealized = openPositions.reduce((sum, entry) => sum + Number(entry.unrealizedPnl || 0), 0);
  const totalRealized = state.events.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);

  portfolioSnapshotGrid.innerHTML = [
    ["Portfolio Value", formatMoney(totalMarketValue)],
    ["Cost Basis", formatMoney(totalCost)],
    ["Unrealized P/L", formatSignedMoney(totalUnrealized)],
    ["Realized P/L", formatSignedMoney(totalRealized)],
    ["Open Positions", String(openPositions.length)],
    ["Tracked Symbols", String(new Set(openPositions.map((entry) => entry.symbol)).size)],
  ].map(([label, value]) => `
    <article class="analytics-item">
      <span class="muted">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");

  if (openPositions.length === 0) {
    portfolioHoldingsList.className = "event-list empty-state";
    portfolioHoldingsList.textContent = "No holdings detected yet.";
    return;
  }

  portfolioHoldingsList.className = "event-list";
  portfolioHoldingsList.innerHTML = openPositions
    .sort((left, right) => Number(right.marketValue || 0) - Number(left.marketValue || 0))
    .map((position) => `
      <article class="event-item">
        <div class="event-meta">
          <span class="event-type">holding</span>
          <span>${escapeHtml(position.symbol)}</span>
        </div>
        <h3>${formatAmount(position.quantity)} ${escapeHtml(position.symbol)}</h3>
        <div class="trade-stats">
          <span>Value: ${formatMoney(position.marketValue)}</span>
          <span>Cost: ${formatMoney(position.totalCost)}</span>
          <span class="${position.unrealizedPnl >= 0 ? "positive-text" : "negative-text"}">Unrealized: ${formatSignedMoney(position.unrealizedPnl)}</span>
        </div>
      </article>
    `).join("");
}

function formatCompactVolume(value) {
  const numeric = Number(value || 0);
  if (numeric >= 1_000_000_000) {
    return `${(numeric / 1_000_000_000).toFixed(2)}B`;
  }
  if (numeric >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(2)}M`;
  }
  if (numeric >= 1_000) {
    return `${(numeric / 1_000).toFixed(2)}K`;
  }
  return numeric.toFixed(2);
}

function summarizeTrades(events) {
  const totalRealizedPnl = events.reduce((sum, entry) => sum + getRealizedPnl(entry), 0);
  const pnlClass = totalRealizedPnl > 0 ? "positive" : totalRealizedPnl < 0 ? "negative" : "neutral";
  return {
    label: "Realized P/L",
    value: formatSignedMoney(totalRealizedPnl),
    pnlClass,
  };
}

function getRealizedPnl(entry) {
  return Number(entry.realizedPnl || 0);
}

function getDailyRealizedTotals(events) {
  const totals = new Map();
  events.forEach((entry) => {
    const next = (totals.get(entry.date) || 0) + getRealizedPnl(entry);
    totals.set(entry.date, next);
  });
  return [...totals.entries()].map(([date, pnl]) => ({ date, pnl }));
}

function formatShortDate(dateKey) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatDateTime(value) {
  const parsed = new Date(Number(value || 0));
  if (Number.isNaN(parsed.valueOf())) {
    return "Unknown time";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function capitalize(value) {
  const text = String(value || "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function renderOpenPositions() {
  if (!openPositionsList) {
    return;
  }

  if (state.openPositions.length === 0) {
    openPositionsList.className = "event-list empty-state";
    openPositionsList.textContent = "No open positions detected from synced trade history.";
    return;
  }

  openPositionsList.className = "event-list";
  openPositionsList.innerHTML = state.openPositions
    .sort((left, right) => Math.abs(right.unrealizedPnl) - Math.abs(left.unrealizedPnl))
    .map((position) => `
      <article class="event-item">
        <div class="event-meta">
          <span class="event-type">open</span>
          <span>${escapeHtml(position.symbol)}</span>
        </div>
        <h3>${formatAmount(position.quantity)} ${escapeHtml(position.symbol)}</h3>
        <div class="trade-stats">
          <span>Avg Cost: ${formatMoney(position.averageCost)}</span>
          <span>Last Price: ${position.marketPrice > 0 ? formatMoney(position.marketPrice) : "N/A"}</span>
          <span>Value: ${position.marketPrice > 0 ? formatMoney(position.marketValue) : "N/A"}</span>
          <span class="${position.unrealizedPnl >= 0 ? "positive-text" : "negative-text"}">Unrealized P/L: ${formatSignedMoney(position.unrealizedPnl)}</span>
        </div>
      </article>
    `)
    .join("");
}

function recalculateRealizedPnl() {
  const fifoBySymbol = new Map();
  const ordered = [...state.events].sort((left, right) => {
    const leftTime = Date.parse(left.executedAt || `${left.date}T00:00:00Z`) || 0;
    const rightTime = Date.parse(right.executedAt || `${right.date}T00:00:00Z`) || 0;
    return leftTime - rightTime;
  });

  ordered.forEach((entry) => {
    const symbolKey = String(entry.asset || "UNKNOWN").toUpperCase();
    const baseAsset = String(entry.baseAsset || symbolKey).toUpperCase();
    const feeAsset = String(entry.feeAsset || "").toUpperCase();
    const quantity = Number(entry.amount || 0);
    const quoteAmount = Number(entry.quoteAmount || 0);
    const fee = Number(entry.fee || 0);

    if (!fifoBySymbol.has(symbolKey)) {
      fifoBySymbol.set(symbolKey, []);
    }

    const lots = fifoBySymbol.get(symbolKey);

    if (entry.side === "buy") {
      const acquiredQty = Math.max(0, quantity - (feeAsset === baseAsset ? fee : 0));
      const totalCost = quoteAmount + (feeAsset !== baseAsset ? fee : 0);
      if (acquiredQty > 0) {
        lots.push({
          quantity: acquiredQty,
          unitCost: totalCost / acquiredQty,
        });
      }
      entry.realizedPnl = 0;
      return;
    }

    if (entry.side !== "sell") {
      entry.realizedPnl = 0;
      return;
    }

    let quantityToClose = quantity + (feeAsset === baseAsset ? fee : 0);
    let costBasis = 0;
    while (quantityToClose > 0 && lots.length > 0) {
      const lot = lots[0];
      const matchedQty = Math.min(quantityToClose, lot.quantity);
      costBasis += matchedQty * lot.unitCost;
      lot.quantity -= matchedQty;
      quantityToClose -= matchedQty;
      if (lot.quantity <= 1e-12) {
        lots.shift();
      }
    }

    if (quantityToClose > 1e-12) {
      const fallbackUnitCost = quantity > 0 ? quoteAmount / quantity : 0;
      costBasis += quantityToClose * fallbackUnitCost;
    }

    const proceeds = quoteAmount - (feeAsset !== baseAsset ? fee : 0);
    entry.realizedPnl = proceeds - costBasis;
  });

  state.events = ordered;
  state.openPositions = [...fifoBySymbol.entries()]
    .map(([symbol, lots]) => buildOpenPosition(symbol, lots, state.pricesBySymbol[symbol]))
    .filter(Boolean);
}

function buildOpenPosition(symbol, lots, currentPrice) {
  const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  if (quantity <= 1e-12) {
    return null;
  }

  const totalCost = lots.reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0);
  const averageCost = quantity > 0 ? totalCost / quantity : 0;
  const marketPrice = Number(currentPrice || 0);
  const marketValue = quantity * marketPrice;
  const unrealizedPnl = marketPrice > 0 ? marketValue - totalCost : 0;

  return {
    symbol,
    quantity,
    averageCost,
    marketPrice,
    marketValue,
    totalCost,
    unrealizedPnl,
  };
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
