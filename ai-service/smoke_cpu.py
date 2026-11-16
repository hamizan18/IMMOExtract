"""Smoke test: PyTorch CPU runtime on Python 3.14.3 in .venv-test."""
import sys
print(f'Python: {sys.version}')
print()

# 1. Import torch
import torch
print(f'torch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
cpu_dev = torch.device('cpu')
print(f'CPU device: {cpu_dev}')
print()

# 2. Small tensor operations
a = torch.randn(3, 4, device=cpu_dev)
b = torch.randn(4, 5, device=cpu_dev)
c = torch.matmul(a, b)
print(f'matmul({list(a.shape)}, {list(b.shape)}) -> {list(c.shape)}')
print(f'c dtype: {c.dtype}')
print(f'c device: {c.device}')
print()

# 3. Import torchvision
import torchvision
print(f'torchvision version: {torchvision.__version__}')
print()

# 4. Import numpy and pillow
import numpy as np
print(f'numpy version: {np.__version__}')
from PIL import Image
print(f'Pillow version: {Image.__version__}')
print()

# 5. Simulate a small conv + bn forward (CPU)
import torch.nn as nn
model = nn.Sequential(
    nn.Conv2d(3, 16, 3, padding=1),
    nn.BatchNorm2d(16),
    nn.ReLU(),
)
model.eval()
with torch.no_grad():
    x = torch.randn(1, 3, 64, 64, device=cpu_dev)
    y = model(x)
    print(f'Conv+BN+ReLU forward: input {list(x.shape)} -> output {list(y.shape)}')
    print(f'output min={y.min().item():.4f}, max={y.max().item():.4f}')
print()

# 6. Pillow -> tensor -> back
img = Image.new('RGB', (128, 128), color=(255, 128, 64))
arr = np.array(img)
t = torch.from_numpy(arr).permute(2, 0, 1).float() / 255.0
print(f'PIL->numpy->tensor: {list(t.shape)}, dtype={t.dtype}')
print(f'pixel[0,0] = ({t[0,0,0]:.4f}, {t[1,0,0]:.4f}, {t[2,0,0]:.4f})')
print()

# 7. torchvision transforms
from torchvision import transforms
transform = transforms.Compose([
    transforms.Resize((512, 512)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.406, 0.456, 0.485], std=[0.225, 0.224, 0.229]),
])
img_512 = transform(img)
print(f'torchvision transform: PIL (128,128) -> tensor {list(img_512.shape)}')
print(f'normalized pixel[0,0] = ({img_512[0,0,0]:.4f}, {img_512[1,0,0]:.4f}, {img_512[2,0,0]:.4f})')
print()

print('=== ALL SMOKE TESTS PASSED ===')
