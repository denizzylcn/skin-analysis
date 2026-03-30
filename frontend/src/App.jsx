import { useState } from "react"
import UploadSection from "./components/UploadSection"
import ResultSection from "./components/ResultSection"

export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center">
            <span className="text-white text-lg">✦</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">SkinAI</h1>
            <p className="text-xs text-gray-500">Akıllı Cilt Analizi</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {!result ? (
          <UploadSection
            loading={loading}
            setLoading={setLoading}
            setResult={setResult}
            preview={preview}
            setPreview={setPreview}
          />
        ) : (
          <ResultSection
            result={result}
            preview={preview}
            onReset={() => { setResult(null); setPreview(null) }}
          />
        )}
      </main>
    </div>
  )
}