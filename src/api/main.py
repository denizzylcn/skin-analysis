"""FastAPI uygulaması — ana giriş noktası."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Cilt Analizi API",
    description="Görüntü işleme tabanlı akıllı cilt analizi",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Cilt Analizi API çalışıyor!"}
# Router'lar ilerleyen haftalarda buraya eklenecek
# from src.api.routers import analyze, recommend
# app.include_router(analyze.router, prefix="/api/analyze")
# app.include_router(recommend.router, prefix="/api/recommend")
