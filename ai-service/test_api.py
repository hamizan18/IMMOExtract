"""IMMOExtract — Test Suite for AI Service API (FastAPI).

Verifies:
1. GET /health with model loaded (model_loaded: true).
2. POST /extract with valid multipart image upload (returns 200, valid JSON, base64 RGBA).
3. POST /extract with invalid/corrupt image bytes (returns 400).
4. POST /extract-path with valid local files (returns 200, saves RGBA PNG and mask to disk).
5. POST /extract-path with non-existent path (returns 404).
"""

import base64
import io
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

# Ensure ai-service directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from main import app
from extractor import CATEGORY_PIXEL_THRESHOLD
from schp_cpu import ATR_SETTINGS


def _create_synthetic_human_image(width: int = 240, height: int = 360) -> Image.Image:
    """Creates a synthetic standing figure with distinct ATR color blocks."""
    img = Image.new("RGB", (width, height), (220, 220, 220))
    draw = ImageDraw.Draw(img)

    # Head / Hat
    draw.ellipse([width * 0.35, height * 0.05, width * 0.65, height * 0.22], fill=(60, 40, 20))
    # Upper body / Clothes
    draw.rectangle([width * 0.25, height * 0.22, width * 0.75, height * 0.55], fill=(30, 80, 180))
    # Legs / Pants
    draw.rectangle([width * 0.28, height * 0.55, width * 0.48, height * 0.88], fill=(40, 40, 50))
    draw.rectangle([width * 0.52, height * 0.55, width * 0.72, height * 0.88], fill=(40, 40, 50))
    # Feet / Shoes
    draw.rectangle([width * 0.25, height * 0.88, width * 0.48, height * 0.96], fill=(15, 15, 15))
    draw.rectangle([width * 0.52, height * 0.88, width * 0.75, height * 0.96], fill=(15, 15, 15))

    return img


class TestAIServiceAPI(unittest.TestCase):
    """Integration test suite for FastAPI AI Service endpoints."""

    def setUp(self):
        # Using context manager for TestClient ensures lifespan (startup & shutdown) executes
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)

    def assert_category_files(self, data, source, job_dir):
        objects = data["objects"]
        self.assertIsInstance(objects, list)
        eligible = {
            category for category, count in data["category_pixel_counts"].items()
            if category != "Background" and count > CATEGORY_PIXEL_THRESHOLD
        }
        self.assertEqual(set(data["categories_present"]), eligible)
        self.assertEqual({obj["category"] for obj in objects}, eligible)
        self.assertEqual(len(objects), len(eligible))
        self.assertGreater(len(objects), 0)
        source_pixels = np.array(source)
        image_width, image_height = source.size
        occupied = np.zeros((image_height, image_width), dtype=bool)
        for obj in objects:
            class_id = obj["class_id"]
            self.assertIs(type(class_id), int)
            self.assertIn(class_id, range(1, 18))
            self.assertEqual(obj["category"], ATR_SETTINGS["labels"][class_id])
            self.assertEqual(obj["file"], f"objects/atr-{class_id}.png")
            left, top, right, bottom = obj["bbox"]
            self.assertTrue(0 <= left < right <= image_width)
            self.assertTrue(0 <= top < bottom <= image_height)
            self.assertEqual((obj["width"], obj["height"]), (right - left, bottom - top))
            self.assertEqual(obj["pixel_count"], data["category_pixel_counts"][obj["category"]])
            with Image.open(os.path.join(job_dir, obj["file"])) as crop:
                self.assertEqual(crop.format, "PNG")
                self.assertEqual(crop.mode, "RGBA")
                self.assertEqual(crop.size, (obj["width"], obj["height"]))
                pixels = np.array(crop)
            np.testing.assert_array_equal(pixels[..., :3], source_pixels[top:bottom, left:right])
            alpha = pixels[..., 3]
            self.assertTrue(np.all((alpha == 0) | (alpha == 255)))
            self.assertEqual(int(np.count_nonzero(alpha)), obj["pixel_count"])
            rows, columns = np.nonzero(alpha)
            self.assertEqual(obj["bbox"], [
                max(0, left + int(columns.min()) - 2),
                max(0, top + int(rows.min()) - 2),
                min(image_width, left + int(columns.max()) + 3),
                min(image_height, top + int(rows.max()) + 3),
            ])
            occupied_crop = occupied[top:bottom, left:right]
            self.assertFalse(np.any(occupied_crop & (alpha != 0)))
            occupied_crop |= alpha != 0
        self.assertEqual(
            set(os.listdir(os.path.join(job_dir, "objects"))),
            {f"atr-{obj['class_id']}.png" for obj in objects},
        )

    def test_01_health_endpoint(self):
        """GET /health must return 200, status ok, and model_loaded: true."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("service"), "ai-service")
        self.assertIs(data.get("model_loaded"), True)
        print("  [PASS] test_01_health_endpoint: model_loaded is True")

    def test_02_extract_multipart_valid(self):
        """POST /extract with multipart image must return 200 and valid RGBA base64."""
        test_img = _create_synthetic_human_image(240, 360)
        buf = io.BytesIO()
        test_img.save(buf, format="PNG")
        buf.seek(0)

        response = self.client.post(
            "/extract",
            files={"file": ("test_person.png", buf.getvalue(), "image/png")},
            data={"include_base64": "true"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("original_size"), [240, 360])
        self.assertIsInstance(data.get("categories_present"), list)
        self.assertGreater(len(data.get("categories_present")), 0)
        self.assertGreater(data.get("execution_time_seconds"), 0)
        self.assertEqual(data["objects"], [])

        # Verify RGBA PNG base64
        self.assertIn("image_base64", data)
        rgba_bytes = base64.b64decode(data["image_base64"])
        with Image.open(io.BytesIO(rgba_bytes)) as rgba_img:
            self.assertEqual(rgba_img.size, (240, 360))
            self.assertEqual(rgba_img.mode, "RGBA")
            alpha_channel = np.array(rgba_img.split()[-1])
            self.assertTrue(np.any(alpha_channel == 0), "Should have transparent background")
            self.assertTrue(np.any(alpha_channel == 255), "Should have opaque foreground")

        # Verify Mask base64
        self.assertIn("mask_base64", data)
        mask_bytes = base64.b64decode(data["mask_base64"])
        with Image.open(io.BytesIO(mask_bytes)) as mask_img:
            self.assertEqual(mask_img.size, (240, 360))
            self.assertEqual(mask_img.mode, "L")

        print(
            f"  [PASS] test_02_extract_multipart_valid: time={data['execution_time_seconds']}s, "
            f"categories={data['categories_present']}"
        )

    def test_03_extract_multipart_corrupt_file(self):
        """POST /extract with corrupt bytes must return 400 Bad Request."""
        corrupt_data = b"NOT_A_VALID_IMAGE_DATA_BYTES"
        response = self.client.post(
            "/extract",
            files={"file": ("bad.png", corrupt_data, "image/png")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())
        print("  [PASS] test_03_extract_multipart_corrupt_file: returned 400 as expected")

    def test_04_extract_path_valid(self):
        """POST /extract-path must read from disk, save RGBA and mask, and return 200."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            in_path = os.path.join(tmp_dir, "input.png")
            out_path = os.path.join(tmp_dir, "output.png")
            mask_path = os.path.join(tmp_dir, "mask.png")
            objects_dir = os.path.join(tmp_dir, "objects")

            test_img = _create_synthetic_human_image(200, 200)
            test_img.save(in_path)

            payload = {
                "image_path": in_path,
                "output_path": out_path,
                "save_mask_path": mask_path,
                "include_base64": False,
                "objects_dir": objects_dir,
            }
            response = self.client.post("/extract-path", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data.get("status"), "success")
            self.assertEqual(data.get("output_path"), out_path)
            self.assertEqual(data.get("save_mask_path"), mask_path)
            self.assert_category_files(data, test_img, tmp_dir)

            # Check files written to disk
            self.assertTrue(os.path.isfile(out_path), "RGBA file should exist on disk")
            self.assertTrue(os.path.isfile(mask_path), "Mask file should exist on disk")

            with Image.open(out_path) as saved_rgba:
                self.assertEqual(saved_rgba.mode, "RGBA")
                self.assertEqual(saved_rgba.size, (200, 200))

            with Image.open(mask_path) as saved_mask:
                self.assertEqual(saved_mask.mode, "L")
                self.assertEqual(saved_mask.size, (200, 200))

            print("  [PASS] test_04_extract_path_valid: files written and verified on disk")

    def test_05_extract_path_not_found(self):
        """POST /extract-path with non-existent file must return 404."""
        payload = {"image_path": "D:/non_existent_path_xyz_123.png"}
        response = self.client.post("/extract-path", json=payload)
        self.assertEqual(response.status_code, 404)
        print("  [PASS] test_05_extract_path_not_found: returned 404 as expected")

    def test_06_extract_multipart_objects_without_foreground_path(self):
        """Category-only disk export must also work for multipart uploads."""
        test_img = _create_synthetic_human_image(240, 360)
        buf = io.BytesIO()
        test_img.save(buf, format="PNG")
        with tempfile.TemporaryDirectory() as job_dir:
            response = self.client.post(
                "/extract",
                files={"file": ("person.png", buf.getvalue(), "image/png")},
                data={
                    "objects_dir": os.path.join(job_dir, "objects"),
                    "include_base64": "false",
                },
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertNotIn("output_path", data)
            self.assertNotIn("image_base64", data)
            self.assertNotIn("mask_base64", data)
            self.assert_category_files(data, test_img, job_dir)

    def test_07_extract_path_objects_only_and_legacy(self):
        """Path export needs no foreground path; omitted objects_dir remains opt-in."""
        test_img = _create_synthetic_human_image(200, 200)
        with tempfile.TemporaryDirectory() as job_dir:
            input_path = os.path.join(job_dir, "input.png")
            test_img.save(input_path)
            response = self.client.post("/extract-path", json={
                "image_path": input_path,
                "objects_dir": os.path.join(job_dir, "objects"),
            })
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertNotIn("output_path", data)
            self.assertNotIn("image_base64", data)
            self.assert_category_files(data, test_img, job_dir)

        with tempfile.TemporaryDirectory() as job_dir:
            input_path = os.path.join(job_dir, "input.png")
            test_img.save(input_path)
            response = self.client.post("/extract-path", json={"image_path": input_path})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["objects"], [])
            self.assertEqual(os.listdir(job_dir), ["input.png"])


class TestStylizationValidation(unittest.TestCase):
    """Exercise API rejection paths without substituting fake AI results."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = os.path.join(self.tmp.name, "input.png")
        Image.new("RGBA", (16, 24), (120, 60, 30, 128)).save(self.source)
        with open(self.source, "rb") as source:
            self.png = source.read()
        environment = patch.dict(os.environ, {
            "SCHP_CHECKPOINT_PATH": os.path.join(self.tmp.name, "missing-schp"),
            "SD15_MODEL_PATH": os.path.join(self.tmp.name, "missing-sd15"),
        })
        environment.start()
        self.addCleanup(environment.stop)
        self.client = self.enterContext(TestClient(app))

    def post_both(self, options=None, content=None):
        options = options or {}
        payload = self.png if content is None else content
        with open(self.source, "wb") as source:
            source.write(payload)
        return [
            self.client.post("/stylize", files={"file": ("input.png", payload, "image/png")},
                             data=options),
            self.client.post("/stylize-path", json={"image_path": self.source, **options}),
        ]

    def test_unavailable_and_health(self):
        health = self.client.get("/health").json()
        self.assertFalse(health["stylizer_available"])
        self.assertFalse(health["stylizer_loaded"])
        for response in self.post_both():
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("image_base64", response.json())

    def test_invalid_parameters_before_model_load(self):
        for options in (
            {"strength": 0}, {"strength": 1.1}, {"strength": 0.01},
            {"strength": "nan"}, {"strength": "inf"},
            {"target_size": 0}, {"target_size": 257}, {"target_size": 520},
            {"num_inference_steps": 1}, {"num_inference_steps": 51},
            {"guidance_scale": "nan"}, {"guidance_scale": "inf"},
            {"guidance_scale": -1}, {"guidance_scale": 21},
            {"seed": -1}, {"seed": 2**63}, {"preset": "unknown"},
            {"save_generated_path": os.path.join(self.tmp.name, "raw.png")},
        ):
            with self.subTest(options=options):
                for response in self.post_both(options):
                    self.assertEqual(response.status_code, 400, response.text)

    def test_empty_and_corrupt_images(self):
        for content in (b"", b"not a PNG", self.png[:40]):
            with self.subTest(content=content):
                for response in self.post_both(content=content):
                    self.assertEqual(response.status_code, 400, response.text)

    def test_oversized_files(self):
        for response in self.post_both(content=b"x" * (10 * 1024 * 1024 + 1)):
            self.assertEqual(response.status_code, 413)

    def test_unsupported_animated_and_large_dimensions(self):
        fixtures = []
        for image, format_name in (
            (Image.new("RGB", (8, 8)), "BMP"),
            (Image.new("RGB", (8193, 1)), "PNG"),
        ):
            buffer = io.BytesIO()
            image.save(buffer, format=format_name)
            fixtures.append(buffer.getvalue())
        buffer = io.BytesIO()
        Image.new("RGBA", (8, 8), "red").save(
            buffer, format="PNG", save_all=True,
            append_images=[Image.new("RGBA", (8, 8), "blue")], duration=100,
        )
        fixtures.append(buffer.getvalue())
        for content in fixtures:
            for response in self.post_both(content=content):
                self.assertEqual(response.status_code, 400, response.text)

    def test_missing_path_and_no_path_leak(self):
        missing = os.path.join(self.tmp.name, "private-missing.png")
        response = self.client.post("/stylize-path", json={"image_path": missing})
        self.assertEqual(response.status_code, 404)
        self.assertNotIn(self.tmp.name, response.text)

    def test_output_paths_cannot_overwrite_source_or_each_other(self):
        alias = os.path.join(self.tmp.name, "alias.png")
        os.link(self.source, alias)
        output = os.path.join(self.tmp.name, "result.png")
        for options in (
            {"output_path": self.source},
            {"output_path": alias},
            {"output_path": output, "save_generated_path": self.source},
            {"output_path": output, "save_generated_path": output},
        ):
            response = self.client.post(
                "/stylize-path", json={"image_path": self.source, **options}
            )
            self.assertEqual(response.status_code, 400, response.text)
        response = self.client.post("/stylize",
            files={"file": ("input.png", self.png, "image/png")},
            data={"output_path": output, "save_generated_path": output})
        self.assertEqual(response.status_code, 400)
        with open(self.source, "rb") as source:
            self.assertEqual(source.read(), self.png)
        self.assertFalse(os.path.exists(output))


if __name__ == "__main__":
    print("Running IMMOExtract AI Service API Test Suite...")
    unittest.main()
