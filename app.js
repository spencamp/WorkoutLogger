const STORAGE_KEY = "workout-logger.entries.v1";

const recordButton = document.getElementById("recordButton");
const addTypedButton = document.getElementById("addTypedButton");
const typedInput = document.getElementById("typedInput");
const dayTabs = document.getElementById("dayTabs");
const entriesPanel = document.getElementById("entriesPanel");
const totalsPanel = document.getElementById("totalsPanel");
const totalsRange = document.getElementById("totalsRange");
const rawViewButton = document.getElementById("rawViewButton");
const totalsViewButton = document.getElementById("totalsViewButton");
const trendsViewButton = document.getElementById("trendsViewButton");
const rawViewPanel = document.getElementById("rawViewPanel");
const totalsViewPanel = document.getElementById("totalsViewPanel");
const trendsViewPanel = document.getElementById("trendsViewPanel");
const trendSummaryCards = document.getElementById("trendSummaryCards");
const trendTimeComparison = document.getElementById("trendTimeComparison");
const trendRepsComparison = document.getElementById("trendRepsComparison");
const trendStreak = document.getElementById("trendStreak");
const timeChart = document.getElementById("timeChart");
const repsChart = document.getElementById("repsChart");
const topTimeDays = document.getElementById("topTimeDays");
const topRepDays = document.getElementById("topRepDays");
const entryRowTemplate = document.getElementById("entryRowTemplate");
const totalRowTemplate = document.getElementById("totalRowTemplate");
const liveTranscript = document.getElementById("liveTranscript");
const voiceSupportNotice = document.getElementById("voiceSupportNotice");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const editActivity = document.getElementById("editActivity");
const editAmount = document.getElementById("editAmount");
const editUnit = document.getElementById("editUnit");
const cancelEdit = document.getElementById("cancelEdit");

let entries = loadEntries();
let selectedDay = getTodayKey();
let selectedView = "raw";
let editingEntryId = null;
let recognition = null;
let isRecording = false;

initializeVoiceRecognition();
render();

recordButton.addEventListener("click", () => {
  if (!recognition) {
    return;
  }

  if (isRecording) {
    recognition.stop();
    return;
  }

  liveTranscript.textContent = "Listening...";
  recognition.start();
});

addTypedButton.addEventListener("click", () => {
  const text = typedInput.value.trim();
  if (!text) {
    alert("Type what you did first.");
    return;
  }

  const parsedEntries = parseWorkoutText(text);
  if (!parsedEntries.length) {
    alert("Couldn't understand that. Try something like: 10 squats, 1 minute dead hang.");
    return;
  }

  addParsedEntries(parsedEntries);
  typedInput.value = "";
  liveTranscript.textContent = `Added ${parsedEntries.length} entr${parsedEntries.length === 1 ? "y" : "ies"}.`;
});

rawViewButton.addEventListener("click", () => {
  selectedView = "raw";
  render();
});

totalsViewButton.addEventListener("click", () => {
  selectedView = "totals";
  render();
});

trendsViewButton.addEventListener("click", () => {
  selectedView = "trends";
  render();
});

totalsRange.addEventListener("change", () => {
  renderTotals();
});

cancelEdit.addEventListener("click", () => {
  editDialog.close();
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!editingEntryId) {
    return;
  }

  const index = entries.findIndex((entry) => entry.id === editingEntryId);
  if (index === -1) {
    return;
  }

  entries[index] = {
    ...entries[index],
    activity: editActivity.value.trim(),
    amount: Number(editAmount.value),
    unit: editUnit.value,
  };

  saveEntries(entries);
  render();
  editDialog.close();
});

function initializeVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceSupportNotice.hidden = false;
    voiceSupportNotice.textContent =
      "Voice recognition is not available in this browser. Typed logging still works offline.";
    recordButton.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    recordButton.textContent = "⏹️ Stop Recording";
  };

  recognition.onend = () => {
    isRecording = false;
    recordButton.textContent = "🎙️ Start Recording";
  };

  recognition.onerror = (event) => {
    liveTranscript.textContent = `Voice error: ${event.error}. You can still type entries.`;
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();

    liveTranscript.textContent = `Heard: "${transcript}"`;
    const parsedEntries = parseWorkoutText(transcript);

    if (!parsedEntries.length) {
      liveTranscript.textContent += " — I couldn't parse a workout. Try typing it.";
      return;
    }

    addParsedEntries(parsedEntries);
    liveTranscript.textContent += ` — Added ${parsedEntries.length} entr${parsedEntries.length === 1 ? "y" : "ies"}.`;
  };
}

function parseWorkoutText(text) {
  const normalized = replaceNumberWords(text)
    .toLowerCase()
    .replace(/\band\b/g, ",")
    .replace(/\bi did\b/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\ba\b/g, "1");

  const chunks = normalized
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const parsed = [];

  for (const chunk of chunks) {
    const amountFirst = chunk.match(/(\d+(?:\.\d+)?)\s*[- ]?\s*(minute|minutes|second|seconds|hour|hours|rep|reps)?\s+(.+)/);
    const activityFirst = chunk.match(/(.+?)\s+for\s+(\d+(?:\.\d+)?)\s*[- ]?\s*(minute|minutes|second|seconds|hour|hours|rep|reps)?/);

    let amount = null;
    let rawUnit = "reps";
    let activity = "";

    if (amountFirst) {
      amount = Number(amountFirst[1]);
      rawUnit = amountFirst[2] || "reps";
      activity = amountFirst[3];
    } else if (activityFirst) {
      amount = Number(activityFirst[2]);
      rawUnit = activityFirst[3] || "reps";
      activity = activityFirst[1];
    } else {
      continue;
    }

    if (!Number.isFinite(amount)) {
      continue;
    }

    const canonicalActivity = canonicalizeActivity(activity);
    if (!canonicalActivity) {
      continue;
    }

    parsed.push({
      activity: canonicalActivity,
      amount,
      unit: normalizeUnit(rawUnit),
      timestamp: new Date().toISOString(),
    });
  }

  return parsed;
}

function replaceNumberWords(text) {
  const wordToNumber = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    thirteen: "13",
    fourteen: "14",
    fifteen: "15",
    sixteen: "16",
    seventeen: "17",
    eighteen: "18",
    nineteen: "19",
    twenty: "20",
    thirty: "30",
    forty: "40",
    fifty: "50",
    sixty: "60",
  };

  let output = text;
  for (const [word, number] of Object.entries(wordToNumber)) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    output = output.replace(regex, number);
  }

  return output;
}

function canonicalizeActivity(activity) {
  const cleaned = activity
    .replace(/\bfor\b/g, "")
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const aliases = [
    [/^dead[- ]?hang$/, "dead hang"],
    [/^hang$/, "dead hang"],
    [/^couch stretch$/, "couch stretch"],
    [/^hip flexor stretch$/, "couch stretch"],
    [/^deep squat$/, "deep squat hold"],
    [/^deep squat hold$/, "deep squat hold"],
    [/^dep squat$/, "deep squat hold"],
    [/^hamstring stretch$/, "hamstring stretch"],
    [/^calf stretch$/, "calf stretch"],
    [/^shoulder stretch$/, "shoulder stretch"],
    [/^thoracic rotation$/, "thoracic rotation"],
    [/^ankle mobility$/, "ankle mobility"],
  ];

  for (const [pattern, canonical] of aliases) {
    if (pattern.test(cleaned)) {
      return canonical;
    }
  }

  return cleaned;
}

function normalizeUnit(unit) {
  if (unit.startsWith("minute")) {
    return "minutes";
  }
  if (unit.startsWith("second")) {
    return "seconds";
  }
  if (unit.startsWith("hour")) {
    return "hours";
  }
  return "reps";
}

function addParsedEntries(parsedEntries) {
  const entriesToAdd = parsedEntries.map((entry) => ({
    ...entry,
    id: createEntryId(),
  }));

  entries = [...entries, ...entriesToAdd];
  selectedDay = dayKey(entriesToAdd[0].timestamp);
  saveEntries(entries);
  render();
}

function render() {
  renderViewToggle();
  renderDayTabs();
  renderEntriesForSelectedDay();
  renderTotals();
  renderTrends();
}

function renderViewToggle() {
  const showingRaw = selectedView === "raw";
  const showingTotals = selectedView === "totals";
  const showingTrends = selectedView === "trends";
  rawViewButton.classList.toggle("active", showingRaw);
  totalsViewButton.classList.toggle("active", showingTotals);
  trendsViewButton.classList.toggle("active", showingTrends);
  rawViewPanel.hidden = !showingRaw;
  totalsViewPanel.hidden = !showingTotals;
  trendsViewPanel.hidden = !showingTrends;
}

function renderDayTabs() {
  const uniqueDays = [...new Set(entries.map((entry) => dayKey(entry.timestamp)))].sort((a, b) =>
    a > b ? -1 : 1,
  );

  if (!uniqueDays.length) {
    selectedDay = getTodayKey();
  } else if (!uniqueDays.includes(selectedDay)) {
    selectedDay = uniqueDays[0];
  }

  dayTabs.innerHTML = "";

  if (!uniqueDays.length) {
    return;
  }

  for (const day of uniqueDays) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `day-tab ${day === selectedDay ? "active" : ""}`;
    button.textContent = formatDay(day);
    button.addEventListener("click", () => {
      selectedDay = day;
      render();
    });
    dayTabs.appendChild(button);
  }
}

function renderEntriesForSelectedDay() {
  const dayEntries = entries
    .filter((entry) => dayKey(entry.timestamp) === selectedDay)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  entriesPanel.innerHTML = "";

  if (!dayEntries.length) {
    entriesPanel.innerHTML = '<p class="empty-state">No entries for this day yet.</p>';
    return;
  }

  for (const entry of dayEntries) {
    const row = entryRowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".entry-title").textContent = `${entry.amount} ${entry.unit} ${entry.activity}`;
    row.querySelector(".entry-meta").textContent = new Date(entry.timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    row.querySelector(".edit-button").addEventListener("click", () => openEditDialog(entry));
    row.querySelector(".delete-button").addEventListener("click", () => {
      entries = entries.filter((item) => item.id !== entry.id);
      saveEntries(entries);
      render();
    });

    entriesPanel.appendChild(row);
  }
}

function renderTotals() {
  const range = totalsRange.value;
  const filtered = entries.filter((entry) => isInSelectedRange(entry.timestamp, range));
  const totalsMap = new Map();

  for (const entry of filtered) {
    const normalized = normalizeForAggregation(Number(entry.amount), entry.unit);
    const key = `${entry.activity.toLowerCase()}|${normalized.unit}`;
    const existing = totalsMap.get(key);

    if (existing) {
      existing.amount += normalized.amount;
    } else {
      totalsMap.set(key, {
        activity: entry.activity,
        unit: normalized.unit,
        amount: normalized.amount,
      });
    }
  }

  const totals = [...totalsMap.values()].sort((a, b) => b.amount - a.amount);
  totalsPanel.innerHTML = "";

  if (!totals.length) {
    totalsPanel.innerHTML = '<p class="empty-state">No totals in this range yet.</p>';
    return;
  }

  for (const total of totals) {
    const displayTotal = formatDisplayTotal(total.amount, total.unit);
    const row = totalRowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".entry-title").textContent = `${displayTotal.amount} ${displayTotal.unit} ${total.activity}`;
    row.querySelector(".entry-meta").textContent = "";
    totalsPanel.appendChild(row);
  }
}

function renderTrends() {
  const last14 = getLastNDays(14);
  const byDay = buildDailyMetrics(entries);
  const today = dayKey(new Date().toISOString());
  const todayMetrics = byDay.get(today) || { minutes: 0, reps: 0 };

  const weekly = getRollingRangeTotals(byDay, 7, 0);
  const previousWeekly = getRollingRangeTotals(byDay, 7, 7);

  trendSummaryCards.innerHTML = "";
  const todayExerciseTotals = summarizeTodayPerExercise(entries, today);

  if (!todayExerciseTotals.length) {
    trendSummaryCards.innerHTML = '<p class="empty-state">No movement logged today yet.</p>';
  } else {
    for (const item of todayExerciseTotals.slice(0, 6)) {
      const displayTotal = formatDisplayTotal(item.amount, item.unit);
      const card = document.createElement("article");
      card.className = "summary-card";

      const activityText = document.createElement("p");
      activityText.textContent = item.activity;

      const totalText = document.createElement("strong");
      totalText.textContent = `${displayTotal.amount} ${displayTotal.unit}`;

      card.append(activityText, totalText);
      trendSummaryCards.appendChild(card);
    }
  }

  trendTimeComparison.textContent = `Time trend (rolling 7d): ${formatTrend(weekly.minutes, previousWeekly.minutes, "minutes")}`;
  trendRepsComparison.textContent = `Reps trend (rolling 7d): ${formatTrend(weekly.reps, previousWeekly.reps, "reps")}`;
  trendStreak.textContent = `Current streak: ${calculateStreak(entries)} day${calculateStreak(entries) === 1 ? "" : "s"}`;

  drawChart(timeChart, last14, byDay, "minutes");
  drawChart(repsChart, last14, byDay, "reps");
  renderTopDays(topTimeDays, byDay, "minutes");
  renderTopDays(topRepDays, byDay, "reps");

  if (!todayExerciseTotals.length && todayMetrics.minutes === 0 && todayMetrics.reps === 0 && entries.length === 0) {
    trendTimeComparison.textContent = "Time trend (rolling 7d): no data yet.";
    trendRepsComparison.textContent = "Reps trend (rolling 7d): no data yet.";
    trendStreak.textContent = "Current streak: 0 days";
  }
}

function summarizeTodayPerExercise(allEntries, day) {
  const map = new Map();
  for (const entry of allEntries) {
    if (dayKey(entry.timestamp) !== day) {
      continue;
    }
    const normalized = normalizeForAggregation(Number(entry.amount), entry.unit);
    const key = `${entry.activity.toLowerCase()}|${normalized.unit}`;
    const current = map.get(key);
    if (current) {
      current.amount += normalized.amount;
    } else {
      map.set(key, {
        activity: entry.activity,
        unit: normalized.unit,
        amount: normalized.amount,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.amount - a.amount);
}

function buildDailyMetrics(allEntries) {
  const map = new Map();
  for (const entry of allEntries) {
    const day = dayKey(entry.timestamp);
    const current = map.get(day) || { minutes: 0, reps: 0 };
    if (isTimeUnit(entry.unit)) {
      current.minutes += toMinutes(Number(entry.amount), entry.unit);
    } else {
      current.reps += Number(entry.amount);
    }
    map.set(day, current);
  }
  return map;
}

function getRollingRangeTotals(byDay, count, offsetDays) {
  const dates = getLastNDays(count, offsetDays);
  return dates.reduce(
    (sum, day) => {
      const metrics = byDay.get(day) || { minutes: 0, reps: 0 };
      sum.minutes += metrics.minutes;
      sum.reps += metrics.reps;
      return sum;
    },
    { minutes: 0, reps: 0 },
  );
}

function getLastNDays(count, offsetDays = 0) {
  const days = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() - offsetDays);

  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(end);
    day.setDate(end.getDate() - i);
    days.push(localDateKey(day));
  }
  return days;
}

function drawChart(target, days, byDay, metric) {
  target.innerHTML = "";
  const values = days.map((day) => (byDay.get(day) || { minutes: 0, reps: 0 })[metric]);
  const maxValue = Math.max(...values, 0);

  for (let i = 0; i < days.length; i += 1) {
    const value = values[i];
    const wrap = document.createElement("div");
    wrap.className = "chart-bar-wrap";

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    const heightPct = maxValue === 0 ? 2 : Math.max((value / maxValue) * 100, 2);
    bar.style.height = `${heightPct}%`;
    bar.title = `${formatDay(days[i])}: ${metric === "minutes" ? formatOneDecimal(value) + " min" : trimNumber(value) + " reps"}`;

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = days[i].slice(8, 10);

    wrap.append(bar, label);
    target.appendChild(wrap);
  }
}

function renderTopDays(target, byDay, metric) {
  target.innerHTML = "";
  const rows = [...byDay.entries()]
    .map(([day, values]) => ({ day, value: values[metric] }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (!rows.length) {
    target.innerHTML = '<li class="empty-state">No data yet.</li>';
    return;
  }

  for (const row of rows) {
    const li = document.createElement("li");
    li.textContent = `${formatDay(row.day)} — ${metric === "minutes" ? formatOneDecimal(row.value) + " min" : trimNumber(row.value) + " reps"}`;
    target.appendChild(li);
  }
}

function calculateStreak(allEntries) {
  const days = new Set(allEntries.map((entry) => dayKey(entry.timestamp)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function formatTrend(current, previous, suffix) {
  if (current === 0 && previous === 0) {
    return "no data yet";
  }

  if (previous === 0) {
    return `⬆️ up from 0 to ${suffix === "minutes" ? formatOneDecimal(current) : trimNumber(current)} ${suffix}`;
  }

  const delta = current - previous;
  const pct = (delta / previous) * 100;
  const arrow = delta > 0 ? "⬆️" : delta < 0 ? "⬇️" : "➖";
  const amount = suffix === "minutes" ? formatOneDecimal(current) : trimNumber(current);
  return `${arrow} ${delta === 0 ? "flat" : `${pct > 0 ? "+" : ""}${formatOneDecimal(pct)}%`} (${amount} ${suffix} this 7d)`;
}


function createEntryId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const randomBytes = new Uint32Array(2);
    globalThis.crypto.getRandomValues(randomBytes);
    return `fallback-${Date.now().toString(36)}-${randomBytes[0].toString(36)}${randomBytes[1].toString(36)}`;
  }

  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeForAggregation(amount, unit) {
  if (isTimeUnit(unit)) {
    return {
      amount: toMinutes(amount, unit),
      unit: "minutes",
    };
  }

  return {
    amount,
    unit,
  };
}

function isInSelectedRange(timestamp, range) {
  if (range === "all") {
    return true;
  }

  const date = new Date(timestamp);
  const now = new Date();

  if (range === "day") {
    return dayKey(date) === dayKey(now);
  }

  if (range === "week") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return date >= start && date <= now;
  }

  if (range === "month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  return true;
}

function isTimeUnit(unit) {
  return unit === "seconds" || unit === "minutes" || unit === "hours";
}

function toMinutes(amount, unit) {
  if (unit === "seconds") {
    return amount / 60;
  }
  if (unit === "hours") {
    return amount * 60;
  }
  return amount;
}

function formatDisplayTotal(amount, unit) {
  if (isTimeUnit(unit)) {
    return {
      amount: formatOneDecimal(toMinutes(amount, unit)),
      unit: "minutes",
    };
  }
  return {
    amount: trimNumber(amount),
    unit,
  };
}

function formatOneDecimal(value) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function trimNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function openEditDialog(entry) {
  editingEntryId = entry.id;
  editActivity.value = entry.activity;
  editAmount.value = entry.amount;
  editUnit.value = entry.unit;
  editDialog.showModal();
}

function dayKey(timestamp) {
  return localDateKey(new Date(timestamp));
}

function getTodayKey() {
  return localDateKey(new Date());
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDayKey(day) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

function formatDay(day) {
  return parseDayKey(day).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => entry && entry.id && entry.activity && entry.timestamp);
  } catch {
    return [];
  }
}

function saveEntries(nextEntries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
}
