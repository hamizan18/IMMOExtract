"""Test suite for HumanExtractor end-to-end pipeline on CPU.

Tests:
1. HumanExtractor initialization with SCHP ATR-18 checkpoint.
2. Preprocessing letterboxing for various aspect ratios (square, portrait, landscape).
3. Synthetic human fixture image processing.
4. Output dimensions verification (must match input dimensions exactly).
5. Transparency verification (alpha is 0 for background, 255 for foreground).
6. File save and reload verification (RGBA PNG format, palette, metadata).
"""

import os
import sys
import tempfile
import time

# Ensure ai-service root is in sys.path
ai_service_dir = os.path.dirname(os.path.abspath(__file__))
if ai_service_dir not in sys.path:
    sys.path.insert(0, ai_service_dir)

import numpy as np
from PIL import Image, ImageDraw
import torch

from extractor import HumanExtractor, ExtractionResult


def create_synthetic_person_image(width=360, height=480) -> Image.Image:
    """Creates a synthetic image resembling a person figure on a neutral background."""
    img = Image.new("RGB", (width, height), (220, 220, 225))  # Light grey background
    draw = ImageDraw.Draw(img)

    cx = width // 2
    # Head / Face
    draw.ellipse([cx - 40, 40, cx + 40, 130], fill=(235, 195, 160))
    # Hair
    draw.arc([cx - 42, 38, cx + 42, 90], start=180, end=360, fill=(40, 25, 20), width=10)
    # Upper clothes (Torso)
    draw.rectangle([cx - 60, 130, cx + 60, 280], fill=(45, 95, 175))  # Blue shirt
    # Arms
    draw.rectangle([cx - 85, 140, cx - 60, 260], fill=(235, 195, 160))  # Left arm
    draw.rectangle([cx + 60, 140, cx + 85, 260], fill=(235, 195, 160))  # Right arm
    # Pants
    draw.rectangle([cx - 55, 280, cx - 10, 410], fill=(30, 35, 45))  # Left leg
    draw.rectangle([cx + 10, 280, cx + 55, 410], fill=(30, 35, 45))  # Right leg
    # Shoes
    draw.ellipse([cx - 60, 405, cx - 5, 435], fill=(80, 40, 20))
    draw.ellipse([cx + 5, 405, cx + 60, 435], fill=(80, 40, 20))

    return img


def test_extractor():
    print("=== 1. Initializing HumanExtractor Engine ===")
    start = time.perf_counter()
    extractor = HumanExtractor()
    print(f"Extractor initialized in {time.perf_counter() - start:.2f}s on {extractor.device}")

    print("\n=== 2. Testing Letterbox Preprocessing ===")
    test_sizes = [(300, 300), (320, 480), (640, 360)]
    for w, h in test_sizes:
        test_img = Image.new("RGB", (w, h), (128, 128, 128))
        tensor, (dx, dy, nw, nh) = extractor.preprocess(test_img)
        print(f"Input ({w}x{h}) -> canvas 512x512, scaled=({nw}x{nh}), offset=({dx}, {dy})")
        assert tensor.shape == (1, 3, 512, 512)
        assert dx >= 0 and dy >= 0
        assert nw <= 512 and nh <= 512
        assert dx + nw <= 512 and dy + nh <= 512
    print("PASS: Preprocessing letterbox logic verified across all aspect ratios.")

    print("\n=== 3. Testing Extraction with Synthetic Human Image ===")
    synth_img = create_synthetic_person_image(360, 480)
    print(f"Created synthetic fixture image: {synth_img.size}, mode={synth_img.mode}")

    start = time.perf_counter()
    result = extractor.extract(synth_img)
    total_time = time.perf_counter() - start

    print(f"Extraction completed in: {total_time:.3f} seconds")
    print(f"Reported execution time: {result.execution_time_seconds:.3f} seconds")
    print(f"Original size: {result.original_size}")
    print(f"Categories detected: {result.categories_present}")
    print(f"Category pixel counts: {result.category_pixel_counts}")

    assert result.original_size == (360, 480), f"Size mismatch: {result.original_size}"
    assert result.foreground_mask.shape == (480, 360), f"Mask shape mismatch: {result.foreground_mask.shape}"
    assert result.class_map.shape == (480, 360), f"Class map shape mismatch: {result.class_map.shape}"
    assert result.rgba_image.size == (360, 480), f"RGBA size mismatch: {result.rgba_image.size}"
    assert result.rgba_image.mode == "RGBA", f"Expected RGBA mode, got {result.rgba_image.mode}"

    fg_count = np.count_nonzero(result.foreground_mask)
    total_pixels = 360 * 480
    fg_ratio = fg_count / total_pixels
    print(f"Foreground pixels: {fg_count:,} / {total_pixels:,} ({fg_ratio:.1%})")

    # In a person image, foreground should be between 5% and 80%
    assert 0.05 < fg_ratio < 0.85, f"Unexpected foreground ratio: {fg_ratio:.2%}"
    print("PASS: Foreground extraction produces expected proportion.")

    print("\n=== 4. Verifying Transparency and RGBA Integrity ===")
    rgba_arr = np.array(result.rgba_image)  # [H, W, 4]
    alpha = rgba_arr[:, :, 3]

    # Verify background pixels have alpha == 0
    bg_mask = ~result.foreground_mask
    assert (alpha[bg_mask] == 0).all(), "Background pixels must have alpha == 0!"

    # Verify foreground pixels have alpha == 255
    assert (alpha[result.foreground_mask] == 255).all(), "Foreground pixels must have alpha == 255!"

    # Verify RGB channels are preserved
    orig_arr = np.array(synth_img)
    assert np.array_equal(rgba_arr[:, :, :3], orig_arr), "RGB pixel values must be preserved exactly!"
    print("PASS: Transparency verified (alpha=0 on background, alpha=255 on foreground, RGB intact).")

    print("\n=== 5. Verifying File Export and Reload ===")
    with tempfile.TemporaryDirectory() as tmpdir:
        out_rgba = os.path.join(tmpdir, "extracted.png")
        out_mask = os.path.join(tmpdir, "mask.png")

        extractor.save_result(result, out_rgba, out_mask)

        assert os.path.exists(out_rgba)
        assert os.path.exists(out_mask)

        # Reload and check using context managers to release file locks on Windows
        with Image.open(out_rgba) as loaded_rgba:
            assert loaded_rgba.format == "PNG"
            assert loaded_rgba.mode == "RGBA"
            assert loaded_rgba.size == (360, 480)

        with Image.open(out_mask) as loaded_mask:
            assert loaded_mask.format == "PNG"
            assert loaded_mask.mode == "RGBA" or loaded_mask.mode == "L"
            assert loaded_mask.size == (360, 480)

        print(f"Saved RGBA size: {os.path.getsize(out_rgba):,} bytes")
        print(f"Saved Mask size: {os.path.getsize(out_mask):,} bytes")
        print("PASS: PNG file export and reload verified.")

    print("\n=== ALL EXTRACTOR TESTS PASSED ===")


if __name__ == "__main__":
    test_extractor()
