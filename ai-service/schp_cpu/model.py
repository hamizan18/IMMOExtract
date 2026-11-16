"""SCHP AugmentCE2P (ResNet-101) adapted for pure PyTorch CPU execution.

Adapted from Self-Correction-Human-Parsing (SCHP) by Peike Li:
https://github.com/GoGoDuck912/Self-Correction-Human-Parsing

License:
    - SCHP: MIT License, Copyright (c) 2020 Peike Li
    - InPlaceABN: BSD 3-Clause, Copyright (c) 2017 Mapillary AB
"""

import functools
from typing import List, Tuple

import torch
import torch.nn as nn
from torch.nn import functional as F

from .abn import InPlaceABNSync, ACT_NONE

BatchNorm2d = functools.partial(InPlaceABNSync, activation=ACT_NONE)
affine_par = True

# ATR Dataset specifications
ATR_SETTINGS = {
    "input_size": (512, 512),
    "num_classes": 18,
    "labels": [
        "Background",     # 0
        "Hat",            # 1
        "Hair",           # 2
        "Sunglasses",     # 3
        "Upper-clothes",  # 4
        "Skirt",          # 5
        "Pants",          # 6
        "Dress",          # 7
        "Belt",           # 8
        "Left-shoe",      # 9
        "Right-shoe",     # 10
        "Face",           # 11
        "Left-leg",       # 12
        "Right-leg",      # 13
        "Left-arm",       # 14
        "Right-arm",      # 15
        "Bag",            # 16
        "Scarf",          # 17
    ],
    # BGR mean and std used by SCHP upstream preprocessing
    "mean": [0.406, 0.456, 0.485],
    "std": [0.225, 0.224, 0.229],
}


def conv3x3(in_planes: int, out_planes: int, stride: int = 1) -> nn.Conv2d:
    """3x3 convolution with padding."""
    return nn.Conv2d(
        in_planes,
        out_planes,
        kernel_size=3,
        stride=stride,
        padding=1,
        bias=False,
    )


class Bottleneck(nn.Module):
    expansion = 4

    def __init__(
        self,
        inplanes: int,
        planes: int,
        stride: int = 1,
        dilation: int = 1,
        downsample: nn.Module = None,
        fist_dilation: int = 1,
        multi_grid: int = 1,
    ):
        super(Bottleneck, self).__init__()
        self.conv1 = nn.Conv2d(inplanes, planes, kernel_size=1, bias=False)
        self.bn1 = BatchNorm2d(planes)
        self.conv2 = nn.Conv2d(
            planes,
            planes,
            kernel_size=3,
            stride=stride,
            padding=dilation * multi_grid,
            dilation=dilation * multi_grid,
            bias=False,
        )
        self.bn2 = BatchNorm2d(planes)
        self.conv3 = nn.Conv2d(planes, planes * 4, kernel_size=1, bias=False)
        self.bn3 = BatchNorm2d(planes * 4)
        self.relu = nn.ReLU(inplace=False)
        self.relu_inplace = nn.ReLU(inplace=True)
        self.downsample = downsample
        self.dilation = dilation
        self.stride = stride

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x

        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)

        out = self.conv2(out)
        out = self.bn2(out)
        out = self.relu(out)

        out = self.conv3(out)
        out = self.bn3(out)

        if self.downsample is not None:
            residual = self.downsample(x)

        out = out + residual
        out = self.relu_inplace(out)
        return out


class PSPModule(nn.Module):
    """Pyramid Scene Parsing Network module."""

    def __init__(self, features: int, out_features: int = 512, sizes=(1, 2, 3, 6)):
        super(PSPModule, self).__init__()
        self.stages = nn.ModuleList(
            [self._make_stage(features, out_features, size) for size in sizes]
        )
        self.bottleneck = nn.Sequential(
            nn.Conv2d(
                features + len(sizes) * out_features,
                out_features,
                kernel_size=3,
                padding=1,
                dilation=1,
                bias=False,
            ),
            InPlaceABNSync(out_features),
        )

    def _make_stage(self, features: int, out_features: int, size: int) -> nn.Sequential:
        prior = nn.AdaptiveAvgPool2d(output_size=(size, size))
        conv = nn.Conv2d(features, out_features, kernel_size=1, bias=False)
        bn = InPlaceABNSync(out_features)
        return nn.Sequential(prior, conv, bn)

    def forward(self, feats: torch.Tensor) -> torch.Tensor:
        h, w = feats.size(2), feats.size(3)
        priors = [
            F.interpolate(
                input=stage(feats),
                size=(h, w),
                mode="bilinear",
                align_corners=True,
            )
            for stage in self.stages
        ] + [feats]
        bottle = self.bottleneck(torch.cat(priors, 1))
        return bottle


class Edge_Module(nn.Module):
    """Edge Learning Branch."""

    def __init__(self, in_fea: List[int] = [256, 512, 1024], mid_fea: int = 256, out_fea: int = 2):
        super(Edge_Module, self).__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(in_fea[0], mid_fea, kernel_size=1, padding=0, dilation=1, bias=False),
            InPlaceABNSync(mid_fea),
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(in_fea[1], mid_fea, kernel_size=1, padding=0, dilation=1, bias=False),
            InPlaceABNSync(mid_fea),
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(in_fea[2], mid_fea, kernel_size=1, padding=0, dilation=1, bias=False),
            InPlaceABNSync(mid_fea),
        )
        self.conv4 = nn.Conv2d(mid_fea, out_fea, kernel_size=3, padding=1, dilation=1, bias=True)
        self.conv5 = nn.Conv2d(out_fea * 3, out_fea, kernel_size=1, padding=0, dilation=1, bias=True)

    def forward(self, x1: torch.Tensor, x2: torch.Tensor, x3: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        _, _, h, w = x1.size()

        edge1_fea = self.conv1(x1)
        edge1 = self.conv4(edge1_fea)
        edge2_fea = self.conv2(x2)
        edge2 = self.conv4(edge2_fea)
        edge3_fea = self.conv3(x3)
        edge3 = self.conv4(edge3_fea)

        edge2_fea = F.interpolate(edge2_fea, size=(h, w), mode="bilinear", align_corners=True)
        edge3_fea = F.interpolate(edge3_fea, size=(h, w), mode="bilinear", align_corners=True)
        edge2 = F.interpolate(edge2, size=(h, w), mode="bilinear", align_corners=True)
        edge3 = F.interpolate(edge3, size=(h, w), mode="bilinear", align_corners=True)

        edge = torch.cat([edge1, edge2, edge3], dim=1)
        edge_fea = torch.cat([edge1_fea, edge2_fea, edge3_fea], dim=1)
        edge = self.conv5(edge)

        return edge, edge_fea


class Decoder_Module(nn.Module):
    """Parsing Branch Decoder Module."""

    def __init__(self, num_classes: int):
        super(Decoder_Module, self).__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(512, 256, kernel_size=1, padding=0, dilation=1, bias=False),
            InPlaceABNSync(256),
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(256, 48, kernel_size=1, stride=1, padding=0, dilation=1, bias=False),
            InPlaceABNSync(48),
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(304, 256, kernel_size=1, padding=0, dilation=1, bias=False),
            InPlaceABNSync(256),
            nn.Conv2d(256, 256, kernel_size=1, padding=0, dilation=1, bias=False),
            InPlaceABNSync(256),
        )
        self.conv4 = nn.Conv2d(256, num_classes, kernel_size=1, padding=0, dilation=1, bias=True)

    def forward(self, xt: torch.Tensor, xl: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        _, _, h, w = xl.size()
        xt = F.interpolate(self.conv1(xt), size=(h, w), mode="bilinear", align_corners=True)
        xl = self.conv2(xl)
        x = torch.cat([xt, xl], dim=1)
        x = self.conv3(x)
        seg = self.conv4(x)
        return seg, x


class ResNet(nn.Module):
    """ResNet-101 based AugmentCE2P architecture for human parsing."""

    def __init__(self, block, layers: List[int], num_classes: int = 18):
        self.inplanes = 128
        super(ResNet, self).__init__()
        self.conv1 = conv3x3(3, 64, stride=2)
        self.bn1 = BatchNorm2d(64)
        self.relu1 = nn.ReLU(inplace=False)
        self.conv2 = conv3x3(64, 64)
        self.bn2 = BatchNorm2d(64)
        self.relu2 = nn.ReLU(inplace=False)
        self.conv3 = conv3x3(64, 128)
        self.bn3 = BatchNorm2d(128)
        self.relu3 = nn.ReLU(inplace=False)

        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)

        self.layer1 = self._make_layer(block, 64, layers[0])
        self.layer2 = self._make_layer(block, 128, layers[1], stride=2)
        self.layer3 = self._make_layer(block, 256, layers[2], stride=2)
        self.layer4 = self._make_layer(
            block, 512, layers[3], stride=1, dilation=2, multi_grid=(1, 1, 1)
        )

        self.context_encoding = PSPModule(2048, 512)
        self.edge = Edge_Module()
        self.decoder = Decoder_Module(num_classes)

        self.fushion = nn.Sequential(
            nn.Conv2d(1024, 256, kernel_size=1, padding=0, dilation=1, bias=False),
            InPlaceABNSync(256),
            nn.Dropout2d(0.1),
            nn.Conv2d(256, num_classes, kernel_size=1, padding=0, dilation=1, bias=True),
        )

    def _make_layer(
        self, block, planes: int, blocks: int, stride: int = 1, dilation: int = 1, multi_grid=1
    ) -> nn.Sequential:
        downsample = None
        if stride != 1 or self.inplanes != planes * block.expansion:
            downsample = nn.Sequential(
                nn.Conv2d(
                    self.inplanes,
                    planes * block.expansion,
                    kernel_size=1,
                    stride=stride,
                    bias=False,
                ),
                BatchNorm2d(planes * block.expansion, affine=affine_par),
            )

        layers = []
        generate_multi_grid = (
            lambda index, grids: grids[index % len(grids)] if isinstance(grids, tuple) else 1
        )
        layers.append(
            block(
                self.inplanes,
                planes,
                stride,
                dilation=dilation,
                downsample=downsample,
                multi_grid=generate_multi_grid(0, multi_grid),
            )
        )
        self.inplanes = planes * block.expansion
        for i in range(1, blocks):
            layers.append(
                block(
                    self.inplanes,
                    planes,
                    dilation=dilation,
                    multi_grid=generate_multi_grid(i, multi_grid),
                )
            )

        return nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> List:
        x = self.relu1(self.bn1(self.conv1(x)))
        x = self.relu2(self.bn2(self.conv2(x)))
        x = self.relu3(self.bn3(self.conv3(x)))
        x = self.maxpool(x)

        x2 = self.layer1(x)
        x3 = self.layer2(x2)
        x4 = self.layer3(x3)
        x5 = self.layer4(x4)

        x = self.context_encoding(x5)
        parsing_result, parsing_fea = self.decoder(x, x2)

        # Edge branch
        edge_result, edge_fea = self.edge(x2, x3, x4)

        # Fusion branch
        x = torch.cat([parsing_fea, edge_fea], dim=1)
        fusion_result = self.fushion(x)

        return [[parsing_result, fusion_result], [edge_result]]


def resnet101(num_classes: int = 18) -> ResNet:
    """Builds a ResNet-101 AugmentCE2P human parsing model for CPU execution.

    Args:
        num_classes: Number of human parsing classes (default 18 for ATR).

    Returns:
        Instantiated ResNet model.
    """
    return ResNet(Bottleneck, [3, 4, 23, 3], num_classes=num_classes)
