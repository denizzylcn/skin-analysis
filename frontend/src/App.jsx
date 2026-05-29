import { useState, useEffect } from "react"
import UploadSection from "./components/UploadSection"
import ResultSection from "./components/ResultSection"
import HistorySection from "./components/HistorySection"
import ClinicMap from "./components/ClinicMap"

const MAX_HISTORY = 5

export default function App() {
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [preview, setPreview]       = useState(null)
  const [activeTab, setActiveTab]   = useState("analyze")
  const [history, setHistory]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("skinai_history") || "[]") }
    catch { return [] }
  })

  useEffect(() => {
    if (result && preview && result.status !== "no_face") {
      const entry = {
        id: Date.now(),
        preview,
        result,
        date: new Date().toLocaleDateString("tr-TR", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
        }),
      }
      setHistory(prev => {
        const updated = [entry, ...prev].slice(0, MAX_HISTORY)
        localStorage.setItem("skinai_history", JSON.stringify(updated))
        return updated
      })
    }
  }, [result])

  const handleReset = () => {
    setResult(null); setPreview(null); setLoadingStep(0); setActiveTab("analyze")
  }
  const handleHistorySelect = (entry) => {
    setPreview(entry.preview); setResult(entry.result); setActiveTab("analyze")
  }
  const handleClearHistory = () => {
    setHistory([]); localStorage.removeItem("skinai_history")
  }

  const NAV = [
    { key: "analyze",  label: "Analiz" },
    { key: "history",  label: "Geçmiş",  badge: history.length > 0 ? history.length : null },
    { key: "clinics",  label: "Klinikler", badge: "🗺️" },
  ]

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }}>

      {/* Dekoratif blob'lar */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #f43f5e, transparent)" }} />
        <div className="absolute top-1/2 -right-40 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ec4899, transparent)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50"
        style={{ background: "rgba(15,12,41,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)", boxShadow: "0 0 20px rgba(244,63,94,0.4)" }}>
              <span className="text-white text-xl">✦</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-wide">SkinAI</h1>
              <p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>Akıllı Cilt Analizi</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex gap-1 p-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {NAV.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300"
                style={{
                  background: activeTab === tab.key ? "linear-gradient(135deg, #f43f5e, #a855f7)" : "transparent",
                  color: activeTab === tab.key ? "white" : "rgba(255,255,255,0.5)",
                  boxShadow: activeTab === tab.key ? "0 0 15px rgba(244,63,94,0.3)" : "none",
                }}>
                {tab.label}
                {tab.badge && typeof tab.badge === "number" && (
                  <span className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold"
                    style={{ background: activeTab === tab.key ? "rgba(255,255,255,0.3)" : "#f43f5e", color: "white" }}>
                    {tab.badge}
                  </span>
                )}
                {tab.badge && typeof tab.badge === "string" && (
                  <span style={{ fontSize: 12 }}>{tab.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 relative">
        {activeTab === "history" ? (
          <HistorySection history={history} onSelect={handleHistorySelect} onClear={handleClearHistory} />
        ) : activeTab === "clinics" ? (
          <ClinicMap />
        ) : !result ? (
          <UploadSection loading={loading} loadingStep={loadingStep} setLoading={setLoading}
            setLoadingStep={setLoadingStep} setResult={setResult} preview={preview} setPreview={setPreview} />
        ) : (
          <ResultSection result={result} preview={preview} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}
