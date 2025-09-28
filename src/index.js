// ========= DOM Refs =========
const els = {
  dayTime: document.querySelector("#formatted-day-time"),
  city: document.querySelector(".current-city"),
  temp: document.querySelector(".current-temperature-value"),
  humidity: document.querySelector("#current-humidity"),
  wind: document.querySelector("#current-wind-speed"),
  desc: document.querySelector("#current-description"),
  form: document.querySelector("#search-form"),
  input: document.querySelector("#city-input"),
  icon: document.querySelector(".current-temperature-icon"), // <img>
};

// ========= API Config =========
const API_KEY = "bf84c5dt8ba6f1571of07a1c8e407cf3";
const UNIT = "metric";
const BASE = "https://api.shecodes.io/weather/v1/current";

// ========= TimeZoneDB Config =========
const TZDB_KEY = "ZSYV5RBNT2CW"; // your key
const TZDB_URL = "https://api.timezonedb.com/v2.1/get-time-zone";

// ========= Clock State =========
let baseUtcTime = null; // UTC timestamp from SheCodes (ms)
let baseSystemTime = null; // system time when data was fetched
let cityTimeZone = null; // IANA timezone (e.g. "Europe/London")
let clockTimer = null;

// ========= Small utilities =========
const tzCache = new Map(); // key: "lat,lon" rounded -> IANA tz

function roundCoord(n) {
  return Math.round(n * 100) / 100; // ~1km precision; good for cities
}

function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

// ========= Timezone via TimeZoneDB (coords) =========
async function resolveTimeZoneByCoords(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const key = `${roundCoord(lat)},${roundCoord(lon)}`;
  if (tzCache.has(key)) return tzCache.get(key);

  const url = `${TZDB_URL}?key=${encodeURIComponent(
    TZDB_KEY
  )}&format=json&by=position&lat=${lat}&lng=${lon}`;

  try {
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // TimeZoneDB returns: { status: "OK", zoneName: "Europe/London", ... }
    if (data?.status === "OK" && data?.zoneName) {
      tzCache.set(key, data.zoneName);
      return data.zoneName;
    }
    console.warn("TimeZoneDB unexpected payload:", data);
    return null;
  } catch (err) {
    console.warn("TimeZoneDB error:", err);
    return null;
  }
}

// ========= Clock Rendering =========
function updateClock() {
  if (!baseUtcTime || !baseSystemTime) return;

  // Advance from the UTC snapshot by elapsed real time
  const elapsed = Date.now() - baseSystemTime;
  const nowUtc = new Date(baseUtcTime + elapsed);

  const opts = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  if (cityTimeZone) {
    opts.timeZone = cityTimeZone; // render in the city's local time
  }

  els.dayTime.textContent = nowUtc.toLocaleString(undefined, opts);
}

function startClock() {
  if (clockTimer) clearInterval(clockTimer);

  // Render immediately
  updateClock();

  // Align to the next minute, then every minute
  const msToNextMinute = 60000 - (Date.now() % 60000);
  setTimeout(() => {
    updateClock();
    clockTimer = setInterval(updateClock, 60000);
  }, msToNextMinute);
}

// ========= API Calls =========
function getWeatherByCoords(lat, lon) {
  const url = `${BASE}?lat=${lat}&lon=${lon}&key=${API_KEY}&unit=${UNIT}`;
  axios.get(url).then(displayWeather).catch(showFallback);
}

function getWeatherByCity(city) {
  const url = `${BASE}?query=${encodeURIComponent(
    city
  )}&key=${API_KEY}&unit=${UNIT}`;
  axios.get(url).then(displayWeather).catch(showFallback);
}

// ========= Rendering =========
async function displayWeather({ data }) {
  console.log("🌦 Full API response:", data);

  if (data?.status === "not_found") {
    showFallback();
    return;
  }

  // Basic weather info
  els.city.textContent = data.city;
  els.temp.textContent = Math.round(Number(data.temperature?.current ?? 0));
  els.humidity.textContent = `${Number(data.temperature?.humidity ?? 0)}%`;
  els.wind.textContent = `${Number(data.wind?.speed ?? 0).toFixed(1)} km/h`;
  els.desc.textContent = data.condition?.description ?? "";

  // Weather icon (<img>)
  if (els.icon) {
    const iconUrl =
      data?.condition?.icon_url ||
      (data?.condition?.icon
        ? `https://shecodes-assets.s3.amazonaws.com/api/weather/icons/${data.condition.icon}.png`
        : "");
    els.icon.src = iconUrl;
    els.icon.alt = data.condition?.description || "Weather icon";
    els.icon.loading = "lazy";
    els.icon.decoding = "async";
  }

  // Save SheCodes UTC snapshot (seconds -> ms)
  baseUtcTime = Number(data.time) * 1000;
  baseSystemTime = Date.now();

  // Resolve timezone via TimeZoneDB using coordinates
  const { latitude, longitude } = data?.coordinates || {};
  cityTimeZone = await resolveTimeZoneByCoords(latitude, longitude);

  // If TimeZoneDB failed (rare), fall back to browser local tz (omit timeZone)
  console.log("🕐 Resolved timezone (TZDB):", cityTimeZone);

  startClock();
}

function showFallback() {
  els.city.textContent = "City not found";
  els.temp.textContent = "--";
  els.humidity.textContent = "--";
  els.wind.textContent = "--";
  els.desc.textContent = "--";
  els.dayTime.textContent = "--";

  if (els.icon) {
    els.icon.src = "";
    els.icon.alt = "";
  }

  baseUtcTime = null;
  baseSystemTime = null;
  cityTimeZone = null;

  if (clockTimer) clearInterval(clockTimer);
}

// ========= Search Handler =========
function onSearch(e) {
  e.preventDefault();
  const query = els.input.value.trim();
  if (!query) return;
  getWeatherByCity(query);
  e.target.reset();
}
els.form.addEventListener("submit", onSearch);

// ========= Init =========
function initDefaultCity() {
  if (!("geolocation" in navigator)) {
    getWeatherByCity("Paris");
  } else {
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        getWeatherByCoords(latitude, longitude);
      },
      () => {
        getWeatherByCity("Paris");
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }
}

initDefaultCity();
