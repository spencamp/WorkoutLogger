# Workout Logger (Voice + Typed)

A beginner-friendly web app that lets you log workouts with voice or typing.

## What this app does

- Press a button and talk naturally (when browser supports speech recognition).
- Parse multiple entries from one phrase (`"10 squats and 1 minute dead hang"`).
- Keep all logs in `localStorage` (on-device).
- View a **Raw Daily Log** by day tabs.
- View a **Totals** tab grouped by exercise + unit.
- Filter totals by **Today**, **Rolling 7 Days**, **This Month**, or **All Time**.
- View a **Trends** tab with:
  - today's per-exercise totals,
  - rolling 7-day vs previous 7-day trends (time + reps),
  - last 14-day charts (time and reps),
  - most active days lists (time and reps),
  - current streak.
- Group workouts by day with tappable day tabs.
- Edit or delete entries.
- Typed logging works offline.

## Beginner setup (absolute zero)

### 1) Install a code editor
- Install [Visual Studio Code](https://code.visualstudio.com/).

### 2) Get the files
If this repository is already on your computer, open it in VS Code.

### 3) Run a local web server
Because microphone features need a real browser context, run a local server instead of opening the file directly.

#### Option A (no Python install): VS Code Live Server
1. In VS Code, go to **Extensions**.
2. Install **Live Server** (by Ritwick Dey).
3. Open `index.html`.
4. Click **Go Live** (bottom-right in VS Code).

#### Option B (Python)
In terminal, inside this folder:

```bash
python3 -m http.server 4173
```

Then open:

- On your computer browser: `http://localhost:4173`
- On iPhone (same Wi-Fi):
  - Find your computer local IP (like `192.168.1.50`)
  - Open `http://<your-computer-ip>:4173` in Safari

### 4) iPhone notes
- Voice recognition support can vary by Safari/iOS version.
- If voice is unavailable, the app shows a message and typed logging still works.
- Data is local to that browser/device only.

## How to use

1. Tap **Start Recording**, then say something like:
   - `I did 10 squats and 1 minute dead hang`
2. Or type the same sentence and press **Add Typed Entry**.
3. Open **Raw Daily Log** to review exact entries by day.
4. Open **Totals** for totals by exercise over your selected range.
5. Open **Trends** to check consistency and progress at a glance.
6. Use **Edit** or **Delete** for corrections.
3. Open the day tab to review entries.
4. Use **Edit** or **Delete** for corrections.

## Suggested next upgrades

- Add export/import (JSON or CSV)
- Add cloud sync (Supabase/Firebase)
- Add custom activity presets
- Add PWA install support
