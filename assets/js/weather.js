/* ============================================================================
   weather.js — pulls the current temperature for your location.
   ----------------------------------------------------------------------------
   Uses Open-Meteo (open-meteo.com): a FREE weather API that needs NO API key
   and NO signup. We log the temperature next to each day's counts so that,
   over time, the dashboard can show how sales move with the weather.
   If the internet is down, this just returns null and the app keeps working.
   ============================================================================ */

const Weather = (function () {
  "use strict";

  // WMO weather codes -> short description + emoji (a friendly subset)
  const CODES = {
    0:  ["Clear", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"],
    3:  ["Overcast", "☁️"], 45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
    51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Drizzle", "🌧️"],
    61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
    71: ["Light snow", "🌨️"], 73: ["Snow", "❄️"], 75: ["Heavy snow", "❄️"],
    80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Heavy showers", "⛈️"],
    95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
  };

  async function fetchCurrent(lat, lon) {
    const url = "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,weather_code&temperature_unit=fahrenheit";
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const c = data.current;
      const [desc, emoji] = CODES[c.weather_code] || ["—", "🌡️"];
      return { tempF: Math.round(c.temperature_2m), code: c.weather_code, desc, emoji };
    } catch {
      return null; // offline or blocked — app still works, just no weather logged
    }
  }

  return { fetchCurrent };
})();
