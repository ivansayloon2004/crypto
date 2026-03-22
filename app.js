const STORAGE_KEY = "crypto-calendar-events-v1";
const NOTES_STORAGE_KEY = "crypto-calendar-notes-v1";
const MEXC_STORAGE_KEY = "crypto-calendar-mexc-config-v2";
const MEXC_SESSION_KEY = "crypto-calendar-mexc-session-v2";
const API_BASE_URL = window.location.origin;
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
const fieldToggles = document.querySelectorAll(".field-toggle");
const loginGate = document.getElementById("loginGate");
const appShell = document.getElementById("appShell");
const loginStatus = document.getElementById("loginStatus");
const googleButton = document.getElementById("googleButton");
const userEmail = document.getElementById("userEmail");
let dashboardInitialized = false;

bootstrap();

document.getElementById("prevMonthButton").addEventListener("click", () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderCalendar();
});

document.getElementById("nextMonthButton").addEventListener("click", () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

document.getElementById("todayButton").addEventListener("click", () => {
  state.currentMonth = new Date();
  state.selectedDate = formatDateKey(new Date());
  renderCalendar();
  renderSelectedDate();
  hydrateDayNoteForm();
});

document.getElementById("resetButton").addEventListener("click", () => {
  state.events = [];
  persistEvents();
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
    persistEvents();
    jsonInput.value = "";
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
fieldToggles.forEach((button) => {
  button.addEventListener("click", () => toggleSecretField(button));
});

mexcForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const config = readMexcForm();
  persistMexcConfig(config);
  syncStatus.textContent = config.apiKey ? (config.rememberKeys ? "MEXC keys remembered on this device." : "MEXC keys saved for this browser session only.") : "Saved with empty keys. Add keys before syncing.";
});

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
  renderWeekdays();
  renderCalendar();
  renderSelectedDate();
  hydrateDayNoteForm();
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
            <span class="${getTradeCashFlow(entry) >= 0 ? "positive-text" : "negative-text"}">P/L Est.: ${formatSignedMoney(getTradeCashFlow(entry))}</span>
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
    persistEvents();
    renderCalendar();
    renderSelectedDate();
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
    fee: Number(entry.fee || 0),
    feeAsset: String(entry.feeAsset || "").toUpperCase(),
    isMaker: Boolean(entry.isMaker),
    executedAt: String(entry.executedAt || entry.date || ""),
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

  persistEvents();
  renderCalendar();
  renderSelectedDate();
  hydrateDayNoteForm();
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

function getTradeCashFlow(entry) {
  if (!entry.quoteAmount) {
    return 0;
  }

  return entry.side === "sell" ? Number(entry.quoteAmount) : -Number(entry.quoteAmount);
}

function summarizeTrades(events) {
  const totalCashFlow = events.reduce((sum, entry) => sum + getTradeCashFlow(entry), 0);
  const pnlClass = totalCashFlow > 0 ? "positive" : totalCashFlow < 0 ? "negative" : "neutral";
  return {
    label: "P/L Est.",
    value: formatSignedMoney(totalCashFlow),
    pnlClass,
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
