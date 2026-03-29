"""Basit pipeline testleri."""
from pathlib import Path
import numpy as np
import cv2
import tempfile
import pytest

from src.data.pipeline import image_quality, split
from src.utils.config import CONFIG
import pandas as pd


def make_test_image(path: Path, w=100, h=100, bright=128):
    img = np.full((h, w, 3), bright, dtype=np.uint8)
    cv2.imwrite(str(path), img)


def test_image_quality_ok(tmp_path):
    p = tmp_path / "test.jpg"
    make_test_image(p)
    result = image_quality(p, CONFIG)
    assert result["ok"] is True


def test_image_quality_dark(tmp_path):
    p = tmp_path / "dark.jpg"
    make_test_image(p, bright=10)
    result = image_quality(p, CONFIG)
    assert result["ok"] is False
    assert "karanlık" in result["reason"]


def test_split_ratios():
    df = pd.DataFrame({
        "path": [f"img_{i}.jpg" for i in range(100)],
        "label": ["a"] * 50 + ["b"] * 50,
        "ok": [True] * 100,
        "md5": [f"hash_{i}" for i in range(100)],
    })
    result = split(df, CONFIG)
    counts = result["split"].value_counts()
    assert counts["train"] > counts["val"]
    assert counts["train"] > counts["test"]
