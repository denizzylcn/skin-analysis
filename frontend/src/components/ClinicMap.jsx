import { useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// Elazığ sabit klinik + güzellik merkezi listesi
const ELAZIG_CLINICS = [
  { id:"d1", lat:38.66988505135798, lon:39.18655398060494, tags:{ name:"Uzm. Dr. Feride Çoban Gül Dermatoloji Kliniği", amenity:"clinic", "addr:full":"Mir Center, Halaylı Sk. No:9 Kat:5, Sürsürü" } },
  { id:"d2", lat:38.6783, lon:39.2215, tags:{ name:"Uzm. Dr. Dilara Turgut - Botoks & Dermatoloji", amenity:"clinic", "addr:full":"Emir İş Merkezi No:43/1 Kat:3, Vali Fahri Bey Cd." } },
  { id:"d3", lat:38.66988505135798, lon:39.18655398060494, tags:{ name:"Dr. Oktay Halisdemir Clinic", amenity:"clinic", "addr:full":"Mir Center, Halaylı Sk. No:9/9 K:3, Sürsürü" } },
  { id:"b1", lat:38.6705, lon:39.2118, tags:{ name:"Belezza Beauty Studio", shop:"beauty", "addr:full":"Şahin Sk. Şahin Apt No:1, Sürsürü" } },
  { id:"b2", lat:38.67305280627804, lon:39.19738978324539, tags:{ name:"Aris Ezgi Doğan Güzellik", shop:"beauty", "addr:full":"Zübeyde Hanım Cd. No:31, Üniversite Mah." } },
  { id:"b3", lat:38.6774, lon:39.2198, tags:{ name:"Hülya Kayak - Aesthe Delüxe", shop:"beauty", "addr:full":"Gazi Caddesi, Kalkan Sk. Hayma Center Kat:3" } },
  { id:"b4", lat:38.669997017560505, lon:39.1843987247831, tags:{ name:"Beyaz Köşk Beauty - Doğu Park Plaza", shop:"beauty", "addr:full":"Cumhuriyet Mah. 2611. Sokak No:7/6 Kat:2" } },
  { id:"b5", lat:38.6776, lon:39.2200, tags:{ name:"Şebnem Güzellik Salonu", shop:"beauty", "addr:full":"Kalkan Sk. No:03/17 Kat:3, Yeni Mah." } },
]

const OVERPASS_URL = "https://overpass-api.de/api/interpreter"

async function fetchOverpass(lat, lon, radiusKm) {
  const r = radiusKm * 1000
  const query = `[out:json][timeout:25];(
    node["amenity"="doctors"](around:${r},${lat},${lon});
    node["amenity"="clinic"](around:${r},${lat},${lon});
    node["amenity"="hospital"](around:${r},${lat},${lon});
    node["healthcare"="dermatologist"](around:${r},${lat},${lon});
    node["shop"="beauty"](around:${r},${lat},${lon});
    node["leisure"="spa"](around:${r},${lat},${lon});
  );out body;`
  const res = await fetch(OVERPASS_URL, { method:"POST", body:"data="+encodeURIComponent(query) })
  const data = await res.json()
  return data.elements || []
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = ((lat2-lat1)*Math.PI)/180, dLon = ((lon2-lon1)*Math.PI)/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

function getType(tags) {
  if (tags?.amenity === "hospital") return { label:"Hastane", emoji:"🏥", color:"#c084fc" }
  if (["beauty","cosmetics","spa"].includes(tags?.shop||tags?.leisure))
    return { label:"Güzellik / Spa", emoji:"💆", color:"#f9a8d4" }
  return { label:"Klinik", emoji:"🩺", color:"rgba(255,255,255,0.5)" }
}

function makeIcon(emoji) {
  return L.divIcon({
    html:`<div style="width:34px;height:34px;border-radius:50%;background:rgba(244,63,94,0.9);border:2.5px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 10px rgba(0,0,0,0.5)">${emoji}</div>`,
    iconSize:[34,34], iconAnchor:[17,17], className:"",
  })
}

function userMarkerIcon() {
  return L.divIcon({
    html:`<div style="width:16px;height:16px;border-radius:50%;background:#f43f5e;border:3px solid white;box-shadow:0 0 14px rgba(244,63,94,0.8)"></div>`,
    iconSize:[16,16], iconAnchor:[8,8], className:"",
  })
}

function FlyTo({ pos }) {
  const map = useMap()
  useState(() => { if (pos) map.flyTo(pos, 16, { animate:true, duration:1 }) })
  return null
}

export default function ClinicMap() {
  const [status, setStatus]     = useState("idle")
  const [userPos, setUserPos]   = useState(null)
  const [clinics, setClinics]   = useState([])
  const [selected, setSelected] = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)
  const [radius, setRadius]     = useState(10)
  const [errorMsg, setErrorMsg] = useState("")

  const buildList = (lat, lon, raw, km) => {
    const overpassIds = new Set(raw.map(c => String(c.id)))
    const extra = ELAZIG_CLINICS.filter(c => !overpassIds.has(c.id))
    return [...raw, ...extra]
      .filter(c => c.lat && c.lon)
      .map(c => ({ ...c, dist: getDistance(lat, lon, c.lat, c.lon) }))
      .filter(c => c.dist <= km + 2)
      .sort((a,b) => a.dist - b.dist)
      .slice(0, 30)
  }

  const locate = () => {
    setStatus("locating"); setErrorMsg(""); setSelected(null)
    if (!navigator.geolocation) { setErrorMsg("Konum desteklenmiyor."); setStatus("error"); return }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        setUserPos({ lat, lon }); setStatus("loading")
        let raw = []
        try { raw = await fetchOverpass(lat, lon, radius) } catch {}
        setClinics(buildList(lat, lon, raw, radius))
        setStatus("done")
      },
      (err) => { setErrorMsg(err.code===1?"Konum izni reddedildi.":"Konum alınamadı."); setStatus("error") },
      { timeout:10000 }
    )
  }

  const changeRadius = async (r) => {
    setRadius(r)
    if (!userPos) return
    setStatus("loading")
    let raw = []
    try { raw = await fetchOverpass(userPos.lat, userPos.lon, r) } catch {}
    setClinics(buildList(userPos.lat, userPos.lon, raw, r))
    setStatus("done")
  }

  const focusClinic = (i) => {
    setSelected(i)
    const c = clinics[i]
    if (c) setFlyTarget([c.lat, c.lon])
  }

  const busy = status === "locating" || status === "loading"

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold text-white">Yakın Klinikler</h2>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:14, marginTop:4 }}>
          Konumunuza en yakın dermatoloji klinikleri, güzellik merkezleri ve hastaneler
        </p>
      </div>

      {/* Kontrol */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>Yarıçap:</span>
          {[2,5,10].map(r => (
            <button key={r} onClick={() => changeRadius(r)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: radius===r ? "linear-gradient(135deg,#f43f5e,#a855f7)" : "rgba(255,255,255,0.07)",
                color: radius===r ? "white" : "rgba(255,255,255,0.5)",
                border:`1px solid ${radius===r?"transparent":"rgba(255,255,255,0.1)"}`,
              }}>
              {r} km
            </button>
          ))}
        </div>
        <div className="flex-1"/>
        <button onClick={locate} disabled={busy}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{
            background: busy ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#f43f5e,#a855f7)",
            boxShadow:"0 0 20px rgba(244,63,94,0.3)", cursor: busy ? "not-allowed" : "pointer",
          }}>
          {status==="locating" ? "📡 Konum alınıyor..." : status==="loading" ? "🔍 Aranıyor..." : "📍 Konumumu Bul"}
        </button>
      </div>

      {/* Hata */}
      {status==="error" && (
        <div className="p-4 rounded-2xl flex items-start gap-3"
          style={{ background:"rgba(244,63,94,0.1)", border:"1px solid rgba(244,63,94,0.3)" }}>
          <span className="text-xl">⚠️</span>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.7)" }}>{errorMsg}</p>
        </div>
      )}

      {/* Harita + Liste */}
      {userPos && (status==="done"||status==="loading") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl overflow-hidden"
            style={{ height:440, border:"1px solid rgba(255,255,255,0.1)", zIndex:0 }}>
            <MapContainer center={[userPos.lat, userPos.lon]} zoom={14}
              style={{ width:"100%", height:"100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap"/>
              {flyTarget && <FlyTo pos={flyTarget} key={String(flyTarget)}/>}
              <Marker position={[userPos.lat, userPos.lon]} icon={userMarkerIcon()}>
                <Popup><b>📍 Konumunuz</b></Popup>
              </Marker>
              {clinics.map((c,i) => {
                const type = getType(c.tags)
                return (
                  <Marker key={c.id} position={[c.lat,c.lon]} icon={makeIcon(type.emoji)}
                    eventHandlers={{ click:()=>setSelected(i) }}>
                    <Popup><b>{c.tags?.name||"İsimsiz"}</b><br/>{type.label} — {c.dist.toFixed(1)} km<br/><small>{c.tags?.["addr:full"]||""}</small></Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>

          {/* Liste */}
          <div className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", height:440 }}>
            <div className="px-4 py-3" style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-sm font-semibold text-white">
                {status==="loading" ? "Aranıyor..." : `${clinics.length} yer bulundu`}
              </p>
            </div>
            <div className="overflow-y-auto flex-1">
              {clinics.length===0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                  <span className="text-4xl">🔍</span>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>Yarıçapı artırın.</p>
                </div>
              ) : clinics.map((c,i) => {
                const type = getType(c.tags)
                const isSel = selected===i
                return (
                  <button key={c.id} onClick={()=>focusClinic(i)}
                    className="w-full text-left px-4 py-3 transition-all"
                    style={{
                      background: isSel ? "rgba(244,63,94,0.15)" : "transparent",
                      borderBottom:"1px solid rgba(255,255,255,0.05)",
                      borderLeft: isSel ? "2px solid #f43f5e" : "2px solid transparent",
                    }}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">{type.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.tags?.name||"İsimsiz"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ fontSize:10, color:type.color, background:"rgba(255,255,255,0.06)", padding:"1px 6px", borderRadius:10 }}>
                            {type.label}
                          </span>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{c.dist.toFixed(1)} km</span>
                        </div>
                        {(c.tags?.["addr:full"]||c.tags?.["addr:street"]) && (
                          <p className="truncate" style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:2 }}>
                            {c.tags["addr:full"]||c.tags["addr:street"]}
                          </p>
                        )}
                        {c.tags?.phone && <p style={{ fontSize:11, color:"#f9a8d4", marginTop:2 }}>📞 {c.tags.phone}</p>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Boş durum */}
      {status==="idle" && (
        <div className="flex flex-col items-center gap-5 py-16 text-center rounded-2xl"
          style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.1)" }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background:"rgba(244,63,94,0.1)", border:"1px solid rgba(244,63,94,0.2)" }}>🗺️</div>
          <div>
            <p className="text-xl font-bold text-white mb-2">Yakın Yerleri Keşfedin</p>
            <p style={{ fontSize:14, color:"rgba(255,255,255,0.4)", maxWidth:360, margin:"0 auto", lineHeight:1.7 }}>
              Konumunuzu paylaşın, dermatoloji klinikleri ve güzellik merkezleri haritada gösterilsin.
            </p>
          </div>
          <button onClick={locate} className="px-8 py-3 rounded-2xl text-white font-bold text-sm"
            style={{ background:"linear-gradient(135deg,#f43f5e,#a855f7)", boxShadow:"0 0 25px rgba(244,63,94,0.4)" }}>
            📍 Konumumu Bul
          </button>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)" }}>
            Konum bilginiz sunucuya gönderilmez.
          </p>
        </div>
      )}
    </div>
  )
}
