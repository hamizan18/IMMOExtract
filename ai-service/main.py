"""IMMOExtract — AI Service (FastAPI).

Provides:
- GET /health: Health status and model readiness.
- POST /extract: Multipart image upload for human parsing and transparent RGBA extraction.
- POST /extract-path: JSON request for local file processing (optimized for co-located backend).
- POST /stylize: Multipart image upload for local SD15 pixel art stylization.
- POST /stylize-path: JSON request for local file stylization (co-located backend).
"""

import base64
from contextlib import asynccontextmanager
import io
import logging
import math
import os
import sys
from threading import Lock
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

from extractor import HumanExtractor, DEFAULT_CHECKPOINT_PATH, save_category_objects

# Optional dependencies must not disable the extraction service.
logger = logging.getLogger(__name__)
_stylization_lock = Lock()
_MAX_IMAGE_BYTES = 10 * 1024 * 1024
try:
    from stylizer import LocalStylizer, DEFAULT_SD15_MODEL_DIR
    STYLIZER_MODULE_AVAILABLE = True
except ImportError:
    logger.info("Stylization dependencies unavailable; extraction remains enabled.")
    STYLIZER_MODULE_AVAILABLE = False
    LocalStylizer = None
    DEFAULT_SD15_MODEL_DIR = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes models upon startup."""
    # 1. Initialize HumanExtractor (SCHP ATR-18)
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

    # 2. Initialize LocalStylizer (SD15 CPU img2img)
    if STYLIZER_MODULE_AVAILABLE:
        sd15_model_dir = os.getenv("SD15_MODEL_PATH", DEFAULT_SD15_MODEL_DIR)
        if sd15_model_dir and os.path.isdir(sd15_model_dir):
            try:
                print(f"[AI Service] Configuring LocalStylizer (lazy load) from: {sd15_model_dir}")
                app.state.stylizer = LocalStylizer(
                    model_dir=sd15_model_dir, num_threads=2, lazy_load=True
                )
                app.state.stylizer_available = True
                print("[AI Service] LocalStylizer configured successfully.")
            except Exception as exc:
                print(f"[AI Service] Failed to initialize LocalStylizer: {exc}")
                app.state.stylizer = None
                app.state.stylizer_available = False
        else:
            print(
                f"[AI Service] SD15 checkpoint directory not found at {sd15_model_dir}. Stylizer disabled."
            )
            app.state.stylizer = None
            app.state.stylizer_available = False
    else:
        app.state.stylizer = None
        app.state.stylizer_available = False

    try:
        yield
    finally:
        if getattr(app.state, "stylizer", None) is not None:
            app.state.stylizer.unload()
        app.state.stylizer = None
        app.state.stylizer_available = False
        app.state.extractor = None
        app.state.model_loaded = False


app = FastAPI(
    title="IMMOExtract AI Service",
    description="Local human parsing & transparent sprite extraction and AI stylization service",
    version="0.3.0",
    lifespan=lifespan,
)


class ExtractPathRequest(BaseModel):
    """Request schema for file-path based extraction."""

    image_path: str = Field(..., description="Absolute or relative path to the source image")
    output_path: Optional[str] = Field(None, description="Path where extracted RGBA PNG will be saved")
    save_mask_path: Optional[str] = Field(None, description="Path where binary alpha mask will be saved")
    include_base64: bool = Field(False, description="Whether to include base64-encoded image and mask")
    objects_dir: Optional[str] = Field(None, description="Internal directory for category PNG crops")


class StylizePathRequest(BaseModel):
    """Request schema for file-path based AI stylization."""

    image_path: str = Field(
        ..., description="Absolute or relative path to the source image (RGB or RGBA)"
    )
    output_path: Optional[str] = Field(
        None, description="Path where stylized RGBA PNG will be saved"
    )
    save_generated_path: Optional[str] = Field(
        None, description="Optional path to save raw square generation output"
    )
    prompt: Optional[str] = Field(None, description="Text prompt describing the target style")
    negative_prompt: Optional[str] = Field(
        None, description="Text prompt describing unwanted artifacts"
    )
    preset: Optional[str] = Field(
        "pixel-art", description="Preset name: 'pixel-art', 'retro-rpg', 'game-boy'"
    )
    target_size: int = Field(256, description="Resolution for diffusion (default 256)")
    num_inference_steps: int = Field(20, description="Total nominal denoising steps (default 20)")
    strength: float = Field(0.5, description="Transformation strength (0.0 to 1.0)")
    guidance_scale: float = Field(7.5, description="Classifier-free guidance weight")
    seed: int = Field(0, description="RNG seed")
    include_base64: bool = Field(False, description="Whether to include base64-encoded stylized PNG")


def _get_extractor() -> HumanExtractor:
    """Helper to retrieve extractor or raise HTTP 503."""
    extractor = getattr(app.state, "extractor", None)
    if extractor is None:
        raise HTTPException(
            status_code=503,
            detail="AI model is not loaded. Ensure checkpoint exists and service is initialized.",
        )
    return extractor


def _get_stylizer() -> LocalStylizer:
    """Helper to retrieve stylizer or raise HTTP 503."""
    stylizer = getattr(app.state, "stylizer", None)
    if stylizer is None or not getattr(app.state, "stylizer_available", False):
        raise HTTPException(
            status_code=503,
            detail="AI stylizer is not available. Ensure SD15 checkpoint directory exists and dependencies are installed.",
        )
    return stylizer


def _build_response_payload(
    result,
    output_path: Optional[str] = None,
    save_mask_path: Optional[str] = None,
    include_base64: bool = False,
    objects: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Formats extraction result into standardized JSON response dict."""
    payload: Dict[str, Any] = {
        "status": "success",
        "original_size": [result.original_size[0], result.original_size[1]],
        "categories_present": result.categories_present,
        "category_pixel_counts": result.category_pixel_counts,
        "execution_time_seconds": round(result.execution_time_seconds, 4),
        "objects": objects if objects is not None else [],
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


def _build_stylize_response_payload(
    result: Any,
    output_path: Optional[str] = None,
    save_generated_path: Optional[str] = None,
    include_base64: bool = False,
) -> Dict[str, Any]:
    """Formats stylization result into standardized JSON response dict."""
    payload: Dict[str, Any] = {
        "status": "success",
        "original_size": list(result.original_size),
        "target_size": list(result.target_size),
        "prompt": result.prompt,
        "negative_prompt": result.negative_prompt,
        "steps_executed": result.steps_executed,
        "strength": result.strength,
        "guidance_scale": result.guidance_scale,
        "seed": result.seed,
        "nsfw_detected": result.nsfw_detected,
        "execution_time_seconds": round(result.execution_time_seconds, 4),
    }

    if output_path:
        payload["output_path"] = output_path
    if save_generated_path:
        payload["save_generated_path"] = save_generated_path

    if include_base64:
        buf = io.BytesIO()
        result.stylized_image.save(buf, format="PNG")
        payload["image_base64"] = base64.b64encode(buf.getvalue()).decode("ascii")

    return payload


@app.get("/health")
def health() -> Dict[str, Any]:
    """Health status and model readiness probe."""
    stylizer = getattr(app.state, "stylizer", None)
    return {
        "status": "ok",
        "service": "ai-service",
        "model_loaded": getattr(app.state, "model_loaded", False),
        "stylizer_available": getattr(app.state, "stylizer_available", False),
        "stylizer_loaded": stylizer.is_loaded() if stylizer is not None else False,
    }


@app.post("/extract")
async def extract_upload(
    file: UploadFile = File(..., description="Image file to extract (JPG/PNG/WebP)"),
    output_path: Optional[str] = Form(None, description="Optional local file path to save RGBA PNG"),
    save_mask_path: Optional[str] = Form(None, description="Optional local file path to save mask PNG"),
    include_base64: bool = Form(True, description="Include base64 strings in response"),
    objects_dir: Optional[str] = Form(None, description="Internal directory for category PNG crops"),
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
    objects = save_category_objects(result, objects_dir) if objects_dir is not None else []

    return _build_response_payload(
        result,
        output_path=output_path,
        save_mask_path=save_mask_path,
        include_base64=include_base64,
        objects=objects,
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
    objects = (
        save_category_objects(result, request.objects_dir)
        if request.objects_dir is not None else []
    )

    return _build_response_payload(
        result,
        output_path=request.output_path,
        save_mask_path=request.save_mask_path,
        include_base64=request.include_base64,
        objects=objects,
    )


def _validate_stylize_options(options, output_path, save_generated_path, image_path=None):
    """Reject unsupported work and output aliases before loading the model."""
    if options["preset"] is not None and options["preset"] not in (
        "pixel-art", "retro-rpg", "game-boy"
    ):
        raise HTTPException(400, "Unknown stylization preset.")
    size = options["target_size"]
    if size < 64 or size > 512 or size % 8:
        raise HTTPException(400, "target_size must be a multiple of 8 between 64 and 512.")
    steps = options["num_inference_steps"]
    strength = options["strength"]
    if not 2 <= steps <= 50:
        raise HTTPException(400, "num_inference_steps must be between 2 and 50.")
    if not math.isfinite(strength) or not 0 < strength <= 1 or int(steps * strength) < 1:
        raise HTTPException(400, "strength must be in (0, 1] and produce at least one denoising step.")
    if not math.isfinite(options["guidance_scale"]) or not 0 <= options["guidance_scale"] <= 20:
        raise HTTPException(400, "guidance_scale must be finite and between 0 and 20.")
    if not 0 <= options["seed"] <= 2**63 - 1:
        raise HTTPException(400, "seed must be between 0 and 2^63 - 1.")
    if save_generated_path and not output_path:
        raise HTTPException(400, "save_generated_path requires output_path.")
    paths = [path for path in (image_path, output_path, save_generated_path) if path]
    for index, path in enumerate(paths):
        for other in paths[:index]:
            if (
                os.path.normcase(os.path.realpath(path)) == os.path.normcase(os.path.realpath(other))
                or (os.path.exists(path) and os.path.exists(other) and os.path.samefile(path, other))
            ):
                raise HTTPException(400, "Source and output paths must be distinct.")


def _read_stylize_image(source):
    """Decode bounded static images, normalizing all transparency to RGBA."""
    try:
        with Image.open(source) as image:
            if image.format not in ("JPEG", "PNG", "WEBP") or getattr(image, "n_frames", 1) != 1:
                raise HTTPException(400, "Only static JPG, PNG and WebP images are supported.")
            width, height = image.size
            if max(width, height) > 8192 or width * height > 24_000_000:
                raise HTTPException(400, "Image dimensions exceed 8192 per side or 24 megapixels.")
            return image.convert("RGBA")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(400, "Image is corrupt or unsupported.") from None


def _run_stylization(image, options, output_path, save_generated_path, include_base64):
    stylizer = _get_stylizer()
    # The lazy loader and PNDM scheduler are mutable; never run them concurrently.
    if not _stylization_lock.acquire(blocking=False):
        raise HTTPException(409, "Stylizer is busy. Wait for the active request to finish.")
    try:
        result = stylizer.stylize(image=image, **options)
        if output_path:
            stylizer.save_result(result, output_path, save_generated_path)
        return _build_stylize_response_payload(
            result, output_path, save_generated_path, include_base64
        )
    except Exception:
        logger.exception("Local stylization or output persistence failed")
        raise HTTPException(500, "Local stylization or output persistence failed.") from None
    finally:
        _stylization_lock.release()


@app.post("/stylize")
def stylize_upload(
    file: UploadFile = File(..., description="Image file to stylize (JPG/PNG/WebP, RGB or RGBA)"),
    output_path: Optional[str] = Form(None, description="Optional local file path to save stylized RGBA PNG"),
    save_generated_path: Optional[str] = Form(None, description="Optional local file path to save raw diffusion output"),
    prompt: Optional[str] = Form(None, description="Text prompt describing the target style"),
    negative_prompt: Optional[str] = Form(None, description="Text prompt describing unwanted artifacts"),
    preset: Optional[str] = Form("pixel-art", description="Preset name: 'pixel-art', 'retro-rpg', 'game-boy'"),
    target_size: int = Form(256, description="Target diffusion resolution (default 256)"),
    num_inference_steps: int = Form(20, description="Total nominal denoising steps"),
    strength: float = Form(0.5, description="Transformation strength (0.0 to 1.0)"),
    guidance_scale: float = Form(7.5, description="Classifier-free guidance weight"),
    seed: int = Form(0, description="RNG seed"),
    include_base64: bool = Form(True, description="Include base64 string in response"),
) -> Dict[str, Any]:
    """Internal loopback API; synchronous work runs outside the event loop."""
    options = dict(
        prompt=prompt, negative_prompt=negative_prompt, preset=preset,
        target_size=target_size, num_inference_steps=num_inference_steps,
        strength=strength, guidance_scale=guidance_scale, seed=seed,
    )
    _validate_stylize_options(options, output_path, save_generated_path)
    content = file.file.read(_MAX_IMAGE_BYTES + 1)
    if not content:
        raise HTTPException(400, "Uploaded file is empty.")
    if len(content) > _MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image exceeds 10 MiB.")
    image = _read_stylize_image(io.BytesIO(content))
    return _run_stylization(image, options, output_path, save_generated_path, include_base64)


@app.post("/stylize-path")
def stylize_path(request: StylizePathRequest) -> Dict[str, Any]:
    """Internal trusted paths only; never expose this route to browser clients."""
    options = request.model_dump(exclude={
        "image_path", "output_path", "save_generated_path", "include_base64"
    })
    _validate_stylize_options(
        options, request.output_path, request.save_generated_path, request.image_path
    )
    if not os.path.isfile(request.image_path):
        raise HTTPException(404, "Source image file not found.")
    try:
        with open(request.image_path, "rb") as source:
            content = source.read(_MAX_IMAGE_BYTES + 1)
    except OSError:
        raise HTTPException(400, "Source image could not be read.") from None
    if len(content) > _MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image exceeds 10 MiB.")
    image = _read_stylize_image(io.BytesIO(content))
    return _run_stylization(
        image, options, request.output_path, request.save_generated_path, request.include_base64
    )
