"""
Cilt Analizi Modülü
===================
- Renk analizi (HSV, LAB)
- Cilt segmentasyonu (YCrCb)
- Tekstür analizi (LBP, Gabor, Laplacian)
- Yağlılık tahmini
"""

import cv2
import numpy as np
from PIL import Image


class SkinAnalyzer:

    def __init__(self):
        self.gabor_kernels = self._build_gabor_kernels()

    def _build_gabor_kernels(self) -> list:
        """4 farklı yönde Gabor filtresi oluştur."""
        kernels = []
        for theta in [0, 45, 90, 135]:
            kernel = cv2.getGaborKernel(
                ksize=(21, 21),
                sigma=5.0,
                theta=np.deg2rad(theta),
                lambd=10.0,
                gamma=0.5,
                psi=0,
                ktype=cv2.CV_32F,
            )
            kernels.append(kernel)
        return kernels

    def analyze(self, img_bgr: np.ndarray) -> dict:
        mask   = self._skin_mask(img_bgr)
        result = {}
        result.update(self._color_analysis(img_bgr, mask))
        result.update(self._texture_lbp(img_bgr, mask))
        result.update(self._texture_gabor(img_bgr))
        result.update(self._oiliness(img_bgr))
        result["skin_score"] = self._skin_score(result)
        return result

    # ── 1) Cilt Segmentasyonu ─────────────────────────────────────
    def _skin_mask(self, img_bgr: np.ndarray) -> np.ndarray:
        """YCrCb renk uzayıyla cilt piksellerini maskele."""
        ycrcb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
        mask  = cv2.inRange(ycrcb,
                            np.array([0,   133,  77]),
                            np.array([255, 173, 127]))
        # Gürültü temizle
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask   = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel)
        mask   = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        return mask

    # ── 2) Renk Analizi ──────────────────────────────────────────
    def _color_analysis(self, img_bgr: np.ndarray, mask: np.ndarray) -> dict:
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)

        def masked_mean(channel):
            vals = channel[mask > 0]
            return round(float(vals.mean()), 2) if len(vals) else 0.0

        return {
            "hue_mean"        : masked_mean(hsv[:, :, 0]),
            "saturation_mean" : masked_mean(hsv[:, :, 1]),
            "brightness_mean" : masked_mean(hsv[:, :, 2]),
            "lightness_mean"  : masked_mean(lab[:, :, 0]),
            "green_red_diff"  : masked_mean(lab[:, :, 1]),  # a kanalı: kızarıklık
            "skin_pixel_ratio": round(float((mask > 0).sum() / mask.size), 3),
        }

    # ── 3) LBP Tekstür Analizi ───────────────────────────────────
    def _texture_lbp(self, img_bgr: np.ndarray, mask: np.ndarray) -> dict:
        """
        Local Binary Pattern (LBP) ile tekstür analizi.
        Cilt tipi tespitinde çok kullanılan klasik GİP yöntemi.
        """
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        lbp  = np.zeros_like(gray, dtype=np.uint8)

        # 8 komşu piksel, yarıçap=1
        neighbors = [(-1,-1),(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1)]
        for i, (dy, dx) in enumerate(neighbors):
            shifted = np.roll(np.roll(gray, dy, axis=0), dx, axis=1)
            lbp    |= ((gray >= shifted).astype(np.uint8) << i)

        # Sadece cilt piksellerinde histogram
        skin_lbp = lbp[mask > 0] if mask.sum() > 0 else lbp.flatten()
        hist, _  = np.histogram(skin_lbp, bins=16, range=(0, 256))
        hist     = hist.astype(float) / (hist.sum() + 1e-6)

        # Tekstür homojenliği — düşük = pürüzlü
        uniformity = float(np.sum(hist ** 2))

        return {
            "lbp_uniformity"  : round(uniformity, 4),
            "texture_roughness": round(1.0 - uniformity, 4),
        }

    # ── 4) Gabor Tekstür Analizi ─────────────────────────────────
    def _texture_gabor(self, img_bgr: np.ndarray) -> dict:
        """Gabor filtreleriyle yön bazlı tekstür enerjisi."""
        gray     = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        energies = []
        for kernel in self.gabor_kernels:
            filtered = cv2.filter2D(gray, cv2.CV_32F, kernel)
            energies.append(float(np.mean(np.abs(filtered))))

        return {
            "gabor_energy_mean": round(float(np.mean(energies)), 2),
            "gabor_energy_max" : round(float(np.max(energies)),  2),
        }

    # ── 5) Yağlılık ──────────────────────────────────────────────
    def _oiliness(self, img_bgr: np.ndarray) -> dict:
        hsv            = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        v              = hsv[:, :, 2].astype(float)
        s              = hsv[:, :, 1].astype(float)
        highlight_mask = (v > 200) & (s < 50)
        score          = float(highlight_mask.sum() / highlight_mask.size) * 100

        return {
            "oiliness_score": round(score, 3),
            "oiliness_level": (
                "high"   if score > 2.0 else
                "medium" if score > 0.5 else
                "low"
            ),
        }

    # ── 6) Genel Skor ────────────────────────────────────────────
    def _skin_score(self, f: dict) -> float:
        brightness = f.get("brightness_mean", 128) / 255 * 30
        oiliness   = max(0, 30 - f.get("oiliness_score", 0) * 10)
        texture    = max(0, 20 - f.get("texture_roughness", 0) * 20)
        gabor      = min(20, f.get("gabor_energy_mean", 0) / 10)
        return round(min(100, max(0, brightness + oiliness + texture + gabor)), 1)


if __name__ == "__main__":
    import sys
    from PIL import Image

    analyzer = SkinAnalyzer()
    if len(sys.argv) > 1:
        img = np.array(Image.open(sys.argv[1]).convert("RGB"))[:, :, ::-1]
    else:
        img = np.random.randint(100, 200, (224, 224, 3), dtype=np.uint8)

    result = analyzer.analyze(img)
    print("=== Cilt Analizi ===")
    for k, v in result.items():
        print(f"  {k:25s}: {v}")