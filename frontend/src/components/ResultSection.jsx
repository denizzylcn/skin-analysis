import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

const SKIN_TYPE_TR = { dry: "Kuru", normal: "Normal", oily: "Yağlı" }
const PROBLEM_TR = {
  acne: "Akne", bags: "Göz Altı Torbası", blackhead: "Siyah Nokta",
  "cilt lekesi": "Cilt Lekesi", "dark spot": "Koyu Nokta",
  gözenek: "Gözenek", redness: "Kızarıklık", wrinkle: "Kırışıklık",
}
const PROBLEM_ICON = {
  acne: "🔴", bags: "👁️", blackhead: "⚫", "cilt lekesi": "🟤",
  "dark spot": "🟫", gözenek: "🔵", redness: "🟠", wrinkle: "〰️",
}

export default function ResultSection({ result, preview, onReset }) {
  if (result.status === "no_face") {
    return (
      <div className="flex flex-col items-center gap-6 py-20">
        <div className="text-6xl">😕</div>
        <h2 className="text-2xl font-bold text-gray-800">Yüz Tespit Edilemedi</h2>
        <p className="text-gray-500">Lütfen net bir yüz fotoğrafı yükleyin.</p>
        <Button onClick={onReset}>Tekrar Dene</Button>
      </div>
    )
  }

  const { skin_type, problems, problem_summary, recommendations, skin } = result

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analiz Sonuçları</h2>
          <p className="text-gray-500 text-sm mt-1">{problem_summary}</p>
        </div>
        <Button variant="outline" onClick={onReset}>Yeni Analiz</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Sol: Fotoğraf + Cilt Tipi */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <img src={preview} alt="analiz" className="w-full h-52 object-cover" />
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Cilt Tipi</span>
                <Badge className="bg-gradient-to-r from-rose-500 to-purple-500 text-white text-sm px-3">
                  {SKIN_TYPE_TR[skin_type?.prediction] || skin_type?.prediction}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Güven</span>
                  <span>{Math.round((skin_type?.confidence || 0) * 100)}%</span>
                </div>
                <Progress value={(skin_type?.confidence || 0) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Cilt Skoru */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cilt Skoru</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-gray-900">
                  {skin?.skin_score || 0}
                </span>
                <span className="text-gray-400 mb-1">/100</span>
              </div>
              <Progress value={skin?.skin_score || 0} className="h-2 mt-2" />
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400">Yağlılık</p>
                  <p className="font-medium capitalize">{skin?.oiliness_level || "-"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400">Parlaklık</p>
                  <p className="font-medium">{skin?.brightness_mean?.toFixed(0) || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orta: Tespit Edilen Problemler */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Tespit Edilen Sorunlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {problems && problems.length > 0 ? (
                problems.map((p) => (
                  <div key={p.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{PROBLEM_ICON[p.label] || "⚪"}</span>
                        <span className="text-sm font-medium">
                          {PROBLEM_TR[p.label] || p.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {Math.round(p.confidence * 100)}%
                      </span>
                    </div>
                    <Progress value={p.confidence * 100} className="h-1.5" />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-8 gap-2">
                  <span className="text-4xl">✨</span>
                  <p className="text-sm text-gray-500">Belirgin sorun tespit edilmedi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ: Ürün Önerileri */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Önerilen Ürünler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations?.map((r, i) => (
                <div key={i}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.Name}</p>
                      <p className="text-xs text-gray-400">{r.Brand}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {r.Label}
                        </Badge>
                        <span className="text-xs text-gray-500">⭐ {r.Rank}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-rose-500 whitespace-nowrap">
                      ${r.Price}
                    </span>
                  </div>
                  {i < recommendations.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}