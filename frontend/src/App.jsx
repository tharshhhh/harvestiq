import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  MapPin, Leaf, Camera, CalendarCheck, MessageCircle, Bell,
  Droplets, Sun, Cloud, CloudRain, ChevronRight, CheckCircle2,
  AlertTriangle, TrendingUp, Sprout, Send, ArrowLeft, Loader2,
  RotateCcw, Upload, X, Crosshair, Search, Wind
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
const API_BASE = "http://127.0.0.1:8000";

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
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,precipitation_probability_max,weather_code,et0_fao_evapotranspiration,precipitation_sum&timezone=auto&forecast_days=7`)
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

/* ---------------- India soil regions (ICAR / NBSS&LUP classification) ----------------
   SoilGrids has large coverage gaps over India — verified null even over prime
   farmland such as the Cauvery delta. This regional layer provides a documented
   fallback so soil type still varies correctly by location.                      */

const INDIA_SOIL_REGIONS = [
  { region: "Cauvery Delta Alluvium", latMin: 10.2, latMax: 11.5, lonMin: 78.8, lonMax: 79.9, soil: "Alluvial (deltaic)", texture: "Clay loam", ph: 7.2, soc: 0.65, notes: "Fertile river-deposited soil, high water retention, ideal for paddy" },
  { region: "Kongu Belt (Coimbatore-Erode)", latMin: 10.5, latMax: 11.8, lonMin: 76.8, lonMax: 78.2, soil: "Red & Black mix", texture: "Sandy clay loam", ph: 7.0, soc: 0.40, notes: "Mixed red loam and black cotton soil, moderate fertility, irrigation-dependent" },
  { region: "Tamil Nadu Red Loam", latMin: 8.0, latMax: 13.4, lonMin: 76.9, lonMax: 80.4, soil: "Red soil", texture: "Sandy loam", ph: 6.5, soc: 0.45, notes: "Iron-rich, well-drained, low in nitrogen and organic matter" },
  { region: "Western Ghats Laterite", latMin: 10.5, latMax: 16.0, lonMin: 74.5, lonMax: 76.5, soil: "Laterite soil", texture: "Clay loam", ph: 5.6, soc: 1.10, notes: "Acidic, leached, high iron and aluminium, needs liming" },
  { region: "Kerala Coastal Laterite", latMin: 8.2, latMax: 12.8, lonMin: 74.8, lonMax: 76.8, soil: "Laterite soil", texture: "Sandy clay loam", ph: 5.5, soc: 1.30, notes: "Highly acidic, heavy rainfall leaching, good for plantation crops" },
  { region: "Deccan Black Cotton", latMin: 15.5, latMax: 22.5, lonMin: 73.0, lonMax: 80.5, soil: "Black soil (Regur)", texture: "Clay", ph: 7.8, soc: 0.55, notes: "High clay, swells when wet and cracks when dry, retains moisture well" },
  { region: "Malwa Black Soil", latMin: 21.5, latMax: 25.5, lonMin: 74.0, lonMax: 80.0, soil: "Black soil (Regur)", texture: "Clay", ph: 7.9, soc: 0.50, notes: "Deep black cotton soil, rich in lime and magnesium" },
  { region: "Gujarat Black & Alluvial", latMin: 20.0, latMax: 24.7, lonMin: 68.5, lonMax: 74.5, soil: "Black / Alluvial mix", texture: "Clay loam", ph: 7.9, soc: 0.45, notes: "Mixed alluvial and black soil, moderately saline in coastal belts" },
  { region: "Thar Desert Arid", latMin: 24.0, latMax: 30.2, lonMin: 69.0, lonMax: 75.5, soil: "Arid / Desert soil", texture: "Loamy sand", ph: 8.3, soc: 0.20, notes: "Sandy, low moisture retention, saline patches, very low organic matter" },
  { region: "Indo-Gangetic Alluvium (Punjab-Haryana)", latMin: 28.5, latMax: 32.5, lonMin: 73.5, lonMax: 77.5, soil: "Alluvial soil", texture: "Loam", ph: 7.6, soc: 0.40, notes: "Highly fertile, intensively farmed, declining organic carbon" },
  { region: "Indo-Gangetic Alluvium (UP-Bihar)", latMin: 24.0, latMax: 29.0, lonMin: 77.0, lonMax: 88.5, soil: "Alluvial soil", texture: "Silt loam", ph: 7.4, soc: 0.45, notes: "Deep fertile alluvium, well suited to wheat, rice and sugarcane" },
  { region: "Bengal Delta Alluvium", latMin: 21.5, latMax: 26.5, lonMin: 87.0, lonMax: 90.0, soil: "Alluvial (deltaic)", texture: "Silty clay loam", ph: 6.8, soc: 0.80, notes: "Fine-textured delta soil, high water table, ideal for rice and jute" },
  { region: "Eastern Red & Laterite", latMin: 17.5, latMax: 24.5, lonMin: 81.0, lonMax: 87.5, soil: "Red & Laterite", texture: "Sandy clay loam", ph: 6.0, soc: 0.55, notes: "Iron-rich, moderately acidic, responds well to organic amendment" },
  { region: "Telangana-Rayalaseema Red", latMin: 13.0, latMax: 19.5, lonMin: 77.0, lonMax: 81.5, soil: "Red sandy soil", texture: "Sandy loam", ph: 6.8, soc: 0.40, notes: "Light-textured, low fertility, drought-prone, needs irrigation" },
  { region: "South Karnataka Red Loam", latMin: 12.4, latMax: 14.5, lonMin: 76.5, lonMax: 78.6, soil: "Red loamy soil", texture: "Sandy clay loam", ph: 6.4, soc: 0.55, notes: "Well-drained red loam over granite, moderate fertility, suited to ragi and pulses" },
  { region: "Karnataka Plateau Red", latMin: 12.4, latMax: 18.5, lonMin: 74.5, lonMax: 78.6, soil: "Red loamy soil", texture: "Sandy clay loam", ph: 6.6, soc: 0.50, notes: "Moderately fertile, good drainage, suited to millets and pulses" },
  { region: "Himalayan Mountain Soil", latMin: 29.5, latMax: 35.5, lonMin: 73.0, lonMax: 81.0, soil: "Mountain / Forest soil", texture: "Loam", ph: 6.2, soc: 1.60, notes: "High organic matter, thin profile, prone to erosion on slopes" },
  { region: "Northeast Hill Soil", latMin: 22.0, latMax: 29.5, lonMin: 89.5, lonMax: 97.5, soil: "Forest / Laterite", texture: "Silt loam", ph: 5.4, soc: 1.80, notes: "Acidic, very high organic matter, heavy rainfall leaching" },
  { region: "Coastal Andhra Alluvium", latMin: 13.5, latMax: 19.0, lonMin: 79.5, lonMax: 85.5, soil: "Coastal alluvium", texture: "Clay loam", ph: 7.3, soc: 0.60, notes: "Delta alluvium, fertile, some salinity near the coast" },
  { region: "Konkan Coastal Laterite", latMin: 15.0, latMax: 20.5, lonMin: 72.5, lonMax: 74.5, soil: "Laterite soil", texture: "Clay loam", ph: 5.8, soc: 1.20, notes: "Acidic lateritic soil, very high monsoon rainfall" },
];

function classifyIndiaSoil(lat, lon) {
  const hits = INDIA_SOIL_REGIONS
    .filter((r) => lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax)
    .map((r) => {
      const cy = (r.latMin + r.latMax) / 2;
      const cx = (r.lonMin + r.lonMax) / 2;
      return { r, d: Math.hypot(lat - cy, lon - cx) };
    })
    .sort((a, b) => a.d - b.d);
  if (!hits.length) return null;
  return hits[0].r;
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
  [0, 0],
  [0.01, 0], [0, 0.01], [-0.01, 0], [0, -0.01],
  [0.02, 0.02], [-0.02, 0.02], [0.02, -0.02], [-0.02, -0.02],
  [0.04, 0], [0, 0.04], [-0.04, 0], [0, -0.04],
];

function useSoilData(lat, lon) {
  const [soil, setSoil] = useState(null);
  const [soilStatus, setSoilStatus] = useState("idle");

  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;
    setSoilStatus("loading");

    (async () => {
      // 1. Try SoilGrids at the exact point, then very close offsets (~1-3 km)
      for (const [dLat, dLon] of SEARCH_RING) {
        if (cancelled) return;
        try {
          const r = await querySoilGrids(lat + dLat, lon + dLon);
          if (r.clay == null && r.phh2o == null) continue;

          const clay = r.clay, sand = r.sand, silt = r.silt;
          const socPct = r.soc != null ? r.soc / 10 : null;
          const offsetKm = Math.round(Math.hypot(dLat, dLon) * 111);

          const resolved = {
            ph: r.phh2o != null ? Math.round(r.phh2o * 10) / 10 : null,
            clay: clay != null ? Math.round(clay) : null,
            sand: sand != null ? Math.round(sand) : null,
            silt: silt != null ? Math.round(silt) : null,
            soc: socPct != null ? Math.round(socPct * 100) / 100 : null,
            nitrogen: r.nitrogen != null ? Math.round(r.nitrogen * 100) / 100 : null,
            texture: (clay != null && sand != null && silt != null)
              ? textureClass(sand, silt, clay) : "Unclassified",
            soilName: null,
            region: null,
            notes: null,
            source: "SoilGrids (ISRIC) 250 m satellite survey",
            offsetKm,
            exact: offsetKm === 0,
            measured: true,
          };
          resolved.score = soilHealthScore(resolved);
          if (!cancelled) { setSoil(resolved); setSoilStatus(offsetKm === 0 ? "ready" : "nearby"); }
          return;
        } catch { /* try next point */ }
      }

      // 2. Fall back to the documented India regional soil map
      if (cancelled) return;
      const reg = classifyIndiaSoil(lat, lon);
      if (reg) {
        const resolved = {
          ph: reg.ph, soc: reg.soc, nitrogen: null,
          clay: null, sand: null, silt: null,
          texture: reg.texture,
          soilName: reg.soil,
          region: reg.region,
          notes: reg.notes,
          source: "ICAR / NBSS&LUP regional soil classification",
          offsetKm: 0, exact: false, measured: false,
        };
        resolved.score = soilHealthScore(resolved);
        setSoil(resolved);
        setSoilStatus("regional");
        return;
      }

      setSoil(null);
      setSoilStatus("nodata");
    })();

    return () => { cancelled = true; };
  }, [lat, lon]);

  return { soil, soilStatus };
}

/* ---------------- Irrigation water calculator (FAO-56 method) ----------------
   ETc = ET0 x Kc, where ET0 is reference evapotranspiration from Open-Meteo
   and Kc is the FAO crop coefficient. Net irrigation = ETc - effective rainfall,
   then divided by system efficiency. Validated against published FAO/ICAR
   crop water requirement ranges.                                            */

const CROP_KC = {
  rice: { kc: 1.20, days: 120, label: "Rice / Paddy" },
  maize: { kc: 1.20, days: 110, label: "Maize" },
  cotton: { kc: 1.15, days: 165, label: "Cotton" },
  sugarcane: { kc: 1.25, days: 330, label: "Sugarcane" },
  banana: { kc: 1.10, days: 330, label: "Banana" },
  groundnut: { kc: 1.15, days: 110, label: "Groundnut" },
  chickpea: { kc: 1.00, days: 100, label: "Chickpea" },
  lentil: { kc: 1.10, days: 110, label: "Lentil" },
  blackgram: { kc: 1.05, days: 80, label: "Black gram" },
  mungbean: { kc: 1.05, days: 70, label: "Mung bean" },
  pigeonpeas: { kc: 1.15, days: 165, label: "Pigeon pea" },
  mothbeans: { kc: 0.95, days: 75, label: "Moth bean" },
  kidneybeans: { kc: 1.15, days: 105, label: "Kidney bean" },
  coconut: { kc: 1.00, days: 365, label: "Coconut" },
  mango: { kc: 0.85, days: 150, label: "Mango" },
  coffee: { kc: 0.95, days: 270, label: "Coffee" },
  jute: { kc: 1.10, days: 110, label: "Jute" },
  watermelon: { kc: 1.00, days: 90, label: "Watermelon" },
  muskmelon: { kc: 1.00, days: 90, label: "Muskmelon" },
  papaya: { kc: 1.05, days: 300, label: "Papaya" },
  orange: { kc: 0.90, days: 270, label: "Orange" },
  pomegranate: { kc: 0.90, days: 180, label: "Pomegranate" },
  grapes: { kc: 0.85, days: 180, label: "Grapes" },
  apple: { kc: 0.95, days: 165, label: "Apple" },
  millet: { kc: 1.00, days: 90, label: "Millet / Ragi" },
};

// Application efficiency by irrigation method (FAO typical values)
const IRRIGATION_EFFICIENCY = {
  "Drip system": 0.90,
  "Sprinkler": 0.75,
  "Farm pond / Tank": 0.60,
  "Canal": 0.55,
  "Borewell": 0.60,
  "Open well": 0.60,
  "River / Stream": 0.55,
  "Rain-fed only": 1.00,
};

const ACRE_TO_HA = 0.404686;
const MM_PER_ACRE_LITRES = 4046.86;   // 1 mm depth over 1 acre = 4,046.86 litres

function bestEfficiency(sources) {
  if (!sources?.length) return { value: 0.65, label: "surface irrigation" };
  let best = 0, label = "";
  for (const s of sources) {
    const e = IRRIGATION_EFFICIENCY[s];
    if (e != null && e > best && s !== "Rain-fed only") { best = e; label = s; }
  }
  if (best === 0) return { value: 1.0, label: "rain-fed" };
  return { value: best, label };
}

function calculateWater({ et0, rainfall7day, crop, acres, irrigationSources }) {
  const key = (crop || "").toLowerCase().replace(/[^a-z]/g, "");
  const cropData = CROP_KC[key] || { kc: 1.05, days: 120, label: crop || "Selected crop" };
  const eff = bestEfficiency(irrigationSources);

  const etc = et0 * cropData.kc;                       // mm/day crop water use
  const dailyRain = (rainfall7day || 0) / 7;
  const effectiveRain = dailyRain * 0.75;              // ~75% of rain is usable
  const netNeed = Math.max(0, etc - effectiveRain);    // mm/day to supply
  const grossNeed = netNeed / eff.value;               // account for system losses

  const litresPerDayPerAcre = grossNeed * MM_PER_ACRE_LITRES;
  const litresPerDay = litresPerDayPerAcre * acres;

  return {
    cropLabel: cropData.label,
    kc: cropData.kc,
    seasonDays: cropData.days,
    et0: Math.round(et0 * 100) / 100,
    etc: Math.round(etc * 100) / 100,
    effectiveRain: Math.round(effectiveRain * 100) / 100,
    netNeed: Math.round(netNeed * 100) / 100,
    grossNeed: Math.round(grossNeed * 100) / 100,
    efficiency: eff,
    litresPerDay: Math.round(litresPerDay),
    litresPerWeek: Math.round(litresPerDay * 7),
    m3PerDay: Math.round(litresPerDay / 1000 * 10) / 10,
    seasonTotalMm: Math.round(etc * cropData.days),
    seasonTotalLitres: Math.round(grossNeed * cropData.days * MM_PER_ACRE_LITRES * acres),
    // A typical 5 HP borewell pump delivers roughly 30,000 litres per hour
    pumpHoursPerDay: Math.round((litresPerDay / 30000) * 10) / 10,
    tankersPerDay: Math.round((litresPerDay / 12000) * 10) / 10,
  };
}

function acresFromFarmSize(sizeLabel) {
  if (!sizeLabel) return 1;
  if (sizeLabel.includes("Under 1")) return 0.5;
  if (sizeLabel.includes("1-5")) return 3;
  if (sizeLabel.includes("5-10")) return 7.5;
  if (sizeLabel.includes("Over 10")) return 15;
  return 1;
}

/* ---------------- Alert engine (derived from live weather + soil) ---------------- */

function generateAlerts({ weather, soil, climate, profile }) {
  const alerts = [];
  const daily = weather?.daily;
  const current = weather?.current;
  const now = new Date();

  const dayName = (iso, i) =>
    i === 0 ? "today" : i === 1 ? "tomorrow"
    : new Date(iso).toLocaleDateString(undefined, { weekday: "long" });

  // ---- Rainfall-driven ----
  if (daily?.precipitation_probability_max) {
    const probs = daily.precipitation_probability_max;
    const heavyIdx = probs.findIndex((p) => p >= 70);
    if (heavyIdx !== -1) {
      alerts.push({
        id: "rain-heavy",
        level: heavyIdx <= 1 ? "danger" : "warning",
        icon: "rain",
        title: `Heavy rain likely ${dayName(daily.time[heavyIdx], heavyIdx)} (${probs[heavyIdx]}%)`,
        body: "Hold off on fertiliser and pesticide application — rain within 48 hours washes both away before the crop can take them up. Check field drainage before it arrives.",
        action: "Delay fertiliser by 2-3 days",
        time: `${heavyIdx === 0 ? "Today" : `In ${heavyIdx} day${heavyIdx > 1 ? "s" : ""}`}`,
      });
    }

    const dryStreak = probs.slice(0, 5).every((p) => p < 20);
    if (dryStreak) {
      alerts.push({
        id: "dry-spell",
        level: "warning",
        icon: "drought",
        title: "No rain expected for 5 days",
        body: `Soil moisture will fall steadily. ${soil?.texture?.includes("Sand") || soil?.texture?.includes("Loamy sand")
          ? "Your sandy soil drains quickly, so irrigate sooner rather than later."
          : "Plan irrigation within the next 2-3 days."}`,
        action: "Schedule irrigation",
        time: "Next 5 days",
      });
    }
  }

  // ---- Temperature-driven ----
  if (daily?.temperature_2m_max) {
    const maxT = Math.max(...daily.temperature_2m_max.slice(0, 5));
    const hotIdx = daily.temperature_2m_max.findIndex((t) => t >= 38);
    if (hotIdx !== -1) {
      alerts.push({
        id: "heat",
        level: maxT >= 42 ? "danger" : "warning",
        icon: "heat",
        title: `Heat stress risk — ${Math.round(maxT)}°C expected`,
        body: "Irrigate early morning or after sunset to reduce evaporation loss. Avoid spraying in peak afternoon heat; it scorches foliage and evaporates before absorption.",
        action: "Irrigate at dawn or dusk",
        time: dayName(daily.time[hotIdx], hotIdx),
      });
    }
    const coldIdx = daily.temperature_2m_max.findIndex((t) => t <= 10);
    if (coldIdx !== -1) {
      alerts.push({
        id: "cold",
        level: "warning",
        icon: "cold",
        title: "Cold stress possible",
        body: "Low temperatures slow nutrient uptake and can damage sensitive crops. Light evening irrigation raises soil temperature overnight.",
        action: "Consider frost protection",
        time: dayName(daily.time[coldIdx], coldIdx),
      });
    }
  }

  // ---- Humidity + disease pressure ----
  if (current?.relative_humidity_2m != null && current?.temperature_2m != null) {
    const h = current.relative_humidity_2m;
    const t = current.temperature_2m;
    if (h >= 80 && t >= 20 && t <= 32) {
      alerts.push({
        id: "fungal",
        level: "danger",
        icon: "disease",
        title: `High fungal disease risk (${Math.round(h)}% humidity)`,
        body: "Warm, humid conditions are ideal for leaf spot, blight and mildew. Inspect the underside of lower leaves for lesions. Early neem-oil spray is far more effective than treating an established infection.",
        action: "Scout the field and photograph any lesions",
        time: "Now",
      });
    } else if (h >= 70 && t >= 22) {
      alerts.push({
        id: "fungal-mod",
        level: "warning",
        icon: "disease",
        title: "Moderate disease pressure",
        body: "Humidity is high enough to support fungal growth. Weekly scouting is worthwhile, particularly after rain.",
        action: "Scout weekly",
        time: "This week",
      });
    }
  }

  // ---- Wind ----
  if (current?.wind_speed_10m != null && current.wind_speed_10m >= 25) {
    alerts.push({
      id: "wind",
      level: "warning",
      icon: "wind",
      title: `Strong wind — ${Math.round(current.wind_speed_10m)} km/h`,
      body: "Do not spray today. Drift wastes chemical, misses the target, and risks damaging neighbouring plots. Tall crops may need staking.",
      action: "Postpone spraying",
      time: "Now",
    });
  }

  // ---- Soil-driven ----
  if (soil?.ph != null) {
    if (soil.ph < 5.5) {
      alerts.push({
        id: "ph-acid",
        level: "warning",
        icon: "soil",
        title: `Strongly acidic soil (pH ${soil.ph})`,
        body: "Below pH 5.5, phosphorus becomes locked up and aluminium toxicity can damage roots. Agricultural lime at 2-3 t/ha, applied well before sowing, corrects this over a season.",
        action: "Apply agricultural lime",
        time: "Before next sowing",
      });
    } else if (soil.ph > 8.2) {
      alerts.push({
        id: "ph-alk",
        level: "warning",
        icon: "soil",
        title: `Alkaline soil (pH ${soil.ph})`,
        body: "High pH restricts iron, zinc and manganese uptake, often showing as yellowing between leaf veins. Gypsum or elemental sulphur lowers pH gradually.",
        action: "Apply gypsum",
        time: "Before next sowing",
      });
    }
  }

  if (soil?.soc != null && soil.soc < 0.5) {
    alerts.push({
      id: "low-oc",
      level: "info",
      icon: "soil",
      title: `Low organic carbon (${soil.soc}%)`,
      body: "Below 0.5% the soil holds less water and fewer nutrients. Incorporating crop residue instead of burning it, adding farmyard manure, and growing a legume in rotation all build it back up.",
      action: "Add organic matter",
      time: "This season",
    });
  }

  if (soil && !soil.measured) {
    alerts.push({
      id: "soil-test",
      level: "info",
      icon: "soil",
      title: "Get a Soil Health Card test",
      body: "Your soil values come from the regional map, not a test of your field. A free Soil Health Card gives exact N, P and K figures, which raises crop recommendation confidence from around 40% to over 90%.",
      action: "Visit your district agriculture office",
      time: "Recommended",
    });
  }

  // ---- Rainfall regime ----
  if (climate?.annualRainfall != null) {
    if (climate.annualRainfall < 600) {
      alerts.push({
        id: "low-rain",
        level: "info",
        icon: "drought",
        title: `Low rainfall zone (${climate.annualRainfall} mm/yr)`,
        body: "Prioritise drought-tolerant crops such as millets, pulses and groundnut. Drip irrigation and mulching materially reduce water loss in this regime.",
        action: "Consider drought-tolerant crops",
        time: "Planning",
      });
    } else if (climate.annualRainfall > 2000) {
      alerts.push({
        id: "high-rain",
        level: "info",
        icon: "rain",
        title: `High rainfall zone (${climate.annualRainfall} mm/yr)`,
        body: "Drainage matters more than irrigation here. Raised beds prevent waterlogging, and heavy rain leaches nitrogen, so split fertiliser into more, smaller doses.",
        action: "Check field drainage",
        time: "Planning",
      });
    }
  }

  // ---- Seasonal ----
  const month = now.getMonth();
  if (month >= 4 && month <= 6) {
    alerts.push({
      id: "kharif",
      level: "info", icon: "calendar",
      title: "Kharif sowing window approaching",
      body: "Complete land preparation and arrange seed and fertiliser now. Sowing with the first sustained monsoon rain gives the best establishment.",
      action: "Prepare land and source seed",
      time: "Jun-Jul",
    });
  } else if (month >= 8 && month <= 10) {
    alerts.push({
      id: "rabi",
      level: "info", icon: "calendar",
      title: "Rabi season planning",
      body: "Wheat, chickpea, mustard and lentil are sown from October. Test soil now so any amendment has time to act before sowing.",
      action: "Plan rabi crop",
      time: "Oct-Nov",
    });
  }

  const rank = { danger: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.level] - rank[b.level]);
}


/* ---------------- Device notifications ---------------- */

function useNotifications(alerts) {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const sentRef = useRef(new Set());

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPermission(p);
  }, []);

  useEffect(() => {
    if (permission !== "granted" || !alerts?.length) return;
    // Only push genuinely urgent items, and only once each
    const urgent = alerts.filter((a) => a.level === "danger");
    for (const a of urgent) {
      if (sentRef.current.has(a.id)) continue;
      sentRef.current.add(a.id);
      try {
        new Notification("HarvestIQ — " + a.title, {
          body: a.action || a.body.slice(0, 120),
          tag: a.id,
        });
      } catch { /* notification failed, ignore */ }
    }
  }, [permission, alerts]);

  return { permission, requestNotifications };
}

/* ---------------- UI atoms ---------------- */

function TopBar({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-4">
      {onBack && (
        <button onClick={onBack} className="text-[#122E16]0 hover:text-[#22452A] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="text-lg font-semibold text-[#122E16] tracking-tight">{title}</h1>
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
          <circle key={i} cx="70" cy="70" r={radius * r} fill="none" stroke="currentColor" strokeWidth="1" className="text-[#C6DBB8]" />
        ))}
        <circle
          cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="text-[#22452A] transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-[#122E16] font-mono">{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-[#122E16]0 mt-0.5">Soil Health</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, sub, accent }) {
  return (
    <div className="bg-white border border-[#B4CDA6] rounded-2xl p-3.5">
      <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-1">{label}</p>
      <p className="text-xl font-mono font-semibold text-[#122E16]">
        {value}<span className="text-xs text-[#122E16]0 ml-1">{unit}</span>
      </p>
      {sub && <p className={`text-[11px] mt-1 ${accent || "text-[#122E16]0"}`}>{sub}</p>}
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
      <p className="text-[11px] uppercase tracking-widest font-mono flex items-center gap-1.5 text-[#2C5137]">
        <span className={`w-1.5 h-1.5 rounded-full ${loc.source === "gps" ? "bg-[#3A6647] animate-pulse" : "bg-[#8AA891]"}`} />
        {sourceLabel}
      </p>

      <div className="flex items-center gap-1.5 mt-1">
        <MapPin className="w-4 h-4 text-[#122E16]0 flex-shrink-0" />
        <p className="text-[#122E16] text-base font-medium truncate">
          {loc.status === "requesting" ? "Detecting…" : loc.label || "Location not set"}
        </p>
      </div>

      {(loc.district || loc.state) && (
        <p className="text-[11px] text-[#122E16]0 mt-0.5">
          {[loc.district, loc.state, loc.postcode].filter(Boolean).join(" · ")}
        </p>
      )}

      {loc.lat != null && (
        <p className="text-[11px] font-mono text-[#122E16]0 mt-0.5">
          {loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}°
        </p>
      )}

      {loc.message && <p className="text-[11px] text-[#22452A]/70 mt-1">{loc.message}</p>}

      <div className="flex items-center gap-3 mt-2">
        <button onClick={requestGPS} className="text-[11px] text-[#2C5137] flex items-center gap-1">
          <Crosshair className="w-3 h-3" /> Use my GPS
        </button>
        <button onClick={() => setShowManual((s) => !s)} className="text-[11px] text-[#122E16]0 flex items-center gap-1">
          <Search className="w-3 h-3" /> Change
        </button>
      </div>

      {showManual && (
        <div className="flex items-center gap-2 mt-2 bg-white border border-[#B4CDA6] rounded-full px-3 py-1.5">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
            placeholder="e.g. Kilpauk, Chennai"
            className="flex-1 bg-transparent text-xs text-[#1B3F20] placeholder-[#7A9480] outline-none min-w-0" />
          <button onClick={submitManual} className="text-[#2C5137] flex-shrink-0"><Send className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Screens ---------------- */

function HomeScreen({ go, alerts = [], loc, weather, weatherStatus, requestGPS, setManualLocation, soil, soilStatus, climate }) {
  const current = weather?.current;
  const daily = weather?.daily;

  return (
    <div className="px-5 pb-28 space-y-5">
      <div className="flex items-start justify-between gap-3 pt-2">
        <LocationBlock loc={loc} requestGPS={requestGPS} setManualLocation={setManualLocation} />
        <button onClick={() => go("alerts")} className="relative bg-white border border-[#B4CDA6] p-2.5 rounded-full flex-shrink-0">
          <Bell className="w-5 h-5 text-[#55755B]" />
          {alerts.length > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono flex items-center justify-center ${
              alerts.some((a) => a.level === "danger") ? "bg-rose-500 text-white" : "bg-[#22452A] text-white"
            }`}>{alerts.length}</span>
          )}
        </button>
      </div>

      <div className="bg-white border border-[#B4CDA6] rounded-3xl p-6">
        {soilStatus === "loading" ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-[#22452A] animate-spin" />
            <p className="text-xs text-[#122E16]0">Analysing soil…</p>
          </div>
        ) : soil ? (
          <>
            <ContourRing score={soil.score} />
            <p className="text-center text-sm text-[#1B3F20] mt-3">{soil.soilName || soil.texture}</p>
            <p className="text-center text-[11px] text-[#122E16]0">{soil.texture}</p>
            <p className="text-center text-[11px] text-[#122E16]0 mt-0.5">
              {soil.measured
                ? (soil.exact ? "satellite survey at your coordinates" : `satellite survey ~${soil.offsetKm} km away`)
                : soil.region}
            </p>
          </>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-xs text-[#122E16]0 text-center px-4">No soil survey coverage for this location.</p>
          </div>
        )}
        <button
          onClick={() => go("soil")}
          className="w-full mt-5 bg-[#22452A] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#2F5C38] transition-colors"
        >
          Full Soil Analysis <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Soil Type" value={soil?.soilName || soil?.texture || "—"} unit=""
          sub={soil ? (soil.measured ? "satellite survey" : "regional map") : "no data"} accent="text-[#2C5137]" />
        <MetricCard label="pH Level" value={soil?.ph ?? "—"} unit=""
          sub={soil?.ph == null ? "" : soil.ph < 6 ? "Acidic" : soil.ph > 7.5 ? "Alkaline" : "Near neutral"} />
        <MetricCard label="Organic Carbon" value={soil?.soc ?? "—"} unit="%" sub={levelFor(soil?.soc, 0.75, 2.0)} />
        <MetricCard label="Rainfall / yr" value={climate?.annualRainfall ?? "—"} unit="mm"
          sub={climate ? `${climate.monthlyRainfall} mm monthly avg` : "loading"} />
      </div>

      <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4">
        {weatherStatus === "loading" && (
          <div className="flex items-center gap-2 text-[#122E16]0 text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching live weather…
          </div>
        )}
        {weatherStatus === "error" && <p className="text-rose-600 text-sm">Couldn't load live weather.</p>}
        {weatherStatus === "ready" && current && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1B3F20] flex items-center gap-2">
                <WeatherIcon code={current.weather_code} className="w-4 h-4 text-[#22452A]" />
                {Math.round(current.temperature_2m)}°C · {weatherCodeToText(current.weather_code)}
              </p>
              <p className="text-xs text-[#122E16]0 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" /> {Math.round(current.relative_humidity_2m)}%
              </p>
            </div>
            {daily && (
              <div className="flex justify-between">
                {daily.time.slice(0, 5).map((day, i) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#122E16]0">
                      {i === 0 ? "Today" : new Date(day).toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="text-xs font-mono text-[#55755B]">{Math.round(daily.temperature_2m_max[i])}°</span>
                    <span className="text-[10px] text-[#2C5137]">{daily.precipitation_probability_max[i]}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-sm font-medium text-[#1B3F20]">Crop Recommendation</p>
          <button onClick={() => go("soil")} className="text-[11px] text-[#22452A]">Run analysis</button>
        </div>
        <button onClick={() => go("soil")} className="w-full bg-white border border-[#B4CDA6] rounded-2xl p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-[#DFEBD6] flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-[#2C5137]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[#1B3F20]">Get AI crop recommendation</p>
            <p className="text-[11px] text-[#122E16]0">Based on your soil pH, climate and rainfall</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#122E16]0" />
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
    { label: "Clay", value: soil.clay, color: "bg-[#A0522D]" },
    { label: "Sand", value: soil.sand, color: "bg-[#2F5C38]" },
    { label: "Silt", value: soil.silt, color: "bg-[#3A6647]" },
  ] : [];

  const inputCls = "w-full bg-[#DFEBD6] border border-[#B4CDA6] rounded-lg px-3 py-2 text-sm text-[#122E16] placeholder-[#7A9480] outline-none focus:border-[#22452A]";

  return (
    <div className="px-5 pb-28">
      <TopBar title="Soil Analysis" onBack={() => go("home")} />

      {soilStatus === "loading" && (
        <div className="bg-white border border-[#B4CDA6] rounded-2xl p-5 mb-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-[#22452A] animate-spin" />
          <p className="text-sm text-[#122E16]0">Reading soil survey data for your coordinates…</p>
        </div>
      )}

      {soilStatus === "nodata" && (
        <div className="bg-white border border-rose-300 rounded-2xl p-5 mb-4">
          <p className="text-sm text-rose-700 mb-1">No soil data available</p>
          <p className="text-xs text-[#122E16]0">This location falls outside both satellite survey coverage and the regional soil map.</p>
        </div>
      )}

      {soilStatus === "regional" && (
        <div className="bg-[#22452A]/12 border border-[#22452A]/30 rounded-2xl p-3 mb-4">
          <p className="text-[11px] text-[#2F5C38]/90 leading-relaxed">
            Satellite soil survey has no coverage at this point, so values come from the documented
            regional soil map. A Soil Health Card test gives field-specific accuracy.
          </p>
        </div>
      )}

      {soil && (
        <>
          <div className="bg-white border border-[#B4CDA6] rounded-2xl p-5 mb-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-1">Detected Soil Type</p>
                <p className="text-2xl font-semibold text-[#122E16]">{soil.soilName || soil.texture}</p>
                {soil.soilName && <p className="text-sm text-[#122E16]0 mt-0.5">{soil.texture} texture</p>}
                {soil.region && <p className="text-[11px] text-[#2C5137] mt-1">{soil.region}</p>}
                <p className="text-[11px] text-[#122E16]0 mt-1">
                  {soil.measured
                    ? (soil.exact ? soil.source : `${soil.source} · nearest point ~${soil.offsetKm} km`)
                    : soil.source}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-1">Health</p>
                <p className="text-3xl font-mono font-semibold text-[#22452A]">{soil.score}</p>
              </div>
            </div>

            {soil.clay != null && soil.measured && (
              <>
                <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-2">Particle Composition</p>
                <div className="flex h-3 rounded-full overflow-hidden mb-2">
                  {composition.map((c) => (
                    <div key={c.label} className={c.color} style={{ width: `${c.value}%` }} />
                  ))}
                </div>
                <div className="flex gap-4 mb-4">
                  {composition.map((c) => (
                    <div key={c.label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${c.color}`} />
                      <span className="text-[11px] text-[#122E16]0">{c.label} {c.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {soil.notes && (
              <div className="bg-[#DFEBD6] rounded-xl p-3 mb-3">
                <p className="text-[11px] text-[#122E16]0 leading-relaxed">{soil.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#B4CDA6]">
              <div>
                <p className="text-[11px] text-[#122E16]0 mb-0.5">pH</p>
                <p className="text-lg font-mono text-[#122E16]">{soil.ph ?? "—"}</p>
                <p className="text-[10px] text-[#122E16]0">
                  {soil.ph == null ? "" : soil.ph < 6 ? "Acidic" : soil.ph > 7.5 ? "Alkaline" : "Near neutral"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#122E16]0 mb-0.5">Organic C</p>
                <p className="text-lg font-mono text-[#122E16]">{soil.soc ?? "—"}<span className="text-xs text-[#122E16]0">%</span></p>
                <p className="text-[10px] text-[#122E16]0">{levelFor(soil.soc, 0.75, 2.0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#122E16]0 mb-0.5">Total N</p>
                <p className="text-lg font-mono text-[#122E16]">{soil.nitrogen ?? "—"}<span className="text-xs text-[#122E16]0"> g/kg</span></p>
                <p className="text-[10px] text-[#122E16]0">{levelFor(soil.nitrogen, 1.0, 2.5)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[#1B3F20]">Soil test values</p>
              <button onClick={() => setShowTest((s) => !s)} className="text-[11px] text-[#2C5137]">
                {showTest ? "Hide" : "Add for higher accuracy"}
              </button>
            </div>
            {!showTest && (
              <p className="text-[11px] text-[#122E16]0 leading-relaxed">
                Satellite data gives pH and texture, but not plant-available N, P and K.
                Adding those from a Soil Health Card raises prediction confidence from around 40% to over 90%.
              </p>
            )}
            {showTest && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {["N", "P", "K"].map((k) => (
                    <div key={k}>
                      <label className="block text-[11px] text-[#122E16]0 mb-1">{k} (kg/ha)</label>
                      <input value={test[k]} onChange={(e) => setTest({ ...test, [k]: e.target.value })}
                        placeholder="0" inputMode="decimal" className={inputCls} />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#122E16]0">From your Soil Health Card. Typical ranges: N 0-140, P 5-145, K 5-205.</p>
              </>
            )}
          </div>

          <button
            onClick={runPrediction}
            disabled={loading}
            className="w-full mb-4 bg-[#3A6647] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Running AI prediction…</>) : "Run AI Crop Recommendation"}
          </button>

          {result?.error && (
            <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 mb-4">
              <p className="text-rose-700 text-xs">{result.error}</p>
            </div>
          )}

          {result && !result.error && (
            <div className="mb-6">
              <div className="bg-white border border-[#3A6647] rounded-2xl p-5 mb-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[#2C5137] mb-1">Best Match</p>
                    <p className="text-2xl font-semibold text-[#122E16] capitalize">{result.recommended_crop}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-mono font-semibold text-[#2C5137]">{result.confidence}%</p>
                    <p className="text-[10px] text-[#122E16]0">confidence</p>
                  </div>
                </div>

                {result.all_predictions?.[0]?.info && (
                  <div className="grid grid-cols-4 gap-2 py-3 border-t border-[#B4CDA6] mt-2">
                    {[["Season","season"],["Duration","duration"],["Water","water"],["Yield","yield"]].map(([lab,key]) => (
                      <div key={key}>
                        <p className="text-[10px] text-[#122E16]0">{lab}</p>
                        <p className="text-[11px] text-[#55755B]">{result.all_predictions[0].info[key] || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-[#122E16]0 border-t border-[#B4CDA6] pt-2">
                  {result.mode === "full" ? "7-feature model · 99.55% test accuracy" : "4-feature model · 96.36% test accuracy"}
                </p>
              </div>

              {result.alternatives?.length > 0 && (
                <>
                  <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-2 px-1">Also suitable</p>
                  <div className="space-y-2 mb-3">
                    {result.alternatives.map((a) => (
                      <div key={a.crop} className="bg-white border border-[#B4CDA6] rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[#1B3F20] capitalize">{a.crop}</p>
                          <p className="text-[10px] text-[#122E16]0">
                            {[a.info?.season, a.info?.duration, a.info?.water && `${a.info.water} water`].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <span className="font-mono text-sm text-[#122E16]0">{a.confidence}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {result.mode === "measurable" && (
                <div className="bg-[#22452A]/12 border border-[#22452A]/30 rounded-xl p-3">
                  <p className="text-[11px] text-[#2F5C38]/90 leading-relaxed">
                    Confidence is spread across several crops because pH and climate alone can suit many of them.
                    Add your soil-test N, P and K values above for a much sharper recommendation.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-3">Inputs used for prediction</p>
            <div className="grid grid-cols-2 gap-y-2 text-[11px]">
              <span className="text-[#122E16]0">Soil pH</span>
              <span className="text-[#55755B] font-mono text-right">{soil.ph ?? "—"}</span>
              <span className="text-[#122E16]0">Temperature</span>
              <span className="text-[#55755B] font-mono text-right">
                {weather?.current ? `${Math.round(weather.current.temperature_2m)}°C` : "—"}
              </span>
              <span className="text-[#122E16]0">Humidity</span>
              <span className="text-[#55755B] font-mono text-right">
                {weather?.current ? `${Math.round(weather.current.relative_humidity_2m)}%` : "—"}
              </span>
              <span className="text-[#122E16]0">Rainfall (monthly avg)</span>
              <span className="text-[#55755B] font-mono text-right">
                {climate ? `${climate.monthlyRainfall} mm` : "—"}
              </span>
              {climate && (<>
                <span className="text-[#122E16]0">Rainfall (past year)</span>
                <span className="text-[#55755B] font-mono text-right">{climate.annualRainfall} mm</span>
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
          <button onClick={openCamera} className="w-full border-2 border-dashed border-[#9BBB8A] rounded-3xl py-14 flex flex-col items-center justify-center gap-3 hover:border-[#22452A] transition-colors">
            <div className="bg-white p-4 rounded-full"><Camera className="w-7 h-7 text-[#22452A]" /></div>
            <p className="text-[#55755B] text-sm font-medium">Open camera to scan a leaf</p>
          </button>
          {cameraError && <p className="text-rose-600 text-xs text-center px-4">{cameraError}</p>}
          <button onClick={() => fileRef.current?.click()} className="w-full border border-[#B4CDA6] rounded-2xl py-3 flex items-center justify-center gap-2 text-[#122E16]0 text-sm">
            <Upload className="w-4 h-4" /> Upload a photo instead
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {state === "camera" && (
        <div className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-white border border-[#B4CDA6]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-80 object-cover" />
            <button onClick={reset} className="absolute top-3 right-3 bg-[#DFEBD6]/70 p-2 rounded-full">
              <X className="w-4 h-4 text-[#1B3F20]" />
            </button>
          </div>
          <button onClick={capturePhoto} className="w-full bg-[#22452A] text-white font-semibold py-3 rounded-xl">Capture Photo</button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {state === "analyzing" && (
        <div className="py-16 flex flex-col items-center gap-4">
          {imageSrc && <img src={imageSrc} alt="Captured leaf" className="w-40 h-40 object-cover rounded-2xl mb-2" />}
          <Loader2 className="w-8 h-8 text-[#22452A] animate-spin" />
          <p className="text-[#122E16]0 text-sm">Analyzing leaf texture &amp; lesion pattern…</p>
        </div>
      )}

      {state === "result" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#B4CDA6] rounded-3xl overflow-hidden">
            <div className="h-48 bg-[#DFEBD6]">
              {imageSrc && <img src={imageSrc} alt="Captured leaf" className="w-full h-full object-cover" />}
            </div>
            <div className="p-5">
              {diagnosis?.error ? (
                <div className="py-2">
                  <p className="text-rose-700 text-sm font-medium mb-1">Detection unavailable</p>
                  <p className="text-[#122E16]0 text-xs">{diagnosis.error}</p>
                </div>
              ) : diagnosis ? (
                <>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className={`text-lg font-semibold ${diagnosis.is_healthy ? "text-[#2C5137]" : "text-[#122E16]"}`}>
                      {diagnosis.disease}
                    </p>
                    <span className="text-[#22452A] font-mono text-sm flex-shrink-0">{diagnosis.confidence}%</span>
                  </div>
                  <p className="text-xs text-[#122E16]0 mb-1">Detected on {diagnosis.crop}</p>
                  <p className="text-[10px] text-[#122E16]0 mb-4">
                    MobileNetV2 · 38 classes · {diagnosis.model_accuracy}% test accuracy
                  </p>

                  {diagnosis.alternatives?.length > 0 && (
                    <div className="mb-4 bg-[#DFEBD6] rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wide text-[#122E16]0 mb-1.5">Other possibilities</p>
                      {diagnosis.alternatives.map((alt, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-[#122E16]0">
                          <span>{alt.disease} ({alt.crop})</span>
                          <span className="font-mono">{alt.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-2">Recommended actions</p>
                  <ul className="space-y-2">
                    {diagnosis.actions.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-sm text-[#55755B]">
                        <CheckCircle2 className="w-4 h-4 text-[#2C5137] mt-0.5 flex-shrink-0" />{a}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
          <button onClick={reset} className="w-full border border-[#9BBB8A] text-[#55755B] py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Scan another leaf
          </button>
        </div>
      )}
    </div>
  );
}


function WaterScreen({ go, weather, profile, soil }) {
  const [crop, setCrop] = useState("groundnut");
  const [acres, setAcres] = useState(acresFromFarmSize(profile?.farmSize));
  const [acreInput, setAcreInput] = useState(String(acresFromFarmSize(profile?.farmSize)));

  const daily = weather?.daily;
  const et0vals = (daily?.et0_fao_evapotranspiration || []).filter((v) => v != null);
  const et0 = et0vals.length ? et0vals.reduce((a, b) => a + b, 0) / et0vals.length : null;
  const rain7 = (daily?.precipitation_sum || []).filter((v) => v != null).reduce((a, b) => a + b, 0);

  const result = et0 != null
    ? calculateWater({ et0, rainfall7day: rain7, crop, acres, irrigationSources: profile?.irrigation })
    : null;

  const applyAcres = (v) => {
    setAcreInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0 && n <= 10000) setAcres(n);
  };

  const cropOptions = Object.keys(CROP_KC);
  const inputCls = "w-full bg-white border border-[#B4CDA6] rounded-xl px-4 py-3 text-[#122E16] outline-none focus:border-[#22452A]";

  return (
    <div className="px-5 pb-28">
      <TopBar title="Water Requirement" onBack={() => go("home")} />

      <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4 mb-4">
        <label className="block text-sm text-[#22452A] mb-2">Crop</label>
        <select value={crop} onChange={(e) => setCrop(e.target.value)} className={inputCls + " mb-4"}>
          {cropOptions.map((c) => (
            <option key={c} value={c}>{CROP_KC[c].label}</option>
          ))}
        </select>

        <label className="block text-sm text-[#22452A] mb-2">Land area (acres)</label>
        <input value={acreInput} onChange={(e) => applyAcres(e.target.value)}
          inputMode="decimal" className={inputCls} />
        <div className="flex gap-2 mt-2">
          {[0.5, 1, 2, 5, 10].map((a) => (
            <button key={a} onClick={() => applyAcres(String(a))}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                acres === a ? "bg-[#22452A] text-white border-[#22452A]" : "bg-white text-[#33553A] border-[#B4CDA6]"
              }`}>
              {a} ac
            </button>
          ))}
        </div>
      </div>

      {!result && (
        <div className="bg-white border border-[#B4CDA6] rounded-2xl p-6 text-center">
          <Loader2 className="w-5 h-5 text-[#22452A] animate-spin mx-auto mb-2" />
          <p className="text-sm text-[#4A6B50]">Loading evapotranspiration data for your location…</p>
        </div>
      )}

      {result && (
        <>
          <div className="bg-white border-2 border-[#22452A] rounded-2xl p-5 mb-4">
            <p className="text-[11px] uppercase tracking-wide text-[#3A6647] mb-1">Daily water requirement</p>
            <p className="text-4xl font-mono font-semibold text-[#122E16]">
              {result.litresPerDay.toLocaleString()}
              <span className="text-lg text-[#4A6B50] ml-2">litres/day</span>
            </p>
            <p className="text-sm text-[#33553A] mt-1">
              {result.m3PerDay} m³ · {result.grossNeed} mm/day over {acres} acre{acres !== 1 ? "s" : ""}
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#B4CDA6]">
              <div>
                <p className="text-[11px] text-[#55755B]">Per week</p>
                <p className="text-lg font-mono text-[#122E16]">{(result.litresPerWeek / 1000).toFixed(1)} m³</p>
              </div>
              <div>
                <p className="text-[11px] text-[#55755B]">Pump running time</p>
                <p className="text-lg font-mono text-[#122E16]">{result.pumpHoursPerDay} hrs/day</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4 mb-4">
            <p className="text-[11px] uppercase tracking-wide text-[#55755B] mb-3">How this is calculated</p>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#4A6B50]">Reference evapotranspiration (ET₀)</span>
                <span className="font-mono text-[#122E16]">{result.et0} mm/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A6B50]">Crop coefficient (K<sub>c</sub>) — {result.cropLabel}</span>
                <span className="font-mono text-[#122E16]">× {result.kc}</span>
              </div>
              <div className="flex justify-between border-t border-[#DFEBD6] pt-2">
                <span className="text-[#4A6B50]">Crop water use (ET<sub>c</sub>)</span>
                <span className="font-mono text-[#122E16]">{result.etc} mm/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A6B50]">Less effective rainfall</span>
                <span className="font-mono text-[#122E16]">− {result.effectiveRain} mm/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A6B50]">Net irrigation need</span>
                <span className="font-mono text-[#122E16]">{result.netNeed} mm/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A6B50]">System efficiency ({result.efficiency.label})</span>
                <span className="font-mono text-[#122E16]">÷ {(result.efficiency.value * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between border-t border-[#B4CDA6] pt-2">
                <span className="text-[#22452A] font-medium">Gross water to apply</span>
                <span className="font-mono text-[#22452A] font-medium">{result.grossNeed} mm/day</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4 mb-4">
            <p className="text-[11px] uppercase tracking-wide text-[#55755B] mb-3">Full season estimate</p>
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-2xl font-mono font-semibold text-[#122E16]">
                {(result.seasonTotalLitres / 1000000).toFixed(2)}
              </p>
              <p className="text-sm text-[#4A6B50]">million litres</p>
            </div>
            <p className="text-[12px] text-[#4A6B50]">
              {result.seasonTotalMm} mm over roughly {result.seasonDays} days for {acres} acre{acres !== 1 ? "s" : ""}
            </p>
          </div>

          {(!profile?.irrigation?.length || profile.irrigation.includes("Rain-fed only")) && (
            <div className="bg-[#22452A]/10 border border-[#22452A]/30 rounded-xl p-3 mb-4">
              <p className="text-[12px] text-[#22452A] leading-relaxed">
                Switching to a drip system would cut this requirement by roughly 35% compared with
                flood or canal irrigation, by reducing evaporation and runoff losses.
              </p>
            </div>
          )}

          <p className="text-[11px] text-[#55755B] leading-relaxed">
            Calculated using the FAO-56 Penman-Monteith method. ET₀ comes from live weather data for your
            location; crop coefficients are FAO standard values for the mid-season stage. Actual needs vary
            with growth stage, soil type and local conditions — treat this as a planning estimate.
          </p>
        </>
      )}
    </div>
  );
}

function GuideScreen({ go }) {
  return (
    <div className="px-5 pb-28">
      <TopBar title="Groundnut · Crop Guide" onBack={() => go("home")} />
      <div className="relative pl-6">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-[#C6DBB8]" />
        <div className="space-y-6">
          {LIFECYCLE.map((s) => (
            <div key={s.stage} className="relative">
              <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
                s.status === "done" ? "bg-[#3A6647] border-[#3A6647]" :
                s.status === "current" ? "bg-[#22452A] border-[#22452A] animate-pulse" :
                "bg-white border-[#9BBB8A]"}`} />
              <p className={`text-sm font-medium ${s.status === "upcoming" ? "text-[#122E16]0" : "text-[#122E16]"}`}>{s.stage}</p>
              <p className="text-xs text-[#122E16]0 mt-0.5">{s.detail}</p>
              {s.status === "current" && (
                <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide text-[#22452A] bg-[#22452A]/12 px-2 py-0.5 rounded-full">In progress</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsScreen({ go, alerts, notifPermission, requestNotifications }) {
  const styles = {
    danger:  { color: "text-rose-600",  bg: "bg-rose-400/10",  border: "border-rose-300",  label: "Urgent" },
    warning: { color: "text-[#22452A]", bg: "bg-[#22452A]/12", border: "border-[#22452A]/30", label: "Attention" },
    info:    { color: "text-[#2C5137]",  bg: "bg-[#3A6647]/12",  border: "border-[#3A6647]/30",  label: "Advisory" },
  };
  const iconFor = (k) => {
    if (k === "rain") return CloudRain;
    if (k === "drought" || k === "heat") return Sun;
    if (k === "disease") return Leaf;
    if (k === "wind") return Wind;
    if (k === "soil") return Sprout;
    if (k === "calendar") return CalendarCheck;
    return AlertTriangle;
  };

  const counts = alerts.reduce((a, x) => ({ ...a, [x.level]: (a[x.level] || 0) + 1 }), {});

  return (
    <div className="px-5 pb-28">
      <TopBar title="Alerts & Advisories" onBack={() => go("home")} />

      <div className="flex gap-2 mb-4">
        {["danger", "warning", "info"].map((lvl) => (
          <div key={lvl} className={`flex-1 rounded-xl p-3 ${styles[lvl].bg} border ${styles[lvl].border}`}>
            <p className={`text-xl font-mono font-semibold ${styles[lvl].color}`}>{counts[lvl] || 0}</p>
            <p className="text-[10px] text-[#122E16]0">{styles[lvl].label}</p>
          </div>
        ))}
      </div>

      {notifPermission !== "granted" && (
        <button
          onClick={requestNotifications}
          className="w-full bg-white border border-[#B4CDA6] rounded-2xl p-4 mb-4 flex items-center gap-3 text-left hover:border-[#3A6647]/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#3A6647]/12 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-[#2C5137]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[#1B3F20]">Turn on device notifications</p>
            <p className="text-[11px] text-[#122E16]0">
              {notifPermission === "denied"
                ? "Blocked — enable notifications for this site in your browser settings"
                : "Get urgent weather and disease warnings on this device"}
            </p>
          </div>
        </button>
      )}

      {notifPermission === "granted" && (
        <div className="bg-[#3A6647]/12 border border-[#3A6647]/30 rounded-xl p-3 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2C5137] flex-shrink-0" />
          <p className="text-[11px] text-[#2C5137]">Device notifications are on for urgent alerts.</p>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="bg-white border border-[#B4CDA6] rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-[#2C5137] mx-auto mb-3" />
          <p className="text-sm text-[#55755B]">No advisories right now</p>
          <p className="text-[11px] text-[#122E16]0 mt-1">Conditions look stable. Check back after weather changes.</p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((a) => {
          const S = styles[a.level];
          const Icon = iconFor(a.icon);
          return (
            <div key={a.id} className={`bg-white border ${S.border} rounded-2xl p-4`}>
              <div className="flex gap-3">
                <div className={`${S.bg} p-2 rounded-xl h-fit flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${S.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-[#122E16]">{a.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${S.bg} ${S.color} flex-shrink-0`}>
                      {a.time}
                    </span>
                  </div>
                  <p className="text-xs text-[#122E16]0 leading-relaxed mb-2">{a.body}</p>
                  {a.action && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-[#B4CDA6]">
                      <ChevronRight className={`w-3.5 h-3.5 ${S.color}`} />
                      <p className={`text-[11px] ${S.color}`}>{a.action}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[#122E16]0 mt-4 leading-relaxed">
        Advisories are generated from live weather, your soil profile and the current season.
        They are guidance, not a substitute for local extension advice.
      </p>
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
              m.from === "user" ? "bg-[#22452A] text-white" : "bg-white border border-[#B4CDA6] text-[#1B3F20]"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#B4CDA6] rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[#22452A] animate-spin" />
              <span className="text-xs text-[#122E16]0">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)}
              className="text-[11px] text-[#122E16]0 border border-[#B4CDA6] rounded-full px-3 py-1.5">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="sticky bottom-24 flex items-center gap-2 bg-white border border-[#B4CDA6] rounded-full px-2 py-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about your crop…"
          className="flex-1 bg-transparent text-sm text-[#1B3F20] placeholder-[#7A9480] outline-none px-2 min-w-0"
        />
        <button onClick={send} className="bg-[#22452A] p-2 rounded-full flex-shrink-0"><Send className="w-4 h-4 text-white" /></button>
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
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#DFEBD6]/95 backdrop-blur border-t border-[#B4CDA6]">
      <div className="max-w-md mx-auto flex justify-between px-3 pt-2 pb-5">
        {tabs.map((t) => {
          const Icon = t.icon; const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => go(t.id)} className="flex flex-col items-center gap-1 flex-1 py-1">
              <Icon className={`w-5 h-5 ${isActive ? "text-[#22452A]" : "text-[#122E16]0"}`} />
              <span className={`text-[10px] ${isActive ? "text-[#22452A]" : "text-[#122E16]0"}`}>{t.label}</span>
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
const IRRIGATION = ["Rain-fed only", "Borewell", "Open well", "Canal", "Farm pond / Tank", "Drip system", "Sprinkler", "River / Stream"];
const SEASONS = ["Kharif (Jun-Oct)", "Rabi (Nov-Mar)", "Zaid / Summer (Apr-Jun)", "Perennial / Year-round"];
const GOALS = ["Maximize yield", "Reduce input cost", "Switch to organic", "Improve soil health"];

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-sm border transition-colors text-left ${
        selected
          ? "bg-[#22452A] text-white border-[#22452A] font-medium"
          : "bg-white text-[#55755B] border-[#B4CDA6] hover:border-[#9BBB8A]"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="mb-5">
      <label className="block text-sm text-[#55755B] mb-1">{label}</label>
      {hint && <p className="text-[11px] text-[#122E16]0 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function WelcomeScreen({ onEnter, loc, weather, savedProfile, soil, soilStatus, climate, alerts }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({
    name: "", phone: "", village: "", farmSize: "", experience: "",
    irrigation: [], season: [], currentCrop: "", goals: [],
  });

  const isReturning = Boolean(savedProfile);
  const temp = weather?.current?.temperature_2m;
  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
  const toggleGoal = (g) =>
    setP((prev) => ({ ...prev, goals: prev.goals.includes(g) ? prev.goals.filter((x) => x !== g) : [...prev.goals, g] }));
  const toggleIrrigation = (v) =>
    setP((prev) => ({ ...prev, irrigation: prev.irrigation.includes(v) ? prev.irrigation.filter((x) => x !== v) : [...prev.irrigation, v] }));
  const toggleSeason = (v) =>
    setP((prev) => ({ ...prev, season: prev.season.includes(v) ? prev.season.filter((x) => x !== v) : [...prev.season, v] }));

  const inputCls = "w-full bg-white border border-[#B4CDA6] rounded-xl px-4 py-3 text-[#122E16] placeholder-[#7A9480] outline-none focus:border-[#22452A] transition-colors";

  /* ---------- Returning user ---------- */
  if (isReturning) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#B4CDA6] flex items-center justify-center">
              <Sprout className="w-7 h-7 text-[#22452A]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3A6647] animate-pulse" />
              <span className="text-[11px] font-mono tracking-widest text-[#2C5137]">FIELD ACTIVE</span>
            </div>
          </div>

          <p className="text-[11px] font-mono tracking-[0.2em] text-[#2C5137] mb-2">HARVESTIQ</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#122E16] mb-2">Welcome back, {savedProfile.name}</h1>
          <p className="text-sm text-[#122E16]0 mb-1">
            {loc?.label || savedProfile.village || "Locating your field…"}
            {temp != null && ` · ${Math.round(temp)}°C`}
          </p>
          <p className="text-[11px] text-[#122E16]0 mb-8">
            {[savedProfile.farmSize, soil?.texture, (savedProfile.irrigation || []).join(", ")].filter(Boolean).join(" · ")}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-1">Soil Health</p>
              <p className="text-2xl font-mono font-semibold text-[#122E16]">{soil?.score ?? "—"}</p>
            </div>
            <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-1">Crop Day</p>
              <p className="text-2xl font-mono font-semibold text-[#122E16]">45</p>
            </div>
            <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wide text-[#122E16]0 mb-1">Soil pH</p>
              <p className="text-2xl font-mono font-semibold text-[#22452A]">{soil?.ph ?? "—"}</p>
            </div>
          </div>

          <div className="bg-white border-l-2 border-[#22452A] p-4 mb-6">
            <p className="text-[11px] uppercase tracking-wide text-[#22452A] mb-1">
              {alerts?.length ? `Needs attention (${alerts.length})` : "Field status"}
            </p>
            <p className="text-sm text-[#55755B]">
              {alerts?.[0] ? `${alerts[0].title} — ${alerts[0].action || ""}` : "No urgent advisories right now."}
            </p>
          </div>

          <button
            onClick={() => onEnter(savedProfile)}
            className="w-full bg-[#22452A] text-white font-semibold py-3.5 rounded-xl hover:bg-[#2F5C38] transition-colors flex items-center justify-center gap-2"
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
    { title: "Water and season", sub: "Irrigation access determines which crops are realistic.", valid: p.irrigation.length > 0 && p.season.length > 0 },
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
      <div className="hidden lg:flex flex-col justify-between w-2/5 border-r border-[#B4CDA6] p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.10] pointer-events-none">
          <svg viewBox="0 0 400 800" className="w-full h-full">
            {[...Array(14)].map((_, i) => (
              <path key={i}
                d={`M-50 ${60 + i * 58} Q 100 ${20 + i * 58}, 200 ${60 + i * 58} T 450 ${60 + i * 58}`}
                fill="none" stroke="#22452A" strokeWidth="1.5" />
            ))}
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#22452A] flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-[#122E16]">HarvestIQ</span>
          </div>
          <p className="text-[11px] font-mono tracking-[0.2em] text-[#2C5137] ml-[3.25rem] -mt-1">
            PRECISION AGRICULTURE
          </p>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-semibold text-[#122E16] leading-tight mb-4">
            Every field tells a story.
            <br />
            <span className="text-[#22452A]">We help you read it.</span>
          </h2>
          <p className="text-sm text-[#122E16]0 leading-relaxed max-w-xs">
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
              <div className="w-8 h-8 rounded-lg bg-white border border-[#B4CDA6] flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-[#2C5137]" />
              </div>
              <p className="text-xs text-[#122E16]0">{f.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex lg:hidden items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#22452A] flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-mono tracking-[0.2em] text-[#2C5137]">HARVESTIQ</p>
            <p className="text-[11px] text-[#122E16]0">Precision agriculture platform</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-7">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[#22452A]" : "bg-[#C6DBB8]"}`} />
          ))}
        </div>

        <p className="text-[11px] font-mono text-[#122E16]0 mb-1">STEP {step + 1} OF {steps.length}</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-[#122E16] mb-1.5">{current.title}</h1>
        <p className="text-sm text-[#122E16]0 mb-7">{current.sub}</p>

        {step === 0 && (
          <>
            <Field label="Full name">
              <input value={p.name} onChange={(e) => set("name", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder="Your name" className={inputCls} />
            </Field>
            <Field label="Mobile number" hint="Optional — stored for future SMS alerts (not yet active; alerts currently come through this app and device notifications)">
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
            <div className="bg-white border border-[#B4CDA6] rounded-2xl p-4 mt-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-[#2C5137]" />
                  <p className="text-sm text-[#1B3F20]">Auto-detected from your location</p>
                </div>
                {(soilStatus === "loading" || loc?.status === "requesting") && (
                  <Loader2 className="w-3.5 h-3.5 text-[#22452A] animate-spin" />
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] text-[#122E16]0">Location</span>
                  <span className="text-[11px] text-[#1B3F20] text-right">{loc?.label || "detecting…"}</span>
                </div>
                {loc?.postcode && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#122E16]0">PIN code</span>
                    <span className="text-[11px] font-mono text-[#1B3F20]">{loc.postcode}</span>
                  </div>
                )}
                {loc?.lat != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#122E16]0">Coordinates</span>
                    <span className="text-[11px] font-mono text-[#1B3F20]">
                      {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                    </span>
                  </div>
                )}

                <div className="border-t border-[#B4CDA6] pt-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#122E16]0">Soil type</span>
                    <span className="text-[11px] text-[#2C5137] font-medium text-right">
                      {soilStatus === "loading" ? "analysing…" : (soil?.soilName || soil?.texture || "no data")}
                    </span>
                  </div>
                  {soil?.ph != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#122E16]0">Soil pH</span>
                      <span className="text-[11px] font-mono text-[#1B3F20]">{soil.ph}</span>
                    </div>
                  )}
                  {soil?.texture && soil?.soilName && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#122E16]0">Texture</span>
                      <span className="text-[11px] text-[#1B3F20]">{soil.texture}</span>
                    </div>
                  )}
                  {soil?.region && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[11px] text-[#122E16]0">Soil region</span>
                      <span className="text-[11px] text-[#1B3F20] text-right">{soil.region}</span>
                    </div>
                  )}
                  {soil?.clay != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#122E16]0">Composition</span>
                      <span className="text-[11px] font-mono text-[#1B3F20]">
                        {soil.clay}% clay · {soil.sand}% sand · {soil.silt}% silt
                      </span>
                    </div>
                  )}
                  {soil?.soc != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#122E16]0">Organic carbon</span>
                      <span className="text-[11px] font-mono text-[#1B3F20]">{soil.soc}%</span>
                    </div>
                  )}
                  {soil?.score != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#122E16]0">Soil health</span>
                      <span className="text-[11px] font-mono text-[#22452A]">{soil.score}/100</span>
                    </div>
                  )}
                </div>

                {(weather?.current || climate) && (
                  <div className="border-t border-[#B4CDA6] pt-2.5 space-y-2.5">
                    {weather?.current && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#122E16]0">Current weather</span>
                        <span className="text-[11px] font-mono text-[#1B3F20]">
                          {Math.round(weather.current.temperature_2m)}°C · {Math.round(weather.current.relative_humidity_2m)}% RH
                        </span>
                      </div>
                    )}
                    {climate && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#122E16]0">Annual rainfall</span>
                        <span className="text-[11px] font-mono text-[#1B3F20]">{climate.annualRainfall} mm</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {soil && soil.measured && !soil.exact && (
                <p className="text-[10px] text-[#22452A]/70 mt-3">
                  Nearest satellite survey point is ~{soil.offsetKm} km away.
                </p>
              )}
              {soil && !soil.measured && (
                <p className="text-[10px] text-[#22452A]/70 mt-3">
                  From the regional soil map — satellite survey has no coverage at this exact point.
                </p>
              )}
              {soilStatus === "nodata" && (
                <p className="text-[10px] text-rose-600/80 mt-3">
                  No soil survey coverage nearby. You can still use weather-based recommendations.
                </p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Irrigation source" hint="Select all that apply — many farms use more than one">
              <div className="grid grid-cols-2 gap-2">
                {IRRIGATION.map((i) => (
                  <Chip key={i} label={i} selected={p.irrigation.includes(i)} onClick={() => toggleIrrigation(i)} />
                ))}
              </div>
            </Field>
            <Field label="Growing season" hint="Select all you farm in — many farms crop across multiple seasons">
              <div className="grid grid-cols-1 gap-2">
                {SEASONS.map((s) => (
                  <Chip key={s} label={s} selected={p.season.includes(s)} onClick={() => toggleSeason(s)} />
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
              className="px-5 py-3.5 rounded-xl border border-[#B4CDA6] text-[#122E16]0 text-sm hover:border-[#9BBB8A] transition-colors">
              Back
            </button>
          )}
          <button
            onClick={next}
            disabled={!current.valid}
            className={`flex-1 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors ${
              current.valid ? "bg-[#22452A] text-white hover:bg-[#2F5C38]" : "bg-white text-[#122E16]0 cursor-not-allowed"
            }`}
          >
            {step === steps.length - 1 ? "Enter HarvestIQ" : "Continue"} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {!current.valid && (
          <p className="text-[11px] text-[#122E16]0 mt-3 text-center">
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
    { id: "water", icon: Droplets, label: "Water" },
    { id: "detect", icon: Camera, label: "Detect" },
    { id: "guide", icon: CalendarCheck, label: "Guide" },
    { id: "chat", icon: MessageCircle, label: "Assistant" },
    { id: "alerts", icon: Bell, label: "Alerts" },
  ];
  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-[#B4CDA6] min-h-screen px-4 py-6 flex-shrink-0">
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-9 h-9 rounded-xl bg-white border border-[#B4CDA6] flex items-center justify-center">
          <Sprout className="w-5 h-5 text-[#22452A]" />
        </div>
        <span className="text-sm font-semibold text-[#122E16]">HarvestIQ</span>
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
                isActive ? "bg-white text-[#22452A]" : "text-[#122E16]0 hover:text-[#55755B]"
              }`}
            >
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {profile && (
        <div className="px-3 py-3 border-t border-[#B4CDA6]">
          <p className="text-sm text-[#55755B]">{profile.name}</p>
          <p className="text-[11px] text-[#122E16]0">
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
    { id: "water", icon: Droplets, label: "Water" },
    { id: "detect", icon: Camera, label: "Detect" },
    { id: "chat", icon: MessageCircle, label: "Assistant" },
  ];
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#DFEBD6]/95 backdrop-blur border-t border-[#B4CDA6]">
      <div className="flex justify-between px-3 pt-2 pb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => go(t.id)} className="flex flex-col items-center gap-1 flex-1 py-1">
              <Icon className={`w-5 h-5 ${isActive ? "text-[#22452A]" : "text-[#122E16]0"}`} />
              <span className={`text-[10px] ${isActive ? "text-[#22452A]" : "text-[#122E16]0"}`}>{t.label}</span>
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
  const alerts = useMemo(
    () => generateAlerts({ weather, soil, climate, profile }),
    [weather, soil, climate, profile]
  );
  const { permission: notifPermission, requestNotifications } = useNotifications(alerts);
  const navTabs = ["home", "soil", "water", "detect", "guide", "chat", "alerts"];

  const screens = {
    home: <HomeScreen go={setScreen} alerts={alerts} loc={loc} weather={weather} weatherStatus={weatherStatus} requestGPS={requestGPS} setManualLocation={setManualLocation} soil={soil} soilStatus={soilStatus} climate={climate} />,
    soil: <SoilScreen go={setScreen} weather={weather} soil={soil} soilStatus={soilStatus} climate={climate} />,
    detect: <DetectScreen go={setScreen} />,
    guide: <GuideScreen go={setScreen} />,
    water: <WaterScreen go={setScreen} weather={weather} profile={profile} soil={soil} />,
    alerts: <AlertsScreen go={setScreen} alerts={alerts} notifPermission={notifPermission} requestNotifications={requestNotifications} />,
    chat: <ChatScreen go={setScreen} />,
  };

  const styleTag = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap');
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      body { font-family: 'Space Grotesk', sans-serif; background: #DFEBD6; }
    `}</style>
  );

  if (!entered) {
    return (
      <div className="min-h-screen bg-[#DFEBD6]">
        {styleTag}
        <WelcomeScreen
          loc={loc}
          weather={weather}
          soil={soil}
          soilStatus={soilStatus}
          climate={climate}
          savedProfile={profile}
          alerts={alerts}
          onEnter={(prof) => { setProfile(prof); setEntered(true); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#DFEBD6]">
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
