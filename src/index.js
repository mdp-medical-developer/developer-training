//// Build a single object of references so that the code is neat - no repeat of querySelector //////
let els = {
  dayTime: document.querySelector("#formatted-day-time"),
  city: document.querySelector(".current-city"),
  temp: document.querySelector(".current-temperature-value"),
  humidity: document.querySelector("#current-humidity"),
  wind: document.querySelector("#current-wind-speed"),
  desc: document.querySelector("#current-description"),
};

function updateTime() {
  els.dayTime.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

//// Undefined maps to the user's timezone //////
//// calling to the dayTime of the object els (essentially id = formatted-day-time) //////

updateTime();

// If I want to refresh the page every minute - but this could reset the user's city search to Paris///
// setInterval(updateTime, 60 * 1000);

function onSearch(click) {
  click.preventDefault();
  let input = document.querySelector("#city-input");
  let query = input.value.trim();
  if (!query) return;
  getWeather(query);
  click.target.reset();
}

/// Prevent the form's default page reload///
/// Read and trim the input value ///
/// if empty, do nothing, otherwise fetch the weather of the city ///
/// Clears the input after submission ///

document.querySelector("#search-form").addEventListener("submit", onSearch);

const API_KEY = "bf84c5dt8ba6f1571of07a1c8e407cf3";
const UNIT = "metric";

/// API information - constant ///

function getWeather(city) {
  const apiUrl = `https://api.shecodes.io/weather/v1/current?query=${encodeURIComponent(
    city
  )}&key=${API_KEY}&unit=${UNIT}`;
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

/// encodeURIComponent to handle special characters in city names to prevent errors e.g. %20 = space ///
/// axios to fetch the data ///
/// on success (use of .then), call displayWeather ///
/// on failure (use of .catch), shows a simple fallback statue like N/A ///

function displayWeather({ data }) {
  els.city.textContent = data.city;
  els.temp.textContent = Math.round(data.temperature.current);
  els.humidity.textContent = `${data.temperature.humidity}%`;
  els.wind.textContent = `${data.wind.speed.toFixed(1)} km/h`;
  els.desc.textContent = data.condition.description;
}

/// Input city is automatically formatted by the API, so I removed the coding to format characters ///

getWeather("Paris");
/// Initial load: show Paris by default ///
/// Maybe I can build a function to get the user's location later? ///
