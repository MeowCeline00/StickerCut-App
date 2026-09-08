# StickerCut background-removal backend

A small local server that removes image backgrounds for the StickerCut
app's "Remove BG" button. It runs entirely on your own computer:

- **Free.** No paid API, no API key, no account.
- **Local.** Images are processed in memory and never written to disk,
  logged, or sent anywhere else. Nothing leaves your machine.
- **Uses [rembg](https://github.com/danielgatis/rembg)**, an
  open-source background-removal library, via a tiny
  [FastAPI](https://fastapi.tiangolo.com/) HTTP wrapper (`main.py`).

You run this once, on your own PC, while you're developing/using the
app. The Expo app is configured to talk to it over your local network
(see `../.env.example`).

---

## 1. Setup (Windows, PowerShell)

From the `backend` folder:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
```

If activation fails with a message about execution policies (a common
Windows default), run this once and then retry activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

Your prompt should now start with `(.venv)`. Install dependencies:

```powershell
pip install -r requirements.txt
```

This installs `rembg[cpu]` (background removal), FastAPI, and Uvicorn
(the server that runs FastAPI). It can take a few minutes the first
time — rembg pulls in `onnxruntime`.

## 2. Run the server

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

- `--host 0.0.0.0` makes it reachable from other devices on your network
  (needed for the Android emulator and any physical phone), not just
  from this PC.
- **Startup** (not each request) is the slow part: rembg downloads its
  model file the very first time (~170 MB, one-time) and loads it into
  memory before the server starts accepting requests. That can take
  anywhere from several seconds to a couple of minutes depending on
  your connection. After startup, the same loaded model is reused for
  every request, so actual background-removal calls are quick (roughly
  1–3 seconds on a typical PC).
- This uses rembg's `u2net` model — its original, well-tested
  general-purpose model — rather than rembg's newer default, because
  `u2net` needs well under 1 GB of RAM once loaded, vs. several GB for
  the newer model. That keeps this comfortably runnable alongside
  everything else on a normal dev machine.

Leave this terminal window open while you use the app. Press `Ctrl+C`
to stop the server.

## 3. Verify it's working

With the server running, open a **second** PowerShell window (don't
close the server) and run:

```powershell
curl http://localhost:8000/health
```

You should see:

```json
{"status":"ok"}
```

If you want to test actual background removal from PowerShell before
touching the app, you can use the interactive API docs instead: open
`http://localhost:8000/docs` in a browser on the same PC, expand
`POST /remove-bg`, click "Try it out", choose an image file, and
execute — you should get a transparent PNG back.

## 4. Point the app at this server

The app reads the backend URL from `EXPO_PUBLIC_BACKEND_URL` (see
`../src/config/api.ts` and `../.env.example`). Copy the example file if
you haven't already:

```powershell
cd ..
copy .env.example .env
```

Then edit `.env` depending on how you're running the app:

### Android emulator

No changes needed — `10.0.2.2` (the emulator's alias for your PC's
`localhost`) is the default if `EXPO_PUBLIC_BACKEND_URL` is unset, and
it's also what `.env.example` sets by default:

```
EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:8000
```

### iOS Simulator

The simulator shares your Mac's network stack directly, so use:

```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Physical device (Android or iPhone)

A real phone is not your PC, so `localhost`/`10.0.2.2` won't reach it.
You need your PC's actual LAN IP address, and the phone must be on the
**same Wi-Fi network** as your PC.

Find your PC's LAN IP:

```powershell
ipconfig
```

Look for the "IPv4 Address" under your active Wi-Fi adapter (usually
looks like `192.168.x.x` or `10.x.x.x`). Then set:

```
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.50:8000
```

(replace with your actual IP).

**Firewall note:** Windows Firewall may prompt you to allow Python /
Uvicorn to accept incoming connections the first time you run the
server with `--host 0.0.0.0` — allow it for private networks. If the
phone still can't connect, double check both devices are on the same
Wi-Fi (not one on Wi-Fi and one on mobile data), and that no
guest-network/AP-isolation setting on your router is blocking
device-to-device traffic.

After editing `.env`, restart the Expo dev server (`EXPO_PUBLIC_*` vars
are inlined at build/bundle time, so a running Metro process won't pick
up a change automatically).

## Security / privacy

- The server only accepts connections; it does not call out to any
  external service.
- Uploaded image bytes are held in memory for the duration of one
  request and are never written to disk or logged.
- No analytics, telemetry, or third-party calls of any kind.
- `allow_origins=["*"]` (CORS) is intentionally permissive for local
  development — this server is meant to run on your own machine for
  your own app, not to be exposed on the public internet.

## Troubleshooting

- **`pip install rembg` fails / "No onnxruntime backend found"**: use
  `pip install -r requirements.txt` as written — it installs
  `rembg[cpu]`, which is the currently-required install form. A bare
  `rembg` install does not include an inference backend.
- **App shows "Could not connect to the background-removal service"**:
  confirm the server is still running in its terminal, confirm
  `EXPO_PUBLIC_BACKEND_URL` in `.env` matches the scenario you're
  actually running (emulator vs. simulator vs. physical device), and
  confirm you restarted the Expo dev server after editing `.env`.
- **Works on emulator but not on your phone**: almost always a LAN
  IP/Wi-Fi/firewall issue — see the physical-device section above.
