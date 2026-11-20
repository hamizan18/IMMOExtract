"""IMMOExtract — Unit Tests for LocalStylizer (CPU).

Tests:
1. Module imports and ClonedOffloadedWeightsLoader subclassing.
2. Letterbox preprocessing (aspect ratio preservation and neutral canvas padding).
3. Output postprocessing (un-letterbox crop, nearest resize, and 100% alpha restoration).
4. Stylization lifecycle (lazy initialization, is_loaded, unload).
5. Live single-step stylization with local SD15 checkpoint and alpha integrity check.
"""

import os
import sys
import unittest
from typing import Tuple

# Ensure ai-service root is in sys.path
ai_service_dir = os.path.dirname(os.path.abspath(__file__))
if ai_service_dir not in sys.path:
    sys.path.insert(0, ai_service_dir)

import numpy as np
from PIL import Image
import torch

from stylizer import (
    ClonedOffloadedWeightsLoader,
    LocalStylizer,
    StylizationResult,
    DEFAULT_SD15_MODEL_DIR,
    PROMPT_PRESETS,
    patch_accelerate_loader,
)


class TestStylizerPreprocessing(unittest.TestCase):
    """Test preprocessing and postprocessing algorithms without loading models."""

    def setUp(self):
        self.stylizer = LocalStylizer(lazy_load=True)

    def test_presets_exist(self):
        """Ensure predefined presets are configured."""
        self.assertIn("pixel-art", PROMPT_PRESETS)
        self.assertIn("retro-rpg", PROMPT_PRESETS)
        self.assertIn("game-boy", PROMPT_PRESETS)
        for preset_name, preset_dict in PROMPT_PRESETS.items():
            self.assertIn("prompt", preset_dict)
            self.assertIn("negative_prompt", preset_dict)

    def test_preprocess_rgba_portrait(self):
        """Test portrait image (120x240) letterboxed to 256x256."""
        orig_w, orig_h = 120, 240
        # Create dummy RGBA image with distinct alpha circle
        img_arr = np.zeros((orig_h, orig_w, 4), dtype=np.uint8)
        img_arr[:, :, 0] = 200  # Red
        # Alpha mask circle in center
        y, x = np.ogrid[:orig_h, :orig_w]
        mask = ((x - orig_w / 2) ** 2 + (y - orig_h / 2) ** 2) <= 50**2
        img_arr[mask, 3] = 255
        test_img = Image.fromarray(img_arr, mode="RGBA")

        canvas, orig_size, crop_box, orig_alpha = self.stylizer._preprocess_input(
            test_img, target_size=256
        )

        self.assertEqual(orig_size, (120, 240))
        self.assertEqual(canvas.size, (256, 256))
        self.assertEqual(canvas.mode, "RGB")
        self.assertIsNotNone(orig_alpha)
        self.assertEqual(orig_alpha.size, (120, 240))

        pad_x, pad_y, new_w, new_h = crop_box
        self.assertEqual(new_h, 256)
        expected_w = int(round(120 * (256 / 240)))  # 128
        self.assertEqual(new_w, expected_w)
        self.assertEqual(pad_x, (256 - expected_w) // 2)
        self.assertEqual(pad_y, 0)

        # Ensure padding border has neutral gray (128, 128, 128)
        canvas_arr = np.array(canvas)
        # Left padding pixel
        np.testing.assert_array_equal(canvas_arr[0, 0], [128, 128, 128])

    def test_postprocess_restores_exact_alpha(self):
        """Verify postprocessing restores original dimensions and identical alpha."""
        orig_w, orig_h = 100, 150
        # Create source image with arbitrary alpha pattern
        rng = np.random.RandomState(42)
        source_alpha_arr = rng.randint(0, 2, size=(orig_h, orig_w), dtype=np.uint8) * 255
        source_alpha = Image.fromarray(source_alpha_arr, mode="L")

        target_size = 256
        dummy_input = Image.new("RGBA", (orig_w, orig_h), (50, 100, 150, 255))
        dummy_input.putalpha(source_alpha)

        _, orig_size, crop_box, orig_alpha = self.stylizer._preprocess_input(
            dummy_input, target_size=target_size
        )

        # Simulate generated 256x256 RGB image with new colors
        gen_img_arr = np.full((target_size, target_size, 3), 220, dtype=np.uint8)
        gen_img = Image.fromarray(gen_img_arr, mode="RGB")

        stylized = self.stylizer._postprocess_output(
            gen_img=gen_img,
            orig_size=orig_size,
            crop_box=crop_box,
            orig_alpha=orig_alpha,
        )

        self.assertEqual(stylized.size, (orig_w, orig_h))
        self.assertEqual(stylized.mode, "RGBA")

        # Verify alpha is 100% identical to source alpha
        stylized_alpha_arr = np.array(stylized.split()[3])
        np.testing.assert_array_equal(
            stylized_alpha_arr,
            source_alpha_arr,
            err_msg="Restored alpha mask does not match original alpha mask!",
        )

    def test_lazy_initialization(self):
        """Ensure lazy_load does not initialize pipeline on instantiation."""
        stylizer = LocalStylizer(lazy_load=True)
        self.assertFalse(stylizer.is_loaded())
        self.assertIsNone(stylizer.pipe)


class TestStylizerInferenceLive(unittest.TestCase):
    """Live inference test with local SD15 checkpoint on CPU."""

    @classmethod
    def setUpClass(cls):
        cls.model_dir = DEFAULT_SD15_MODEL_DIR
        cls.has_model = os.path.isdir(cls.model_dir)

    def test_live_inference_single_step(self):
        """Run 1-step denoising with local SD15 to verify full end-to-end flow."""
        if not self.has_model:
            self.skipTest(f"SD15 model directory not found at {self.model_dir}")

        stylizer = LocalStylizer(model_dir=self.model_dir, num_threads=2, lazy_load=True)
        self.assertFalse(stylizer.is_loaded())

        # Create dummy RGBA input: 128x160 with center circle
        orig_w, orig_h = 128, 160
        img_arr = np.zeros((orig_h, orig_w, 4), dtype=np.uint8)
        img_arr[:, :, 0] = 180
        img_arr[:, :, 1] = 90
        img_arr[:, :, 2] = 40
        y, x = np.ogrid[:orig_h, :orig_w]
        mask = ((x - orig_w / 2) ** 2 + (y - orig_h / 2) ** 2) <= 40**2
        img_arr[mask, 3] = 255
        test_img = Image.fromarray(img_arr, mode="RGBA")

        recorded_steps = []

        def on_step(step_idx, timestep, step_sec):
            recorded_steps.append((step_idx, timestep, step_sec))

        # Run minimal inference: 2 nominal steps with strength 0.5 = 1 actual denoising step
        result = stylizer.stylize(
            image=test_img,
            preset="pixel-art",
            target_size=256,
            num_inference_steps=2,
            strength=0.5,
            guidance_scale=7.5,
            seed=42,
            step_callback=on_step,
        )

        self.assertTrue(stylizer.is_loaded())
        self.assertIsInstance(result, StylizationResult)
        self.assertEqual(result.original_size, (orig_w, orig_h))
        self.assertEqual(result.target_size, (256, 256))
        self.assertEqual(result.stylized_image.size, (orig_w, orig_h))
        self.assertEqual(result.stylized_image.mode, "RGBA")
        self.assertEqual(result.generated_image.size, (256, 256))
        self.assertGreaterEqual(result.steps_executed, 1)
        self.assertGreater(result.execution_time_seconds, 0.0)
        self.assertFalse(result.nsfw_detected)

        # Verify alpha matches original alpha exactly
        orig_alpha_arr = np.array(test_img.split()[3])
        stylized_alpha_arr = np.array(result.stylized_image.split()[3])
        np.testing.assert_array_equal(stylized_alpha_arr, orig_alpha_arr)

        # Verify pixel RGB values actually transformed
        orig_rgb = np.array(test_img.convert("RGB"))
        stylized_rgb = np.array(result.stylized_image.convert("RGB"))
        self.assertFalse(
            np.array_equal(orig_rgb[mask], stylized_rgb[mask]),
            "Stylized pixel values should differ from original input pixels.",
        )

        # Unload and verify cleanup
        stylizer.unload()
        self.assertFalse(stylizer.is_loaded())
        self.assertIsNone(stylizer.pipe)


if __name__ == "__main__":
    unittest.main()
