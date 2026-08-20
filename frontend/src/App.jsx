import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MapPin, Leaf, Camera, CalendarCheck, MessageCircle, Bell,
  Droplets, Sun, Cloud, CloudRain, ChevronRight, CheckCircle2,
  AlertTriangle, TrendingUp, Sprout, Send, ArrowLeft, Loader2,
  RotateCcw, Upload, X, Crosshair, Search
} from "lucide-react";

/* ---------------- Soil data (simulated — no live soil API wired up yet) ---------------- */

const FIELD = {
  soilScore: 78,
  ph: 6.8,
  n: { value: 240, level: "Medium" },
  p: { value: 18, level: "Low" },
  k: { value: 310, level: "High" },
  oc: 0.6,
  moisture: 34,
};

const CROPS = [
  { name: "Groundnut", match: 94, note: "Ideal for medium-N, high-K sandy loam", icon: "🥜" },
  { name: "Finger Millet (Ragi)", match: 88, note: "Drought tolerant, thrives at this pH", icon: "🌾" },
  { name: "Maize", match: 81, note: "Needs P supplementation before sowing", icon: "🌽" },
  { name: "Black Gram", match: 76, note: "Good rotation crop, fixes nitrogen", icon: "🫘" },
];

const ALERTS = [
  { id: 1, level: "warning", title: "Heavy rain expected soon", body: "Delay fertilizer application by 2-3 days to prevent nutrient runoff.", time: "2h ago" },
  { id: 2, level: "info", title: "Soil moisture trending down", body: "Irrigation recommended within 3 days based on current field readings.", time: "6h ago" },
  { id: 3, level: "danger", title: "Pod borer risk elevated", body: "Regional advisory: monitor groundnut crop closely this week.", time: "1d ago" },
];

const LIFECYCLE = [
  { stage: "Land Preparation", status: "done", detail: "Ploughing & leveling completed" },
  { stage: "Sowing", status: "done", detail: "Groundnut sown — 45 days ago" },
  { stage: "Vegetative Growth", status: "current", detail: "Day 45 of ~110. Monitor for early leaf spot." },
  { stage: "Flowering & Pegging", status: "upcoming", detail: "Expected in ~15 days" },
  { stage: "Pod Development", status: "upcoming", detail: "Expected in ~40 days" },
  { stage: "Harvesting", status: "upcoming", detail: "Expected in ~65 days" },
];

const KNOWLEDGE = [
  { topic: "fertilizer", keys: ["fertilizer","fertiliser","npk","urea","dap","manure","compost","nutrient dose","how much fertilizer"],
    reply: "Your field reads N: Medium (240 kg/ha), P: Low (18 kg/ha), K: High (310 kg/ha). Phosphorus is the gap — apply DAP at ~40 kg/acre or single super phosphate at ~100 kg/acre before flowering. Skip extra potassium; it's already high. Split nitrogen into two doses rather than one heavy application, and never apply within 48 hours of forecast rain — it washes straight off." },
  { topic: "irrigation", keys: ["water","irrigat","moisture","drip","sprinkler","how often water","dry soil"],
    reply: "Soil moisture is at 34% and falling. Groundnut in the vegetative stage needs steady moisture but hates waterlogging — irrigate within 3 days, light and frequent rather than flooding. The critical windows are flowering and pod-filling; missing water then costs the most yield. Drip is ideal if you have it; otherwise irrigate early morning so leaves dry before nightfall." },
  { topic: "disease", keys: ["disease","fungus","fungal","infection","rot","wilt","blight","spot","mildew","rust"],
    reply: "Given current humidity, early and late leaf spot are the main risks for groundnut. Check lower leaves for small dark lesions with yellow halos. First response: remove affected leaves, then a neem-oil spray every 7 days. If it spreads past ~10% of foliage, move to a mancozeb-based fungicide. Use the Detect tab to photograph a leaf for identification." },
  { topic: "pest", keys: ["pest","insect","bug","borer","aphid","caterpillar","thrips","whitefly","mite","larvae"],
    reply: "Watch for pod borer, leaf miner, and aphids at this stage. Scout weekly — check 10 random plants across the field rather than just the edges. Neem oil handles light infestations. Pheromone traps work well for borer. Only escalate to chemical pesticide if damage exceeds roughly 10% of plants, and always spray in the evening to protect pollinators." },
  { topic: "ph", keys: ["ph","acid","alkal","lime","gypsum"],
    reply: "Your pH is 6.8 — slightly acidic to neutral, which is close to ideal for most crops including groundnut, ragi, and maize. No correction needed. For reference: below 5.5 you'd add agricultural lime; above 8.0 you'd add gypsum or elemental sulphur." },
  { topic: "soil", keys: ["soil","health","fertility","organic carbon","texture","loam","clay","sandy"],
    reply: "Overall soil health scores 78/100 — good. Organic carbon at 0.6% is moderate; getting above 0.75% would meaningfully improve water retention and nutrient availability. Best ways to raise it: incorporate crop residue instead of burning, add farmyard manure, and grow a legume in rotation." },
  { topic: "crop_choice", keys: ["which crop","what crop","recommend","suggest","best crop","should i grow","grow next"],
    reply: "Ranked for your field: Groundnut (94%) — best fit for your medium-N, high-K profile. Finger Millet/Ragi (88%) — drought tolerant, low input, thrives at your pH. Maize (81%) — viable but needs phosphorus correction first. Black Gram (76%) — good rotation choice since it fixes nitrogen. Run the live AI prediction on the Soil tab for a model-generated recommendation." },
  { topic: "harvest", keys: ["harvest","when ready","maturity","yield","how long","days to"],
    reply: "You're at day 45 of roughly 110 for groundnut. Flowering and pegging in ~15 days, pod development around day 85, harvest in ~65 days. Harvest indicators: leaves yellowing, and pod shells showing dark inner veins when split. Expected yield at your soil health is roughly 1.5-2.0 tonnes/hectare." },
  { topic: "weather", keys: ["weather","rain","temperature","forecast","humidity","climate","monsoon"],
    reply: "The Field tab shows live weather for your exact GPS location — current conditions plus a 5-day forecast. Use it to time three things: never fertilize within 48 hours of rain, never spray before rain (it washes off), and skip irrigation if rain is likely within 2 days." },
  { topic: "sowing", keys: ["sow","sowing","plant","seed","spacing","depth","transplant"],
    reply: "Groundnut: sow 5-6 cm deep, 30 cm between rows, 10 cm between plants, at roughly 100 kg seed per hectare. Treat seed with Rhizobium culture before sowing to boost nitrogen fixation. Sow when soil temperature is above 18°C and moisture is adequate — right after the first good monsoon rain is the traditional timing." },
  { topic: "land_prep", keys: ["land preparation","plough","plow","tilling","till","levelling","leveling","bed"],
    reply: "For groundnut: 2-3 ploughings to get a fine, loose tilth — pods form underground, so compacted soil directly reduces yield. Level the field for even water distribution, and incorporate farmyard manure at 10 tonnes/hectare during the final ploughing. Raised beds help if your field drains poorly." },
  { topic: "weed", keys: ["weed","grass","unwanted plant","herbicide","mulch"],
    reply: "The critical weed-free period for groundnut is 20-45 days after sowing — weeds during this window cost the most yield. Hand weeding twice, at ~20 and ~40 days, is effective. Mulching with crop residue suppresses weeds and conserves moisture at the same time. Avoid disturbing soil after pegging begins; it damages developing pods." },
  { topic: "rotation", keys: ["rotation","rotate","next season","intercrop","mixed crop","companion"],
    reply: "Groundnut is a legume, so it leaves nitrogen behind — follow it with a heavy feeder like maize or millet to use that. Avoid planting groundnut in the same field two seasons running; it builds up soil-borne disease. Intercropping groundnut with pigeon pea or castor works well and spreads your risk across two crops." },
  { topic: "storage", keys: ["storage","store","post harvest","drying","dry","moisture content"],
    reply: "Dry pods to 8-10% moisture before storage — above that invites aflatoxin, which is both a health risk and a market rejection risk. Sun-dry for 3-4 days on a clean surface, never bare soil. Store in ventilated jute bags on wooden pallets, not directly on the floor. Check monthly for mould and insects." },
  { topic: "market", keys: ["price","market","sell","mandi","profit","income","cost"],
    reply: "Check Agmarknet (agmarknet.gov.in) for live mandi prices in your district. Groundnut typically sells better 2-3 months after harvest than at peak arrival, if you can store it properly. Factor in your input costs — seed, fertilizer, labour, irrigation — before deciding when to sell. Farmer Producer Organisations often negotiate better rates than individual sales." },
  { topic: "organic", keys: ["organic","natural","chemical free","bio","jeevamrut","panchagavya"],
    reply: "Organic options that work well here: farmyard manure and vermicompost for nutrition, neem oil and Trichoderma for disease, pheromone traps and intercropping for pests. Green manure crops like dhaincha ploughed in before sowing add both nitrogen and organic matter. Expect somewhat lower yields initially, offset by lower input costs and price premiums." },
  { topic: "government", keys: ["scheme","subsidy","government","loan","insurance","pm kisan","soil health card"],
    reply: "Worth checking: PM-KISAN (income support), Pradhan Mantri Fasal Bima Yojana (crop insurance), Kisan Credit Card (low-interest credit), and the Soil Health Card scheme (free soil testing). Your district agriculture office or Krishi Vigyan Kendra can help with applications — they're also the best source for locally-specific advice." },
  { topic: "app_help", keys: ["how to use","what can you","help me","features","what is this","how does this work"],
    reply: "HarvestIQ has five sections. Field shows your live location, weather, and soil summary. Soil gives full nutrient analysis and runs the AI crop recommendation model. Detect lets you photograph a leaf for disease identification. Guide tracks your crop's lifecycle stage by stage. And I'm here for anything else — ask about fertilizer, irrigation, pests, sowing, harvest, storage, market prices, or government schemes." },
  { topic: "greeting", keys: ["hello","hi ","hey","namaste","vanakkam","good morning","good evening"],
    reply: "Hello! I'm your HarvestIQ assistant. I can help with fertilizer timing, irrigation, pest and disease management, sowing practices, harvest timing, storage, market prices, or government schemes. What's on your mind?" },
  { topic: "thanks", keys: ["thank","thanks","great","helpful","good job"],
    reply: "Glad that helped. Ask me anything else about your field whenever you need." },
];

// Scores by how many keywords match, so multi-topic questions land on the best fit
function localReply(msg) {
  const lower = msg.toLowerCase();
  let best = null, bestScore = 0;
  for (const entry of KNOWLEDGE) {
    let score = 0;
    for (const k of entry.keys) if (lower.includes(k)) score += k.length;
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  if (best) return best.reply;
  return "I can help with fertilizer, irrigation, pests and disease, soil health, crop choice, sowing, weeding, harvest timing, storage, market prices, government schemes, or how to use this app. Which would be useful?";
}

const FIELD_CONTEXT = `Field data: soil health 78/100, pH 6.8, Nitrogen 240 kg/ha (medium), Phosphorus 18 kg/ha (low), Potassium 310 kg/ha (high), organic carbon 0.6%, soil moisture 34% and falling. Current crop: groundnut, day 45 of ~110, vegetative stage. Top crop matches: groundnut 94%, finger millet 88%, maize 81%, black gram 76%. Location: Tamil Nadu, India.`;

// Optional: paste a Google Gemini API key to enable open-ended answers.
// Leave empty and the app uses the built-in knowledge base instead.
const GEMINI_API_KEY = "";

// Change this to your deployed backend URL when hosting (e.g. https://your-api.onrender.com)
const API_BASE = "https://harvestiq-2f3u.onrender.com";

async function chatReply(msg) {
  if (!GEMINI_API_KEY) return localReply(msg);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are HarvestIQ, an agricultural advisor for Indian farmers. Answer practically and concisely (under 120 words). Use this real field data where relevant:\n${FIELD_CONTEXT}\n\nFarmer's question: ${msg}` }] }],
        }),
      }
    );
    if (!res.ok) throw new Error("api");
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : localReply(msg);
  } catch {
    return localReply(msg);
  }
}

/* ---------------- Weather helpers ---------------- */

function weatherCodeToText(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([71, 73, 75].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Mixed conditions";
}

function WeatherIcon({ code, className }) {
  if (code === 0) return <Sun className={className} />;
  if ([61, 63, 65, 80, 81, 82, 51, 53, 55, 95, 96, 99].includes(code)) return <CloudRain className={className} />;
  return <Cloud className={className} />;
}

/* ---------------- Location (neighbourhood-level) ---------------- */

function pickPlaceName(addr, displayName) {
  // Prefer the most specific meaningful field.
  // Chennai's "neighbourhood" is often a water-board division (CMWSSB ...), so skip those.
  const nb = addr.neighbourhood && !/^CMWSSB|^Ward\s|^Division\s/i.test(addr.neighbourhood)
    ? addr.neighbourhood : null;
  const specific =
    nb ||
    addr.suburb ||
    addr.quarter ||
    addr.residential ||
    addr.village ||
    addr.hamlet ||
    addr.town ||
    addr.city_district ||
    addr.municipality ||
    addr.city ||
    addr.county ||
    addr.state_district;

  const region = addr.state_district && addr.state_district !== specific
    ? addr.state_district
    : (addr.city && addr.city !== specific ? addr.city : addr.state);

  if (specific) return region ? `${specific}, ${region}` : specific;
  if (displayName) return displayName.split(",").slice(0, 2).join(",").trim();
  return null;
}

function useLiveField() {
  const [loc, setLoc] = useState({
    label: null, area: null, district: null, state: null, postcode: null,
    lat: null, lon: null, status: "idle", source: null, message: null,
  });
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState("idle");
  const [climate, setClimate] = useState(null);

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const a = data.address || {};
      return {
        label: pickPlaceName(a, data.display_name) || `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,
        area: a.suburb || a.village || a.town || a.city_district || null,
        district: a.state_district || a.county || a.city || null,
        state: a.state || null,
        postcode: a.postcode || null,
      };
    } catch {
      return { label: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`, area: null, district: null, state: null, postcode: null };
    }
  };

  const useApproxLocation = useCallback(async () => {
    setLoc((p) => ({ ...p, status: "requesting", message: "Estimating your location…" }));
    try {
      const d = await (await fetch("https://ipapi.co/json/")).json();
      if (d.latitude && d.longitude) {
        const geo = await reverseGeocode(d.latitude, d.longitude);
        setLoc({ ...geo, lat: d.latitude, lon: d.longitude, status: "ready",
                 source: "approx", message: "Approximate location — enable GPS for field-level accuracy" });
        return true;
      }
    } catch { /* fall through */ }
    setLoc((p) => ({ ...p, status: "error", message: "Couldn't determine your location. Enter it manually." }));
    return false;
  }, []);

  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) { useApproxLocation(); return; }
    setLoc((p) => ({ ...p, status: "requesting", message: "Requesting GPS…" }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const geo = await reverseGeocode(latitude, longitude);
        setLoc({ ...geo, lat: latitude, lon: longitude, status: "ready", source: "gps",
                 message: accuracy ? `GPS accurate to ~${Math.round(accuracy)} m` : null });
      },
      async (err) => {
        const reason = err.code === 1
          ? "GPS permission denied — using approximate location"
          : err.code === 2 ? "GPS unavailable — using approximate location"
          : "GPS timed out — using approximate location";
        const ok = await useApproxLocation();
        if (ok) setLoc((p) => ({ ...p, message: reason }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [useApproxLocation]);

  const setManualLocation = useCallback(async (query) => {
    if (!query.trim()) return;
    setLoc((p) => ({ ...p, status: "requesting", message: "Looking up…" }));
    try {
      const results = await (await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`,
        { headers: { "Accept-Language": "en" } }
      )).json();
      if (results?.length) {
        const r = results[0];
        const a = r.address || {};
        setLoc({
          label: pickPlaceName(a, r.display_name) || r.display_name.split(",")[0],
          area: a.suburb || a.village || a.town || null,
          district: a.state_district || a.county || a.city || null,
          state: a.state || null, postcode: a.postcode || null,
          lat: parseFloat(r.lat), lon: parseFloat(r.lon),
          status: "ready", source: "manual", message: null,
        });
        return;
      }
      setLoc((p) => ({ ...p, status: "error", message: `Couldn't find "${query}".` }));
    } catch {
      setLoc((p) => ({ ...p, status: "error", message: "Lookup failed. Check your connection." }));
    }
  }, []);

  useEffect(() => { requestGPS(); }, [requestGPS]);

  // Current weather + forecast
  useEffect(() => {
    if (loc.lat == null) return;
    setWeatherStatus("loading");
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,precipitation_probability_max,weather_code&timezone=auto&forecast_days=5`)
      .then((r) => r.json())
      .then((d) => { setWeather(d); setWeatherStatus("ready"); })
      .catch(() => setWeatherStatus("error"));
  }, [loc.lat, loc.lon]);

  // Past-year rainfall -> monthly average (the scale the crop model was trained on)
  useEffect(() => {
    if (loc.lat == null) return;
    const end = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10);
    const start = new Date(Date.now() - 370 * 864e5).toISOString().slice(0, 10);
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${loc.lat}&longitude=${loc.lon}&start_date=${start}&end_date=${end}&daily=precipitation_sum&timezone=auto`)
      .then((r) => r.json())
      .then((d) => {
        const vals = (d?.daily?.precipitation_sum || []).filter((v) => v != null);
        if (!vals.length) return;
        const annual = vals.reduce((a, b) => a + b, 0);
        setClimate({ annualRainfall: Math.round(annual), monthlyRainfall: Math.round(annual / 12) });
      })
      .catch(() => {});
  }, [loc.lat, loc.lon]);

  return { loc, weather, weatherStatus, climate, requestGPS, setManualLocation };
}

/* ---------------- Soil (SoilGrids with nearby-point search) ---------------- */

function textureClass(sand, silt, clay) {
  if (clay >= 40 && silt < 40 && sand < 45) return "Clay";
  if (clay >= 35 && sand >= 45) return "Sandy clay";
  if (clay >= 40 && silt >= 40) return "Silty clay";
  if (clay >= 27 && clay < 40 && sand <= 20) return "Silty clay loam";
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "Clay loam";
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "Sandy clay loam";
  if (silt >= 80 && clay < 12) return "Silt";
  if (silt >= 50 && clay >= 12 && clay < 27) return "Silt loam";
  if (silt >= 50) return "Silt loam";
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return "Loam";
  if (sand >= 85 && (silt + 1.5 * clay) < 15) return "Sand";
  if (sand >= 70 && (silt + 1.5 * clay) >= 15) return "Loamy sand";
  return "Sandy loam";
}

function levelFor(v, low, high) {
  if (v == null) return "—";
  if (v < low) return "Low";
  if (v > high) return "High";
  return "Medium";
}

function soilHealthScore({ ph, soc, nitrogen }) {
  let s = 0;
  s += ph != null ? Math.max(0, 40 - Math.abs(ph - 6.75) * 16) : 26;
  s += soc != null ? Math.min(35, (soc / 2.0) * 35) : 20;
  s += nitrogen != null ? Math.min(25, (nitrogen / 3.0) * 25) : 15;
  return Math.round(Math.max(25, Math.min(99, s)));
}

async function querySoilGrids(lat, lon) {
  const props = ["phh2o", "clay", "sand", "silt", "soc", "nitrogen"].map((p) => `property=${p}`).join("&");
  const res = await fetch(`https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&${props}&depth=0-5cm&value=mean`);
  if (!res.ok) throw new Error("soilgrids");
  const data = await res.json();
  const out = {};
  for (const layer of data?.properties?.layers || []) {
    const raw = layer?.depths?.[0]?.values?.mean;
    const d = layer?.unit_measure?.d_factor || 1;
    out[layer.name] = raw == null ? null : raw / d;
  }
  return out;
}

// SoilGrids has no data over built-up areas, so search outward for the
// nearest point with real survey coverage rather than silently defaulting.
const SEARCH_RING = [
  [0, 0], [0.05, -0.05], [0.05, 0.05], [-0.05, 0.05], [-0.05, -0.05],
  [0.12, 0], [0, 0.12], [-0.12, 0], [0, -0.12],
  [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2],
];

function useSoilData(lat, lon) {
  const [soil, setSoil] = useState(null);
  const [soilStatus, setSoilStatus] = useState("idle");

  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;
    setSoilStatus("loading");

    (async () => {
      for (const [dLat, dLon] of SEARCH_RING) {
        if (cancelled) return;
        try {
          const r = await querySoilGrids(lat + dLat, lon + dLon);
          if (r.clay == null && r.phh2o == null) continue;

          const clay = r.clay, sand = r.sand, silt = r.silt;
          const socPct = r.soc != null ? r.soc / 10 : null;   // dg/kg -> %
          const offsetKm = Math.round(Math.hypot(dLat, dLon) * 111);

          const resolved = {
            ph: r.phh2o != null ? Math.round(r.phh2o * 10) / 10 : null,
            clay: clay != null ? Math.round(clay) : null,
            sand: sand != null ? Math.round(sand) : null,
            silt: silt != null ? Math.round(silt) : null,
            soc: socPct != null ? Math.round(socPct * 100) / 100 : null,
            nitrogen: r.nitrogen != null ? Math.round(r.nitrogen * 100) / 100 : null,  // g/kg
            texture: (clay != null && sand != null && silt != null) ? textureClass(sand, silt, clay) : "Unclassified",
            source: "SoilGrids (ISRIC) 250 m",
            offsetKm,
            exact: offsetKm === 0,
          };
          resolved.score = soilHealthScore(resolved);
          if (!cancelled) { setSoil(resolved); setSoilStatus(offsetKm === 0 ? "ready" : "nearby"); }
          return;
        } catch { /* try next point */ }
      }
      if (!cancelled) { setSoil(null); setSoilStatus("nodata"); }
    })();

    return () => { cancelled = true; };
  }, [lat, lon]);

  return { soil, soilStatus };
}

/* ---------------- UI atoms ---------------- */

function TopBar({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-4">
      {onBack && (
        <button onClick={onBack} className="text-stone-400 hover:text-amber-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="text-lg font-semibold text-stone-100 tracking-tight">{title}</h1>
    </div>
  );
}

function ContourRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        {[1, 0.78, 0.56].map((r, i) => (
          <circle key={i} cx="70" cy="70" r={radius * r} fill="none" stroke="currentColor" strokeWidth="1" className="text-stone-800" />
        ))}
        <circle
          cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="text-amber-400 transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-stone-50 font-mono">{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-stone-400 mt-0.5">Soil Health</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, sub, accent }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5">
      <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">{label}</p>
      <p className="text-xl font-mono font-semibold text-stone-50">
        {value}<span className="text-xs text-stone-500 ml-1">{unit}</span>
      </p>
      {sub && <p className={`text-[11px] mt-1 ${accent || "text-stone-400"}`}>{sub}</p>}
    </div>
  );
}

/* ---------------- Location block ---------------- */

function LocationBlock({ loc, requestGPS, setManualLocation }) {
  const [showManual, setShowManual] = useState(false);
  const [query, setQuery] = useState("");

  const submitManual = () => { setManualLocation(query); setShowManual(false); setQuery(""); };

  const sourceLabel = loc.source === "gps" ? "Live GPS"
    : loc.source === "manual" ? "Manual"
    : loc.source === "approx" ? "Approximate" : "Locating";

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[11px] uppercase tracking-widest font-mono flex items-center gap-1.5 text-teal-400">
        <span className={`w-1.5 h-1.5 rounded-full ${loc.source === "gps" ? "bg-teal-400 animate-pulse" : "bg-stone-600"}`} />
        {sourceLabel}
      </p>

      <div className="flex items-center gap-1.5 mt-1">
        <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0" />
        <p className="text-stone-100 text-base font-medium truncate">
          {loc.status === "requesting" ? "Detecting…" : loc.label || "Location not set"}
        </p>
      </div>

      {(loc.district || loc.state) && (
        <p className="text-[11px] text-stone-500 mt-0.5">
          {[loc.district, loc.state, loc.postcode].filter(Boolean).join(" · ")}
        </p>
      )}

      {loc.lat != null && (
        <p className="text-[11px] font-mono text-stone-600 mt-0.5">
          {loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}°
        </p>
      )}

      {loc.message && <p className="text-[11px] text-amber-500/70 mt-1">{loc.message}</p>}

      <div className="flex items-center gap-3 mt-2">
        <button onClick={requestGPS} className="text-[11px] text-teal-400 flex items-center gap-1">
          <Crosshair className="w-3 h-3" /> Use my GPS
        </button>
        <button onClick={() => setShowManual((s) => !s)} className="text-[11px] text-stone-400 flex items-center gap-1">
          <Search className="w-3 h-3" /> Change
        </button>
      </div>

      {showManual && (
        <div className="flex items-center gap-2 mt-2 bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1.5">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
            placeholder="e.g. Kilpauk, Chennai"
            className="flex-1 bg-transparent text-xs text-stone-200 placeholder-stone-600 outline-none min-w-0" />
          <button onClick={submitManual} className="text-teal-400 flex-shrink-0"><Send className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Screens ---------------- */

function HomeScreen({ go, loc, weather, weatherStatus, requestGPS, setManualLocation, soil, soilStatus, climate }) {
  const current = weather?.current;
  const daily = weather?.daily;

  return (
    <div className="px-5 pb-28 space-y-5">
      <div className="flex items-start justify-between gap-3 pt-2">
        <LocationBlock loc={loc} requestGPS={requestGPS} setManualLocation={setManualLocation} />
        <button onClick={() => go("alerts")} className="relative bg-neutral-900 border border-neutral-800 p-2.5 rounded-full flex-shrink-0">
          <Bell className="w-5 h-5 text-stone-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
        {soilStatus === "loading" ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <p className="text-xs text-stone-500">Analysing soil…</p>
          </div>
        ) : soil ? (
          <>
            <ContourRing score={soil.score} />
            <p className="text-center text-sm text-stone-300 mt-3">{soil.texture}</p>
            <p className="text-center text-[11px] text-stone-600">
              {soil.exact ? "at your coordinates" : `nearest survey ~${soil.offsetKm} km`}
            </p>
          </>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-xs text-stone-600 text-center px-4">No soil survey coverage for this location.</p>
          </div>
        )}
        <button
          onClick={() => go("soil")}
          className="w-full mt-5 bg-amber-400 text-neutral-950 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors"
        >
          Full Soil Analysis <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Soil Texture" value={soil?.texture ?? "—"} unit=""
          sub={soil ? (soil.exact ? "detected" : "nearby survey") : "no data"} accent="text-teal-400" />
        <MetricCard label="pH Level" value={soil?.ph ?? "—"} unit=""
          sub={soil?.ph == null ? "" : soil.ph < 6 ? "Acidic" : soil.ph > 7.5 ? "Alkaline" : "Near neutral"} />
        <MetricCard label="Organic Carbon" value={soil?.soc ?? "—"} unit="%" sub={levelFor(soil?.soc, 0.75, 2.0)} />
        <MetricCard label="Rainfall / yr" value={climate?.annualRainfall ?? "—"} unit="mm"
          sub={climate ? `${climate.monthlyRainfall} mm monthly avg` : "loading"} />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        {weatherStatus === "loading" && (
          <div className="flex items-center gap-2 text-stone-500 text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching live weather…
          </div>
        )}
        {weatherStatus === "error" && <p className="text-rose-400 text-sm">Couldn't load live weather.</p>}
        {weatherStatus === "ready" && current && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-stone-200 flex items-center gap-2">
                <WeatherIcon code={current.weather_code} className="w-4 h-4 text-amber-400" />
                {Math.round(current.temperature_2m)}°C · {weatherCodeToText(current.weather_code)}
              </p>
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" /> {Math.round(current.relative_humidity_2m)}%
              </p>
            </div>
            {daily && (
              <div className="flex justify-between">
                {daily.time.slice(0, 5).map((day, i) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-stone-500">
                      {i === 0 ? "Today" : new Date(day).toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="text-xs font-mono text-stone-300">{Math.round(daily.temperature_2m_max[i])}°</span>
                    <span className="text-[10px] text-teal-400">{daily.precipitation_probability_max[i]}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-sm font-medium text-stone-200">Crop Recommendation</p>
          <button onClick={() => go("soil")} className="text-[11px] text-amber-400">Run analysis</button>
        </div>
        <button onClick={() => go("soil")} className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-stone-200">Get AI crop recommendation</p>
            <p className="text-[11px] text-stone-600">Based on your soil pH, climate and rainfall</p>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-600" />
        </button>
      </div>
    </div>
  );
}

function SoilScreen({ go, weather, soil, soilStatus, climate }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [test, setTest] = useState({ N: "", P: "", K: "" });

  const hasTest = test.N !== "" && test.P !== "" && test.K !== "";

  const runPrediction = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body = {
        temperature: weather?.current?.temperature_2m ?? 27,
        humidity: weather?.current?.relative_humidity_2m ?? 70,
        ph: soil?.ph ?? 6.8,
        rainfall: climate?.monthlyRainfall ?? 100,
      };
      if (hasTest) {
        body.N = parseFloat(test.N);
        body.P = parseFloat(test.P);
        body.K = parseFloat(test.K);
      }
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("bad response");
      setResult(await res.json());
    } catch {
      setResult({ error: "Couldn't reach the AI backend. Make sure the server is running." });
    }
    setLoading(false);
  };

  const composition = soil ? [
    { label: "Clay", value: soil.clay, color: "bg-orange-400" },
    { label: "Sand", value: soil.sand, color: "bg-amber-300" },
    { label: "Silt", value: soil.silt, color: "bg-teal-400" },
  ] : [];

  const inputCls = "w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-700 outline-none focus:border-amber-400";

  return (
    <div className="px-5 pb-28">
      <TopBar title="Soil Analysis" onBack={() => go("home")} />

      {soilStatus === "loading" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <p className="text-sm text-stone-400">Reading soil survey data for your coordinates…</p>
        </div>
      )}

      {soilStatus === "nodata" && (
        <div className="bg-neutral-900 border border-rose-500/40 rounded-2xl p-5 mb-4">
          <p className="text-sm text-rose-300 mb-1">No soil survey coverage here</p>
          <p className="text-xs text-stone-500">SoilGrids has no data for this area even after searching nearby. Try a location closer to agricultural land.</p>
        </div>
      )}

      {soil && (
        <>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">Detected Soil Type</p>
                <p className="text-2xl font-semibold text-stone-50">{soil.texture}</p>
                <p className="text-[11px] text-stone-600 mt-1">
                  {soil.exact ? soil.source : `${soil.source} · nearest survey point ~${soil.offsetKm} km away`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">Health</p>
                <p className="text-3xl font-mono font-semibold text-amber-400">{soil.score}</p>
              </div>
            </div>

            {soil.clay != null && (
              <>
                <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-2">Particle Composition</p>
                <div className="flex h-3 rounded-full overflow-hidden mb-2">
                  {composition.map((c) => (
                    <div key={c.label} className={c.color} style={{ width: `${c.value}%` }} />
                  ))}
                </div>
                <div className="flex gap-4 mb-4">
                  {composition.map((c) => (
                    <div key={c.label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${c.color}`} />
                      <span className="text-[11px] text-stone-400">{c.label} {c.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-800">
              <div>
                <p className="text-[11px] text-stone-500 mb-0.5">pH</p>
                <p className="text-lg font-mono text-stone-100">{soil.ph ?? "—"}</p>
                <p className="text-[10px] text-stone-600">
                  {soil.ph == null ? "" : soil.ph < 6 ? "Acidic" : soil.ph > 7.5 ? "Alkaline" : "Near neutral"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-stone-500 mb-0.5">Organic C</p>
                <p className="text-lg font-mono text-stone-100">{soil.soc ?? "—"}<span className="text-xs text-stone-600">%</span></p>
                <p className="text-[10px] text-stone-600">{levelFor(soil.soc, 0.75, 2.0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-500 mb-0.5">Total N</p>
                <p className="text-lg font-mono text-stone-100">{soil.nitrogen ?? "—"}<span className="text-xs text-stone-600"> g/kg</span></p>
                <p className="text-[10px] text-stone-600">{levelFor(soil.nitrogen, 1.0, 2.5)}</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-stone-200">Soil test values</p>
              <button onClick={() => setShowTest((s) => !s)} className="text-[11px] text-teal-400">
                {showTest ? "Hide" : "Add for higher accuracy"}
              </button>
            </div>
            {!showTest && (
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Satellite data gives pH and texture, but not plant-available N, P and K.
                Adding those from a Soil Health Card raises prediction confidence from around 40% to over 90%.
              </p>
            )}
            {showTest && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {["N", "P", "K"].map((k) => (
                    <div key={k}>
                      <label className="block text-[11px] text-stone-500 mb-1">{k} (kg/ha)</label>
                      <input value={test[k]} onChange={(e) => setTest({ ...test, [k]: e.target.value })}
                        placeholder="0" inputMode="decimal" className={inputCls} />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-stone-600">From your Soil Health Card. Typical ranges: N 0-140, P 5-145, K 5-205.</p>
              </>
            )}
          </div>

          <button
            onClick={runPrediction}
            disabled={loading}
            className="w-full mb-4 bg-teal-400 text-neutral-950 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Running AI prediction…</>) : "Run AI Crop Recommendation"}
          </button>

          {result?.error && (
            <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-3 mb-4">
              <p className="text-rose-300 text-xs">{result.error}</p>
            </div>
          )}

          {result && !result.error && (
            <div className="mb-6">
              <div className="bg-neutral-900 border border-teal-400 rounded-2xl p-5 mb-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-teal-400 mb-1">Best Match</p>
                    <p className="text-2xl font-semibold text-stone-50 capitalize">{result.recommended_crop}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-mono font-semibold text-teal-400">{result.confidence}%</p>
                    <p className="text-[10px] text-stone-600">confidence</p>
                  </div>
                </div>

                {result.all_predictions?.[0]?.info && (
                  <div className="grid grid-cols-4 gap-2 py-3 border-t border-neutral-800 mt-2">
                    {[["Season","season"],["Duration","duration"],["Water","water"],["Yield","yield"]].map(([lab,key]) => (
                      <div key={key}>
                        <p className="text-[10px] text-stone-600">{lab}</p>
                        <p className="text-[11px] text-stone-300">{result.all_predictions[0].info[key] || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-stone-600 border-t border-neutral-800 pt-2">
                  {result.mode === "full" ? "7-feature model · 99.55% test accuracy" : "4-feature model · 96.36% test accuracy"}
                </p>
              </div>

              {result.alternatives?.length > 0 && (
                <>
                  <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-2 px-1">Also suitable</p>
                  <div className="space-y-2 mb-3">
                    {result.alternatives.map((a) => (
                      <div key={a.crop} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-stone-200 capitalize">{a.crop}</p>
                          <p className="text-[10px] text-stone-600">
                            {[a.info?.season, a.info?.duration, a.info?.water && `${a.info.water} water`].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <span className="font-mono text-sm text-stone-400">{a.confidence}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {result.mode === "measurable" && (
                <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3">
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    Confidence is spread across several crops because pH and climate alone can suit many of them.
                    Add your soil-test N, P and K values above for a much sharper recommendation.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-3">Inputs used for prediction</p>
            <div className="grid grid-cols-2 gap-y-2 text-[11px]">
              <span className="text-stone-500">Soil pH</span>
              <span className="text-stone-300 font-mono text-right">{soil.ph ?? "—"}</span>
              <span className="text-stone-500">Temperature</span>
              <span className="text-stone-300 font-mono text-right">
                {weather?.current ? `${Math.round(weather.current.temperature_2m)}°C` : "—"}
              </span>
              <span className="text-stone-500">Humidity</span>
              <span className="text-stone-300 font-mono text-right">
                {weather?.current ? `${Math.round(weather.current.relative_humidity_2m)}%` : "—"}
              </span>
              <span className="text-stone-500">Rainfall (monthly avg)</span>
              <span className="text-stone-300 font-mono text-right">
                {climate ? `${climate.monthlyRainfall} mm` : "—"}
              </span>
              {climate && (<>
                <span className="text-stone-500">Rainfall (past year)</span>
                <span className="text-stone-300 font-mono text-right">{climate.annualRainfall} mm</span>
              </>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DetectScreen({ go }) {
  const [state, setState] = useState("idle");
  const [imageSrc, setImageSrc] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);

  const analyzeImage = async (blob) => {
    setState("analyzing");
    setDiagnosis(null);
    try {
      const form = new FormData();
      form.append("file", blob, "leaf.jpg");
      const res = await fetch(`${API_BASE}/detect-disease`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Detection failed");
      }
      setDiagnosis(await res.json());
    } catch (e) {
      setDiagnosis({ error: e.message || "Couldn't reach the disease model. Is the backend running?" });
    }
    setState("result");
  };
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const openCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream;
      setState("camera");
    } catch {
      setCameraError("Camera unavailable or permission denied — use the upload option below instead.");
    }
  };

  useEffect(() => {
    if (state === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [state]);

  const capturePhoto = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setImageSrc(canvas.toDataURL("image/jpeg"));
    stopCamera();
    canvas.toBlob((blob) => analyzeImage(blob), "image/jpeg", 0.92);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageSrc(ev.target.result);
    reader.readAsDataURL(file);
    analyzeImage(file);
  };

  const reset = () => { stopCamera(); setImageSrc(null); setCameraError(null); setDiagnosis(null); setState("idle"); };

  return (
    <div className="px-5 pb-28">
      <TopBar title="Disease Detection" onBack={() => go("home")} />

      {state === "idle" && (
        <div className="space-y-3">
          <button onClick={openCamera} className="w-full border-2 border-dashed border-neutral-700 rounded-3xl py-14 flex flex-col items-center justify-center gap-3 hover:border-amber-400 transition-colors">
            <div className="bg-neutral-900 p-4 rounded-full"><Camera className="w-7 h-7 text-amber-400" /></div>
            <p className="text-stone-300 text-sm font-medium">Open camera to scan a leaf</p>
          </button>
          {cameraError && <p className="text-rose-400 text-xs text-center px-4">{cameraError}</p>}
          <button onClick={() => fileRef.current?.click()} className="w-full border border-neutral-800 rounded-2xl py-3 flex items-center justify-center gap-2 text-stone-400 text-sm">
            <Upload className="w-4 h-4" /> Upload a photo instead
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {state === "camera" && (
        <div className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-80 object-cover" />
            <button onClick={reset} className="absolute top-3 right-3 bg-neutral-950/70 p-2 rounded-full">
              <X className="w-4 h-4 text-stone-200" />
            </button>
          </div>
          <button onClick={capturePhoto} className="w-full bg-amber-400 text-neutral-950 font-semibold py-3 rounded-xl">Capture Photo</button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {state === "analyzing" && (
        <div className="py-16 flex flex-col items-center gap-4">
          {imageSrc && <img src={imageSrc} alt="Captured leaf" className="w-40 h-40 object-cover rounded-2xl mb-2" />}
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-stone-400 text-sm">Analyzing leaf texture &amp; lesion pattern…</p>
        </div>
      )}

      {state === "result" && (
        <div className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
            <div className="h-48 bg-neutral-950">
              {imageSrc && <img src={imageSrc} alt="Captured leaf" className="w-full h-full object-cover" />}
            </div>
            <div className="p-5">
              {diagnosis?.error ? (
                <div className="py-2">
                  <p className="text-rose-300 text-sm font-medium mb-1">Detection unavailable</p>
                  <p className="text-stone-500 text-xs">{diagnosis.error}</p>
                </div>
              ) : diagnosis ? (
                <>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className={`text-lg font-semibold ${diagnosis.is_healthy ? "text-teal-300" : "text-stone-50"}`}>
                      {diagnosis.disease}
                    </p>
                    <span className="text-amber-400 font-mono text-sm flex-shrink-0">{diagnosis.confidence}%</span>
                  </div>
                  <p className="text-xs text-stone-500 mb-1">Detected on {diagnosis.crop}</p>
                  <p className="text-[10px] text-stone-600 mb-4">
                    MobileNetV2 · 38 classes · {diagnosis.model_accuracy}% test accuracy
                  </p>

                  {diagnosis.alternatives?.length > 0 && (
                    <div className="mb-4 bg-neutral-950 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wide text-stone-600 mb-1.5">Other possibilities</p>
                      {diagnosis.alternatives.map((alt, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-stone-500">
                          <span>{alt.disease} ({alt.crop})</span>
                          <span className="font-mono">{alt.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-2">Recommended actions</p>
                  <ul className="space-y-2">
                    {diagnosis.actions.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-sm text-stone-300">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />{a}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
          <button onClick={reset} className="w-full border border-neutral-700 text-stone-300 py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Scan another leaf
          </button>
        </div>
      )}
    </div>
  );
}

function GuideScreen({ go }) {
  return (
    <div className="px-5 pb-28">
      <TopBar title="Groundnut · Crop Guide" onBack={() => go("home")} />
      <div className="relative pl-6">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-neutral-800" />
        <div className="space-y-6">
          {LIFECYCLE.map((s) => (
            <div key={s.stage} className="relative">
              <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
                s.status === "done" ? "bg-teal-400 border-teal-400" :
                s.status === "current" ? "bg-amber-400 border-amber-400 animate-pulse" :
                "bg-neutral-900 border-neutral-700"}`} />
              <p className={`text-sm font-medium ${s.status === "upcoming" ? "text-stone-500" : "text-stone-100"}`}>{s.stage}</p>
              <p className="text-xs text-stone-500 mt-0.5">{s.detail}</p>
              {s.status === "current" && (
                <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">In progress</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsScreen({ go }) {
  const styles = {
    warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
    info: { icon: TrendingUp, color: "text-teal-400", bg: "bg-teal-400/10" },
    danger: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-400/10" },
  };
  return (
    <div className="px-5 pb-28">
      <TopBar title="Alerts" onBack={() => go("home")} />
      <div className="space-y-3">
        {ALERTS.map((a) => {
          const S = styles[a.level]; const Icon = S.icon;
          return (
            <div key={a.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex gap-3">
              <div className={`${S.bg} p-2 rounded-full h-fit`}><Icon className={`w-4 h-4 ${S.color}`} /></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-100">{a.title}</p>
                <p className="text-xs text-stone-500 mt-1">{a.body}</p>
                <p className="text-[10px] text-stone-600 mt-2 font-mono">{a.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChatScreen({ go }) {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm your HarvestIQ assistant. Ask me about fertilizer timing, irrigation, disease risk, crop choice, soil nutrients, or your harvest schedule." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const ask = async (text) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setThinking(true);
    const reply = await chatReply(text);
    setThinking(false);
    setMessages((m) => [...m, { from: "bot", text: reply }]);
  };

  const send = () => ask(input.trim());

  const suggestions = ["When should I irrigate?", "What fertilizer do I need?", "Any pest risk right now?", "When will it be ready to harvest?", "How should I store the crop?", "Any government schemes?"];

  return (
    <div className="px-5 pb-28 flex flex-col" style={{ minHeight: "100vh" }}>
      <TopBar title="AI Assistant" onBack={() => go("home")} />
      <div className="flex-1 space-y-3 pb-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.from === "user" ? "bg-amber-400 text-neutral-950" : "bg-neutral-900 border border-neutral-800 text-stone-200"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-xs text-stone-500">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)}
              className="text-[11px] text-stone-400 border border-neutral-800 rounded-full px-3 py-1.5">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="sticky bottom-24 flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full px-2 py-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about your crop…"
          className="flex-1 bg-transparent text-sm text-stone-200 placeholder-stone-600 outline-none px-2 min-w-0"
        />
        <button onClick={send} className="bg-amber-400 p-2 rounded-full flex-shrink-0"><Send className="w-4 h-4 text-neutral-950" /></button>
      </div>
    </div>
  );
}

/* ---------------- Bottom Navigation ---------------- */

function BottomNav({ active, go }) {
  const tabs = [
    { id: "home", icon: Sprout, label: "Field" },
    { id: "soil", icon: Leaf, label: "Soil" },
    { id: "detect", icon: Camera, label: "Detect" },
    { id: "guide", icon: CalendarCheck, label: "Guide" },
    { id: "chat", icon: MessageCircle, label: "Assistant" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-neutral-950/95 backdrop-blur border-t border-neutral-800">
      <div className="max-w-md mx-auto flex justify-between px-3 pt-2 pb-5">
        {tabs.map((t) => {
          const Icon = t.icon; const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => go(t.id)} className="flex flex-col items-center gap-1 flex-1 py-1">
              <Icon className={`w-5 h-5 ${isActive ? "text-amber-400" : "text-stone-600"}`} />
              <span className={`text-[10px] ${isActive ? "text-amber-400" : "text-stone-600"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Root ---------------- */

const FARM_SIZES = ["Under 1 acre", "1-5 acres", "5-10 acres", "Over 10 acres"];
const EXPERIENCE = ["New to farming", "1-5 years", "5-15 years", "15+ years"];
const IRRIGATION = ["Rain-fed only", "Borewell / Well", "Canal", "Drip / Sprinkler"];
const SEASONS = ["Kharif (Jun-Oct)", "Rabi (Nov-Mar)", "Zaid (Apr-Jun)"];
const GOALS = ["Maximize yield", "Reduce input cost", "Switch to organic", "Improve soil health"];

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-sm border transition-colors text-left ${
        selected
          ? "bg-amber-400 text-neutral-950 border-amber-400 font-medium"
          : "bg-neutral-900 text-stone-300 border-neutral-800 hover:border-neutral-700"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="mb-5">
      <label className="block text-sm text-stone-300 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-stone-600 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function WelcomeScreen({ onEnter, loc, weather, savedProfile, soil, soilStatus, climate }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({
    name: "", phone: "", village: "", farmSize: "", experience: "",
    irrigation: "", season: "", currentCrop: "", goals: [],
  });

  const isReturning = Boolean(savedProfile);
  const temp = weather?.current?.temperature_2m;
  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
  const toggleGoal = (g) =>
    setP((prev) => ({ ...prev, goals: prev.goals.includes(g) ? prev.goals.filter((x) => x !== g) : [...prev.goals, g] }));

  const inputCls = "w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-stone-100 placeholder-stone-600 outline-none focus:border-amber-400 transition-colors";

  /* ---------- Returning user ---------- */
  if (isReturning) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Sprout className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[11px] font-mono tracking-widest text-teal-400">FIELD ACTIVE</span>
            </div>
          </div>

          <p className="text-[11px] font-mono tracking-[0.2em] text-teal-400 mb-2">HARVESTIQ</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-50 mb-2">Welcome back, {savedProfile.name}</h1>
          <p className="text-sm text-stone-400 mb-1">
            {loc?.label || savedProfile.village || "Locating your field…"}
            {temp != null && ` · ${Math.round(temp)}°C`}
          </p>
          <p className="text-[11px] text-stone-600 mb-8">
            {[savedProfile.farmSize, soil?.texture, savedProfile.irrigation].filter(Boolean).join(" · ")}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">Soil Health</p>
              <p className="text-2xl font-mono font-semibold text-stone-50">{soil?.score ?? "—"}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">Crop Day</p>
              <p className="text-2xl font-mono font-semibold text-stone-50">45</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">Soil pH</p>
              <p className="text-2xl font-mono font-semibold text-amber-400">{soil?.ph ?? "—"}</p>
            </div>
          </div>

          <div className="bg-neutral-900 border-l-2 border-amber-400 p-4 mb-6">
            <p className="text-[11px] uppercase tracking-wide text-amber-400 mb-1">Needs attention</p>
            <p className="text-sm text-stone-300">{ALERTS[0].title} — {ALERTS[0].body}</p>
          </div>

          <button
            onClick={() => onEnter(savedProfile)}
            className="w-full bg-amber-400 text-neutral-950 font-semibold py-3.5 rounded-xl hover:bg-amber-300 transition-colors flex items-center justify-center gap-2"
          >
            Continue to field <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Onboarding steps ---------- */
  const steps = [
    { title: "Let's set up your profile", sub: "This helps us tailor guidance to your farm.", valid: p.name.trim().length > 0 },
    { title: "About your land", sub: "Your soil type is detected automatically from your location.", valid: Boolean(p.farmSize) },
    { title: "Water and season", sub: "Irrigation access determines which crops are realistic.", valid: p.irrigation && p.season },
    { title: "Your goals", sub: "We'll prioritize advice around what matters to you.", valid: p.goals.length > 0 },
  ];
  const current = steps[step];

  const next = () => {
    if (!current.valid) return;
    if (step < steps.length - 1) setStep(step + 1);
    else onEnter(p);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between w-2/5 border-r border-neutral-800 p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg viewBox="0 0 400 800" className="w-full h-full">
            {[...Array(14)].map((_, i) => (
              <path key={i}
                d={`M-50 ${60 + i * 58} Q 100 ${20 + i * 58}, 200 ${60 + i * 58} T 450 ${60 + i * 58}`}
                fill="none" stroke="#EF9F27" strokeWidth="1.5" />
            ))}
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-neutral-950" />
            </div>
            <span className="text-lg font-semibold text-stone-50">HarvestIQ</span>
          </div>
          <p className="text-[11px] font-mono tracking-[0.2em] text-teal-400 ml-[3.25rem] -mt-1">
            PRECISION AGRICULTURE
          </p>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-semibold text-stone-100 leading-tight mb-4">
            Every field tells a story.
            <br />
            <span className="text-amber-400">We help you read it.</span>
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
            GPS-based soil analysis, live weather, AI crop recommendations, and disease detection — built for the realities of Indian farming.
          </p>
        </div>

        <div className="relative space-y-3">
          {[
            { icon: MapPin, label: "Soil analysed from your exact coordinates" },
            { icon: Leaf, label: "Crop recommendations from a trained model" },
            { icon: Camera, label: "Photograph a leaf, identify the disease" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-xs text-stone-500">{f.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex lg:hidden items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center">
            <Sprout className="w-6 h-6 text-neutral-950" />
          </div>
          <div>
            <p className="text-[11px] font-mono tracking-[0.2em] text-teal-400">HARVESTIQ</p>
            <p className="text-[11px] text-stone-600">Precision agriculture platform</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-7">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-amber-400" : "bg-neutral-800"}`} />
          ))}
        </div>

        <p className="text-[11px] font-mono text-stone-600 mb-1">STEP {step + 1} OF {steps.length}</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-stone-50 mb-1.5">{current.title}</h1>
        <p className="text-sm text-stone-400 mb-7">{current.sub}</p>

        {step === 0 && (
          <>
            <Field label="Full name">
              <input value={p.name} onChange={(e) => set("name", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder="Your name" className={inputCls} />
            </Field>
            <Field label="Mobile number" hint="Optional — for weather and pest alerts">
              <input value={p.phone} onChange={(e) => set("phone", e.target.value)}
                placeholder="+91" className={inputCls} />
            </Field>
            <Field label="Village or district" hint="Optional — we can also detect this from GPS">
              <input value={p.village} onChange={(e) => set("village", e.target.value)}
                placeholder={loc?.label || "e.g. Kanchipuram, Tamil Nadu"} className={inputCls} />
            </Field>
            <Field label="Farming experience">
              <div className="grid grid-cols-2 gap-2">
                {EXPERIENCE.map((e) => (
                  <Chip key={e} label={e} selected={p.experience === e} onClick={() => set("experience", e)} />
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Farm size">
              <div className="grid grid-cols-2 gap-2">
                {FARM_SIZES.map((f) => (
                  <Chip key={f} label={f} selected={p.farmSize === f} onClick={() => set("farmSize", f)} />
                ))}
              </div>
            </Field>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mt-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-teal-400" />
                  <p className="text-sm text-stone-200">Auto-detected from your location</p>
                </div>
                {(soilStatus === "loading" || loc?.status === "requesting") && (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] text-stone-500">Location</span>
                  <span className="text-[11px] text-stone-200 text-right">{loc?.label || "detecting…"}</span>
                </div>
                {loc?.postcode && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">PIN code</span>
                    <span className="text-[11px] font-mono text-stone-200">{loc.postcode}</span>
                  </div>
                )}
                {loc?.lat != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">Coordinates</span>
                    <span className="text-[11px] font-mono text-stone-200">
                      {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                    </span>
                  </div>
                )}

                <div className="border-t border-neutral-800 pt-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">Soil type</span>
                    <span className="text-[11px] text-teal-400 font-medium">
                      {soilStatus === "loading" ? "analysing…" : soil?.texture || "no survey data"}
                    </span>
                  </div>
                  {soil?.ph != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-500">Soil pH</span>
                      <span className="text-[11px] font-mono text-stone-200">{soil.ph}</span>
                    </div>
                  )}
                  {soil?.clay != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-500">Composition</span>
                      <span className="text-[11px] font-mono text-stone-200">
                        {soil.clay}% clay · {soil.sand}% sand · {soil.silt}% silt
                      </span>
                    </div>
                  )}
                  {soil?.soc != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-500">Organic carbon</span>
                      <span className="text-[11px] font-mono text-stone-200">{soil.soc}%</span>
                    </div>
                  )}
                  {soil?.score != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-500">Soil health</span>
                      <span className="text-[11px] font-mono text-amber-400">{soil.score}/100</span>
                    </div>
                  )}
                </div>

                {(weather?.current || climate) && (
                  <div className="border-t border-neutral-800 pt-2.5 space-y-2.5">
                    {weather?.current && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-stone-500">Current weather</span>
                        <span className="text-[11px] font-mono text-stone-200">
                          {Math.round(weather.current.temperature_2m)}°C · {Math.round(weather.current.relative_humidity_2m)}% RH
                        </span>
                      </div>
                    )}
                    {climate && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-stone-500">Annual rainfall</span>
                        <span className="text-[11px] font-mono text-stone-200">{climate.annualRainfall} mm</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {soil && !soil.exact && (
                <p className="text-[10px] text-amber-500/70 mt-3">
                  Nearest soil survey point is ~{soil.offsetKm} km away — built-up areas have no direct coverage.
                </p>
              )}
              {soilStatus === "nodata" && (
                <p className="text-[10px] text-rose-400/80 mt-3">
                  No soil survey coverage nearby. You can still use weather-based recommendations.
                </p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Irrigation source">
              <div className="grid grid-cols-2 gap-2">
                {IRRIGATION.map((i) => (
                  <Chip key={i} label={i} selected={p.irrigation === i} onClick={() => set("irrigation", i)} />
                ))}
              </div>
            </Field>
            <Field label="Growing season">
              <div className="grid grid-cols-1 gap-2">
                {SEASONS.map((s) => (
                  <Chip key={s} label={s} selected={p.season === s} onClick={() => set("season", s)} />
                ))}
              </div>
            </Field>
            <Field label="Current crop" hint="Leave blank if the field is empty">
              <input value={p.currentCrop} onChange={(e) => set("currentCrop", e.target.value)}
                placeholder="e.g. Groundnut" className={inputCls} />
            </Field>
          </>
        )}

        {step === 3 && (
          <Field label="What matters most?" hint="Select all that apply">
            <div className="grid grid-cols-1 gap-2">
              {GOALS.map((g) => (
                <Chip key={g} label={g} selected={p.goals.includes(g)} onClick={() => toggleGoal(g)} />
              ))}
            </div>
          </Field>
        )}

        <div className="flex gap-3 mt-7">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="px-5 py-3.5 rounded-xl border border-neutral-800 text-stone-400 text-sm hover:border-neutral-700 transition-colors">
              Back
            </button>
          )}
          <button
            onClick={next}
            disabled={!current.valid}
            className={`flex-1 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors ${
              current.valid ? "bg-amber-400 text-neutral-950 hover:bg-amber-300" : "bg-neutral-900 text-stone-600 cursor-not-allowed"
            }`}
          >
            {step === steps.length - 1 ? "Enter HarvestIQ" : "Continue"} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {!current.valid && (
          <p className="text-[11px] text-stone-600 mt-3 text-center">
            {step === 0 ? "Enter your name to continue" : "Select an option to continue"}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}

function SideNav({ active, go, profile }) {
  const tabs = [
    { id: "home", icon: Sprout, label: "Field" },
    { id: "soil", icon: Leaf, label: "Soil" },
    { id: "detect", icon: Camera, label: "Detect" },
    { id: "guide", icon: CalendarCheck, label: "Guide" },
    { id: "chat", icon: MessageCircle, label: "Assistant" },
    { id: "alerts", icon: Bell, label: "Alerts" },
  ];
  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-neutral-800 min-h-screen px-4 py-6 flex-shrink-0">
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
          <Sprout className="w-5 h-5 text-amber-400" />
        </div>
        <span className="text-sm font-semibold text-stone-100">HarvestIQ</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive ? "bg-neutral-900 text-amber-400" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {profile && (
        <div className="px-3 py-3 border-t border-neutral-800">
          <p className="text-sm text-stone-300">{profile.name}</p>
          <p className="text-[11px] text-stone-600">
            {[profile.farmSize, profile.village].filter(Boolean).join(" · ") || "Farmer"}
          </p>
        </div>
      )}
    </aside>
  );
}

function MobileNav({ active, go }) {
  const tabs = [
    { id: "home", icon: Sprout, label: "Field" },
    { id: "soil", icon: Leaf, label: "Soil" },
    { id: "detect", icon: Camera, label: "Detect" },
    { id: "guide", icon: CalendarCheck, label: "Guide" },
    { id: "chat", icon: MessageCircle, label: "Assistant" },
  ];
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-neutral-950/95 backdrop-blur border-t border-neutral-800">
      <div className="flex justify-between px-3 pt-2 pb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => go(t.id)} className="flex flex-col items-center gap-1 flex-1 py-1">
              <Icon className={`w-5 h-5 ${isActive ? "text-amber-400" : "text-stone-600"}`} />
              <span className={`text-[10px] ${isActive ? "text-amber-400" : "text-stone-600"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HarvestIQApp() {
  const [entered, setEntered] = useState(false);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("home");
  const { loc, weather, weatherStatus, climate, requestGPS, setManualLocation } = useLiveField();
  const { soil, soilStatus } = useSoilData(loc.lat, loc.lon);
  const navTabs = ["home", "soil", "detect", "guide", "chat", "alerts"];

  const screens = {
    home: <HomeScreen go={setScreen} loc={loc} weather={weather} weatherStatus={weatherStatus} requestGPS={requestGPS} setManualLocation={setManualLocation} soil={soil} soilStatus={soilStatus} climate={climate} />,
    soil: <SoilScreen go={setScreen} weather={weather} soil={soil} soilStatus={soilStatus} climate={climate} />,
    detect: <DetectScreen go={setScreen} />,
    guide: <GuideScreen go={setScreen} />,
    alerts: <AlertsScreen go={setScreen} />,
    chat: <ChatScreen go={setScreen} />,
  };

  const styleTag = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap');
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      body { font-family: 'Space Grotesk', sans-serif; background: #0a0a0a; }
    `}</style>
  );

  if (!entered) {
    return (
      <div className="min-h-screen bg-neutral-950">
        {styleTag}
        <WelcomeScreen
          loc={loc}
          weather={weather}
          soil={soil}
          soilStatus={soilStatus}
          climate={climate}
          savedProfile={profile}
          onEnter={(prof) => { setProfile(prof); setEntered(true); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {styleTag}
      <div className="flex">
        <SideNav active={screen} go={setScreen} profile={profile} />
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto pb-24 md:pb-8">
            {screens[screen]}
          </div>
        </main>
      </div>
      <MobileNav active={navTabs.includes(screen) ? screen : "home"} go={setScreen} />
    </div>
  );
}
