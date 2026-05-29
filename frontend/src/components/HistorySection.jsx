import { useMemo } from "react"

const SKIN_TYPE_TR = { dry: "Kuru", normal: "Normal", oily: "Yağlı" }
const SKIN_TYPE_GRADIENT = {
  dry:    "linear-gradient(135deg,#3b82f6,#06b6d4)",
  normal: "linear-gradient(135deg,#10b981,#14b8a6)",
  oily:   "linear-gradient(135deg,#f43f5e,#a855f7)",
}

// ── Mini SVG çizgi grafik ─────────────────────────────────────
function ScoreChart({ history }) {
  const data = useMemo(() => {
    return [...history].reverse().map((entry, i) => ({
      index: i,
      score: Math.round(entry.result?.skin?.skin_score || 0),
      date:  entry.date,
    }))
  }, [history])

  if (data.length < 2) return (
    <div className="flex items-center justify-center h-full"
      style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
      En az 2 analiz gerekli
    </div>
  )

  const W = 560, H = 140
  const PAD = { top: 16, right: 20, bottom: 32, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const scores = data.map(d => d.score)
  const minS = Math.max(0,  Math.min(...scores) - 10)
  const maxS = Math.min(100, Math.max(...scores) + 10)

  const xScale = (i) => PAD.left + (i / (data.length - 1)) * innerW
  const yScale = (s) => PAD.top + innerH - ((s - minS) / (maxS - minS)) * innerH

  // Polyline noktaları
  const points = data.map(d => `${xScale(d.index)},${yScale(d.score)}`).join(" ")

  // Gradient alan için path
  const areaPath = [
    `M ${xScale(0)} ${yScale(data[0].score)}`,
    ...data.slice(1).map(d => `L ${xScale(d.index)} ${yScale(d.score)}`),
    `L ${xScale(data.length - 1)} ${PAD.top + innerH}`,
    `L ${xScale(0)} ${PAD.top + innerH}`,
    "Z"
  ].join(" ")

  // Y ekseni çizgileri
  const yTicks = [minS, Math.round((minS + maxS) / 2), maxS].map(v => Math.round(v))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f43f5e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* Y ekseni yardımcı çizgiler */}
      {yTicks.map(tick => (
        <g key={tick}>
          <line
            x1={PAD.left} y1={yScale(tick)}
            x2={PAD.left + innerW} y2={yScale(tick)}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1"
          />
          <text x={PAD.left - 6} y={yScale(tick) + 4}
            textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="10">
            {tick}
          </text>
        </g>
      ))}

      {/* Alan dolgusu */}
      <path d={areaPath} fill="url(#chartGrad)" />

      {/* Çizgi */}
      <polyline
        points={points}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Noktalar + tarih etiketleri */}
      {data.map((d, i) => {
        const x = xScale(i), y = yScale(d.score)
        const scoreColor = d.score >= 70 ? "#10b981" : d.score >= 45 ? "#f59e0b" : "#f43f5e"
        return (
          <g key={i}>
            {/* Nokta */}
            <circle cx={x} cy={y} r="5" fill="#0f0c29" stroke={scoreColor} strokeWidth="2.5" />
            <circle cx={x} cy={y} r="2.5" fill={scoreColor} />

            {/* Skor etiketi */}
            <text x={x} y={y - 10} textAnchor="middle"
              fill="white" fontSize="11" fontWeight="600">
              {d.score}
            </text>

            {/* Tarih etiketi (alt) */}
            <text
              x={x} y={PAD.top + innerH + 18}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)" fontSize="9"
              style={{ maxWidth: 60 }}>
              {d.date?.split(" ")[0]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Trend badge ───────────────────────────────────────────────
function TrendBadge({ history }) {
  if (history.length < 2) return null
  const latest = Math.round(history[0]?.result?.skin?.skin_score || 0)
  const prev   = Math.round(history[1]?.result?.skin?.skin_score || 0)
  const diff   = latest - prev

  if (diff === 0) return (
    <span className="px-2 py-1 rounded-full text-xs font-semibold"
      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
      → Değişmedi
    </span>
  )
  return (
    <span className="px-2 py-1 rounded-full text-xs font-semibold"
      style={{
        background: diff > 0 ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
        color: diff > 0 ? "#6ee7b7" : "#fda4af",
        border: `1px solid ${diff > 0 ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
      }}>
      {diff > 0 ? `↑ +${diff} iyileşme` : `↓ ${diff} gerileme`}
    </span>
  )
}

// ── Ana bileşen ───────────────────────────────────────────────
export default function HistorySection({ history, onSelect, onClear }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          🕐
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Henüz analiz yok</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, maxWidth: 300, margin: "0 auto", lineHeight: 1.7 }}>
            Bir fotoğraf analiz ettiğinizde sonuçlar burada görünecek. Son 5 analiz saklanır.
          </p>
        </div>
      </div>
    )
  }

  const avgScore = Math.round(history.reduce((s, e) => s + (e.result?.skin?.skin_score || 0), 0) / history.length)
  const bestScore = Math.round(Math.max(...history.map(e => e.result?.skin?.skin_score || 0)))

  return (
    <div className="space-y-6">

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-3xl font-bold text-white">Analiz Geçmişi</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>Son {history.length} analiz</p>
          </div>
          <TrendBadge history={history} />
        </div>
        <button onClick={onClear}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fda4af" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.2)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(244,63,94,0.1)"}>
          Geçmişi Temizle
        </button>
      </div>

      {/* Özet metrikler */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Toplam Analiz", value: history.length, sub: "kayıt" },
          { label: "Ortalama Skor", value: avgScore, sub: "/100" },
          { label: "En İyi Skor",   value: bestScore, sub: "/100" },
        ].map(m => (
          <div key={m.label} className="p-4 rounded-2xl text-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{m.label}</p>
            <p className="text-3xl font-bold text-white">{m.value}
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}> {m.sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Grafik */}
      {history.length >= 2 && (
        <div className="p-5 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">📈 Cilt Skoru Takibi</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Kronolojik sıra</p>
          </div>
          <ScoreChart history={history} />
        </div>
      )}

      {/* Analiz kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((entry, i) => {
          const skinType = entry.result?.skin_type?.prediction
          const score    = Math.round(entry.result?.skin?.skin_score || 0)
          const problems = entry.result?.problems || []
          const scoreColor = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#f43f5e"

          return (
            <div key={entry.id} onClick={() => onSelect(entry)}
              className="overflow-hidden cursor-pointer group transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={e => { e.currentTarget.style.border = "1px solid rgba(244,63,94,0.3)"; e.currentTarget.style.transform = "translateY(-2px)" }}
              onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(0)" }}>

              {/* Fotoğraf */}
              <div className="relative h-44 overflow-hidden">
                <img src={entry.preview} alt={`Analiz ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(15,12,41,0.85),transparent)" }} />

                {/* Skor overlay */}
                <div className="absolute bottom-3 left-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold" style={{ color: scoreColor, textShadow: `0 0 12px ${scoreColor}` }}>{score}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>/100</span>
                </div>

                {/* Cilt tipi badge */}
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: SKIN_TYPE_GRADIENT[skinType] || "linear-gradient(135deg,#f43f5e,#a855f7)" }}>
                    {SKIN_TYPE_TR[skinType] || skinType || "—"}
                  </span>
                </div>

                {i === 0 && (
                  <div className="absolute top-3 left-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(244,63,94,0.85)", color: "white" }}>En son</span>
                  </div>
                )}
              </div>

              {/* Alt bilgi */}
              <div className="p-4">
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{entry.date}</p>
                {problems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {problems.slice(0, 3).map(p => (
                      <span key={p.label} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                        {p.label}
                      </span>
                    ))}
                    {problems.length > 3 && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", alignSelf: "center" }}>+{problems.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#10b981" }}>✨ Sorun tespit edilmedi</p>
                )}
                <p className="mt-3 text-xs font-medium opacity-60 group-hover:opacity-100 transition-all"
                  style={{ color: "#f9a8d4" }}>
                  Sonuçları görüntüle →
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
