const STORAGE_KEY = "crypto-calendar-events-v1";
const NOTES_STORAGE_KEY = "crypto-calendar-notes-v1";
const MEXC_STORAGE_KEY = "crypto-calendar-mexc-config-v2";
const MEXC_SESSION_KEY = "crypto-calendar-mexc-session-v2";
const FAVORITES_STORAGE_KEY = "crypto-calendar-favorites-v1";
const ALERTS_STORAGE_KEY = "crypto-calendar-alerts-v1";
const SYMBOL_JOURNAL_STORAGE_KEY = "crypto-calendar-symbol-journal-v1";
const API_BASE_URL = window.location.origin;
const MEXC_MARKET_WS_URL = "wss://wbs-api.mexc.com/ws";
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
};

const monthLabel = document.getElementById("monthLabel");
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
const marketChartLiveBadge = document.getElementById("marketChartLiveBadge");
const marketChartCanvas = document.getElementById("marketChartCanvas");
const chartHoverInfo = document.getElementById("chartHoverInfo");
const indicatorVolume = document.getElementById("indicatorVolume");
const indicatorEma20 = document.getElementById("indicatorEma20");
const indicatorEma50 = document.getElementById("indicatorEma50");
const miniChartsGrid = document.getElementById("miniChartsGrid");
const symbolAnalytics = document.getElementById("symbolAnalytics");
const alertForm = document.getElementById("alertForm");
const alertsList = document.getElementById("alertsList");
const alertSymbolInput = document.getElementById("alertSymbolInput");
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
const DEFAULT_MARKET_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "BNBUSDT"];

bootstrap();

document.getElementById("prevMonthButton").addEventListener("click", () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderStats();
  renderCalendar();
});

document.getElementById("nextMonthButton").addEventListener("click", () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderStats();
  renderCalendar();
});

document.getElementById("todayButton").addEventListener("click", () => {
  state.currentMonth = new Date();
  state.selectedDate = formatDateKey(new Date());
  renderStats();
  renderCalendar();
  renderSelectedDate();
  hydrateDayNoteForm();
});

document.getElementById("resetButton").addEventListener("click", () => {
  state.events = [];
  persistEvents();
  renderStats();
  renderCalendar();
  renderSelectedDate();
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
chartImageInput.addEventListener("change", handleChartPreview);
fieldToggles.forEach((button) => {
  button.addEventListener("click", () => toggleSecretField(button));
});

mexcForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const config = readMexcForm();
  persistMexcConfig(config);
  renderMarketSymbolChips();
  renderMarketList();
  syncStatus.textContent = config.apiKey ? (config.rememberKeys ? "MEXC keys remembered on this device." : "MEXC keys saved for this browser session only.") : "Saved with empty keys. Add keys before syncing.";
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
  hydrateMexcForm();
  setDefaultSyncRange();
  const session = await restoreSession();

  if (session?.authenticated) {
    showAuthenticatedApp(session.user);
    initializeDashboard();
    return;
  }

  showLoginGate();
  initializeGoogleLogin();
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
  renderMarketSymbolChips();
  updateLiveChartUi();
  hydrateSymbolJournal();
  renderAlerts();
  renderSymbolAnalytics();
  renderMiniCharts();
  loadMarketCatalog();
  loadMarketChart();
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

  const events = [...state.events];
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
    const dayEvents = getEventsForDate(dateKey);
    const daySummary = summarizeTrades(dayEvents);
    const isOtherMonth = day.getMonth() !== month;
    const isToday = dateKey === formatDateKey(new Date());
    const isSelected = dateKey === state.selectedDate;

    cells.push(`
      <button class="calendar-day ${isOtherMonth ? "is-other-month" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}" data-date="${dateKey}">
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
  const events = getEventsForDate(state.selectedDate);
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
    renderStats();
    renderCalendar();
    renderSelectedDate();
    renderSymbolAnalytics();
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

    showAuthenticatedApp(payload.user);
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
  setDefaultSyncRange();
  resetSecretFieldStates();
  syncStatus.textContent = "Stored MEXC keys and sync settings cleared from this browser.";
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
    rememberKeys: formData.get("rememberKeys") === "on",
  };
}

function persistMexcConfig(config) {
  const sharedConfig = {
    apiBase: config.apiBase,
    symbols: config.symbols,
    startDate: config.startDate,
    endDate: config.endDate,
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
    drawMarketChart(marketChartSeries, resolvedSymbol, interval);
    if (marketChartMeta) {
      marketChartMeta.textContent = `${capitalize(state.marketType)} market with live MEXC feed.`;
    }
    if (marketChartStatus) {
      marketChartStatus.textContent = marketChartLiveEnabled
        ? `Live ${resolvedSymbol} ${interval} chart is streaming from MEXC.`
        : `Loaded ${resolvedSymbol} ${interval} chart from MEXC.`;
    }
    syncMarketChartTimer();
    syncMarketChartStream(resolvedSymbol, interval);
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
}

function seedAlertFormFromCurrentSymbol() {
  if (!alertSymbolInput) {
    return;
  }

  alertSymbolInput.value = String(marketSymbolInput?.value || "").trim().toUpperCase();
  document.getElementById("alertPriceInput").value = String(getLastChartPrice() || "");
}

function saveAlert(event) {
  event.preventDefault();
  const symbol = String(alertSymbolInput?.value || "").trim().toUpperCase();
  const price = Number(document.getElementById("alertPriceInput")?.value || 0);
  const direction = String(document.getElementById("alertDirectionSelect")?.value || "above");
  const note = String(document.getElementById("alertNoteInput")?.value || "").trim();
  if (!symbol || !price) {
    return;
  }

  state.alerts.push({
    id: crypto.randomUUID(),
    symbol,
    price,
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
          <div class="event-notes">${formatMoney(alert.price)} ${alert.note ? `- ${escapeHtml(alert.note)}` : ""}</div>
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
    ["Avg Cost", position ? formatMoney(position.averageCost) : "0.00"],
    ["Unrealized", position ? formatSignedMoney(position.unrealizedPnl) : "0.00"],
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
  marketChartCanvas.addEventListener("mousemove", (event) => {
    const activeCandles = Array.isArray(marketChartSeries) && marketChartSeries.length > 0
      ? marketChartSeries.map((entry) => ({
          time: Number(entry[0]),
          open: Number(entry[1]),
          high: Number(entry[2]),
          low: Number(entry[3]),
          close: Number(entry[4]),
          volume: Number(entry[5] || 0),
        }))
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

    chartHoverInfo.textContent = `${marketSymbolInput.value} ${marketIntervalSelect.value} | ${formatDateTime(candle.time)} | O ${formatCompactPrice(candle.open)} H ${formatCompactPrice(candle.high)} L ${formatCompactPrice(candle.low)} C ${formatCompactPrice(candle.close)} V ${formatCompactVolume(candle.volume)}`;
  });

  marketChartCanvas.addEventListener("mouseleave", () => {
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

  if (!Array.isArray(klines) || klines.length === 0) {
    clearMarketChart();
    throw new Error("No candles returned");
  }

  const canvas = marketChartCanvas;
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
  const lows = normalized.map((entry) => entry.low);
  const highs = normalized.map((entry) => entry.high);
  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);
  const priceRange = Math.max(maxPrice - minPrice, maxPrice * 0.002);
  const candleWidth = Math.max(4, chartWidth / normalized.length * 0.62);
  const gap = chartWidth / normalized.length;

  context.clearRect(0, 0, width, height);

  if (indicatorVolume?.checked) {
    const volumeMax = Math.max(...normalized.map((entry) => entry.volume), 1);
    normalized.forEach((entry, index) => {
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

  normalized.forEach((entry, index) => {
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
    drawLineSeries(context, calculateEmaSeries(normalized, 20), maxPrice, priceRange, chartHeight, padding, chartWidth, "#f7b955");
  }
  if (indicatorEma50?.checked) {
    drawLineSeries(context, calculateEmaSeries(normalized, 50), maxPrice, priceRange, chartHeight, padding, chartWidth, "#7dc4ff");
  }

  const last = normalized[normalized.length - 1];
  if (marketChartTitle) {
    marketChartTitle.textContent = `${symbol} ${interval}`;
  }
  if (marketChartPrice) {
    marketChartPrice.textContent = `Last: ${formatMoney(last.close)}`;
  }

  bindChartHover(normalized, symbol, interval, maxPrice, priceRange, chartHeight, padding, gap);
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

function persistEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
}

function loadNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistNotes() {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(state.notesByDate));
}

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry || "").trim().toUpperCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function persistFavorites() {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favorites));
}

function loadAlerts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAlerts() {
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(state.alerts));
}

function loadSymbolJournal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SYMBOL_JOURNAL_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistSymbolJournal() {
  localStorage.setItem(SYMBOL_JOURNAL_STORAGE_KEY, JSON.stringify(state.symbolJournal));
}

function getEventsForDate(dateKey) {
  return state.events.filter((entry) => entry.date === dateKey);
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
  const numeric = Number(amount || 0);
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const numeric = Number(value || 0);
  if (numeric >= 1000) {
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (numeric >= 1) {
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 6 });
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
