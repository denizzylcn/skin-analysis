"""
Öneri Motoru
============
Cilt analizi sonuçlarına göre ürün önerisi yapar.
"""
import pandas as pd
from pathlib import Path

_CSV = Path(__file__).resolve().parents[2] / "data" / "raw" / "cosmetics_clean.csv"


class Recommender:
    def __init__(self):
        self.df = pd.read_csv(_CSV)

    def recommend(self, skin_type: str, problems: list[str], top_n: int = 5) -> list[dict]:
        """
        skin_type : "oily" | "dry" | "normal"
        problems  : ["acne", "wrinkle", "dark spot", ...]
        """
        col_map = {"oily": "Oily", "dry": "Dry", "normal": "Normal",
                   "combination": "Combination", "sensitive": "Sensitive"}

        col = col_map.get(skin_type.lower(), "Normal")
        df = self.df[self.df[col] == 1].copy()

        # Probleme göre kategori önceliği
        priority = []
        if any(p in problems for p in ["acne", "redness", "blackhead"]):
            priority.append("Treatment")
            priority.append("Cleanser")
        if any(p in problems for p in ["wrinkle", "dark spot", "cilt lekesi"]):
            priority.append("Treatment")
            priority.append("Moisturizer")
        if "gözenek" in problems:
            priority.append("Cleanser")
        if "bags" in problems:
            priority.append("Eye cream")

        if priority:
            df_priority = df[df["Label"].isin(priority)]
            df_rest     = df[~df["Label"].isin(priority)]
            df = pd.concat([df_priority, df_rest])

        # En yüksek puanlıları al
        df = df.sort_values("Rank", ascending=False).head(top_n)

        return df[["Label", "Brand", "Name", "Price", "Rank", "Ingredients"]].to_dict("records")

    def summarize_problems(self, problems: list[str]) -> str:
        """Tespit edilen problemleri Türkçe özetle."""
        tr = {
            "acne"       : "Akne",
            "bags"       : "Göz altı torbası",
            "blackhead"  : "Siyah nokta",
            "cilt lekesi": "Cilt lekesi",
            "dark spot"  : "Koyu nokta",
            "gözenek"    : "Belirgin gözenek",
            "redness"    : "Kızarıklık",
            "wrinkle"    : "Kırışıklık",
        }
        found = [tr.get(p, p) for p in problems]
        return ", ".join(found) if found else "Belirgin bir sorun tespit edilmedi"