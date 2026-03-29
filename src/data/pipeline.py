"""
Veri temizleme ve hazırlama pipeline'ı.
Kullanım:
    python -m src.data.pipeline --dataset skin_type
    python -m src.data.pipeline --dataset acne
    python -m src.data.pipeline --dataset lesion
"""
import argparse
import hashlib
from pathlib import Path

import cv2
import numpy as np
import pandas as pd

from src.utils.config import CONFIG
from src.utils.logger import get_logger

log = get_logger(__name__)
IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def collect_images(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.suffix.lower() in IMG_EXT)


def image_quality(path: Path, cfg: dict) -> dict:
    path = Path(path).resolve()
    result = {
        "path": str(path),
        "ok": True,
        "reason": "",
        "blur_score": None,
        "brightness": None,
        "width": None,
        "height": None,
        "file_size_kb": round(path.stat().st_size / 1024, 1),
        "md5": hashlib.md5(path.read_bytes()).hexdigest(),
    }

    try:
        from PIL import Image
        import numpy as np
        pil_img = Image.open(path).convert("RGB")
        img = np.array(pil_img)
        img_bgr = img[:, :, ::-1]  # RGB → BGR
    except Exception as e:
        result.update(ok=False, reason="okunamadı")
        return result

    h, w = img_bgr.shape[:2]
    result.update(width=w, height=h)

    min_px = cfg["quality"]["min_size_px"]
    if w < min_px or h < min_px:
        result.update(ok=False, reason=f"çok_küçük ({w}x{h})")
        return result

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    bright = float(gray.mean())
    result.update(blur_score=round(blur, 2), brightness=round(bright, 2))

    if blur < cfg["quality"]["blur_threshold"]:
        result.update(ok=False, reason=f"bulanık (blur={blur:.1f})")
    elif bright < cfg["quality"]["dark_threshold"]:
        result.update(ok=False, reason=f"karanlık (bright={bright:.1f})")
    elif bright > cfg["quality"]["bright_threshold"]:
        result.update(ok=False, reason=f"aşırı_parlak (bright={bright:.1f})")

    return result


def split(df: pd.DataFrame, cfg: dict, seed: int = 42) -> pd.DataFrame:
    df = df.copy()
    df["split"] = "train"
    rng = np.random.default_rng(seed)
    val_r  = cfg["data"]["val_ratio"]
    test_r = cfg["data"]["test_ratio"]
    for _, grp in df.groupby("label"):
        idx = grp.index.tolist()
        rng.shuffle(idx)
        n = len(idx)
        nt = max(1, int(n * test_r))
        nv = max(1, int(n * val_r))
        df.loc[idx[:nt], "split"] = "test"
        df.loc[idx[nt:nt+nv], "split"] = "val"
    return df


def run(dataset: str, root: Path, label_fn, cfg: dict):
    root = Path(root).resolve()
    log.info(f"[{dataset}] Görüntüler taranıyor: {root}")

    if not root.exists():
        log.error(f"[{dataset}] Klasör bulunamadı: {root}")
        return pd.DataFrame()

    images = collect_images(root)
    log.info(f"[{dataset}] {len(images)} görüntü bulundu")

    if not images:
        log.error(f"[{dataset}] Hiç görüntü bulunamadı!")
        return pd.DataFrame()

    rows = []
    for p in images:
        q = image_quality(p, cfg)
        q["label"] = label_fn(p)
        rows.append(q)

    df = pd.DataFrame(rows)

    # Duplicate kaldır
    n_before = len(df)
    df = df.drop_duplicates(subset=["md5"]).reset_index(drop=True)
    log.info(f"[{dataset}] {n_before - len(df)} duplicate kaldırıldı")

    # Split
    df = split(df, cfg)

    # Kaydet
    out = Path(cfg["data"]["manifests_dir"])
    out.mkdir(parents=True, exist_ok=True)
    df.to_csv(out / f"{dataset}_manifest.csv", index=False)
    df[df["ok"]].to_csv(out / f"{dataset}_clean.csv", index=False)

    ok  = df["ok"].sum()
    bad = len(df) - ok
    log.info(f"[{dataset}] Temiz: {ok} | Sorunlu: {bad}")
    log.info(f"[{dataset}] Manifest kaydedildi → {out}/{dataset}_clean.csv")
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", choices=["skin_type","acne","lesion"], required=True)
    args = parser.parse_args()

    cfg = CONFIG
    raw = Path(cfg["data"]["raw_dir"])

    if args.dataset == "skin_type":
        run("skin_type", raw / "skin_type",
            label_fn=lambda p: p.parent.name.lower(), cfg=cfg)

    elif args.dataset == "acne":
        def acne_label(p: Path) -> str:
            parts = p.parts
            for i, part in enumerate(parts):
                if part == "JPEGImages" and i + 1 < len(parts):
                    return parts[i + 1]
            return p.parent.name
        run("acne", raw / "acne", label_fn=acne_label, cfg=cfg)

    elif args.dataset == "lesion":
        import pandas as pd
        meta = pd.read_csv(raw / "lesion" / "HAM10000_metadata.csv")
        label_map = dict(zip(meta["image_id"], meta["dx"]))

        def lesion_label(p: Path) -> str:
            return label_map.get(p.stem, "unknown")

        run("lesion", raw / "lesion", label_fn=lesion_label, cfg=cfg)