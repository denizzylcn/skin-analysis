# Görüntü İşleme Tabanlı Akıllı Cilt Analizi

## Kurulum

```bash
# 1) Sanal ortam
python -m venv skin_env
skin_env\Scripts\activate      # Windows
source skin_env/bin/activate   # Mac/Linux

# 2) Bağımlılıklar
pip install -r requirements.txt

# 3) Ortam değişkenleri
cp .env.example .env
```

## Klasör Yapısı

```
skin-analysis/
├── data/
│   ├── raw/          ← Ham datasetler (Git'e eklenmez)
│   └── processed/    ← Temizlenmiş görüntüler
├── notebooks/        ← Colab notebook'ları
├── src/
│   ├── data/         ← Pipeline & dataset sınıfları
│   ├── models/       ← Model tanımları
│   ├── api/          ← FastAPI endpoints
│   └── utils/        ← Config, logger
├── models/           ← Eğitilmiş modeller
├── frontend/         ← React uygulaması
└── tests/
```

## Veri Pipeline'ı

```bash
python -m src.data.pipeline --dataset skin_type
python -m src.data.pipeline --dataset acne
python -m src.data.pipeline --dataset lesion
```

## API Çalıştırma

```bash
uvicorn src.api.main:app --reload
```

## Testler

```bash
pytest tests/ -v
```
