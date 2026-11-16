"""IMMOExtract — Human Parsing & Foreground Extraction Pipeline (CPU).

Loads SCHP ATR-18 ResNet-101 model and performs:
1. Aspect-ratio preserving letterbox preprocessing (512x512, RGB->BGR, ATR normalization).
2. Pure-PyTorch CPU inference.
3. Bilinear un-padding and resizing back to original image dimensions.
4. Argmax multi-class parsing and binary foreground alpha mask generation.
5. RGBA PNG extraction with clean transparency.

Zero dependencies beyond PyTorch, Pillow, and NumPy (no OpenCV required).
"""

from dataclasses import dataclass, field
import os
import sys
import time
from typing import Any, Dict, List, Optional, Tuple, Union

# Ensure ai-service root is in sys.path
ai_service_dir = os.path.dirname(os.path.abspath(__file__))
if ai_service_dir not in sys.path:
    sys.path.insert(0, ai_service_dir)

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F

from schp_cpu import resnet101, ATR_SETTINGS

DEFAULT_CHECKPOINT_PATH = os.path.join(
    ai_service_dir, "models", "exp-schp-201908301523-atr.pth"
)
CATEGORY_PIXEL_THRESHOLD = 50


@dataclass
class ExtractionResult:
    """Encapsulates the output of a human parsing extraction."""

    original_size: Tuple[int, int]  # (width, height)
    foreground_mask: np.ndarray  # (H, W) bool array, True for foreground
    class_map: np.ndarray  # (H, W) uint8 array with ATR class indices (0..17)
    rgba_image: Image.Image  # RGBA PIL Image with transparent background
    categories_present: List[str] = field(default_factory=list)
    category_pixel_counts: Dict[str, int] = field(default_factory=dict)
    execution_time_seconds: float = 0.0


def save_category_objects(
    result: ExtractionResult, objects_dir: str
) -> List[Dict[str, Any]]:
    """Save one original-pixel RGBA crop per eligible ATR class, without inference."""
    objects = []
    image_width, image_height = result.original_size
    for class_id, category in enumerate(ATR_SETTINGS["labels"]):
        if class_id == 0:
            continue
        category_mask = result.class_map == class_id
        pixel_count = int(np.count_nonzero(category_mask))
        if pixel_count <= CATEGORY_PIXEL_THRESHOLD:
            continue

        rows = np.flatnonzero(category_mask.any(axis=1))
        columns = np.flatnonzero(category_mask.any(axis=0))
        left = max(0, int(columns[0]) - 2)
        top = max(0, int(rows[0]) - 2)
        right = min(image_width, int(columns[-1]) + 3)
        bottom = min(image_height, int(rows[-1]) + 3)
        bbox = [left, top, right, bottom]
        filename = f"atr-{class_id}.png"

        if not objects:
            os.makedirs(objects_dir, exist_ok=True)
        with result.rgba_image.crop(bbox) as crop:
            alpha = category_mask[top:bottom, left:right].astype(np.uint8) * 255
            crop.putalpha(Image.fromarray(alpha))
            crop.save(os.path.join(objects_dir, filename), format="PNG")

        # Advertise only files whose writes have completed successfully.
        objects.append({
            "class_id": class_id,
            "category": category,
            "file": f"objects/{filename}",
            "bbox": bbox,
            "width": right - left,
            "height": bottom - top,
            "pixel_count": pixel_count,
        })
    return objects


class HumanExtractor:
    """Inference engine for human parsing and foreground alpha extraction."""

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        device: str = "cpu",
    ):
        self.device = torch.device(device)
        self.checkpoint_path = checkpoint_path or DEFAULT_CHECKPOINT_PATH
        self.num_classes = ATR_SETTINGS["num_classes"]
        self.input_size = ATR_SETTINGS["input_size"]  # (512, 512)
        self.labels = ATR_SETTINGS["labels"]

        # Normalization constants (BGR)
        self.mean = torch.tensor(
            ATR_SETTINGS["mean"], dtype=torch.float32, device=self.device
        ).view(1, 3, 1, 1)
        self.std = torch.tensor(
            ATR_SETTINGS["std"], dtype=torch.float32, device=self.device
        ).view(1, 3, 1, 1)

        self.model = self._load_model()

    def _load_model(self) -> nn.Module:
        """Instantiates ResNet-101 and loads weights strictly."""
        if not os.path.exists(self.checkpoint_path):
            raise FileNotFoundError(
                f"Checkpoint not found at: {self.checkpoint_path}. "
                "Please download exp-schp-201908301523-atr.pth first."
            )

        model = resnet101(num_classes=self.num_classes)
        model.to(self.device)
        model.eval()

        raw_checkpoint = torch.load(
            self.checkpoint_path, map_location=self.device, weights_only=False
        )
        state_dict = (
            raw_checkpoint["state_dict"]
            if isinstance(raw_checkpoint, dict) and "state_dict" in raw_checkpoint
            else raw_checkpoint
        )

        clean_state_dict = {
            (k[7:] if k.startswith("module.") else k): v
            for k, v in state_dict.items()
        }

        model.load_state_dict(clean_state_dict, strict=True)
        return model

    def preprocess(
        self, image: Image.Image
    ) -> Tuple[torch.Tensor, Tuple[int, int, int, int]]:
        """Preprocesses PIL image to letterboxed BGR normalized tensor [1, 3, 512, 512].

        Returns:
            tensor: Preprocessed tensor ready for model.
            pad_info: (dx, dy, new_w, new_h) placement inside 512x512 canvas.
        """
        orig_w, orig_h = image.size
        target_h, target_w = self.input_size

        # Compute aspect-preserving scale
        scale = min(target_w / orig_w, target_h / orig_h)
        new_w = max(1, int(round(orig_w * scale)))
        new_h = max(1, int(round(orig_h * scale)))

        resized_img = image.resize((new_w, new_h), Image.Resampling.BILINEAR)

        # Place onto 512x512 black canvas
        dx = (target_w - new_w) // 2
        dy = (target_h - new_h) // 2

        canvas = Image.new("RGB", (target_w, target_h), (0, 0, 0))
        canvas.paste(resized_img, (dx, dy))

        # Convert to numpy float32 [H, W, 3] in [0, 1]
        arr_rgb = np.array(canvas, dtype=np.float32) / 255.0

        # Convert RGB -> BGR (SCHP expectation)
        arr_bgr = arr_rgb[:, :, ::-1].copy()

        # [H, W, 3] -> [1, 3, H, W]
        tensor = torch.from_numpy(arr_bgr).permute(2, 0, 1).unsqueeze(0).to(self.device)

        # Normalize with BGR mean and std
        tensor = (tensor - self.mean) / self.std

        return tensor, (dx, dy, new_w, new_h)

    def extract(
        self, image_input: Union[str, Image.Image, np.ndarray]
    ) -> ExtractionResult:
        """Extracts human parsing mask and returns transparent RGBA image.

        Args:
            image_input: File path, PIL Image, or NumPy RGB array.

        Returns:
            ExtractionResult with class map, mask, and RGBA image.
        """
        start_time = time.perf_counter()

        if isinstance(image_input, str):
            orig_pil = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            orig_pil = Image.fromarray(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            orig_pil = image_input.convert("RGB")
        else:
            raise TypeError(f"Unsupported image input type: {type(image_input)}")

        orig_w, orig_h = orig_pil.size

        # Preprocess with letterbox
        input_tensor, (dx, dy, new_w, new_h) = self.preprocess(orig_pil)

        with torch.no_grad():
            output = self.model(input_tensor)
            fusion_logits = output[0][1]  # Shape [1, 18, 128, 128]

            # Upsample logits back to letterbox canvas size (512, 512)
            upsampled_logits = F.interpolate(
                fusion_logits,
                size=self.input_size,
                mode="bilinear",
                align_corners=True,
            )  # Shape [1, 18, 512, 512]

            # Un-pad: crop the valid image region from canvas
            valid_logits = upsampled_logits[:, :, dy : dy + new_h, dx : dx + new_w]

            # Interpolate valid logits to original image resolution (orig_h, orig_w)
            orig_logits = F.interpolate(
                valid_logits,
                size=(orig_h, orig_w),
                mode="bilinear",
                align_corners=True,
            )  # Shape [1, 18, orig_h, orig_w]

            # Argmax across 18 classes -> [orig_h, orig_w]
            class_map_tensor = orig_logits.squeeze(0).argmax(dim=0)
            class_map = class_map_tensor.cpu().numpy().astype(np.uint8)

        # Foreground is all non-background classes (class > 0 in ATR-18)
        foreground_mask = class_map > 0

        # Construct RGBA image
        alpha_channel = np.where(foreground_mask, 255, 0).astype(np.uint8)
        alpha_pil = Image.fromarray(alpha_channel, mode="L")
        rgba_image = orig_pil.copy()
        rgba_image.putalpha(alpha_pil)

        # Count present categories
        unique_classes, counts = np.unique(class_map, return_counts=True)
        category_counts = {}
        categories_present = []
        for cls_idx, count in zip(unique_classes, counts):
            if cls_idx < len(self.labels):
                label_name = self.labels[cls_idx]
                category_counts[label_name] = int(count)
                if cls_idx > 0 and count > CATEGORY_PIXEL_THRESHOLD:
                    categories_present.append(label_name)

        elapsed = time.perf_counter() - start_time

        return ExtractionResult(
            original_size=(orig_w, orig_h),
            foreground_mask=foreground_mask,
            class_map=class_map,
            rgba_image=rgba_image,
            categories_present=categories_present,
            category_pixel_counts=category_counts,
            execution_time_seconds=elapsed,
        )

    def save_result(
        self,
        result: ExtractionResult,
        output_rgba_path: str,
        save_mask_path: Optional[str] = None,
    ) -> None:
        """Saves RGBA extracted image and optional binary mask to disk."""
        os.makedirs(os.path.dirname(os.path.abspath(output_rgba_path)), exist_ok=True)
        result.rgba_image.save(output_rgba_path, format="PNG")

        if save_mask_path:
            os.makedirs(os.path.dirname(os.path.abspath(save_mask_path)), exist_ok=True)
            mask_img = Image.fromarray(
                np.where(result.foreground_mask, 255, 0).astype(np.uint8), mode="L"
            )
            mask_img.save(save_mask_path, format="PNG")
