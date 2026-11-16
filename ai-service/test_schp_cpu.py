"""Test suite for SCHP AugmentCE2P CPU adaptation.

Tests:
1. Model instantiation with ATR-18 classes.
2. Parameter audit (count, state_dict key patterns, ABN buffers).
3. Eval mode forward pass on CPU with input shape [1, 3, 512, 512].
4. Output tensor shapes and value ranges.
5. Post-processing pipeline (bilinear upsampling to 512x512, argmax to class map).
6. Timing and memory footprint measurement on CPU.
"""

import os
import sys
import time

# Ensure ai-service root is in sys.path
ai_service_dir = os.path.dirname(os.path.abspath(__file__))
if ai_service_dir not in sys.path:
    sys.path.insert(0, ai_service_dir)

import torch
import torch.nn as nn
from schp_cpu import resnet101, ATR_SETTINGS


def test_model_instantiation():
    print("--- 1. Testing Model Instantiation ---")
    model = resnet101(num_classes=ATR_SETTINGS["num_classes"])
    model.eval()

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_buffers = sum(b.numel() for b in model.buffers())

    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    print(f"Total buffer elements: {total_buffers:,}")
    print(f"Approximate model size in memory (float32): {(total_params * 4) / (1024**2):.2f} MB")

    # ResNet-101 AugmentCE2P typically has ~65M-70M parameters
    assert 60_000_000 < total_params < 75_000_000, f"Unexpected parameter count: {total_params}"
    print("PASS: Model instantiated successfully with expected parameter count.")
    return model


def test_abn_buffers(model: nn.Module):
    print("\n--- 2. Auditing ABN Buffers and State Dict ---")
    state_keys = list(model.state_dict().keys())
    print(f"Total state_dict keys: {len(state_keys)}")

    # Check that bn/ABN layers have running_mean and running_var
    abn_running_means = [k for k in state_keys if k.endswith("running_mean")]
    abn_running_vars = [k for k in state_keys if k.endswith("running_var")]
    abn_weights = [k for k in state_keys if "bn" in k and k.endswith("weight")]

    print(f"ABN running_mean buffers found: {len(abn_running_means)}")
    print(f"ABN running_var buffers found: {len(abn_running_vars)}")
    print(f"ABN weight parameters found: {len(abn_weights)}")

    assert len(abn_running_means) > 0, "No running_mean buffers found!"
    assert len(abn_running_means) == len(abn_running_vars), "Mismatch between running_mean and running_var count!"

    # Sample key check
    sample_keys = state_keys[:8]
    print(f"Sample keys: {sample_keys}")
    print("PASS: ABN buffers match standard batch-norm state_dict layout.")


def test_forward_pass(model: nn.Module):
    print("\n--- 3. Testing Forward Pass on CPU ---")
    input_shape = (1, 3, 512, 512)
    dummy_input = torch.randn(*input_shape, device="cpu")
    print(f"Input tensor shape: {list(dummy_input.shape)}, dtype={dummy_input.dtype}, device={dummy_input.device}")

    # Warmup / execution with timing
    start_time = time.perf_counter()
    with torch.no_grad():
        output = model(dummy_input)
    elapsed = time.perf_counter() - start_time
    print(f"Forward pass execution time on CPU: {elapsed:.3f} seconds")

    # Output structure: [[parsing_result, fusion_result], [edge_result]]
    assert isinstance(output, list) and len(output) == 2, f"Expected 2 outer elements, got {len(output)}"
    assert len(output[0]) == 2, f"Expected 2 parsing outputs, got {len(output[0])}"
    assert len(output[1]) == 1, f"Expected 1 edge output, got {len(output[1])}"

    parsing_result = output[0][0]
    fusion_result = output[0][1]
    edge_result = output[1][0]

    num_cls = ATR_SETTINGS["num_classes"]
    print(f"parsing_result shape: {list(parsing_result.shape)} (expected [1, {num_cls}, 128, 128])")
    print(f"fusion_result shape:  {list(fusion_result.shape)} (expected [1, {num_cls}, 128, 128])")
    print(f"edge_result shape:    {list(edge_result.shape)} (expected [1, 2, 128, 128])")

    assert parsing_result.shape == (1, num_cls, 128, 128)
    assert fusion_result.shape == (1, num_cls, 128, 128)
    assert edge_result.shape == (1, 2, 128, 128)

    # Check finite numbers (no NaN or Inf)
    assert torch.isfinite(parsing_result).all(), "NaN or Inf detected in parsing_result!"
    assert torch.isfinite(fusion_result).all(), "NaN or Inf detected in fusion_result!"
    assert torch.isfinite(edge_result).all(), "NaN or Inf detected in edge_result!"

    print("PASS: Forward pass completed without errors and output shapes match specification.")
    return fusion_result


def test_postprocessing(fusion_result: torch.Tensor):
    print("\n--- 4. Testing Upsampling and Argmax Pipeline ---")
    # Upstream SCHP uses bilinear upsampling to target input size (512, 512), then argmax
    upsample = nn.Upsample(size=(512, 512), mode="bilinear", align_corners=True)
    with torch.no_grad():
        upsampled = upsample(fusion_result)
        pred_classes = upsampled.squeeze(0).argmax(dim=0)  # Shape [512, 512]

    print(f"Upsampled shape: {list(upsampled.shape)} (expected [1, 18, 512, 512])")
    print(f"Predicted class map shape: {list(pred_classes.shape)} (expected [512, 512])")
    print(f"Predicted class map min: {pred_classes.min().item()}, max: {pred_classes.max().item()}")

    assert upsampled.shape == (1, 18, 512, 512)
    assert pred_classes.shape == (512, 512)
    assert 0 <= pred_classes.min().item() <= 17
    assert 0 <= pred_classes.max().item() <= 17

    # Binary foreground mask test
    foreground = (pred_classes > 0)
    print(f"Foreground binary mask shape: {list(foreground.shape)}, dtype={foreground.dtype}")
    print(f"Foreground pixels ratio: {foreground.float().mean().item():.2%}")
    print("PASS: Upsampling, argmax, and foreground extraction pipeline verified.")


if __name__ == "__main__":
    print("=== SCHP CPU ADAPTATION TEST SUITE ===")
    print(f"Python: {sys.version}")
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    print()

    m = test_model_instantiation()
    test_abn_buffers(m)
    fusion = test_forward_pass(m)
    test_postprocessing(fusion)

    print("\n=== ALL SCHP CPU TESTS PASSED ===")
