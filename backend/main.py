"""
StickerCut local background-removal backend.

A tiny, free, fully local FastAPI service that wraps rembg. It runs on
your own machine, talks to no external API, and holds no API keys. The
Expo app calls it over your local network during development.

Endpoints:
  GET  /health     -> {"status": "ok"}
  POST /remove-bg   multipart/form-data, field name "image" -> PNG bytes
                     (RGBA, background removed) as the raw response body

Processing is in-memory only: uploaded bytes are never written to disk,
and nothing is logged, analyzed, or sent anywhere else.

Run with (see README.md for full setup):
  uvicorn main:app --host 0.0.0.0 --port 8000
"""

import io
import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from rembg import new_session, remove

logger = logging.getLogger("stickercut-backend")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="StickerCut background-removal backend")

# Local development only: the Expo app on an emulator/simulator/physical
# device is a different origin than this server, so CORS must be open.
# This backend is meant to run on your own machine for your own app, not
# to be deployed publicly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Building the rembg session is the slow part (it loads/initializes the
# ONNX model), so it's done once here and reused for every request rather
# than passing session=None and letting rembg build a fresh default
# session per call (rembg.bg.remove() supports both — see its source).
#
# Model choice: rembg's own new_session() defaults to "bria-rmbg", a
# newer, higher-quality model — but it also uses ~6 GB of RAM once
# loaded, which is a lot to ask a general dev machine to keep resident
# just for this. "u2net" is rembg's original, long-standing
# general-purpose model: well-tested, much lighter (well under 1 GB
# resident), and more than good enough for cutting stickers out of
# typical photos. That tradeoff is why this picks it explicitly instead
# of relying on rembg's own default.
_session = None


@app.on_event("startup")
def load_model() -> None:
    global _session
    logger.info("Loading rembg model (first run may download weights)...")
    _session = new_session("u2net")
    logger.info("rembg model ready.")


MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/remove-bg")
async def remove_bg(image: UploadFile = File(...)) -> Response:
    if _session is None:
        # Should not happen (startup hook runs before requests are
        # served), but fail loudly rather than silently reinitializing
        # per-request if it somehow does.
        raise HTTPException(status_code=503, detail="Model is still loading. Try again shortly.")

    content_type = (image.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not an image (unexpected content type).",
        )

    data = await image.read()

    if not data:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 20 MB).")

    # Validate it's actually a decodable image before handing it to rembg,
    # so a corrupt/unsupported file gets a clear 400 instead of a raw 500.
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read this file as an image. Try a different photo.",
        )

    try:
        output_bytes = remove(data, session=_session)
    except Exception:
        logger.exception("rembg failed to process an upload")
        raise HTTPException(
            status_code=500,
            detail="Background removal failed while processing this image.",
        )

    return Response(content=output_bytes, media_type="image/png")
