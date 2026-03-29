"""
Ana Analiz Modülü
=================
FaceDetector + SkinAnalyzer'ı birleştirip
tek bir arayüzden sonuç döner.
"""

import cv2
import numpy as np
from pathlib import Path
from PIL import Image

from src.models.face_detector import FaceDetector
from src.models.skin_analyzer import SkinAnalyzer


class SkinAnalysisPipeline:

    def __init__(self):
        self.face_detector = FaceDetector(method="haar")
        self.skin_analyzer = SkinAnalyzer()

    def _load_image(self, source) -> np.ndarray:
        if isinstance(source, (str, Path)):
            img = Image.open(source).convert("RGB")
            return np.array(img)[:, :, ::-1]
        elif isinstance(source, Image.Image):
            return np.array(source.convert("RGB"))[:, :, ::-1]
        elif isinstance(source, np.ndarray):
            return source
        raise TypeError(f"Desteklenmeyen tip: {type(source)}")

    def run(self, source) -> dict:
        """
        Tam analiz pipeline'ı.

        Returns:
            {
                "status"    : "ok" | "no_face",
                "face"      : {...} | None,
                "skin"      : {...} | None,
                "summary"   : str
            }
        """
        img_bgr = self._load_image(source)

        # 1) Yüz tespiti
        detection = self.face_detector.detect(img_bgr)

        if detection["count"] == 0:
            return {
                "status" : "no_face",
                "face"   : None,
                "skin"   : None,
                "summary": "Görüntüde yüz tespit edilemedi.",
            }

        # En büyük yüzü al
        face = max(detection["faces"], key=lambda f: f["w"] * f["h"])

        # 2) Yüzü kırp
        face_img = self.face_detector.crop_face(img_bgr, face, padding=0.1)

        # 3) Cilt analizi
        skin = self.skin_analyzer.analyze(face_img)

        # 4) Özet üret
        summary = self._summarize(skin)

        return {
            "status" : "ok",
            "face"   : face,
            "skin"   : skin,
            "summary": summary,
        }

    def _summarize(self, skin: dict) -> str:
        score    = skin.get("skin_score", 0)
        oiliness = skin.get("oiliness_level", "low")
        bright   = skin.get("brightness_mean", 0)

        parts = []

        if score >= 70:
            parts.append("Genel cilt durumu iyi.")
        elif score >= 40:
            parts.append("Cilt durumu orta.")
        else:
            parts.append("Cilt bakıma ihtiyaç duyuyor.")

        if oiliness == "high":
            parts.append("Yağlı cilt tespit edildi.")
        elif oiliness == "medium":
            parts.append("Karma cilt tespit edildi.")
        else:
            parts.append("Kuru veya normal cilt tespit edildi.")

        if bright < 100:
            parts.append("Cilt tonu koyu.")
        elif bright < 170:
            parts.append("Cilt tonu orta.")
        else:
            parts.append("Cilt tonu açık.")

        return " ".join(parts)


if __name__ == "__main__":
    import sys

    pipeline = SkinAnalysisPipeline()

    if len(sys.argv) > 1:
        result = pipeline.run(sys.argv[1])
    else:
        # Test için sahte görüntü
        test_img = np.random.randint(100, 200, (300, 300, 3), dtype=np.uint8)
        result = pipeline.run(test_img)

    print(f"Status  : {result['status']}")
    print(f"Özet    : {result['summary']}")
    if result["skin"]:
        print(f"Skor    : {result['skin']['skin_score']}")
        print(f"Yağlılık: {result['skin']['oiliness_level']}")
        print(f"Parlaklık: {result['skin']['brightness_mean']}")