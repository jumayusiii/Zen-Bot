const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');

const {
  WeatherError,
  fetchWeather,
  forecastUrl,
  formatDay,
  geocodeUrl,
  normalizeForecast,
  normalizePlace,
  placeLabel,
  weatherInfo,
} = require('../src/lib/weather');

const weatherCommand = require('../src/commands/utility/weather');
const weatherPreferences = require('../src/lib/weatherPreferences');

let preferenceDirectory;

before(async () => {
  preferenceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-weather-'));
  process.env.WEATHER_PREFERENCES_FILE = path.join(preferenceDirectory, 'weather-preferences.json');
});

after(async () => {
  delete process.env.WEATHER_PREFERENCES_FILE;
  await fs.rm(preferenceDirectory, { recursive: true, force: true });
});

const PLACE_PAYLOAD = {
  results: [
    {
      id: 2950159,
      name: 'Berlin',
      admin1: 'Berlin',
      country: 'Germany',
      latitude: 52.52,
      longitude: 13.41,
      timezone: 'Europe/Berlin',
    },
  ],
};

const FORECAST_PAYLOAD = {
  current: {
    time: '2026-10-29T15:00',
    temperature_2m: 12.4,
    apparent_temperature: 10.8,
    relative_humidity_2m: 67,
    precipitation: 0.2,
    weather_code: 61,
    wind_speed_10m: 14.2,
    is_day: 1,
  },
  daily: {
    time: ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'],
    weather_code: [61, 2, 0, 3],
    temperature_2m_max: [18.2, 19.1, 17.4, 16.8],
    temperature_2m_min: [9.8, 10.2, 8.9, 8.1],
    precipitation_probability_max: [70, 20, 5, 15],
  },
};

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => payload,
  };
}

test('weather URLs encode the place and requested units', () => {
  const geo = new URL(geocodeUrl('New York'));
  assert.equal(geo.searchParams.get('name'), 'New York');
  assert.equal(geo.searchParams.get('count'), '1');

  const metric = new URL(forecastUrl({ latitude: 52.52, longitude: 13.41 }, 'metric'));
  assert.equal(metric.searchParams.get('latitude'), '52.52');
  assert.equal(metric.searchParams.get('longitude'), '13.41');
  assert.equal(metric.searchParams.get('temperature_unit'), 'celsius');
  assert.equal(metric.searchParams.get('wind_speed_unit'), 'kmh');
  assert.equal(metric.searchParams.get('precipitation_unit'), 'mm');
  assert.equal(metric.searchParams.get('forecast_days'), '4');

  const imperial = new URL(forecastUrl({ latitude: 40.7, longitude: -74 }, 'imperial'));
  assert.equal(imperial.searchParams.get('temperature_unit'), 'fahrenheit');
  assert.equal(imperial.searchParams.get('wind_speed_unit'), 'mph');
  assert.equal(imperial.searchParams.get('precipitation_unit'), 'inch');
});

test('WMO weather codes map to labels and night variants', () => {
  assert.equal(weatherInfo(0).label, 'Clear sky');
  assert.equal(weatherInfo(0).emoji, '☀️');
  assert.equal(weatherInfo(0, false).emoji, '🌙');
  assert.equal(weatherInfo(61).label, 'Light rain');
  assert.equal(weatherInfo(95).label, 'Thunderstorm');
  assert.equal(weatherInfo(999).emoji, '❓');
});

test('normalizePlace returns a usable place and placeLabel deduplicates names', () => {
  const place = normalizePlace(PLACE_PAYLOAD);
  assert.equal(place.name, 'Berlin');
  assert.equal(place.country, 'Germany');
  assert.equal(place.latitude, 52.52);
  assert.equal(place.timezone, 'Europe/Berlin');
  assert.equal(normalizePlace({ results: [] }), null);
  assert.equal(normalizePlace({ results: [{ name: 'Nowhere' }] }), null);
  assert.equal(placeLabel({ name: 'Berlin', admin1: 'Berlin', country: 'Germany' }), 'Berlin, Germany');
});

test('normalizeForecast maps current conditions, four days and unit labels', () => {
  const forecast = normalizeForecast(FORECAST_PAYLOAD, 'metric');
  assert.equal(forecast.current.temperature, 12.4);
  assert.equal(forecast.current.feelsLike, 10.8);
  assert.equal(forecast.current.humidity, 67);
  assert.equal(forecast.current.label, 'Light rain');
  assert.equal(forecast.current.emoji, '🌦️');
  assert.equal(forecast.daily.length, 4);
  assert.equal(forecast.daily[0].precipitationChance, 70);
  assert.equal(forecast.daily[1].label, 'Partly cloudy');
  assert.equal(forecast.units.temperature, '°C');

  const imperial = normalizeForecast(FORECAST_PAYLOAD, 'imperial');
  assert.equal(imperial.units.temperature, '°F');
  assert.equal(imperial.units.wind, 'mph');

  assert.throws(
    () => normalizeForecast({}, 'metric'),
    (error) => error instanceof WeatherError && error.code === 'unavailable',
  );
});

test('fetchWeather geocodes first and then requests the forecast', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return jsonResponse(calls.length === 1 ? PLACE_PAYLOAD : FORECAST_PAYLOAD);
  };

  const weather = await fetchWeather('Berlin', { fetchImpl });
  assert.equal(weather.place.name, 'Berlin');
  assert.equal(weather.current.temperature, 12.4);
  assert.equal(weather.daily[0].max, 18.2);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /geocoding-api\.open-meteo\.com/);
  assert.match(calls[1], /api\.open-meteo\.com/);
});

test('fetchWeather reports invalid, missing and failed lookups', async () => {
  await assert.rejects(
    fetchWeather(' ', { fetchImpl: async () => jsonResponse(PLACE_PAYLOAD) }),
    (error) => error instanceof WeatherError && error.code === 'invalid_location',
  );

  await assert.rejects(
    fetchWeather('Atlantis', { fetchImpl: async () => jsonResponse({ results: [] }) }),
    (error) => error instanceof WeatherError && error.code === 'not_found',
  );

  await assert.rejects(
    fetchWeather('Berlin', { fetchImpl: async () => ({ ok: false, status: 503 }) }),
    (error) => error instanceof WeatherError && error.code === 'unavailable',
  );
});

test('formatDay renders a stable forecast label', () => {
  assert.match(formatDay('2026-10-29'), /Oct 29/);
  assert.equal(formatDay('not-a-date'), 'not-a-date');
});

async function runWeatherCommand(privateMode, userId = '400000000000000001') {
  let deferredReply;
  let editedReply;
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    await weatherCommand.execute({
      options: {
        getString(name) {
          if (name === 'location') return ' ';
          if (name === 'units') return 'metric';
          assert.fail(`unexpected string option: ${name}`);
        },
        getBoolean(name) {
          assert.equal(name, 'private');
          return privateMode;
        },
      },
      user: { id: userId },
      deferReply: async (payload) => {
        deferredReply = payload;
      },
      editReply: async (payload) => {
        editedReply = payload;
      },
    });
  } finally {
    console.warn = originalWarn;
  }

  return { deferredReply, editedReply };
}

test('/weather exposes a private boolean switch', () => {
  const privateOption = weatherCommand.data.toJSON().options.find((option) => option.name === 'private');
  assert.ok(privateOption);
  assert.equal(privateOption.type, ApplicationCommandOptionType.Boolean);
  assert.equal(privateOption.required, false);
  assert.match(privateOption.description, /remembered/i);
});

test('/weather remembers private replies per member until turned off', async () => {
  const userId = '400000000000000021';
  const otherId = '400000000000000022';

  let result = await runWeatherCommand(undefined, userId);
  assert.deepEqual(result.deferredReply, {});
  assert.equal(await weatherPreferences.isWeatherPrivate(userId), false);

  result = await runWeatherCommand(true, userId);
  assert.equal(result.deferredReply.flags, MessageFlags.Ephemeral);
  assert.equal(await weatherPreferences.isWeatherPrivate(userId), true);

  result = await runWeatherCommand(undefined, userId);
  assert.equal(result.deferredReply.flags, MessageFlags.Ephemeral);

  result = await runWeatherCommand(undefined, otherId);
  assert.deepEqual(result.deferredReply, {});

  result = await runWeatherCommand(false, userId);
  assert.deepEqual(result.deferredReply, {});
  assert.equal(await weatherPreferences.isWeatherPrivate(userId), false);

  result = await runWeatherCommand(undefined, userId);
  assert.deepEqual(result.deferredReply, {});
});

test('/weather defers an ephemeral reply when private is enabled', async () => {
  const { deferredReply, editedReply } = await runWeatherCommand(true, '400000000000000011');
  assert.equal(deferredReply.flags, MessageFlags.Ephemeral);
  assert.match(editedReply.content, /between 2 and 100 characters/);
});

test('/weather keeps public replies when private is off', async () => {
  const { deferredReply, editedReply } = await runWeatherCommand(false, '400000000000000012');
  assert.deepEqual(deferredReply, {});
  assert.match(editedReply.content, /between 2 and 100 characters/);
});
