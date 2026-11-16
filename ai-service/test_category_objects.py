"""Deterministic category PNG export tests; no model or checkpoint is loaded."""

import os
import tempfile
import unittest

import numpy as np
from PIL import Image

from extractor import CATEGORY_PIXEL_THRESHOLD, ExtractionResult, save_category_objects
from schp_cpu import ATR_SETTINGS


def make_result(class_map):
    height, width = class_map.shape
    y, x = np.indices((height, width))
    rgb = np.stack((x * 7 + y, y * 5 + x, x * 3 + y * 11), axis=2).astype(np.uint8)
    foreground = class_map > 0
    rgba = np.concatenate((rgb, (foreground.astype(np.uint8) * 255)[..., None]), axis=2)
    classes, counts = np.unique(class_map, return_counts=True)
    category_counts = {
        ATR_SETTINGS["labels"][int(class_id)]: int(count)
        for class_id, count in zip(classes, counts)
    }
    categories = [
        ATR_SETTINGS["labels"][int(class_id)]
        for class_id, count in zip(classes, counts)
        if class_id > 0 and count > CATEGORY_PIXEL_THRESHOLD
    ]
    return ExtractionResult(
        original_size=(width, height),
        foreground_mask=foreground,
        class_map=class_map,
        rgba_image=Image.fromarray(rgba),
        categories_present=categories,
        category_pixel_counts=category_counts,
    )


class TestCategoryObjects(unittest.TestCase):
    def assert_export(self, result, expected_bounds):
        original_rgba = np.array(result.rgba_image)
        original_map = result.class_map.copy()
        with tempfile.TemporaryDirectory() as job_dir:
            objects_dir = os.path.join(job_dir, "objects")
            objects = save_category_objects(result, objects_dir)
            self.assertEqual([obj["class_id"] for obj in objects], sorted(expected_bounds))
            self.assertEqual([obj["category"] for obj in objects], result.categories_present)
            expected_files = {f"atr-{class_id}.png" for class_id in expected_bounds}
            self.assertEqual(set(os.listdir(objects_dir)) if os.path.isdir(objects_dir) else set(), expected_files)
            for obj in objects:
                class_id = obj["class_id"]
                left, top, right, bottom = expected_bounds[class_id]
                self.assertEqual(obj["bbox"], [left, top, right, bottom])
                self.assertEqual(obj["file"], f"objects/atr-{class_id}.png")
                self.assertEqual(obj["category"], ATR_SETTINGS["labels"][class_id])
                self.assertEqual(obj["width"], right - left)
                self.assertEqual(obj["height"], bottom - top)
                self.assertEqual(obj["pixel_count"], result.category_pixel_counts[obj["category"]])
                with Image.open(os.path.join(job_dir, obj["file"])) as image:
                    self.assertEqual(image.format, "PNG")
                    self.assertEqual(image.mode, "RGBA")
                    self.assertEqual(image.size, (obj["width"], obj["height"]))
                    pixels = np.array(image)
                np.testing.assert_array_equal(pixels[..., :3], original_rgba[top:bottom, left:right, :3])
                expected_alpha = (result.class_map[top:bottom, left:right] == class_id).astype(np.uint8) * 255
                np.testing.assert_array_equal(pixels[..., 3], expected_alpha)
                self.assertEqual(int(np.count_nonzero(pixels[..., 3])), obj["pixel_count"])
            # Exporting twice replaces deterministic names instead of inventing instances.
            self.assertEqual(save_category_objects(result, objects_dir), objects)
        np.testing.assert_array_equal(result.class_map, original_map)
        np.testing.assert_array_equal(np.array(result.rgba_image), original_rgba)

    def test_original_pixels_and_category_only_alpha_with_padding(self):
        class_map = np.zeros((32, 40), dtype=np.uint8)
        class_map[7:15, 10:19] = 1
        class_map[9:11, 12:14] = 2  # Another foreground category must become transparent.
        self.assert_export(make_result(class_map), {1: [8, 5, 21, 17]})

    def test_left_and_right_shoes_remain_distinct_and_edges_clip(self):
        class_map = np.zeros((32, 40), dtype=np.uint8)
        class_map[0:8, 0:8] = 9
        class_map[24:32, 32:40] = 10
        self.assert_export(make_result(class_map), {9: [0, 0, 10, 10], 10: [30, 22, 40, 32]})

    def test_disconnected_same_class_has_one_crop(self):
        class_map = np.zeros((32, 40), dtype=np.uint8)
        class_map[4:10, 5:10] = 3
        class_map[22:28, 30:35] = 3
        self.assert_export(make_result(class_map), {3: [3, 2, 37, 30]})

    def test_fifty_pixels_excluded_fifty_one_included(self):
        class_map = np.zeros((32, 40), dtype=np.uint8)
        class_map[3:8, 3:13] = 1
        class_map[15:18, 17:34] = 2
        self.assert_export(make_result(class_map), {2: [15, 13, 36, 20]})

    def test_background_only_has_no_objects(self):
        self.assert_export(make_result(np.zeros((32, 40), dtype=np.uint8)), {})

    def test_tiny_categories_have_no_objects(self):
        class_map = np.zeros((32, 40), dtype=np.uint8)
        class_map[0:5, 0:10] = 1
        class_map[12, 12] = 2
        self.assert_export(make_result(class_map), {})

    def test_storage_failure_propagates(self):
        result = make_result(np.ones((8, 8), dtype=np.uint8))
        with tempfile.TemporaryDirectory() as job_dir:
            objects_dir = os.path.join(job_dir, "objects")
            with open(objects_dir, "wb") as blocked_directory:
                blocked_directory.write(b"not a directory")
            with self.assertRaises(OSError):
                save_category_objects(result, objects_dir)


if __name__ == "__main__":
    unittest.main()
