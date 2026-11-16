"""IMMOExtract — AI Service (FastAPI).

Provides:
- GET /health: Health status and model readiness.
- POST /extract: Multipart image upload for human parsing and transparent RGBA extraction.
- POST /extract-path: JSON request for local file processing (optimized for co-located backend).
"""

import base64
from contextlib import asynccontextmanager
import io
import os
import sys
from typing import Any, Dict, List, Optional

# Ensure ai-service root is in sys.path
ai_service_dir = os.path.dirname(os.path.abspath(__file__))
if ai_service_dir not in sys.path:
    sys.path.insert(0, ai_service_dir)

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from extractor import HumanExtractor, DEFAULT_CHECKPOINT_PATH


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes the human parsing model upon startup."""
    checkpoint = os.getenv("SCHP_CHECKPOINT_PATH", DEFAULT_CHECKPOINT_PATH)
    if os.path.exists(checkpoint):
        try:
            print(f"[AI Service] Loading HumanExtractor from: {checkpoint}")
            app.state.extractor = HumanExtractor(checkpoint_path=checkpoint, device="cpu")
            app.state.model_loaded = True
            print("[AI Service] HumanExtractor loaded successfully.")
        except Exception as exc:
            print(f"[AI Service] Failed to load model checkpoint: {exc}")
            app.state.extractor = None
            app.state.model_loaded = False
    else:
        print(f"[AI Service] Checkpoint not found at {checkpoint}. Running in health-only mode.")
        app.state.extractor = None
        app.state.model_loaded = False

    yield

    # Clean up resources on shutdown
    app.state.extractor = None
    app.state.model_loaded = False


app = FastAPI(
    title="IMMOExtract AI Service",
    description="Local human parsing & transparent sprite extraction service",
    version="0.2.0",
    lifespan=lifespan,
)


class ExtractPathRequest(BaseModel):
    """Request schema for file-path based extraction."""

    image_path: str = Field(..., description="Absolute or relative path to the source image")
    output_path: Optional[str] = Field(None, description="Path where extracted RGBA PNG will be saved")
    save_mask_path: Optional[str] = Field(None, description="Path where binary alpha mask will be saved")
    include_base64: bool = Field(False, description="Whether to include base64-encoded image and mask")


def _get_extractor() -> HumanExtractor:
    """Helper to retrieve extractor or raise HTTP 503."""
    extractor = getattr(app.state, "extractor", None)
    if extractor is None:
        raise HTTPException(
            status_code=503,
            detail="AI model is not loaded. Ensure checkpoint exists and service is initialized.",
        )
    return extractor


def _build_response_payload(
    result,
    output_path: Optional[str] = None,
    save_mask_path: Optional[str] = None,
    include_base64: bool = False,
) -> Dict[str, Any]:
    """Formats extraction result into standardized JSON response dict."""
    payload: Dict[str, Any] = {
        "status": "success",
        "original_size": [result.original_size[0], result.original_size[1]],
        "categories_present": result.categories_present,
        "category_pixel_counts": result.category_pixel_counts,
        "execution_time_seconds": round(result.execution_time_seconds, 4),
    }

    if output_path:
        payload["output_path"] = output_path
    if save_mask_path:
        payload["save_mask_path"] = save_mask_path

    if include_base64:
        # RGBA PNG base64
        buf_rgba = io.BytesIO()
        result.rgba_image.save(buf_rgba, format="PNG")
        payload["image_base64"] = base64.b64encode(buf_rgba.getvalue()).decode("ascii")

        # Binary Mask PNG base64
        mask_arr = np.where(result.foreground_mask, 255, 0).astype(np.uint8)
        mask_pil = Image.fromarray(mask_arr, mode="L")
        buf_mask = io.BytesIO()
        mask_pil.save(buf_mask, format="PNG")
        payload["mask_base64"] = base64.b64encode(buf_mask.getvalue()).decode("ascii")

    return payload


@app.get("/health")
def health() -> Dict[str, Any]:
    """Health status and model readiness probe."""
    return {
        "status": "ok",
        "service": "ai-service",
        "model_loaded": getattr(app.state, "model_loaded", False),
    }


@app.post("/extract")
async def extract_upload(
    file: UploadFile = File(..., description="Image file to extract (JPG/PNG/WebP)"),
    output_path: Optional[str] = Form(None, description="Optional local file path to save RGBA PNG"),
    save_mask_path: Optional[str] = Form(None, description="Optional local file path to save mask PNG"),
    include_base64: bool = Form(True, description="Include base64 strings in response"),
) -> Dict[str, Any]:
    """Extract foreground human sprite from uploaded image file."""
    extractor = _get_extractor()

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        pil_image = Image.open(io.BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file is not a valid or supported image: {str(exc)}",
        )

    try:
        result = extractor.extract(pil_image)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Inference error during extraction: {str(exc)}",
        )

    # Save to disk if requested
    if output_path:
        extractor.save_result(result, output_rgba_path=output_path, save_mask_path=save_mask_path)

    return _build_response_payload(
        result,
        output_path=output_path,
        save_mask_path=save_mask_path,
        include_base64=include_base64,
    )


@app.post("/extract-path")
def extract_path(request: ExtractPathRequest) -> Dict[str, Any]:
    """Extract foreground human sprite from a local file path."""
    extractor = _get_extractor()

    if not os.path.isfile(request.image_path):
        raise HTTPException(
            status_code=404,
            detail=f"Source image file not found at path: {request.image_path}",
        )

    try:
        with Image.open(request.image_path) as img:
            pil_image = img.convert("RGB")
            result = extractor.extract(pil_image)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read image at path: {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Inference error during extraction: {str(exc)}",
        )

    if request.output_path:
        extractor.save_result(
            result,
            output_rgba_path=request.output_path,
            save_mask_path=request.save_mask_path,
        )

    return _build_response_payload(
        result,
        output_path=request.output_path,
        save_mask_path=request.save_mask_path,
        include_base64=request.include_base64,
    )
