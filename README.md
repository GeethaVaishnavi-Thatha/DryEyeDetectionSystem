# Dry Eye Detection System

Tracks how often you blink while you work, and warns you when you stop.

Staring at a screen suppresses blink rate — studies put the drop at roughly half
the normal 15–20 blinks per minute. Fewer blinks means the tear film breaks up,
which is what makes eyes feel dry and gritty after a long day. This watches for
that happening and tells you.

Detection runs entirely in the browser using MediaPipe FaceLandmarker. **Video
never leaves your machine** — there is no upload and no server round-trip.

---

## How it works

MediaPipe puts 468 landmarks on your face. Six of them per eye are enough to
measure how open it is, using the **Eye Aspect Ratio**:

```
        P2 ────── P3
   P1 ·              · P4          EAR = ‖P2−P6‖ + ‖P3−P5‖
        P6 ────── P5                     ─────────────────
                                              2 ‖P1−P4‖
```

It divides eye height by eye width. Dividing by the width is the important part:
it makes the number independent of how far you are from the camera, so leaning
in doesn't read as opening your eyes wider.

Open eyes land around 0.25–0.35. A blink drops it sharply for two or three
frames. Counting those drops gives blink rate; blink rate plus session length
gives the risk score.

### Why there's a calibration step

The usual EAR blink threshold is 0.21, which is a population average. Eye shape
varies enough that a fixed threshold misbehaves at both ends — someone whose
eyes rest at 0.24 gets phantom blinks, someone resting at 0.38 has real partial
blinks missed entirely.

Calibration samples six seconds of open-eye video, takes the **median** EAR
(median, so an accidental blink during calibration doesn't drag the baseline
down), and sets that user's threshold to 78% of it. It's the difference between
"below 0.21" and "22% below *your* normal".

### Limitations

Worth being straight about these:

- **Not a medical device.** It measures blink frequency, which is one
  contributing factor among many. It cannot diagnose dry eye disease, and it
  does not replace an optometrist.
- **EAR is a proxy.** It measures eyelid geometry, not tear film. A slow
  incomplete blink and a squint look similar to it.
- **Needs reasonable light and a roughly frontal face.** Steep angles, heavy
  glare on glasses, or a face at the edge of frame will drop tracking.
- **Blink rate is a rolling 60-second window**, so it reads low for the first
  minute of a session and then settles.
- Screen time counts while the scanner is running, not total device use.

---

## Running it

### Frontend (this is the main app)

```bash
npm install
npm run dev          # http://localhost:5173
```

Needs Node 20+. On first run it downloads the FaceLandmarker model (~3.6 MB)
and the MediaPipe WASM runtime from a CDN, so the first start needs a network
connection. After that it's cached by the browser.

The app asks for camera permission when you press **Start Scanner**.

### Backend (optional)

The browser detects blinks but has no durable storage, so it forgets everything
when you close the tab. The Flask server is what remembers: it stores finished
sessions and serves the history the dashboard charts.

It also still offers server-side detection over an MJPEG stream, selectable from
the mode toggle. The app works fully without the backend — you just lose history
across days.

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
python app.py                # http://localhost:5000
```

It downloads the same model on first run.

**Session history**

| Endpoint | Purpose |
| --- | --- |
| `POST /api/sessions` | Record a finished session |
| `GET /api/sessions?days=&limit=` | Sessions in a window, newest first |
| `GET /api/sessions/stats?days=` | Per-day aggregates plus window totals |
| `DELETE /api/sessions/{id}` | Remove one session |
| `DELETE /api/sessions` | Clear all history |

**Detection and status**

| Endpoint | Purpose |
| --- | --- |
| `GET /api/video_feed` | MJPEG stream with eye contours and EAR drawn on |
| `GET /api/status` | Current EAR, blink count, blink rate, risk level |
| `GET /api/health` | Liveness check |
| `POST /api/reset` | Clear session counters |
| `GET /api/export_csv` | Session log as CSV |

Storage is SQLite in `backend/sessions.db` — a single file, no database server
to install. Override the path with the `DRY_EYE_DB` environment variable.

Sessions shorter than five seconds are rejected with a 422; they are mis-clicks,
not data. The frontend treats that as expected rather than as an error.

### Tests

```bash
npm test             # unit + parity
npm run test:watch
npm run typecheck
```

The parity suite runs the TypeScript scoring and `backend/models/ear_calc.py`
over the same 800-input grid and asserts they agree — the logic exists in both
places, and a user switching modes should not see different numbers. It skips
automatically if Python isn't on PATH.

---

## Layout

```
src/
  lib/ear.ts              EAR, risk scoring, health score. Pure functions.
  lib/ear.test.ts         Unit tests, including scale invariance and boundaries
  lib/parity.test.ts      Asserts the TS and Python agree
  lib/sessionApi.ts       Client for the history API. Fails soft when it is down.
  hooks/useEyeTracking.ts MediaPipe loop, blink counting, calibration, overlay
  hooks/useSessionHistory.ts  Records finished sessions, reads history back
  components/             One file per tab, plus Header, Footer, HistoryPanel
  App.tsx                 State and wiring

backend/
  app.py                  Flask API: session history, MJPEG streaming
  db.py                   SQLite storage and the daily aggregates
  utils/detector.py       FaceLandmarker wrapper
  models/ear_calc.py      Same maths as lib/ear.ts, in Python
```

### Notes on a couple of decisions

**Detection runs per animation frame, but React state updates at 5 Hz.**
Re-rendering the tree 60 times a second to move a number is wasteful, so the
loop accumulates into refs and publishes on an interval.

**The GPU delegate falls back to CPU on a timeout.** On some machines WebGL
reports available but the delegate never initialises and never rejects either,
which left the UI on a loading spinner indefinitely. It now races
initialisation against 8 seconds and retries on CPU.

**The scoring is duplicated in Python and TypeScript** rather than shared. The
parity test is what keeps them honest.

**The two halves do different jobs.** Detection runs in the browser because it
is faster there and the video never has to leave the machine. Storage runs in
the backend because a browser cannot keep history a user can rely on. Neither
duplicates the other, and the app still works if the backend is absent.

---

## Deploying

The frontend is a static bundle — `npm run build` emits a single `dist/index.html`
with everything inlined. Config for both hosts is in the repo:

```bash
npx vercel --prod          # vercel.json
# or connect the repo at netlify.com — netlify.toml is already set up
```

**Camera access requires HTTPS.** Both hosts provide it automatically. Opening
the built file over `file://` will not work, and neither will a plain-HTTP host.

The Flask backend is not part of the static deploy. The app runs fully without
it.

---

## Disclaimer

This is a personal project for monitoring screen habits. It is **not a medical
device** and produces no diagnosis. Terms like "risk level" refer to blink
behaviour during a session, nothing more. If your eyes hurt, see an optometrist.
