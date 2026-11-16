"""Pure PyTorch CPU-compatible Activated Batch Normalization (ABN).

Replaces Mapillary InPlaceABN / InPlaceABNSync without requiring custom
CUDA or C++ extensions, preserving exact state_dict compatibility and
eval-mode numerical equivalence.

References:
    - InPlaceABN (BSD 3-Clause, Copyright (c) 2017 Mapillary AB)
    - SCHP (MIT License, Copyright (c) 2020 Peike Li)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

ACT_RELU = "relu"
ACT_LEAKY_RELU = "leaky_relu"
ACT_ELU = "elu"
ACT_NONE = "none"


class ABN(nn.Module):
    """Activated Batch Normalization for CPU / standard PyTorch.

    Combines standard batch normalization with an activation function.
    Maintains identical parameter names (`weight`, `bias`, `running_mean`,
    `running_var`) to allow loading checkpoints trained with InPlaceABN / InPlaceABNSync.
    """

    def __init__(
        self,
        num_features: int,
        eps: float = 1e-5,
        momentum: float = 0.1,
        affine: bool = True,
        activation: str = "leaky_relu",
        slope: float = 0.01,
    ):
        super(ABN, self).__init__()
        self.num_features = num_features
        self.affine = affine
        self.eps = eps
        self.momentum = momentum
        self.activation = activation
        self.slope = slope

        if self.affine:
            self.weight = nn.Parameter(torch.ones(num_features))
            self.bias = nn.Parameter(torch.zeros(num_features))
        else:
            self.register_parameter("weight", None)
            self.register_parameter("bias", None)

        self.register_buffer("running_mean", torch.zeros(num_features))
        self.register_buffer("running_var", torch.ones(num_features))
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.constant_(self.running_mean, 0.0)
        nn.init.constant_(self.running_var, 1.0)
        if self.affine:
            nn.init.constant_(self.weight, 1.0)
            nn.init.constant_(self.bias, 0.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = F.batch_norm(
            x,
            self.running_mean,
            self.running_var,
            self.weight,
            self.bias,
            self.training,
            self.momentum,
            self.eps,
        )

        if self.activation == ACT_RELU:
            return F.relu(x, inplace=True)
        elif self.activation == ACT_LEAKY_RELU:
            return F.leaky_relu(x, negative_slope=self.slope, inplace=True)
        elif self.activation == ACT_ELU:
            return F.elu(x, inplace=True)
        else:
            return x

    def __repr__(self):
        rep = "{name}({num_features}, eps={eps}, momentum={momentum}, affine={affine}, activation={activation}"
        if self.activation == "leaky_relu":
            rep += ", slope={slope})"
        else:
            rep += ")"
        return rep.format(name=self.__class__.__name__, **self.__dict__)


# Aliases so imports and configurations matching upstream SCHP work unchanged
InPlaceABN = ABN
InPlaceABNSync = ABN
