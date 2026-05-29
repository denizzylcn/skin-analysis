import { useState } from "react"

const SKIN_TYPE_TR   = { dry: "Kuru", normal: "Normal", oily: "Yağlı" }
const OILINESS_TR    = { low: "Düşük", medium: "Orta", high: "Yüksek", very_high: "Çok Yüksek" }
const PROBLEM_TR     = {
  acne: "Akne", bags: "Göz Altı Torbası", blackhead: "Siyah Nokta",
  "cilt lekesi": "Cilt Lekesi", "dark spot": "Koyu Nokta",
  gözenek: "Gözenek", redness: "Kızarıklık", wrinkle: "Kırışıklık",
}
const PROBLEM_ICON   = {
  acne: "🔴", bags: "👁️", blackhead: "⚫", "cilt lekesi": "🟤",
  "dark spot": "🟫", gözenek: "🔵", redness: "🟠", wrinkle: "〰️",
}
const SKIN_TYPE_GRADIENT = {
  dry:    "linear-gradient(135deg,#3b82f6,#06b6d4)",
  normal: "linear-gradient(135deg,#10b981,#14b8a6)",
  oily:   "linear-gradient(135deg,#f43f5e,#a855f7)",
}

// ── Bakım rutini üreteci ──────────────────────────────────────
function buildRoutine(skinType, problems) {
  const has = (p) => problems.includes(p)

  const STEPS = {
    morning: [
      {
        step: 1, icon: "💧", title: "Temizleyici",
        dry:    "Köpüksüz, nemlendirici temizleyici (CeraVe Hydrating Cleanser)",
        normal: "Hafif jel temizleyici (Cetaphil Gentle Skin Cleanser)",
        oily:   "Yağ dengeleyici köpük temizleyici (La Roche-Posay Effaclar Foaming Gel)",
        note: has("acne") ? "⚠️ Salisilik asit içeren tercih edin" : null,
      },
      {
        step: 2, icon: "🧴", title: "Tonik",
        dry:    "Alkol içermeyen nemlendirici tonik (Pyunkang Yul Essence Toner)",
        normal: "Dengeleyici tonik (Klairs Supple Preparation Toner)",
        oily:   "Gözenek sıkılaştırıcı tonik (Paula's Choice 2% BHA)",
        note: has("gözenek") ? "⚠️ BHA içeren tonik tercih edin" : null,
      },
      {
        step: 3, icon: "✨", title: "Serum",
        dry:    "Hyaluronik asit serumu (The Ordinary HA 2%)",
        normal: "C vitamini serumu (Skinceuticals CE Ferulic)",
        oily:   "Niacinamide %10 serumu (The Ordinary Niacinamide)",
        note: has("dark spot") || has("cilt lekesi") ? "⚠️ C vitamini veya Arbutin ekleyin" : null,
      },
      {
        step: 4, icon: "💦", title: "Nemlendirici",
        dry:    "Yoğun nemlendirici krem (CeraVe Moisturizing Cream)",
        normal: "Hafif losyon (Neutrogena Hydro Boost)",
        oily:   "Yağsız, hafif jel nemlendirici (Clinique Dramatically Different Gel)",
        note: null,
      },
      {
        step: 5, icon: "☀️", title: "Güneş Kremi (SPF 50+)",
        dry:    "Kremsi SPF (EltaMD UV Elements SPF 44)",
        normal: "Günlük SPF (Altruist SPF 50)",
        oily:   "Mat SPF jel (La Roche-Posay Anthelios Dry Touch SPF 50)",
        note: "⚠️ Güneş kremi asla atlanmamalı!",
      },
    ],
    evening: [
      {
        step: 1, icon: "🌙", title: "Makyaj Temizleme",
        dry:    "Misel su veya temizleyici yağ (Bioderma Sensibio H2O)",
        normal: "Misel su (Garnier Micellar Water)",
        oily:   "Yağ bazlı çift temizleme (DHC Deep Cleansing Oil)",
        note: null,
      },
      {
        step: 2, icon: "💧", title: "İkinci Temizleyici",
        dry:    "Yumuşak köpüksüz temizleyici",
        normal: "Hafif jel temizleyici",
        oily:   "Salisilik asit temizleyici",
        note: has("blackhead") ? "⚠️ Haftalık 2x enzim peeling ekleyin" : null,
      },
      {
        step: 3, icon: "🔬", title: "Aktif Bileşen",
        dry:    has("wrinkle") ? "Retinol %0.25 (düşük konsantrasyon ile başlayın)" : "Peptit serumu",
        normal: has("wrinkle") ? "Retinol %0.5" : "AHA %5 (The Ordinary Glycolic Acid)",
        oily:   has("acne") ? "Benzoil peroksit %2.5 veya Salisilik asit" : "Niacinamide serum",
        note: "⚠️ Retinol kullanıyorsanız sabah mutlaka SPF kullanın",
      },
      {
        step: 4, icon: "👁️", title: "Göz Kremi",
        dry:    "Besleyici göz kremi (Kiehl's Creamy Eye Treatment)",
        normal: "Hafif göz jeli",
        oily:   has("bags") ? "Kafeinli göz kremi (The Ordinary Caffeine Solution)" : "Hafif göz serumu",
        note: has("bags") ? "⚠️ Sabah soğuk kompres ekleyin" : null,
      },
      {
        step: 5, icon: "🌛", title: "Gece Kremi",
        dry:    "Yoğun gece kremi (Laneige Water Sleeping Mask)",
        normal: "Hafif gece losyonu",
        oily:   "Yağsız gece jeli veya nemlendirici",
        note: null,
      },
    ],
  }

  return STEPS
}

// ── Akıllı cilt skoru hesaplama ──────────────────────────────
function calculateSkinScore(problems, lesion, skinType) {
  let score = 100

  // Problem ağırlıkları — ciddi problemler daha fazla düşürür
  const WEIGHTS = {
    acne:          18,
    bags:          10,
    blackhead:     10,
    "cilt lekesi": 12,
    "dark spot":   12,
    gözenek:        8,
    redness:       14,
    wrinkle:       14,
  }

  // Her problem confidence × ağırlık kadar düşür
  for (const p of (problems || [])) {
    const w = WEIGHTS[p.label] || 10
    score -= w * p.confidence
  }

  // Lezyon risk cezası
  for (const l of (lesion || [])) {
    if (l.risk === "yüksek") score -= 15 * l.confidence
    else if (l.risk === "orta") score -= 8 * l.confidence
  }

  // Cilt tipi bonusu/cezası
  if (skinType === "normal") score += 3
  if (skinType === "oily")   score -= 4

  return Math.min(100, Math.max(0, Math.round(score)))
}

// ── Glass style ───────────────────────────────────────────────
const glass = (extra = {}) => ({
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: 20,
  ...extra,
})

// ── PDF indirme ───────────────────────────────────────────────
function downloadPDF({ result, preview, date }) {
  const { skin_type, problems, recommendations, skin } = result
  const skinScore = calculateSkinScore(problems, result.lesion, skin_type?.prediction)
  const skinTypeLabel = SKIN_TYPE_TR[skin_type?.prediction] || skin_type?.prediction || "-"
  const oilLabel = OILINESS_TR[skin?.oiliness_level] || skin?.oiliness_level || "-"
  const problemsHtml = (problems || []).map(p =>
    `<tr><td>${PROBLEM_ICON[p.label] || "⚪"} ${PROBLEM_TR[p.label] || p.label}</td><td>%${Math.round(p.confidence * 100)}</td></tr>`
  ).join("")
  const productsHtml = (recommendations || []).map(r =>
    `<tr><td><strong>${r.Name}</strong><br><small>${r.Brand}</small></td><td>${r.Label}</td><td>$${r.Price}</td><td>⭐ ${r.Rank}</td></tr>`
  ).join("")

  const routine = buildRoutine(skin_type?.prediction, (problems || []).map(p => p.label))
  const routineHtml = (steps, label) => `
    <h3 style="color:#f43f5e;margin:12px 0 8px">${label}</h3>
    ${steps.map(s => `
      <div style="display:flex;gap:10px;margin-bottom:8px;padding:8px;background:#f9fafb;border-radius:8px">
        <span>${s.icon}</span>
        <div>
          <strong>${s.step}. ${s.title}</strong><br>
          <span style="font-size:12px;color:#374151">${s[skin_type?.prediction] || s.dry}</span>
          ${s.note ? `<br><span style="font-size:11px;color:#ef4444">${s.note}</span>` : ""}
        </div>
      </div>`).join("")}`

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/>
<title>SkinAI Analiz Raporu</title>
<style>
  body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#1a1a1a}
  h1{background:linear-gradient(135deg,#f43f5e,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .subtitle{color:#6b7280;font-size:13px;margin-bottom:24px}
  .section{margin-bottom:24px}
  h2{font-size:15px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px}
  .metric-row{display:flex;gap:16px;margin-bottom:16px}
  .metric{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;flex:1}
  .metric .label{font-size:11px;color:#6b7280}
  .metric .val{font-size:22px;font-weight:bold;margin:2px 0}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f3f4f6;text-align:left;padding:8px 10px;font-size:12px}
  td{padding:7px 10px;border-bottom:1px solid #f3f4f6}
  .footer{margin-top:32px;font-size:11px;color:#9ca3af;text-align:center}
</style></head><body>
<h1>✦ SkinAI Analiz Raporu</h1>
<p class="subtitle">Oluşturulma tarihi: ${date}</p>
<div class="section"><h2>Özet Metrikler</h2>
<div class="metric-row">
  <div class="metric"><div class="label">Cilt Tipi</div><div class="val">${skinTypeLabel}</div><div class="label">%${Math.round((skin_type?.confidence||0)*100)} güven</div></div>
  <div class="metric"><div class="label">Cilt Skoru</div><div class="val">${skinScore}/100</div></div>
  <div class="metric"><div class="label">Yağlılık</div><div class="val" style="font-size:16px;margin-top:4px">${oilLabel}</div></div>
</div></div>
<div class="section"><h2>Tespit Edilen Sorunlar</h2>
<table><tr><th>Sorun</th><th>Güven</th></tr>${problemsHtml || "<tr><td colspan='2'>Belirgin sorun tespit edilmedi</td></tr>"}</table></div>
<div class="section"><h2>Önerilen Ürünler</h2>
<table><tr><th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>Puan</th></tr>${productsHtml}</table></div>
<div class="section"><h2>Kişiselleştirilmiş Bakım Rutini</h2>
${routineHtml(routine.morning, "🌅 Sabah Rutini")}
${routineHtml(routine.evening, "🌙 Akşam Rutini")}
</div>
<div class="footer">SkinAI — Akıllı Cilt Analizi | Bu rapor bilgilendirme amaçlıdır, tıbbi tavsiye niteliği taşımaz.</div>
</body></html>`

  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `skinai-rapor-${Date.now()}.html` })
  a.click(); URL.revokeObjectURL(a.href)
}

// ── NoFace ────────────────────────────────────────────────────
function NoFaceCard({ onReset }) {
  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
        style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>😕</div>
      <div>
        <h2 className="text-3xl font-bold text-white mb-3">Yüz Tespit Edilemedi</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: 380, margin: "0 auto", lineHeight: 1.7, fontSize: 14 }}>
          Fotoğrafta net bir yüz bulunamadı. İyi aydınlatılmış, yüzünüzün tam göründüğü bir fotoğraf yükleyin.
        </p>
      </div>
      <div className="w-full max-w-xs p-4 rounded-2xl space-y-2 text-left"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-sm font-semibold text-white mb-3">İpuçları</p>
        {["Yüzünüz fotoğrafın merkezinde olsun","İyi aydınlatılmış ortamda çekin","Gözlük veya maske takmayın","Düz bir açıdan bakın"].map(t => (
          <p key={t} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>✓ {t}</p>
        ))}
      </div>
      <button onClick={onReset} className="px-8 py-3 rounded-2xl text-white font-bold text-sm"
        style={{ background: "linear-gradient(135deg,#f43f5e,#a855f7)", boxShadow: "0 0 25px rgba(244,63,94,0.4)" }}>
        Tekrar Dene
      </button>
    </div>
  )
}

// ── Skor halkası ──────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 54, circ = 2 * Math.PI * r
  const pct = Math.round(score)
  const offset = circ - (pct / 100) * circ
  const color = pct >= 70 ? "#10b981" : pct >= 45 ? "#f59e0b" : "#f43f5e"
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 8px ${color})` }} />
        <text x="65" y="60" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">{pct}</text>
        <text x="65" y="78" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="12">/100</text>
      </svg>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Cilt Skoru</p>
    </div>
  )
}

// ── Bakım rutini bileşeni ─────────────────────────────────────
function RoutineTab({ skinType, problems }) {
  const [period, setPeriod] = useState("morning")
  const problemLabels = problems.map(p => p.label)
  const routine = buildRoutine(skinType, problemLabels)
  const steps = routine[period]

  return (
    <div style={glass({ padding: 0, overflow: "hidden" })}>
      {/* Sabah / Akşam toggle */}
      <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {[
          { key: "morning", label: "🌅 Sabah Rutini" },
          { key: "evening", label: "🌙 Akşam Rutini" },
        ].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className="flex-1 py-3.5 text-sm font-semibold transition-all"
            style={{
              background: period === p.key ? "linear-gradient(135deg,rgba(244,63,94,0.2),rgba(168,85,247,0.2))" : "transparent",
              color: period === p.key ? "white" : "rgba(255,255,255,0.4)",
              borderBottom: period === p.key ? "2px solid #f43f5e" : "2px solid transparent",
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Adımlar */}
      <div className="p-5 space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-4 p-4 rounded-2xl transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Adım numarası */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.2)" }}>
                {s.icon}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 8, background: "rgba(255,255,255,0.08)" }} />
              )}
            </div>
            {/* İçerik */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>ADIM {s.step}</span>
              </div>
              <p className="text-sm font-bold text-white mb-1">{s.title}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                {s[skinType] || s.dry}
              </p>
              {s.note && (
                <div className="mt-2 flex items-start gap-1.5 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <p style={{ fontSize: 12, color: "#fbbf24", lineHeight: 1.5 }}>{s.note}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Dipnot */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 8 }}>
          Bu öneriler analiz sonuçlarına göre kişiselleştirilmiştir. Dermatolog tavsiyesi değildir.
        </p>
      </div>
    </div>
  )
}


// ── Yüz bölge haritası ───────────────────────────────────────
const REGION_PROBLEMS = {
  forehead:   ["acne", "blackhead", "gozetek", "wrinkle"],
  nose:       ["blackhead", "gozetek", "redness"],
  leftCheek:  ["acne", "redness", "cilt lekesi", "dark spot"],
  rightCheek: ["acne", "redness", "cilt lekesi", "dark spot"],
  chin:       ["acne", "blackhead"],
  eyeLeft:    ["bags", "wrinkle"],
  eyeRight:   ["bags", "wrinkle"],
}
const normalizeLabel = (l) => l === "gözenek" ? "gozetek" : l

const REGION_TIPS = {
  forehead: {
    desc: "Alın bölgesi aşırı yağlanma ve tıkalı gözeneklere eğilimlidir.",
    tip:  "Salisilik asit veya BHA içeren ürünler kullanın.",
  },
  nose: {
    desc: "Burun T-bölgesinin en yağlı kısmıdır, siyah noktalara zemin hazırlar.",
    tip:  "Haftalık kil maskesi ve gözenek sıkılaştırıcı tonik uygulayın.",
  },
  leftCheek: {
    desc: "Sol yanak leke ve kızarıklığa hassas bir bölgedir.",
    tip:  "Niacinamide veya C vitamini içeren aydınlatıcı serum tercih edin.",
  },
  rightCheek: {
    desc: "Sağ yanak leke ve kızarıklığa hassas bir bölgedir.",
    tip:  "Centella asiatica veya aloe vera içeren sakinleştirici ürünler kullanın.",
  },
  chin: {
    desc: "Çene hormonal akneye en yatkın bölgedir.",
    tip:  "Benzoil peroksit veya salisilik asit içeren noktasal tedavi uygulayın.",
  },
  eyeLeft: {
    desc: "Sol göz altı bölgesi ince deri yapısı nedeniyle torbalanmaya eğilimlidir.",
    tip:  "Kafein içeren göz kremi kullanın, sabahları soğuk kompres yapın.",
  },
  eyeRight: {
    desc: "Sağ göz altı bölgesi ince deri yapısı nedeniyle torbalanmaya eğilimlidir.",
    tip:  "Kafein içeren göz kremi kullanın, uyku düzeninize dikkat edin.",
  },
}
const REGION_LABEL = {
  forehead:"Alın", nose:"Burun", leftCheek:"Sol Yanak",
  rightCheek:"Sağ Yanak", chin:"Çene", eyeLeft:"Sol Göz Altı", eyeRight:"Sağ Göz Altı",
}
function FaceMap({ problems }) {
  const [hovered, setHovered] = useState(null)
  const activeLabels = problems.map(p => normalizeLabel(p.label))
  const regionScore = (region) => {
    const m = REGION_PROBLEMS[region].filter(p => activeLabels.includes(p))
    return m.length / REGION_PROBLEMS[region].length
  }
  const regionColor = (region) => {
    const s = regionScore(region)
    if (s === 0) return "rgba(255,255,255,0.06)"
    if (s < 0.34) return "rgba(251,191,36,0.35)"
    if (s < 0.67) return "rgba(249,115,22,0.45)"
    return "rgba(244,63,94,0.6)"
  }
  const regionActive = (region) =>
    REGION_PROBLEMS[region].filter(p => activeLabels.includes(p))
      .map(p => p === "gozetek" ? "gözenek" : p)
  const regions = [
    { key:"forehead",   cx:100, cy:68,  rx:52, ry:22, label:"Alin" },
    { key:"eyeLeft",    cx:72,  cy:105, rx:18, ry:9,  label:"Sol Goz" },
    { key:"eyeRight",   cx:128, cy:105, rx:18, ry:9,  label:"Sag Goz" },
    { key:"nose",       cx:100, cy:138, rx:18, ry:22, label:"Burun" },
    { key:"leftCheek",  cx:60,  cy:148, rx:24, ry:28, label:"Sol" },
    { key:"rightCheek", cx:140, cy:148, rx:24, ry:28, label:"Sag" },
    { key:"chin",       cx:100, cy:196, rx:36, ry:18, label:"Cene" },
  ]
  return (
    <div style={glass({ padding: 20 })}>
      <div className="flex gap-6 items-start flex-wrap">
        <div className="flex-shrink-0">
          <svg width="200" height="240" viewBox="0 0 200 240">
            <ellipse cx="100" cy="125" rx="72" ry="88"
              fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
            {regions.map(r => (
              <g key={r.key}>
                <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
                  fill={regionColor(r.key)}
                  stroke={hovered===r.key ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.08)"}
                  strokeWidth={hovered===r.key ? 2 : 1}
                  style={{ cursor:"pointer", transition:"all 0.25s" }}
                  onMouseEnter={() => setHovered(r.key)}
                  onMouseLeave={() => setHovered(null)}/>
                <text x={r.cx} y={r.cy+4} textAnchor="middle"
                  style={{ fontSize:9, fill:"rgba(255,255,255,0.6)", pointerEvents:"none", userSelect:"none" }}>
                  {r.label}
                </text>
              </g>
            ))}
          </svg>
          <div className="flex items-center gap-2 mt-2 justify-center">
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>Temiz</span>
            {["rgba(255,255,255,0.06)","rgba(251,191,36,0.35)","rgba(249,115,22,0.45)","rgba(244,63,94,0.6)"].map((c,i)=>(
              <div key={i} style={{ width:14, height:8, borderRadius:3, background:c, border:"1px solid rgba(255,255,255,0.1)" }}/>
            ))}
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>Yogun</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-bold text-white mb-1">Bolge Detaylari</p>
          {activeLabels.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-center">
              <span className="text-3xl">ok</span>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>Tum bolgeler temiz!</p>
            </div>
          ) : Object.keys(REGION_PROBLEMS).map(region => {
            const active = regionActive(region)
            const score  = regionScore(region)
            const isHov  = hovered === region
            if (active.length === 0) return null
            const dotColor = score < 0.34 ? "#fbbf24" : score < 0.67 ? "#f97316" : "#f43f5e"
            return (
              <div key={region}
                className="px-3 py-2.5 rounded-xl transition-all cursor-pointer"
                style={{
                  background: isHov ? "rgba(244,63,94,0.1)" : "rgba(255,255,255,0.04)",
                  border: isHov ? "1px solid rgba(244,63,94,0.3)" : "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={() => setHovered(region)}
                onMouseLeave={() => setHovered(null)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">{REGION_LABEL[region]}</span>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width:6, height:6, borderRadius:"50%",
                        background: i < Math.ceil(score*3) ? dotColor : "rgba(255,255,255,0.1)" }}/>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {active.map(p => (
                    <span key={p} style={{ fontSize:10, padding:"1px 7px", borderRadius:10,
                      background:"rgba(244,63,94,0.15)", border:"1px solid rgba(244,63,94,0.25)", color:"#fda4af" }}>
                      {PROBLEM_TR[p]||p}
                    </span>
                  ))}
                </div>
                {REGION_TIPS[region] && (
                  <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:8, marginTop:4 }}>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1.5, marginBottom:4 }}>
                      {REGION_TIPS[region].desc}
                    </p>
                    <p style={{ fontSize:11, color:"#fbbf24", lineHeight:1.5 }}>
                      💡 {REGION_TIPS[region].tip}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Ana bileşen ───────────────────────────────────────────────
export default function ResultSection({ result, preview, onReset }) {
  const [activeTab, setActiveTab] = useState("problems")
  if (result.status === "no_face") return <NoFaceCard onReset={onReset} />

  const { skin_type, problems, problem_summary, recommendations, skin } = result
  const skinTypeKey = skin_type?.prediction
  const skinScore   = calculateSkinScore(problems, result.lesion, skinTypeKey)
  const confidence  = Math.round((skin_type?.confidence || 0) * 100)
  const oilLabel    = OILINESS_TR[skin?.oiliness_level] || skin?.oiliness_level || "—"
  const brightness  = skin?.brightness_mean?.toFixed(0) || "—"
  const reportDate  = new Date().toLocaleString("tr-TR")

  const tabs = [
    { key: "problems",        label: "Sorunlar",       badge: problems?.length > 0 ? problems.length : null },
    { key: "recommendations", label: "Ürünler",         badge: recommendations?.length || null },
    { key: "routine",         label: "Bakım Rutini",    badge: "Yeni" },
    { key: "facemap",         label: "Yüz Haritası",    badge: "Yeni" },
    { key: "lesion",          label: "Lezyon",          badge: null },
  ]

  return (
    <div className="space-y-6">
      {/* Üst bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Analiz Sonuçları</h2>
          {problem_summary && (
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>{problem_summary}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => downloadPDF({ result, preview, date: reportDate })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(244,63,94,0.15)"}>
            ⬇ PDF
          </button>
          <button onClick={onReset}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
            Yeni Analiz
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Sol kolon */}
        <div className="space-y-4">
          {/* Fotoğraf */}
          <div style={{ ...glass(), padding: 0, overflow: "hidden" }}>
            <img src={preview} alt="analiz" className="w-full object-cover" style={{ maxHeight: 240 }} />
            <div className="px-4 py-3 flex items-center justify-between">
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Cilt Tipi</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: SKIN_TYPE_GRADIENT[skinTypeKey] || "linear-gradient(135deg,#f43f5e,#a855f7)" }}>
                {SKIN_TYPE_TR[skinTypeKey] || skinTypeKey}
              </span>
            </div>
            <div className="px-4 pb-4">
              <div className="flex justify-between mb-1" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                <span>Güven</span><span>%{confidence}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${confidence}%`, background: SKIN_TYPE_GRADIENT[skinTypeKey] || "linear-gradient(135deg,#f43f5e,#a855f7)" }} />
              </div>
            </div>
          </div>

          {/* Skor */}
          <div className="flex flex-col items-center py-4" style={glass()}>
            <ScoreRing score={skinScore} />
          </div>

          {/* Yağlılık + Parlaklık */}
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "Yağlılık", value: oilLabel }, { label: "Parlaklık", value: brightness }].map(m => (
              <div key={m.label} className="p-3 rounded-2xl text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{m.label}</p>
                <p className="font-semibold text-white text-sm">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ kolon — sekmeler */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: activeTab === tab.key ? "linear-gradient(135deg,#f43f5e,#a855f7)" : "transparent",
                  color: activeTab === tab.key ? "white" : "rgba(255,255,255,0.4)",
                  boxShadow: activeTab === tab.key ? "0 0 15px rgba(244,63,94,0.3)" : "none",
                }}>
                {tab.label}
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: typeof tab.badge === "number" ? "rgba(255,255,255,0.2)"
                        : tab.badge === "Yeni" ? "rgba(16,185,129,0.3)" : "rgba(251,191,36,0.2)",
                      color: typeof tab.badge === "number" ? "white"
                        : tab.badge === "Yeni" ? "#6ee7b7" : "#fbbf24",
                    }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sorunlar */}
          {activeTab === "problems" && (
            <div className="flex-1 p-5 rounded-2xl space-y-4" style={glass()}>
              {problems && problems.length > 0 ? problems.map(p => (
                <div key={p.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PROBLEM_ICON[p.label] || "⚪"}</span>
                      <span className="text-sm font-semibold text-white">{PROBLEM_TR[p.label] || p.label}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#f9a8d4" }}>%{Math.round(p.confidence * 100)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${p.confidence * 100}%`, background: "linear-gradient(90deg,#f43f5e,#a855f7)" }} />
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center py-12 gap-3">
                  <span className="text-5xl">✨</span>
                  <p className="font-semibold text-white">Belirgin sorun tespit edilmedi</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Cildiniz harika görünüyor!</p>
                </div>
              )}
            </div>
          )}

          {/* Ürünler */}
          {activeTab === "recommendations" && (
            <div className="flex-1 p-5 rounded-2xl space-y-4" style={glass()}>
              {(recommendations || []).length > 0 ? recommendations.map((r, i) => (
                <div key={i}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.2)" }}>
                        💄
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{r.Name}</p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{r.Brand}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                            {r.Label}
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>⭐ {r.Rank}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-lg font-bold flex-shrink-0" style={{ color: "#fb7185" }}>${r.Price}</span>
                  </div>
                  {i < recommendations.length - 1 && (
                    <div className="mt-4" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                  )}
                </div>
              )) : (
                <p className="text-center py-8" style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Ürün önerisi bulunamadı.</p>
              )}
            </div>
          )}

          {/* Bakım Rutini */}
          {activeTab === "routine" && (
            <RoutineTab skinType={skinTypeKey} problems={problems || []} />
          )}

          {/* Yüz Haritası */}
          {activeTab === "facemap" && (
            <FaceMap problems={problems || []} />
          )}

          {/* Lezyon */}
          {activeTab === "lesion" && (
            <div className="flex-1 p-5 rounded-2xl" style={glass()}>
              {(!result.lesion || result.lesion.length === 0) ? (
                <div className="flex flex-col items-center py-10 gap-4 text-center">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>✅</div>
                  <div>
                    <p className="text-lg font-bold text-white">Belirgin Lezyon Tespit Edilmedi</p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6, lineHeight: 1.7 }}>
                      HAM10000 modeli herhangi bir cilt lezyonu tespit etmedi.
                    </p>
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                    Bu sonuç tıbbi teşhis niteliği taşımaz.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-white mb-2">Lezyon Analizi Sonuçları</p>
                  {result.lesion.map((l, i) => {
                    const riskColor = l.risk === "yüksek" ? "#f43f5e" : l.risk === "orta" ? "#f59e0b" : "#10b981"
                    const riskBg    = l.risk === "yüksek" ? "rgba(244,63,94,0.1)" : l.risk === "orta" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)"
                    return (
                      <div key={i} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{l.label}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: riskBg, color: riskColor, border: `1px solid ${riskColor}44` }}>
                              {l.risk} risk
                            </span>
                          </div>
                          <span className="text-sm font-bold" style={{ color: "#f9a8d4" }}>
                            %{Math.round(l.confidence * 100)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${l.confidence * 100}%`, background: `linear-gradient(90deg, ${riskColor}, ${riskColor}88)` }} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="mt-3 p-3 rounded-xl flex items-start gap-2"
                    style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
                    <span>⚠️</span>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                      Bu sonuçlar bilgilendirme amaçlıdır. Yüksek riskli tespitlerde bir dermatoloğa başvurmanız önerilir.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
