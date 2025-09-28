// Build a single object of references so that the code is neat - no repeat of querySelector //
let els = {
  dayTime: document.querySelector("#formatted-day-time"),
  city: document.querySelector(".current-city"),
  temp: document.querySelector(".current-temperature-value"),
  humidity: document.querySelector("#current-humidity"),
  wind: document.querySelector("#current-wind-speed"),
  desc: document.querySelector("#current-description"),
  form: document.querySelector("#search-form"),
  input: document.querySelector("#city-input"),
};

// API configuration //
const API_KEY = "bf84c5dt8ba6f1571of07a1c8e407cf3";
const UNIT = "metric";
const BASE = "https://api.shecodes.io/weather/v1/current";

// Time formatting for a city ///
let currentOffsetSec = null;

// Time formatting //
function setDayTime(date) {
  els.dayTime.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Update the time to the city searched by the user//
function updateCityTime(offsetInSeconds) {
  if (typeof offsetInSeconds !== "number") return; // guard
  const nowUTC = Date.now() + new Date().getTimezoneOffset() * 60000;
  const cityTime = new Date(nowUTC + offsetInSeconds * 1000);
  setDayTime(cityTime);
}

// Automatic time update every minute without refreshing //
// setInterval(() => {
//   if (typeof currentOffsetSec === "number") {
//     updateCityTime(currentOffsetSec);
//   }
// }, 60 * 1000);

// API information fetch - by user's location and city//

function getWeatherByCoords(lat, lon) {
  const url = `${BASE}?lat=${lat}&lon=${lon}&key=${API_KEY}&unit=${UNIT}`;
  return axios.get(url).then(displayWeather).catch(showFallback);
}

function getWeatherByCity(city) {
  const url = `${BASE}?query=${encodeURIComponent(
    city
  )}&key=${API_KEY}&unit=${UNIT}`;
  return axios.get(url).then(displayWeather).catch(showFallback);
}

// Information rendering //
function displayWeather({ data }) {
  els.city.textContent = data.city;
  els.temp.textContent = Math.round(data.temperature.current);
  els.humidity.textContent = `${data.temperature.humidity}%`;
  els.wind.textContent = `${data.wind.speed.toFixed(1)} km/h`;
  els.desc.textContent = data.condition.description;

  function onSearch(click) {
    click.preventDefault();
    let input = document.querySelector("#city-input");
    let query = input.value.trim();
    if (!query) return;
    getWeather(query);
    click.target.reset();
  }

  document.querySelector("#search-form").addEventListener("submit", onSearch);

  function getWeather(lat, lon) {
    const apiUrl = `https://api.shecodes.io/weather/v1/current?lat=${lat}&lon=${lon}&key=${API_KEY}&unit=${UNIT}`;
    axios
      .get(apiUrl)
      .then(displayWeather)
      .catch(() => {
        els.city.textContent = "City not found";
        els.temp.textContent = "--";
        els.humidity.textContent = "--";
        els.wind.textContent = "--";
        els.desc.textContent = "--";
      });
  }

  // Update the time accoridng to the city searched using the offset//
  const offset =
    (data.timezone && typeof data.timezone === "object"
      ? data.timezone.offset
      : data.timezone) ?? null;

  if (typeof offset === "number") {
    currentOffsetSec = offset;
    updateCityTime(currentOffsetSec);
  } else if (typeof data.time === "number") {
    // Fallback if API gives a unix time instead of offset:
    // compute offset vs UTC right now using provided local timestamp
    const nowUTCms = Date.now() + new Date().getTimezoneOffset() * 60000;
    const localMs = data.time * 1000;
    currentOffsetSec = Math.round((localMs - nowUTCms) / 1000);
    updateCityTime(currentOffsetSec);
  } else {
    // Last resort: show user’s local time (not ideal, but avoids blank)
    currentOffsetSec = null;
    setDayTime(new Date());
  }
}

function showFallback() {
  els.city.textContent = "City not found";
  els.temp.textContent = "--";
  els.humidity.textContent = "--";
  els.wind.textContent = "--";
  els.desc.textContent = "--";
}

// Search handling //
function onSearch(e) {
  e.preventDefault();
  const query = els.input.value.trim();
  if (!query) return;
  getWeatherByCity(query);
  e.target.reset();
}

els.form.addEventListener("submit", onSearch);

function initDefaultCity() {
  if (!("geolocation" in navigator)) {
    getWeatherByCity("Paris"); // fallback if no geolocation
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      getWeatherByCoords(latitude, longitude);
    },
    () => {
      getWeatherByCity("Paris"); // fallback if denied/error
    },
    {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 5 * 60 * 1000,
    }
  );
}

initDefaultCity();
