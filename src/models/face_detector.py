"""
Yüz Tespiti Modülü
==================
OpenCV ile görüntüden yüz tespiti yapar.
İki yöntem desteklenir:
  1. Haar Cascade (hızlı, hafif)
  2. DNN tabanlı (daha doğru)
"""

import cv2
import numpy as np
from pathlib import Path
from PIL import Image


class FaceDetector:
    def __init__(self, method: str = "haar"):
        self.method = method

        if method == "haar":
            cascade_path = r"C:\cv2data\haarcascade_frontalface_default.xml"
            self.detector = cv2.CascadeClassifier(cascade_path)

        elif method == "dnn":
            self.detector = cv2.FaceDetectorYN.create(
                model="face_detection_yunet_2023mar.onnx",
                config="",
                input_size=(320, 320),
                score_threshold=0.6,
                nms_threshold=0.3,
            )
        else:
            raise ValueError(f"Geçersiz method: {method}.")

    def _load_image(self, source) -> np.ndarray:
        if isinstance(source, (str, Path)):
            img = Image.open(source).convert("RGB")
            return np.array(img)[:, :, ::-1]
        elif isinstance(source, Image.Image):
            return np.array(source.convert("RGB"))[:, :, ::-1]
        elif isinstance(source, np.ndarray):
            return source
        else:
            raise TypeError(f"Desteklenmeyen tip: {type(source)}")

    def detect(self, source) -> dict:
        img_bgr = self._load_image(source)
        h, w = img_bgr.shape[:2]

        if self.method == "haar":
            faces = self._detect_haar(img_bgr)
        else:
            faces = self._detect_dnn(img_bgr)

        return {"faces": faces, "count": len(faces), "image_shape": (h, w)}

    def _detect_haar(self, img_bgr: np.ndarray) -> list[dict]:
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

        detections = self.detector.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
        )

        faces = []
        if len(detections) > 0:
            for (x, y, fw, fh) in detections:
                faces.append({"x": int(x), "y": int(y),
                              "w": int(fw), "h": int(fh), "confidence": None})
        return faces

    def _detect_dnn(self, img_bgr: np.ndarray) -> list[dict]:
        h, w = img_bgr.shape[:2]
        self.detector.setInputSize((w, h))
        _, detections = self.detector.detect(img_bgr)

        faces = []
        if detections is not None:
            for det in detections:
                x, y, fw, fh = int(det[0]), int(det[1]), int(det[2]), int(det[3])
                faces.append({"x": x, "y": y, "w": fw, "h": fh,
                              "confidence": round(float(det[-1]), 3)})
        return faces

    def crop_face(self, source, face: dict, padding: float = 0.2) -> np.ndarray:
        img_bgr = self._load_image(source)
        h, w = img_bgr.shape[:2]
        x, y, fw, fh = face["x"], face["y"], face["w"], face["h"]
        pad_x = int(fw * padding)
        pad_y = int(fh * padding)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(w, x + fw + pad_x)
        y2 = min(h, y + fh + pad_y)
        return img_bgr[y1:y2, x1:x2]

    def draw_faces(self, source, result: dict) -> np.ndarray:
        img = self._load_image(source).copy()
        for face in result["faces"]:
            x, y, fw, fh = face["x"], face["y"], face["w"], face["h"]
            cv2.rectangle(img, (x, y), (x + fw, y + fh), (0, 200, 100), 2)
        return img


if __name__ == "__main__":
    import sys
    detector = FaceDetector(method="haar")
    if len(sys.argv) > 1:
        result = detector.detect(sys.argv[1])
        print(f"Tespit edilen yüz: {result['count']}")
        for i, face in enumerate(result["faces"]):
            print(f"  Yüz {i+1}: x={face['x']} y={face['y']} w={face['w']} h={face['h']}")
    else:
        print("Haar detector hazır!")
        print("Kullanım: python face_detector.py <görüntü_yolu>")