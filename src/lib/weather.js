const GEOCODE_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (compatible; ZenBot/1.12; +https://github.com/jumayusiii/Juma-Habbo-Bot)';

const WEATHER_CODES = Object.freeze({
  0: { label: 'Clear sky', emoji: '☀️', night: '🌙' },
  1: { label: 'Mainly clear', emoji: '🌤️', night: '🌙' },
  2: { label: 'Partly cloudy', emoji: '⛅', night: '☁️' },
  3: { label: 'Overcast', emoji: '☁️' },
  45: { label: 'Fog', emoji: '🌫️' },
  48: { label: 'Rime fog', emoji: '🌫️' },
  51: { label: 'Light drizzle', emoji: '🌦️' },
  53: { label: 'Drizzle', emoji: '🌦️' },
  55: { label: 'Dense drizzle', emoji: '🌧️' },
  56: { label: 'Light freezing drizzle', emoji: '🌧️' },
  57: { label: 'Freezing drizzle', emoji: '🌧️' },
  61: { label: 'Light rain', emoji: '🌦️' },
  63: { label: 'Rain', emoji: '🌧️' },
  65: { label: 'Heavy rain', emoji: '🌧️' },
  66: { label: 'Light freezing rain', emoji: '🌧️' },
  67: { label: 'Freezing rain', emoji: '🌧️' },
  71: { label: 'Light snow', emoji: '🌨️' },
  73: { label: 'Snow', emoji: '🌨️' },
  75: { label: 'Heavy snow', emoji: '❄️' },
  77: { label: 'Snow grains', emoji: '🌨️' },
  80: { label: 'Light showers', emoji: '🌦️' },
  81: { label: 'Showers', emoji: '🌧️' },
  82: { label: 'Violent showers', emoji: '⛈️' },
  85: { label: 'Snow showers', emoji: '🌨️' },
  86: { label: 'Heavy snow showers', emoji: '❄️' },
  95: { label: 'Thunderstorm', emoji: '⛈️' },
  96: { label: 'Thunderstorm with hail', emoji: '⛈️' },
  99: { label: 'Severe thunderstorm with hail', emoji: '⛈️' },
});

const UNIT_LABELS = Object.freeze({
  metric: { temperature: '°C', wind: 'km/h', precipitation: 'mm' },
  imperial: { temperature: '°F', wind: 'mph', precipitation: 'in' },
});

class WeatherError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WeatherError';
    this.code = code;
  }
}

function cleanText(value, maxLength = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** WMO weather code to a readable label and emoji. */
function weatherInfo(code, isDay = true) {
  const info = WEATHER_CODES[Number(code)];
  if (!info) return { label: 'Unknown conditions', emoji: '❓' };
  return {
    label: info.label,
    emoji: !isDay && info.night ? info.night : info.emoji,
  };
}

function geocodeUrl(name) {
  const url = new URL(GEOCODE_ENDPOINT);
  url.searchParams.set('name', name);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  return url.href;
}

function forecastUrl(place, units = 'metric') {
  const imperial = units === 'imperial';
  const url = new URL(FORECAST_ENDPOINT);
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '4',
    temperature_unit: imperial ? 'fahrenheit' : 'celsius',
    wind_speed_unit: imperial ? 'mph' : 'kmh',
    precipitation_unit: imperial ? 'inch' : 'mm',
  }).toString();
  return url.href;
}

function normalizePlace(payload) {
  const result = Array.isArray(payload?.results) ? payload.results[0] : null;
  if (!result) return null;

  const latitude = Number(result.latitude);
  const longitude = Number(result.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: result.id ?? null,
    name: cleanText(result.name, 100),
    admin1: cleanText(result.admin1, 100) || null,
    country: cleanText(result.country, 100) || null,
    latitude,
    longitude,
    timezone: cleanText(result.timezone, 80) || 'UTC',
  };
}

function placeLabel(place) {
  const parts = [place.name, place.admin1, place.country].filter(Boolean);
  return [...new Set(parts)].join(', ');
}

function normalizeForecast(payload, units = 'metric') {
  const current = payload?.current;
  const daily = payload?.daily;

  if (!current || !daily || !Array.isArray(daily.time) || daily.time.length === 0) {
    throw new WeatherError('unavailable', 'The weather service returned no forecast. Please try again.');
  }

  const normalizedUnits = units === 'imperial' ? 'imperial' : 'metric';
  const info = weatherInfo(current.weather_code, current.is_day !== 0);
  const days = daily.time
    .slice(0, 4)
    .map((date, index) => {
      const dayInfo = weatherInfo(daily.weather_code?.[index], true);
      return {
        date: cleanText(date, 10),
        code: toNumber(daily.weather_code?.[index]) ?? 0,
        label: dayInfo.label,
        emoji: dayInfo.emoji,
        max: toNumber(daily.temperature_2m_max?.[index]),
        min: toNumber(daily.temperature_2m_min?.[index]),
        precipitationChance: toNumber(daily.precipitation_probability_max?.[index]),
      };
    })
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date));

  return {
    current: {
      time: cleanText(current.time, 32) || null,
      temperature: toNumber(current.temperature_2m),
      feelsLike: toNumber(current.apparent_temperature),
      humidity: toNumber(current.relative_humidity_2m),
      windSpeed: toNumber(current.wind_speed_10m),
      precipitation: toNumber(current.precipitation),
      code: toNumber(current.weather_code) ?? 0,
      label: info.label,
      emoji: info.emoji,
      isDay: current.is_day !== 0,
    },
    daily: days,
    units: UNIT_LABELS[normalizedUnits],
  };
}

function formatDay(date) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return date;

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

async function fetchJson(url, fetchImpl) {
  let response;

  try {
    response = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new WeatherError('unavailable', 'The weather service could not be reached right now. Please try again in a moment.');
  }

  if (!response.ok) {
    throw new WeatherError('unavailable', 'The weather service could not be reached right now. Please try again in a moment.');
  }

  try {
    return await response.json();
  } catch {
    throw new WeatherError('unavailable', 'The weather service returned an unreadable response. Please try again.');
  }
}

/**
 * Looks up a place and returns its current conditions plus a short forecast.
 *
 * @param {string} location
 * @param {{units?: 'metric'|'imperial', fetchImpl?: typeof fetch}} [options]
 */
async function fetchWeather(location, { units = 'metric', fetchImpl = globalThis.fetch } = {}) {
  const query = cleanText(location, 100);

  if (query.length < 2) {
    throw new WeatherError('invalid_location', 'Enter a city or place name between 2 and 100 characters.');
  }

  const normalizedUnits = units === 'imperial' ? 'imperial' : 'metric';
  const place = normalizePlace(await fetchJson(geocodeUrl(query), fetchImpl));

  if (!place) {
    throw new WeatherError('not_found', `I could not find **${query}**. Try a nearby city or a more specific place name.`);
  }

  const forecast = normalizeForecast(await fetchJson(forecastUrl(place, normalizedUnits), fetchImpl), normalizedUnits);
  return { place, ...forecast };
}

module.exports = {
  WeatherError,
  fetchWeather,
  forecastUrl,
  formatDay,
  geocodeUrl,
  normalizeForecast,
  normalizePlace,
  placeLabel,
  weatherInfo,
};
