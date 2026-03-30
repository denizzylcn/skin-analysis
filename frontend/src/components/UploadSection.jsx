import { useRef } from "react"
import { Button } from "@/components/ui/button"

export default function UploadSection({ loading, setLoading, setResult, preview, setPreview }) {
  const inputRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  const handleAnalyze = async () => {
    if (!inputRef.current?.files[0]) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", inputRef.current.files[0])
      const res = await fetch("http://127.0.0.1:8000/api/analyze", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      alert("Hata: API'ye bağlanılamadı. Backend çalışıyor mu?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Cildinizi Analiz Edin
        </h2>
        <p className="text-gray-500 max-w-md">
          Yüz fotoğrafınızı yükleyin, yapay zeka cilt tipinizi ve problemlerinizi
          tespit edip kişiselleştirilmiş ürün önerileri sunsun.
        </p>
      </div>

      {/* Upload alanı */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) {
            inputRef.current.files = e.dataTransfer.files
            handleFile(file)
          }
        }}
        className="w-full max-w-md h-72 border-2 border-dashed border-rose-200 rounded-2xl
                   flex flex-col items-center justify-center gap-4 cursor-pointer
                   hover:border-rose-400 hover:bg-rose-50/50 transition-all"
      >
        {preview ? (
          <img src={preview} alt="preview" className="h-full w-full object-cover rounded-2xl" />
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl">
              📷
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-700">Fotoğraf yükle</p>
              <p className="text-sm text-gray-400">veya sürükle bırak</p>
            </div>
            <p className="text-xs text-gray-400">JPG, PNG — max 10MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {preview && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => { setPreview(null); inputRef.current.value = "" }}
          >
            Temizle
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-gradient-to-r from-rose-500 to-purple-500 text-white px-8"
          >
            {loading ? "Analiz ediliyor..." : "Analiz Et"}
          </Button>
        </div>
      )}

      {/* Özellikler */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4">
        {[
          { icon: "🔍", title: "Cilt Tipi", desc: "Kuru / Normal / Yağlı" },
          { icon: "⚠️", title: "Problemler", desc: "8 farklı sorun tespiti" },
          { icon: "💄", title: "Ürün Önerisi", desc: "Kişiselleştirilmiş" },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
            <div className="text-2xl mb-2">{f.icon}</div>
            <p className="font-medium text-sm text-gray-800">{f.title}</p>
            <p className="text-xs text-gray-400 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}