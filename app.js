const STORAGE_KEY = "crypto-calendar-events-v1";
const MEXC_STORAGE_KEY = "crypto-calendar-mexc-config-v1";
const API_BASE_URL = window.location.origin;

const demoEvents = [
  { id: crypto.randomUUID(), date: "2026-03-18", type: "deposit", asset: "USDT", amount: 2000, notes: "Funding wallet top-up" },
  { id: crypto.randomUUID(), date: "2026-03-19", type: "trade", asset: "BTC", amount: 0.04, notes: "Spot buy during retrace" },
  { id: crypto.randomUUID(), date: "2026-03-19", type: "trade", asset: "SOL", amount: 12, notes: "Momentum scalp" },
  { id: crypto.randomUUID(), date: "2026-03-20", type: "withdrawal", asset: "ETH", amount: 0.5, notes: "Moved to cold wallet" },
  { id: crypto.randomUUID(), date: "2026-03-21", type: "transfer", asset: "MX", amount: 145, notes: "Transferred between sub-accounts" },
  { id: crypto.randomUUID(), date: "2026-03-22", type: "trade", asset: "ETH", amount: 1.2, notes: "Swing entry after breakout" },
];

const state = {
  currentMonth: new Date(),
  selectedDate: formatDateKey(new Date()),
  events: loadEvents(),
};

const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const weekdayRow = document.getElementById("weekdayRow");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const selectedDateEvents = document.getElementById("selectedDateEvents");
const selectedDateTotal = document.getElementById("selectedDateTotal");
const syncStatus = document.getElementById("syncStatus");
const activityForm = document.getElementById("activityForm");
const jsonInput = document.getElementById("jsonInput");
const mexcForm = document.getElementById("mexcForm");

renderWeekdays();
renderCalendar();
renderSelectedDate();
activityForm.elements.date.value = state.selectedDate;
hydrateMexcForm();

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
  activityForm.elements.date.value = state.selectedDate;
  renderCalendar();
  renderSelectedDate();
});

document.getElementById("resetButton").addEventListener("click", () => {
  state.events = structuredClone(demoEvents);
  persistEvents();
  renderCalendar();
  renderSelectedDate();
  syncStatus.textContent = "Reset to demo data. Your local calendar is ready again.";
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

activityForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(activityForm);
  const newEvent = normalizeEvent({
    date: formData.get("date"),
    type: formData.get("type"),
    asset: formData.get("asset"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });

  state.events = [...state.events, newEvent];
  state.selectedDate = newEvent.date;
  persistEvents();
  renderCalendar();
  renderSelectedDate();
  activityForm.reset();
  activityForm.elements.date.value = state.selectedDate;
  syncStatus.textContent = `${newEvent.type} added for ${newEvent.asset}.`;
});

document.getElementById("syncButton").addEventListener("click", syncMexc);
document.getElementById("clearKeysButton").addEventListener("click", clearMexcKeys);

mexcForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(mexcForm);
  const config = {
    apiKey: String(formData.get("apiKey") || "").trim(),
    apiSecret: String(formData.get("apiSecret") || "").trim(),
    apiBase: String(formData.get("apiBase") || "https://api.mexc.com").trim(),
  };

  localStorage.setItem(MEXC_STORAGE_KEY, JSON.stringify(config));
  syncStatus.textContent = config.apiKey ? "MEXC keys saved in this browser." : "Saved with empty keys. Add keys before syncing.";
});

function renderWeekdays() {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  weekdayRow.innerHTML = weekdays.map((day) => `<div class="weekday-cell">${day}</div>`).join("");
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
    const isOtherMonth = day.getMonth() !== month;
    const isToday = dateKey === formatDateKey(new Date());
    const isSelected = dateKey === state.selectedDate;

    cells.push(`
      <button class="calendar-day ${isOtherMonth ? "is-other-month" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}" data-date="${dateKey}">
        <div class="day-top">
          <span class="day-number">${day.getDate()}</span>
          <span class="day-count">${dayEvents.length} evt</span>
        </div>
        <div class="day-preview">
          ${dayEvents.slice(0, 3).map((entry) => `<span class="event-chip ${entry.type}">${entry.asset} ${formatAmount(entry.amount)}</span>`).join("")}
        </div>
      </button>
    `);
  }

  calendarGrid.innerHTML = cells.join("");

  calendarGrid.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      activityForm.elements.date.value = state.selectedDate;
      renderCalendar();
      renderSelectedDate();
    });
  });
}

function renderSelectedDate() {
  const events = getEventsForDate(state.selectedDate);
  const parsedDate = new Date(`${state.selectedDate}T00:00:00`);
  const readableDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);

  selectedDateLabel.textContent = readableDate;
  selectedDateTotal.textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;

  if (events.length === 0) {
    selectedDateEvents.className = "event-list empty-state";
    selectedDateEvents.textContent = "No activity on this day yet.";
    return;
  }

  selectedDateEvents.className = "event-list";
  selectedDateEvents.innerHTML = events
    .sort((left, right) => left.type.localeCompare(right.type))
    .map((entry) => `
      <article class="event-item ${entry.type}">
        <div class="event-meta">
          <span class="event-type">${entry.type}</span>
          <span>${entry.asset}</span>
        </div>
        <h3>${formatAmount(entry.amount)} ${entry.asset}</h3>
        <div class="event-notes">${entry.notes ? escapeHtml(entry.notes) : "No notes added."}</div>
      </article>
    `)
    .join("");
}

async function syncMexc() {
  syncStatus.textContent = "Trying to connect to the local MEXC sync service...";

  try {
    const config = loadMexcConfig();
    if (!config.apiKey || !config.apiSecret) {
      throw new Error("Please add your MEXC API key and secret first");
    }

    const response = await fetch(`${API_BASE_URL}/api/mexc/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Sync request failed");
    }

    const normalized = payload.activities.map(normalizeEvent);
    state.events = mergeEvents(state.events, normalized);
    persistEvents();
    renderCalendar();
    renderSelectedDate();
    syncStatus.textContent = `Synced ${normalized.length} activities from MEXC.`;
  } catch (error) {
    syncStatus.textContent = `MEXC sync unavailable: ${error.message}`;
  }
}

function loadEvents() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoEvents));
    return structuredClone(demoEvents);
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeEvent) : structuredClone(demoEvents);
  } catch {
    return structuredClone(demoEvents);
  }
}

function loadMexcConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEXC_STORAGE_KEY) || "{}");
    return {
      apiKey: String(parsed.apiKey || "").trim(),
      apiSecret: String(parsed.apiSecret || "").trim(),
      apiBase: String(parsed.apiBase || "https://api.mexc.com").trim(),
    };
  } catch {
    return {
      apiKey: "",
      apiSecret: "",
      apiBase: "https://api.mexc.com",
    };
  }
}

function hydrateMexcForm() {
  const config = loadMexcConfig();
  mexcForm.elements.apiKey.value = config.apiKey;
  mexcForm.elements.apiSecret.value = config.apiSecret;
  mexcForm.elements.apiBase.value = config.apiBase;
}

function clearMexcKeys() {
  localStorage.removeItem(MEXC_STORAGE_KEY);
  mexcForm.reset();
  mexcForm.elements.apiBase.value = "https://api.mexc.com";
  syncStatus.textContent = "Stored MEXC keys cleared from this browser.";
}

function persistEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
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
    notes: String(entry.notes || "").trim(),
  };
}

function mergeEvents(existing, incoming) {
  const byId = new Map(existing.map((entry) => [entry.id, entry]));
  incoming.forEach((entry) => byId.set(entry.id, entry));
  return [...byId.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function formatDateKey(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatAmount(amount) {
  const numeric = Number(amount || 0);
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
