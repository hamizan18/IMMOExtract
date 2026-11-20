"""IMMOExtract — Local AI Pixel Art Stylizer Pipeline (CPU).

Performs image-to-image stylization using local Stable Diffusion v1.5 with:
1. Cloned memory-mapped tensor loader (ClonedOffloadedWeightsLoader) to prevent
   virtual memory commit leaks on Windows CPU.
2. Aspect-ratio preserving letterbox preprocessing with neutral canvas.
3. Pure CPU FP32 img2img denoising inference with PNDMScheduler.
4. Active local safety checker (SD15 default).
5. Un-letterbox and 1:1 original silhouette alpha mask restoration (100% exact match).
6. Clean resource lifecycle management (load/unload/context manager).

Zero cloud API calls; fully local and private.
"""

from dataclasses import dataclass, field
import gc
import json
import os
import sys
import time
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

# Ensure ai-service root is in sys.path
ai_service_dir = os.path.dirname(os.path.abspath(__file__))
if ai_service_dir not in sys.path:
    sys.path.insert(0, ai_service_dir)

import numpy as np
from PIL import Image
from safetensors import safe_open
import torch
import accelerate
import accelerate.big_modeling
import accelerate.utils.offload
from diffusers import StableDiffusionImg2ImgPipeline, UNet2DConditionModel

DEFAULT_SD15_MODEL_DIR = os.path.join(
    ai_service_dir, "models", "sd15-poc", "451f4fe16113bff5a5d2269ed5ad43b0592e9a14"
)

# Built-in prompt presets for quick selection
PROMPT_PRESETS: Dict[str, Dict[str, str]] = {
    "pixel-art": {
        "prompt": "pixel art style, retro game sprite, clean outline, vivid colors",
        "negative_prompt": "blurry, photorealistic, smooth, noise, artifacts",
    },
    "retro-rpg": {
        "prompt": "16-bit retro RPG sprite, pixel art character, vibrant palette, sharp silhouette",
        "negative_prompt": "blurry, realistic, 3d render, modern, smooth gradients",
    },
    "game-boy": {
        "prompt": "game boy 4-color monochrome green pixel art, retro handheld sprite, dithered",
        "negative_prompt": "colorful, photorealistic, modern, blurry, smooth",
    },
}


class ClonedOffloadedWeightsLoader(accelerate.utils.offload.OffloadedWeightsLoader):
    """Subclass of OffloadedWeightsLoader that calls .clone() on extracted tensors.

    On Windows, safetensors memory-mapped files via `safe_open` allocate a virtual
    memory view per slice. Without `.clone()`, references prevent releasing these
    views, causing commit charge spikes. Calling `.clone()` severs the underlying
    mmap reference so the mapping is released immediately when exiting the context,
    keeping physical RSS bounded (~2.2-2.4 GiB).
    """

    def __getitem__(self, key: str):
        if key in self.state_dict:
            return self.state_dict[key]
        weight_info = self.index[key]
        if weight_info.get("safetensors_file") is not None:
            device = "cpu" if self.device is None else self.device
            safetensors_file = weight_info["safetensors_file"]
            weight_name = weight_info.get("weight_name", key)
            try:
                with safe_open(safetensors_file, framework="pt", device=device) as f:
                    tensor = f.get_tensor(weight_name).clone()
            except TypeError:
                with safe_open(safetensors_file, framework="pt", device="cpu") as f:
                    tensor = f.get_tensor(weight_name).clone()

            if "dtype" in weight_info:
                tensor = tensor.to(getattr(torch, weight_info["dtype"]))

            if tensor.device != torch.device(device):
                tensor = tensor.to(device)
            return tensor

        weight_file = os.path.join(self.save_folder, f"{key}.dat")
        return accelerate.utils.offload.load_offloaded_weight(weight_file, weight_info)


def patch_accelerate_loader() -> None:
    """Ensure accelerate uses ClonedOffloadedWeightsLoader for disk offload."""
    accelerate.big_modeling.OffloadedWeightsLoader = ClonedOffloadedWeightsLoader
    accelerate.utils.offload.OffloadedWeightsLoader = ClonedOffloadedWeightsLoader


@dataclass
class StylizationResult:
    """Encapsulates the output and metadata of an AI stylization run."""

    original_size: Tuple[int, int]  # (width, height)
    target_size: Tuple[int, int]  # (width, height) used for diffusion
    stylized_image: Image.Image  # RGBA (or RGB) with restored silhouette alpha
    generated_image: Image.Image  # Raw square RGB diffusion output
    prompt: str
    negative_prompt: str
    steps_executed: int
    strength: float
    guidance_scale: float
    seed: int
    nsfw_detected: bool
    execution_time_seconds: float
    step_times: List[float] = field(default_factory=list)


class LocalStylizer:
    """Inference engine for local SD15 img2img pixel art stylization on CPU."""

    def __init__(
        self,
        model_dir: Optional[str] = None,
        num_threads: int = 2,
        lazy_load: bool = True,
    ):
        self.model_dir = model_dir or os.getenv("SD15_MODEL_PATH", DEFAULT_SD15_MODEL_DIR)
        self.num_threads = num_threads
        self.pipe: Optional[StableDiffusionImg2ImgPipeline] = None

        if not lazy_load:
            self.load()

    def is_loaded(self) -> bool:
        """Check whether the diffusion pipeline is currently resident in memory."""
        return self.pipe is not None

    def load(self) -> None:
        """Initialize and dispatch the SD15 pipeline with disk-offloaded UNet."""
        if self.is_loaded():
            return

        if not os.path.isdir(self.model_dir):
            raise FileNotFoundError(
                f"SD15 model directory not found at: {self.model_dir}. "
                "Ensure model checkpoint files are downloaded locally."
            )

        unet_config_file = os.path.join(self.model_dir, "unet", "config.json")
        unet_weights_file = os.path.join(
            self.model_dir, "unet", "diffusion_pytorch_model.safetensors"
        )

        if not os.path.isfile(unet_config_file) or not os.path.isfile(unet_weights_file):
            raise FileNotFoundError(
                f"UNet config or weights missing in model directory: {self.model_dir}"
            )

        # Set PyTorch CPU thread count
        torch.set_num_threads(self.num_threads)

        # Patch loader for Windows commit memory mitigation
        patch_accelerate_loader()

        # Load UNet architecture on meta device
        with open(unet_config_file, "r", encoding="utf-8") as f:
            unet_config = json.load(f)

        with torch.device("meta"):
            unet = UNet2DConditionModel.from_config(unet_config)

        # Build offload index for disk dispatch
        offload_index = {}
        for name, param in unet.named_parameters():
            offload_index[name] = {
                "safetensors_file": unet_weights_file,
                "weight_name": name,
                "dtype": str(param.dtype).replace("torch.", ""),
            }

        # Dispatch UNet to disk offload
        unet = accelerate.big_modeling.dispatch_model(
            unet,
            device_map={"": "disk"},
            offload_index=offload_index,
            main_device="cpu",
        )

        # Load full pipeline referencing the offloaded UNet
        pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            self.model_dir,
            unet=unet,
            dtype=torch.float32,
            local_files_only=True,
        )
        pipe.set_progress_bar_config(disable=True)

        self.pipe = pipe

    def unload(self) -> None:
        """Release pipeline from memory and run garbage collection."""
        self.pipe = None
        gc.collect()

    def __enter__(self):
        if not self.is_loaded():
            self.load()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.unload()

    def _preprocess_input(
        self,
        image: Image.Image,
        target_size: int,
    ) -> Tuple[Image.Image, Tuple[int, int], Tuple[int, int, int, int], Optional[Image.Image]]:
        """Letterbox image into square RGB canvas and preserve original silhouette alpha."""
        orig_w, orig_h = image.size
        orig_alpha: Optional[Image.Image] = None

        if image.mode == "RGBA":
            orig_alpha = image.split()[3]
            img_rgba = image
        else:
            img_rgba = image.convert("RGBA")

        # Proportional resize maintaining aspect ratio
        scale = min(target_size / orig_w, target_size / orig_h)
        new_w = max(1, int(round(orig_w * scale)))
        new_h = max(1, int(round(orig_h * scale)))
        resized_img = img_rgba.resize((new_w, new_h), Image.Resampling.BILINEAR)

        # Create neutral canvas
        canvas = Image.new("RGB", (target_size, target_size), (128, 128, 128))
        pad_x = (target_size - new_w) // 2
        pad_y = (target_size - new_h) // 2

        # Paste with alpha mask
        canvas.paste(resized_img, (pad_x, pad_y), resized_img.split()[3])

        return canvas, (orig_w, orig_h), (pad_x, pad_y, new_w, new_h), orig_alpha

    def _postprocess_output(
        self,
        gen_img: Image.Image,
        orig_size: Tuple[int, int],
        crop_box: Tuple[int, int, int, int],
        orig_alpha: Optional[Image.Image],
    ) -> Image.Image:
        """Un-letterbox diffusion output back to original size and restore original alpha."""
        pad_x, pad_y, new_w, new_h = crop_box
        orig_w, orig_h = orig_size

        # Un-pad / crop back to valid object area
        cropped = gen_img.crop((pad_x, pad_y, pad_x + new_w, pad_y + new_h))

        # Resize back to original dimensions using NEAREST to preserve crisp pixel look
        restored = cropped.resize((orig_w, orig_h), Image.Resampling.NEAREST)

        if orig_alpha is not None:
            restored_rgba = restored.convert("RGBA")
            restored_rgba.putalpha(orig_alpha)
            return restored_rgba

        return restored

    def stylize(
        self,
        image: Union[Image.Image, str],
        prompt: Optional[str] = None,
        negative_prompt: Optional[str] = None,
        preset: Optional[str] = "pixel-art",
        target_size: int = 256,
        num_inference_steps: int = 20,
        strength: float = 0.5,
        guidance_scale: float = 7.5,
        seed: int = 0,
        step_callback: Optional[Callable[[int, int, float], None]] = None,
    ) -> StylizationResult:
        """Run image-to-image stylization on CPU.

        Args:
            image: PIL Image or path to image file.
            prompt: Text prompt describing the target style. Defaults to preset.
            negative_prompt: Text prompt describing unwanted artifacts. Defaults to preset.
            preset: Built-in preset name ('pixel-art', 'retro-rpg', 'game-boy').
            target_size: Resolution for diffusion model (default 256).
            num_inference_steps: Total nominal denoising steps (default 20).
            strength: Transformation strength (0.0=identical, 1.0=full generation).
            guidance_scale: Classifier-free guidance weight (default 7.5).
            seed: RNG seed for reproducible generation.
            step_callback: Optional callback(step_index, timestep, step_seconds).

        Returns:
            StylizationResult with stylized image, metadata, and execution metrics.
        """
        if not self.is_loaded():
            self.load()

        assert self.pipe is not None, "Pipeline must be loaded before running stylization."

        # Load image if file path is provided
        if isinstance(image, str):
            if not os.path.isfile(image):
                raise FileNotFoundError(f"Source image file not found: {image}")
            pil_image = Image.open(image)
        elif isinstance(image, Image.Image):
            pil_image = image
        else:
            raise TypeError(f"Expected PIL.Image.Image or file path string, got {type(image)}")

        # Resolve prompt and negative prompt
        if preset and preset in PROMPT_PRESETS:
            default_prompt = PROMPT_PRESETS[preset]["prompt"]
            default_neg = PROMPT_PRESETS[preset]["negative_prompt"]
        else:
            default_prompt = PROMPT_PRESETS["pixel-art"]["prompt"]
            default_neg = PROMPT_PRESETS["pixel-art"]["negative_prompt"]

        actual_prompt = prompt if prompt is not None else default_prompt
        actual_neg_prompt = negative_prompt if negative_prompt is not None else default_neg

        # Preprocess input image
        input_canvas, orig_size, crop_box, orig_alpha = self._preprocess_input(
            pil_image, target_size=target_size
        )

        # Setup step tracking
        step_times: List[float] = []
        last_step_time = [time.time()]

        def _internal_step_callback(pipe_obj, step_idx, timestep, callback_kwargs):
            now = time.time()
            step_dt = now - last_step_time[0]
            last_step_time[0] = now
            step_times.append(round(step_dt, 3))
            if step_callback:
                ts_val = int(timestep) if hasattr(timestep, "__int__") else 0
                step_callback(step_idx + 1, ts_val, round(step_dt, 3))
            return callback_kwargs

        # RNG generator for CPU
        generator = torch.Generator(device="cpu").manual_seed(seed)

        t_start = time.time()
        with torch.no_grad():
            output = self.pipe(
                prompt=actual_prompt,
                negative_prompt=actual_neg_prompt,
                image=input_canvas,
                num_inference_steps=num_inference_steps,
                strength=strength,
                guidance_scale=guidance_scale,
                generator=generator,
                callback_on_step_end=_internal_step_callback,
            )
        t_total = time.time() - t_start

        raw_gen_img = output.images[0]

        # Post-process: restore aspect ratio and original alpha contour
        stylized_img = self._postprocess_output(
            gen_img=raw_gen_img,
            orig_size=orig_size,
            crop_box=crop_box,
            orig_alpha=orig_alpha,
        )

        has_nsfw = False
        if hasattr(output, "nsfw_content_detected") and output.nsfw_content_detected is not None:
            has_nsfw = any(output.nsfw_content_detected)

        return StylizationResult(
            original_size=orig_size,
            target_size=(target_size, target_size),
            stylized_image=stylized_img,
            generated_image=raw_gen_img,
            prompt=actual_prompt,
            negative_prompt=actual_neg_prompt,
            steps_executed=len(step_times),
            strength=strength,
            guidance_scale=guidance_scale,
            seed=seed,
            nsfw_detected=has_nsfw,
            execution_time_seconds=round(t_total, 3),
            step_times=step_times,
        )

    def save_result(
        self,
        result: StylizationResult,
        output_path: str,
        save_generated_path: Optional[str] = None,
    ) -> None:
        """Save stylized PNG and optional raw square generation output."""
        output_dir = os.path.dirname(os.path.abspath(output_path))
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        result.stylized_image.save(output_path, format="PNG")

        if save_generated_path:
            gen_dir = os.path.dirname(os.path.abspath(save_generated_path))
            if gen_dir:
                os.makedirs(gen_dir, exist_ok=True)
            result.generated_image.save(save_generated_path, format="PNG")
