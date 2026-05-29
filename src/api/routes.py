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

# ── Sabitler ─────────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CKPT   = ROOT / "models" / "checkpoints"

SKIN_TYPE_CLASSES    = ["dry", "normal", "oily"]
SKIN_PROBLEM_CLASSES = ["acne", "bags", "blackhead", "cilt lekesi",
                        "dark spot", "gözenek", "redness", "wrinkle"]
ACNE_CLASSES         = ["acne", "bags", "redness"]

# HAM10000 — 7 lezyon sınıfı
LESION_CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
LESION_TR = {
    "mel":   "Melanom",
    "nv":    "Melanositik Nevüs",
    "bcc":   "Bazal Hücreli Karsinom",
    "akiec": "Aktİnik Keratoz",
    "bkl":   "Benign Keratoz",
    "df":    "Dermatofibrom",
    "vasc":  "Vasküler Lezyon",
}
LESION_RISK = {
    "mel":   "yüksek",
    "bcc":   "yüksek",
    "akiec": "orta",
    "nv":    "düşük",
    "bkl":   "düşük",
    "df":    "düşük",
    "vasc":  "düşük",
}

# ── Model yükleme ─────────────────────────────────────────────
def load_model(path: Path, num_classes: int):
    model = SkinClassifier(num_classes=num_classes)
    model.load_state_dict(torch.load(path, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model

MODELS_LOADED   = False
model_skin_type = None
model_problems  = None
model_acne      = None
model_lesion    = None

try:
    model_skin_type = load_model(CKPT / "skin_type_best.pth",     len(SKIN_TYPE_CLASSES))
    model_problems  = load_model(CKPT / "skin_problems_best.pth", len(SKIN_PROBLEM_CLASSES))
    print("✅ Ana modeller yüklendi!")

    acne_path = CKPT / "acne_best.pth"
    if acne_path.exists():
        model_acne = load_model(acne_path, len(ACNE_CLASSES))
        print("✅ acne_best.pth yüklendi!")

    lesion_path = CKPT / "lesion_best.pth"
    if lesion_path.exists():
        model_lesion = load_model(lesion_path, len(LESION_CLASSES))
        print("✅ lesion_best.pth yüklendi!")
    else:
        print("ℹ️  lesion_best.pth bulunamadı.")

    MODELS_LOADED = True
except Exception as e:
    print(f"⚠️  Model yüklenemedi: {e}")

# ── Transform ────────────────────────────────────────────────
val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

pipeline    = SkinAnalysisPipeline()
recommender = Recommender()

# ── Yardımcı fonksiyonlar ─────────────────────────────────────
def get_probs(model, img_pil: Image.Image) -> torch.Tensor:
    tensor = val_transform(img_pil).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        return torch.softmax(model(tensor), dim=1)[0]

def predict(model, img_pil, classes):
    probs = get_probs(model, img_pil)
    idx   = probs.argmax().item()
    return classes[idx], round(float(probs[idx]), 3)

def predict_problems_ensemble(img_pil, threshold=0.12):
    probs_main = get_probs(model_problems, img_pil)
    scores = {cls: float(probs_main[i]) for i, cls in enumerate(SKIN_PROBLEM_CLASSES)}

    if model_acne is not None:
        probs_acne = get_probs(model_acne, img_pil)
        acne_scores = {cls: float(probs_acne[i]) for i, cls in enumerate(ACNE_CLASSES)}
        for cls in ACNE_CLASSES:
            if cls in scores:
                scores[cls] = 0.75 * acne_scores[cls] + 0.25 * scores[cls]

    return sorted(
        [{"label": cls, "confidence": round(s, 3)} for cls, s in scores.items() if s >= threshold],
        key=lambda x: x["confidence"], reverse=True
    )

def predict_lesion(img_pil, threshold=0.08):
    """Lezyon tahmini — top-k, düşük threshold (ham10000 dengeli değil)"""
    if model_lesion is None:
        return None
    probs = get_probs(model_lesion, img_pil)
    results = []
    for i, cls in enumerate(LESION_CLASSES):
        conf = float(probs[i])
        if conf >= threshold:
            results.append({
                "code":       cls,
                "label":      LESION_TR.get(cls, cls),
                "confidence": round(conf, 3),
                "risk":       LESION_RISK.get(cls, "düşük"),
            })
    results = sorted(results, key=lambda x: x["confidence"], reverse=True)
    return results[:3] if results else []

# ── Endpoint'ler ──────────────────────────────────────────────
@router.get("/health")
def health():
    return {
        "status"       : "ok",
        "models_loaded": MODELS_LOADED,
        "acne_model"   : model_acne is not None,
        "lesion_model" : model_lesion is not None,
        "device"       : str(DEVICE),
    }

@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece görüntü dosyası yükleyin.")
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya 10MB'dan büyük olamaz.")
    try:
        img_pil = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Görüntü okunamadı.")

    img_np = np.array(img_pil)[:, :, ::-1]

    # 1) GİP analizi
    gip_result = pipeline.run(img_np)
    if gip_result["status"] == "no_face":
        return JSONResponse({"status": "no_face", "message": "Görüntüde yüz tespit edilemedi."})

    # Yüz kırpma
    face = gip_result["face"]
    h, w = img_np.shape[:2]
    pad  = 0.1
    x1 = max(0, int(face["x"] - face["w"] * pad))
    y1 = max(0, int(face["y"] - face["h"] * pad))
    x2 = min(w, int(face["x"] + face["w"] * (1 + pad)))
    y2 = min(h, int(face["y"] + face["h"] * (1 + pad)))
    face_pil = img_pil.crop((x1, y1, x2, y2))

    # 2) Cilt tipi
    skin_type, skin_type_conf = predict(model_skin_type, face_pil, SKIN_TYPE_CLASSES)

    # 3) Problemler (ensemble)
    problems_raw   = predict_problems_ensemble(face_pil, threshold=0.12)
    problem_labels = [p["label"] for p in problems_raw]

    # 4) Lezyon analizi
    lesion_results = predict_lesion(face_pil)

    # 5) Ürün önerisi + özet
    recommendations = recommender.recommend(skin_type, problem_labels, top_n=5)
    problem_summary = recommender.summarize_problems(problem_labels)

    return JSONResponse({
        "status"          : "ok",
        "face"            : face,
        "skin"            : gip_result["skin"],
        "skin_type"       : {
            "prediction": skin_type,
            "confidence": skin_type_conf,
            "label_tr"  : {"dry": "Kuru", "normal": "Normal", "oily": "Yağlı"}.get(skin_type, skin_type),
        },
        "problems"        : problems_raw,
        "problem_summary" : problem_summary,
        "gip_summary"     : gip_result["summary"],
        "recommendations" : recommendations,
        "lesion"          : lesion_results,
    })
