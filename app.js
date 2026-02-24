const STORAGE_KEY = "workout-logger.entries.v1";

const recordButton = document.getElementById("recordButton");
const addTypedButton = document.getElementById("addTypedButton");
const typedInput = document.getElementById("typedInput");
const dayTabs = document.getElementById("dayTabs");
const entriesPanel = document.getElementById("entriesPanel");
const entryRowTemplate = document.getElementById("entryRowTemplate");
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
  const normalized = text
    .toLowerCase()
    .replace(/\band\b/g, ",")
    .replace(/\bi did\b/g, "")
    .replace(/\ba\b/g, "1");

  const chunks = normalized
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const parsed = [];

  for (const chunk of chunks) {
    const match = chunk.match(/(\d+(?:\.\d+)?)\s*(minute|minutes|second|seconds|hour|hours|rep|reps)?\s+(.+)/);

    if (!match) {
      continue;
    }

    const amount = Number(match[1]);
    const rawUnit = match[2] || "reps";
    const activity = match[3]
      .replace(/\bfor\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!activity) {
      continue;
    }

    parsed.push({
      activity,
      amount,
      unit: normalizeUnit(rawUnit),
      timestamp: new Date().toISOString(),
    });
  }

  return parsed;
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
    id: crypto.randomUUID(),
  }));

  entries = [...entries, ...entriesToAdd];
  selectedDay = dayKey(entriesToAdd[0].timestamp);
  saveEntries(entries);
  render();
}

function render() {
  renderDayTabs();
  renderEntriesForSelectedDay();
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

function openEditDialog(entry) {
  editingEntryId = entry.id;
  editActivity.value = entry.activity;
  editAmount.value = entry.amount;
  editUnit.value = entry.unit;
  editDialog.showModal();
}

function dayKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDay(day) {
  return new Date(day).toLocaleDateString([], {
    weekday: "short",
    month: "long",
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
