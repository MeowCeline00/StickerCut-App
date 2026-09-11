"""
StickerCut local background-removal backend.

Free local FastAPI + rembg service.

Endpoints:

GET /health

POST /remove-bg
    Existing multipart endpoint, useful for testing through FastAPI docs.

POST /remove-bg-base64
    React Native / Expo friendly endpoint.
    Receives Base64 JSON and returns transparent PNG as Base64 JSON.

No third-party paid API is used.
Images are processed in memory and are not intentionally stored by
the backend.

Run:

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import base64
import binascii
import io
import logging
from typing import Optional

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from pydantic import BaseModel
from rembg import new_session, remove


# ============================================================
# LOGGING
# ============================================================

logger = logging.getLogger(
    "stickercut-backend"
)

logging.basicConfig(
    level=logging.INFO
)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="StickerCut background-removal backend"
)


# Local development only.
#
# StickerCut running on the Android emulator has a different origin
# from this FastAPI server, so allow local cross-origin requests.
#
# If this backend is ever publicly deployed, tighten this configuration.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CONFIG
# ============================================================

MAX_UPLOAD_BYTES = (
    20 * 1024 * 1024
)

MODEL_NAME = "u2net"


# ============================================================
# REMBG SESSION
# ============================================================

# Loading the ONNX model is expensive, so keep ONE session alive
# and reuse it for every request.

_session = None


@app.on_event("startup")
def load_model() -> None:
    global _session

    logger.info(
        "Loading rembg model "
        "(first run may download weights)..."
    )

    _session = new_session(
        MODEL_NAME
    )

    logger.info(
        "rembg model ready."
    )


# ============================================================
# PYDANTIC MODELS
# ============================================================


class RemoveBgBase64Request(BaseModel):
    imageBase64: str
    mimeType: Optional[str] = None


class RemoveBgBase64Response(BaseModel):
    imageBase64: str
    mimeType: str = "image/png"


# ============================================================
# SHARED IMAGE PROCESSING
# ============================================================


def process_image_bytes(
    data: bytes,
) -> bytes:
    """
    Validate image bytes and run rembg.

    Used by BOTH:
    - /remove-bg
    - /remove-bg-base64
    """

    if _session is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Background-removal model "
                "is still loading. "
                "Try again shortly."
            ),
        )

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Image is empty.",
        )

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Image is too large. "
                "Maximum decoded size is 20 MB."
            ),
        )

    # Validate image bytes before sending them to rembg.
    try:
        with Image.open(
            io.BytesIO(data)
        ) as probe:
            probe.verify()

    except Exception as exc:
        logger.warning(
            "Invalid image upload: %s",
            exc,
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not read this file "
                "as an image. "
                "Try a different image."
            ),
        ) from exc

    try:
        output_bytes = remove(
            data,
            session=_session,
        )

    except Exception as exc:
        logger.exception(
            "rembg failed to process image"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Background removal failed "
                "while processing this image."
            ),
        ) from exc

    if not output_bytes:
        raise HTTPException(
            status_code=500,
            detail=(
                "Background removal returned "
                "an empty image."
            ),
        )

    return output_bytes


# ============================================================
# HEALTH CHECK
# ============================================================


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "modelReady": (
            _session is not None
        ),
    }


# ============================================================
# ORIGINAL MULTIPART ENDPOINT
# ============================================================

# Keep this because it is convenient for testing through:
#
# http://127.0.0.1:8000/docs
#
# StickerCut itself will NOT use this endpoint anymore.


@app.post("/remove-bg")
async def remove_bg(
    image: UploadFile = File(...),
) -> Response:

    content_type = (
        image.content_type or ""
    ).lower()

    if not content_type.startswith(
        "image/"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Uploaded file is not "
                "an image."
            ),
        )

    data = await image.read()

    output_bytes = (
        process_image_bytes(data)
    )

    return Response(
        content=output_bytes,
        media_type="image/png",
    )


# ============================================================
# REACT NATIVE / EXPO BASE64 ENDPOINT
# ============================================================


@app.post(
    "/remove-bg-base64",
    response_model=(
        RemoveBgBase64Response
    ),
)
async def remove_bg_base64(
    request:
        RemoveBgBase64Request,
) -> RemoveBgBase64Response:

    image_base64 = (
        request.imageBase64.strip()
    )

    if not image_base64:
        raise HTTPException(
            status_code=400,
            detail=(
                "No Base64 image data "
                "was supplied."
            ),
        )

    # Safety:
    # StickerCut should send raw Base64,
    # not:
    #
    # data:image/png;base64,...
    #
    # But tolerate a data URI just in case.
    if image_base64.startswith(
        "data:"
    ):
        comma_index = (
            image_base64.find(",")
        )

        if comma_index < 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid Base64 data URI."
                ),
            )

        image_base64 = (
            image_base64[
                comma_index + 1:
            ]
        )

    try:
        input_bytes = (
            base64.b64decode(
                image_base64,
                validate=True,
            )
        )

    except (
        binascii.Error,
        ValueError,
    ) as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                "Image Base64 data "
                "is invalid."
            ),
        ) from exc

    output_bytes = (
        process_image_bytes(
            input_bytes
        )
    )

    output_base64 = (
        base64.b64encode(
            output_bytes
        ).decode(
            "ascii"
        )
    )

    logger.info(
        "Background removal complete: "
        "input=%d bytes, "
        "output=%d bytes",
        len(input_bytes),
        len(output_bytes),
    )

    return (
        RemoveBgBase64Response(
            imageBase64=(
                output_base64
            ),
            mimeType="image/png",
        )
    )