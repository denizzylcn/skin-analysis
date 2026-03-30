"""
API Route'ları
==============
POST /api/analyze  → Görüntü yükle, analiz et, öneri al
GET  /api/health   → Sistem durumu
"""
import io
import sys
import torch
import numpy as np
from pathlib import Path
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

# Proje kökünü path'e ekle
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src.models.analyzer import SkinAnalysisPipeline
from src.api.recommender import Recommender
import torchvision.transforms as transforms
import torchvision.models as models
import torch.nn as nn

router = APIRouter()

# ── Model tanımı ─────────────────────────────────────────────
class SkinClassifier(nn.Module):
    def __init__(self, num_classes, dropout=0.3):
        super().__init__()
        self.backbone = models.efficientnet_b3(weights=None)
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(in_features, num_classes),
        )
    def forward(self, x):
        return self.backbone(x)

# ── Model yükleme ─────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CKPT   = ROOT / "models" / "checkpoints"

SKIN_TYPE_CLASSES    = ["dry", "normal", "oily"]
SKIN_PROBLEM_CLASSES = ["acne", "bags", "blackhead", "cilt lekesi",
                        "dark spot", "gözenek", "redness", "wrinkle"]

def load_model(path: Path, num_classes: int):
    model = SkinClassifier(num_classes=num_classes)
    model.load_state_dict(torch.load(path, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model

# Modelleri yükle
try:
    model_skin_type = load_model(CKPT / "skin_type_best.pth",    len(SKIN_TYPE_CLASSES))
    model_problems  = load_model(CKPT / "skin_problems_best.pth", len(SKIN_PROBLEM_CLASSES))
    MODELS_LOADED   = True
    print("✅ Modeller yüklendi!")
except Exception as e:
    MODELS_LOADED = False
    print(f"⚠️ Model yüklenemedi: {e}")

# Transform
val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# Pipeline ve öneri motoru
pipeline    = SkinAnalysisPipeline()
recommender = Recommender()

# ── Yardımcı fonksiyonlar ─────────────────────────────────────
def predict(model, img_pil: Image.Image, classes: list[str]) -> tuple[str, float]:
    tensor = val_transform(img_pil).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        output = model(tensor)
        probs  = torch.softmax(output, dim=1)[0]
        idx    = probs.argmax().item()
    return classes[idx], round(float(probs[idx]), 3)

def predict_topk(model, img_pil: Image.Image, classes: list[str], threshold=0.15) -> list[dict]:
    tensor = val_transform(img_pil).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        output = model(tensor)
        probs  = torch.softmax(output, dim=1)[0]
    results = []
    for i, prob in enumerate(probs):
        if float(prob) >= threshold:
            results.append({
                "label"      : classes[i],
                "confidence" : round(float(prob), 3)
            })
    return sorted(results, key=lambda x: x["confidence"], reverse=True)

# ── Endpoint'ler ──────────────────────────────────────────────
@router.get("/health")
def health():
    return {
        "status"       : "ok",
        "models_loaded": MODELS_LOADED,
        "device"       : str(DEVICE),
    }


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    # Dosya kontrolü
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece görüntü dosyası yükleyin.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya 10MB'dan büyük olamaz.")

    try:
        img_pil = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Görüntü okunamadı.")

    img_np = np.array(img_pil)[:, :, ::-1]  # RGB → BGR

    # 1) Klasik GİP analizi (yüz tespiti + cilt özellikleri)
    gip_result = pipeline.run(img_np)

    if gip_result["status"] == "no_face":
        return JSONResponse({
            "status" : "no_face",
            "message": "Görüntüde yüz tespit edilemedi.",
        })

    # Yüz bölgesini kırp
    face      = gip_result["face"]
    h, w      = img_np.shape[:2]
    pad       = 0.1
    x1 = max(0, int(face["x"] - face["w"] * pad))
    y1 = max(0, int(face["y"] - face["h"] * pad))
    x2 = min(w, int(face["x"] + face["w"] * (1 + pad)))
    y2 = min(h, int(face["y"] + face["h"] * (1 + pad)))
    face_pil  = img_pil.crop((x1, y1, x2, y2))

    # 2) Cilt tipi tahmini
    skin_type, skin_type_conf = predict(model_skin_type, face_pil, SKIN_TYPE_CLASSES)

    # 3) Cilt problemleri (top-k)
    problems_raw = predict_topk(model_problems, face_pil, SKIN_PROBLEM_CLASSES, threshold=0.15)
    problem_labels = [p["label"] for p in problems_raw]

    # 4) Ürün önerisi
    recommendations = recommender.recommend(skin_type, problem_labels, top_n=5)

    # 5) Problem özeti
    problem_summary = recommender.summarize_problems(problem_labels)

    return JSONResponse({
        "status"     : "ok",
        "face"       : face,
        "skin"       : gip_result["skin"],
        "skin_type"  : {
            "prediction" : skin_type,
            "confidence" : skin_type_conf,
            "label_tr"   : {"dry": "Kuru", "normal": "Normal", "oily": "Yağlı"}.get(skin_type, skin_type),
        },
        "problems"         : problems_raw,
        "problem_summary"  : problem_summary,
        "gip_summary"      : gip_result["summary"],
        "recommendations"  : recommendations,
    })