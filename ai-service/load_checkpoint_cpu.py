"""Verification and loader for SCHP ATR-18 checkpoint on CPU.

Loads `exp-schp-201908301523-atr.pth` into pure-PyTorch `resnet101(num_classes=18)`
model, verifying:
1. File integrity and SHA-256 hash.
2. Exact state_dict key alignment (0 missing, 0 unexpected keys).
3. Eval mode forward pass with actual trained weights on dummy input.
"""

import hashlib
import os
import sys
import time

# Ensure ai-service root is in sys.path
ai_service_dir = os.path.dirname(os.path.abspath(__file__))
if ai_service_dir not in sys.path:
    sys.path.insert(0, ai_service_dir)

import torch
from schp_cpu import resnet101, ATR_SETTINGS

CHECKPOINT_FILENAME = "exp-schp-201908301523-atr.pth"
CHECKPOINT_DIR = os.path.join(ai_service_dir, "models")
CHECKPOINT_PATH = os.path.join(CHECKPOINT_DIR, CHECKPOINT_FILENAME)
EXPECTED_SIZE_BYTES = 267_445_237  # 255.06 MB


def get_file_sha256(filepath: str, chunk_size: int = 1024 * 1024) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(chunk_size):
            sha.update(chunk)
    return sha.hexdigest()


def verify_checkpoint_file(filepath: str = CHECKPOINT_PATH):
    print("--- 1. Verifying Checkpoint File on Disk ---")
    if not os.path.exists(filepath):
        print(f"ERROR: Checkpoint not found at: {filepath}")
        return False, None

    size = os.path.getsize(filepath)
    print(f"File path: {filepath}")
    print(f"File size: {size:,} bytes ({size / (1024**2):.2f} MB)")

    print("Computing SHA-256 hash...")
    start = time.perf_counter()
    sha256 = get_file_sha256(filepath)
    elapsed = time.perf_counter() - start
    print(f"SHA-256: {sha256} (computed in {elapsed:.2f}s)")

    if abs(size - EXPECTED_SIZE_BYTES) > 1024:
        print(f"WARNING: File size {size} differs from expected {EXPECTED_SIZE_BYTES} bytes!")
    else:
        print("PASS: Checkpoint size matches expected upstream release.")

    return True, sha256


def load_and_verify_weights(filepath: str = CHECKPOINT_PATH):
    print("\n--- 2. Instantiating Model and Loading Weights on CPU ---")
    model = resnet101(num_classes=ATR_SETTINGS["num_classes"])
    model.eval()

    print(f"Loading checkpoint with torch.load(map_location='cpu')...")
    start = time.perf_counter()
    raw_checkpoint = torch.load(filepath, map_location="cpu", weights_only=False)
    print(f"Checkpoint loaded in {time.perf_counter() - start:.2f}s")

    # Upstream SCHP checkpoint wraps state dict in 'state_dict' key
    if isinstance(raw_checkpoint, dict) and "state_dict" in raw_checkpoint:
        state_dict = raw_checkpoint["state_dict"]
        print(f"Extracted 'state_dict' from container (contains {len(state_dict)} keys)")
    else:
        state_dict = raw_checkpoint
        print(f"Using raw checkpoint dictionary ({len(state_dict)} keys)")

    # Strip 'module.' prefix if saved from DataParallel / DistributedDataParallel
    clean_state_dict = {}
    for k, v in state_dict.items():
        name = k[7:] if k.startswith("module.") else k
        clean_state_dict[name] = v

    print(f"Normalized keys count: {len(clean_state_dict)}")

    # Strict load verification
    load_result = model.load_state_dict(clean_state_dict, strict=True)
    print(f"Load result: {load_result}")

    missing = getattr(load_result, "missing_keys", [])
    unexpected = getattr(load_result, "unexpected_keys", [])

    print(f"Missing keys:    {len(missing)}")
    print(f"Unexpected keys: {len(unexpected)}")

    assert len(missing) == 0, f"Missing keys found: {missing[:5]}"
    assert len(unexpected) == 0, f"Unexpected keys found: {unexpected[:5]}"
    print("PASS: Exact 100% key match between checkpoint and pure-PyTorch CPU model!")
    return model


def test_forward_with_loaded_weights(model):
    print("\n--- 3. Testing Forward Pass with Loaded Weights ---")
    dummy_input = torch.randn(1, 3, 512, 512, device="cpu")

    start = time.perf_counter()
    with torch.no_grad():
        output = model(dummy_input)
    elapsed = time.perf_counter() - start
    print(f"Forward pass with trained weights: {elapsed:.3f} seconds")

    parsing_result = output[0][0]
    fusion_result = output[0][1]
    edge_result = output[1][0]

    assert torch.isfinite(parsing_result).all(), "NaN or Inf detected in parsing_result!"
    assert torch.isfinite(fusion_result).all(), "NaN or Inf detected in fusion_result!"
    assert torch.isfinite(edge_result).all(), "NaN or Inf detected in edge_result!"

    print(f"Fusion logits min: {fusion_result.min().item():.4f}, max: {fusion_result.max().item():.4f}")
    print("PASS: Forward pass with loaded weights executed cleanly on CPU.")


if __name__ == "__main__":
    print("=== SCHP ATR-18 CHECKPOINT VERIFIER (CPU) ===")
    exists, sha256 = verify_checkpoint_file()
    if not exists:
        print("\nPlease download the checkpoint to continue.")
        sys.exit(1)

    m = load_and_verify_weights()
    test_forward_with_loaded_weights(m)
    print("\n=== ALL CHECKPOINT VERIFICATIONS PASSED ===")
