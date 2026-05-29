import { useRef } from "react"

const LOADING_STEPS = [
  { label: "Yüz tespiti",        desc: "Haar Cascade ile yüz aranıyor..." },
  { label: "Cilt segmentasyonu", desc: "YCrCb renk analizi yapılıyor..." },
  { label: "Model tahmini",      desc: "EfficientNet-B3 çalışıyor..." },
  { label: "Ürün eşleştirme",   desc: "1456 ürün içinden seçiliyor..." },
]

const glassCard = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "20px",
}

export default function UploadSection({ loading, loadingStep, setLoading, setLoadingStep, setResult, preview, setPreview }) {
  const inputRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("Lütfen geçerli bir görüntü dosyası seçin."); return }
    if (file.size > 10 * 1024 * 1024) { alert("Dosya boyutu 10MB'ı geçemez."); return }
    setPreview(URL.createObjectURL(file))
  }

  const simulateSteps = async () => {
    for (let i = 0; i < LOADING_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 800))
      setLoadingStep(i + 1)
    }
  }

  const handleAnalyze = async () => {
    if (!inputRef.current?.files[0]) return
    setLoading(true); setLoadingStep(0)
    try {
      const formData = new FormData()
      formData.append("file", inputRef.current.files[0])
      const [res] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/analyze", { method: "POST", body: formData }),
        simulateSteps(),
      ])
      if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`)
      setResult(await res.json())
    } catch (err) {
      const isNetwork = err.message?.includes("fetch") || err.message?.includes("Failed")
      alert(isNetwork
        ? "❌ API'ye bağlanılamadı.\n\nBackend çalışıyor mu?\n→ python -m uvicorn src.api.main:app --reload"
        : `❌ Hata: ${err.message}`)
    } finally { setLoading(false); setLoadingStep(0) }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-8 py-16">
        {/* Spinner */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "3px solid rgba(244,63,94,0.2)", borderTopColor: "#f43f5e" }} />
          <div className="absolute inset-2 rounded-full animate-spin"
            style={{ border: "2px solid rgba(168,85,247,0.2)", borderTopColor: "#a855f7", animationDirection: "reverse", animationDuration: "0.8s" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            {preview && <img src={preview} alt="" className="w-14 h-14 rounded-full object-cover opacity-70" />}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-1">Analiz ediliyor...</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Yapay zeka cildinizi inceliyor</p>
        </div>

        {/* Adımlar */}
        <div className="w-full max-w-md space-y-3">
          {LOADING_STEPS.map((step, i) => {
            const state = loadingStep > i ? "done" : loadingStep === i ? "active" : "wait"
            return (
              <div key={step.label} className="flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500"
                style={{
                  background: state === "done" ? "rgba(16,185,129,0.1)" : state === "active" ? "rgba(244,63,94,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${state === "done" ? "rgba(16,185,129,0.3)" : state === "active" ? "rgba(244,63,94,0.3)" : "rgba(255,255,255,0.06)"}`,
                  opacity: state === "wait" ? 0.5 : 1,
                }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    background: state === "done" ? "#10b981" : state === "active" ? "linear-gradient(135deg,#f43f5e,#a855f7)" : "rgba(255,255,255,0.1)",
                    color: "white",
                  }}>
                  {state === "done" ? "✓" : state === "active" ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span> : i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: state === "wait" ? "rgba(255,255,255,0.3)" : "white" }}>{step.label}</p>
                  {state === "active" && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{step.desc}</p>}
                </div>
                {state === "done" && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-10 py-10">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-2"
          style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)", color: "#f9a8d4" }}>
          ✦ AI Destekli Cilt Analizi
        </div>
        <h2 className="text-5xl font-bold text-white leading-tight">
          Cildinizi <span style={{ background: "linear-gradient(135deg,#f43f5e,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Analiz</span> Edin
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto", lineHeight: 1.7, fontSize: 15 }}>
          Yüz fotoğrafınızı yükleyin, yapay zeka cilt tipinizi ve problemlerinizi
          tespit edip kişiselleştirilmiş ürün önerileri sunsun.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { inputRef.current.files = e.dataTransfer.files; handleFile(f) } }}
        className="w-full max-w-lg cursor-pointer group overflow-hidden"
        style={{
          ...glassCard,
          minHeight: preview ? 0 : 300,
          transition: "all 0.3s",
          boxShadow: "0 0 40px rgba(244,63,94,0.08)",
        }}
        onMouseEnter={e => e.currentTarget.style.border = "1px solid rgba(244,63,94,0.4)"}
        onMouseLeave={e => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="önizleme" className="w-full max-h-80 object-cover" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              <span className="text-white font-semibold text-sm px-4 py-2 rounded-full"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                Fotoğrafı Değiştir
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-5 p-16">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.2)" }}>
              📷
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-lg">Fotoğraf yükle</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>veya sürükle bırak</p>
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
              JPG, PNG — maks 10MB
            </p>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />

      {preview && (
        <div className="flex gap-3">
          <button
            onClick={() => { setPreview(null); inputRef.current.value = "" }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
          >
            Temizle
          </button>
          <button
            onClick={handleAnalyze}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)", boxShadow: "0 0 25px rgba(244,63,94,0.4)" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 35px rgba(244,63,94,0.6)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 25px rgba(244,63,94,0.4)"}
          >
            Analiz Et ✦
          </button>
        </div>
      )}

      {/* Özellik kartları */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-2">
        {[
          { icon: "🔍", title: "Cilt Tipi",    desc: "Kuru / Normal / Yağlı", color: "#60a5fa" },
          { icon: "⚠️", title: "Problemler",  desc: "8 farklı sorun tespiti", color: "#f472b6" },
          { icon: "💄", title: "Ürün Önerisi", desc: "Kişiselleştirilmiş",    color: "#c084fc" },
        ].map((f) => (
          <div key={f.title} className="p-4 text-center rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-2xl mb-2">{f.icon}</div>
            <p className="font-semibold text-sm text-white">{f.title}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
