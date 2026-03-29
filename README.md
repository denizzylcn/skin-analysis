# 🔬 Görüntü İşleme Tabanlı Akıllı Cilt Analizi ve Kişiselleştirilmiş Bakım Öneri Sistemi

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python" />
  <img src="https://img.shields.io/badge/PyTorch-2.3-orange?style=flat-square&logo=pytorch" />
  <img src="https://img.shields.io/badge/OpenCV-4.9-green?style=flat-square&logo=opencv" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-teal?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
</p>

<p align="center">
  Yüz fotoğrafından cilt tipi tespiti, lezyon analizi ve kişiselleştirilmiş bakım önerisi sunan yapay zeka destekli sistem.
</p>

---

## 📌 Proje Hakkında

Bu proje, görüntü işleme ve derin öğrenme yöntemlerini birleştirerek kullanıcının yüz fotoğrafından cilt tipini (kuru/normal/yağlı), cilt sorunlarını (akne, kızarıklık, göz altı) ve deri lezyonlarını tespit eden; tespit sonuçlarına göre kişiselleştirilmiş cilt bakım ürünleri öneren bir sistem sunar.

### 🎯 Temel Özellikler

- **Otomatik Yüz Tespiti** — OpenCV Haar Cascade ile yüz bölgesi tespiti
- **Cilt Tipi Sınıflandırması** — EfficientNet-B3 ile kuru / normal / yağlı cilt tespiti (%85+ doğruluk)
- **Cilt Defekti Analizi** — Akne, kızarıklık ve göz altı tespiti
- **Deri Lezyonu Analizi** — HAM10000 dataseti ile 7 farklı lezyon sınıfı tespiti
- **Kişiselleştirilmiş Öneri** — Tespit sonuçlarına göre ürün ve bakım rutini önerisi
- **Klasik GİP Analizi** — LBP, Gabor filtresi, HSV/LAB renk uzayı analizi



## 🔬 Görüntü İşleme Teknikleri

| Teknik | Kullanım Amacı |
|--------|---------------|
| Haar Cascade | Yüz tespiti |
| YCrCb Maskeleme | Cilt bölgesi segmentasyonu |
| HSV / LAB Analizi | Renk ve parlaklık analizi |
| LBP (Local Binary Pattern) | Tekstür homojenliği analizi |
| Gabor Filtresi | Yön bazlı tekstür enerjisi |
| Laplacian Variance | Bulanıklık / keskinlik tespiti |
| CLAHE | Kontrast iyileştirme |

---

## 🤖 Derin Öğrenme

- **Mimari:** EfficientNet-B3 (Transfer Learning)
- **Framework:** PyTorch 2.3
- **Eğitim:** Google Colab T4 GPU
- **Optimizasyon:** Adam (lr=0.0001), ReduceLROnPlateau
- **Loss:** CrossEntropyLoss (weighted — sınıf dengesizliği için)
- **Augmentation:** RandomFlip, RandomRotation, ColorJitter

