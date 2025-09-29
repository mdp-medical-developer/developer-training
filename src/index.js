// --- Config: SheCodes API ---
const API_KEY = "bf84c5dt8ba6f1571of07a1c8e407cf3";
const UNIT = "metric";
const BASE_CURRENT = "https://api.shecodes.io/weather/v1/current";
const BASE_FORECAST = "https://api.shecodes.io/weather/v1/forecast";

// --- Config: TimeZoneDB (for city local time by coords) ---
const TZDB_KEY = "ZSYV5RBNT2CW";
const TZDB_URL = "https://api.timezonedb.com/v2.1/get-time-zone";

// --- Select elements ---
const els = {
  city: document.querySelector(".current-city"),
  temp: document.querySelector(".current-temperature-value"),
  humidity: document.querySelector("#current-humidity"),
  wind: document.querySelector("#current-wind-speed"),
  desc: document.querySelector("#current-description"),
  icon: document.querySelector(".current-temperature-icon"),
  form: document.querySelector("#search-form"),
  input: document.querySelector("#city-input"),
  forecast: document.querySelector("#forecast"),
  observed: document.querySelector("#observed-time"),
};

// Holds the current city's IANA timezone, e.g. "Europe/London"
let currentTimeZone = null;

// --- Helpers ---
function iconUrl(condition) {
  if (condition && condition.icon_url) return condition.icon_url;
  if (condition && condition.icon) {
    return `https://shecodes-assets.s3.amazonaws.com/api/weather/icons/${condition.icon}.png`;
  }
  return "";
}

function weekday(unix) {
  const date = new Date(unix * 1000);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: currentTimeZone || undefined,
  });
}

function formatObservedTime(unix) {
  const date = new Date(unix * 1000);
  return date.toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: currentTimeZone || undefined,
  });
}

// Get IANA timezone from coordinates using TimeZoneDB
async function getTimeZoneByCoords(lat, lon) {
  const url = `${TZDB_URL}?key=${encodeURIComponent(
    TZDB_KEY
  )}&format=json&by=position&lat=${lat}&lng=${lon}`;
  const res = await fetch(url);
  const data = await res.json();
  // Expecting { status: "OK", zoneName: "Europe/London", ... }
  if (data && data.status === "OK" && data.zoneName) {
    return data.zoneName;
  }
  return null; // if it fails, we'll just let the browser default apply
}

// --- Render current weather ---
function renderCurrent(data) {
  els.city.textContent = data.city || "";
  els.temp.textContent = Math.round(data.temperature.current);
  els.humidity.textContent = data.temperature.humidity + "%";
  els.wind.textContent = data.wind.speed.toFixed(1) + " km/h";
  els.desc.textContent = data.condition.description || "";
  els.icon.src = iconUrl(data.condition);
  els.icon.alt = data.condition.description || "Weather icon";

  if (els.observed) {
    els.observed.textContent =
      "Observed at: " + formatObservedTime(data.time) + " (Local Time)";
  }
}

// --- Render 5-day forecast ---
function renderForecast(data) {
  const daily = (data.daily || []).slice(0, 5);
  let html = "";

  daily.forEach(function (day) {
    const max = Math.round(day.temperature.maximum);
    const min = Math.round(day.temperature.minimum);
    const url = iconUrl(day.condition);
    const alt = day.condition.description || "Weather icon";

    html += `
      <div class="weather-forecast-day">
        <div class="weather-forecast-date">${weekday(day.time)}</div>
        <div class="weather-forecast-icon">
          <img src="${url}" alt="${alt}" />
        </div>
        <div class="weather-forecast-temperature"><strong>${max}°</strong>${min}°</div>
      </div>
    `;
  });

  els.forecast.innerHTML = html;
}

// --- Fetch weather + forecast by CITY and set timezone ---
async function loadCity(city) {
  const [current, forecast] = await Promise.all([
    axios.get(
      `${BASE_CURRENT}?query=${encodeURIComponent(
        city
      )}&key=${API_KEY}&unit=${UNIT}`
    ),
    axios.get(
      `${BASE_FORECAST}?query=${encodeURIComponent(
        city
      )}&key=${API_KEY}&unit=${UNIT}`
    ),
  ]);

  // Resolve timezone from coords
  const coords = current.data && current.data.coordinates;
  currentTimeZone = coords
    ? await getTimeZoneByCoords(coords.latitude, coords.longitude)
    : null;

  renderCurrent(current.data);
  renderForecast(forecast.data);
}

// --- Fetch weather + forecast by COORDS and set timezone ---
async function loadByCoords(lat, lon) {
  const [current, forecast] = await Promise.all([
    axios.get(
      `${BASE_CURRENT}?lat=${lat}&lon=${lon}&key=${API_KEY}&unit=${UNIT}`
    ),
    axios.get(
      `${BASE_FORECAST}?lat=${lat}&lon=${lon}&key=${API_KEY}&unit=${UNIT}`
    ),
  ]);

  // Resolve timezone from coords
  currentTimeZone = await getTimeZoneByCoords(lat, lon);

  renderCurrent(current.data);
  renderForecast(forecast.data);
}

// --- Search event ---
els.form.addEventListener("submit", function (e) {
  e.preventDefault();
  const city = els.input.value.trim();
  if (city) {
    loadCity(city);
  }
  e.target.reset();
});

// --- Initial load: try geolocation first, else default to London ---
function init() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        loadCity("London");
      }
    );
  } else {
    loadCity("London");
  }
}

init();
