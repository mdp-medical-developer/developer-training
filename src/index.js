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
  icon: document.querySelector(".current-temperature-icon"),
};

// ========= API Config =========
const API_KEY = "bf84c5dt8ba6f1571of07a1c8e407cf3";
const UNIT = "metric";
const BASE = "https://api.shecodes.io/weather/v1/current";

// ========= Clock State =========
let baseUtcTime = null; // UTC timestamp from SheCodes (ms)
let baseSystemTime = null; // system time when data was fetched
let cityTimeZone = null; // IANA timezone (e.g. "Asia/Singapore")
let clockTimer = null;

// ========= Timezone Fetch =========
// This calls WorldTimeAPI to get the IANA timezone dynamically.
async function getTimeZone(city) {
  try {
    const response = await fetch(`https://worldtimeapi.org/api/timezone`);
    const zones = await response.json();

    // Try to find a match based on the city name
    const match = zones.find((z) =>
      z.toLowerCase().includes(city.toLowerCase())
    );
    return match || null;
  } catch (err) {
    console.warn("⚠️ Could not fetch timezone. Defaulting to local.", err);
    return null;
  }
}

// ========= Clock Rendering =========
function updateClock() {
  if (!baseUtcTime || !baseSystemTime) return;

  const elapsed = Date.now() - baseSystemTime;
  const nowUtc = new Date(baseUtcTime + elapsed);

  const options = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  // ✅ Apply city timezone if we found one
  if (cityTimeZone) {
    options.timeZone = cityTimeZone;
  }

  els.dayTime.textContent = nowUtc.toLocaleString(undefined, options);
}

function startClock() {
  if (clockTimer) clearInterval(clockTimer);
  updateClock();
  clockTimer = setInterval(updateClock, 60000);
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

  // Basic weather info
  els.city.textContent = data.city;
  els.temp.textContent = Math.round(data.temperature.current);
  els.humidity.textContent = `${data.temperature.humidity}%`;
  els.wind.textContent = `${Number(data.wind.speed).toFixed(1)} km/h`;
  els.desc.textContent = data.condition.description;

  const iconUrl =
    data?.condition?.icon_url ||
    `https://shecodes-assets.s3.amazonaws.com/api/weather/icons/${data.condition.icon}.png`;

  els.icon.src = iconUrl;
  els.icon.alt = data.condition.description || "Weather icon";
  els.icon.loading = "lazy";
  els.icon.decoding = "async";

  // ✅ Step 1: Save UTC time
  baseUtcTime = data.time * 1000;
  baseSystemTime = Date.now();

  // ✅ Step 2: Fetch actual IANA timezone dynamically
  cityTimeZone = await getTimeZone(data.city);
  console.log("🕐 Resolved timezone:", cityTimeZone);

  // ✅ Step 3: Start ticking clock
  startClock();
}

function showFallback() {
  els.city.textContent = "City not found";
  els.temp.textContent = "--";
  els.humidity.textContent = "--";
  els.wind.textContent = "--";
  els.desc.textContent = "--";
  els.dayTime.textContent = "--";

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
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords: { latitude, longitude } }) =>
      getWeatherByCoords(latitude, longitude),
    () => getWeatherByCity("Paris"),
    {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 5 * 60 * 1000,
    }
  );
}

initDefaultCity();
