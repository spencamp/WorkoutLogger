# Workout Logger (Voice + Typed)

A beginner-friendly web app that lets you log workouts with voice or typing.

## What this app does

- Press a button and talk naturally (when browser supports speech recognition).
- Parse multiple entries from one phrase (`"10 squats and 1 minute dead hang"`).
- Handle more natural phrasing like hyphenated time (`"60-second couch stretch"`) and normalize common aliases (`"dead-hang"` -> `dead hang`).
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

## Suggested next upgrades

- Add export/import (JSON or CSV)
- Add cloud sync (Supabase/Firebase)
- Add custom activity presets
- Add PWA install support

## Master workout/stretch catalog

Edit `workout-catalog.js` to maintain your master list of workouts and stretches.

Each item has:
- `name`: canonical exercise/stretch name
- `type`: `exercise` or `stretch`
- `aliases`: alternate phrases you might speak/type

Example:

```js
{
  name: "pull ups",
  type: "exercise",
  aliases: ["pull-ups", "pullup", "pull-ups"]
}
```

Hyphenated and non-hyphenated names are treated as the same activity automatically (for example `pull ups` and `pull-ups`).


## Netlify deploy troubleshooting (buttons tap but do nothing)

If the UI appears but buttons do nothing, the browser is usually running stale JavaScript or missing one of the JS files.

1. Confirm these files are in your Netlify publish output:
   - `index.html`
   - `app.js`
   - `workout-catalog.js`
   - `styles.css`
2. In browser dev tools, open **Network** and make sure `app.js` and `workout-catalog.js` both return `200`.
3. Hard refresh the site on desktop and iPhone.
4. This repo includes a Netlify `_headers` file to reduce stale cache issues after redeploys.
