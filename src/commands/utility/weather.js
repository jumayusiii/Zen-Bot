const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  WeatherError,
  fetchWeather,
  formatDay,
  placeLabel,
} = require('../../lib/weather');
const { isWeatherPrivate, setWeatherPrivate } = require('../../lib/weatherPreferences');

function valueWithUnit(value, unit, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${unit}`;
}

function percent(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : '—';
}

function buildEmbed(client, weather, requestedBy, privateMode) {
  const { place, current, daily, units } = weather;
  const today = daily[0];
  const forecast = daily.length > 0
    ? daily
      .map((day, index) => {
        const label = index === 0 ? 'Today' : formatDay(day.date);
        return `**${label}** · ${day.emoji} ${valueWithUnit(day.max, units.temperature)} / ${valueWithUnit(day.min, units.temperature)} · ${percent(day.precipitationChance)} rain`;
      })
      .join('\n')
    : 'No daily forecast available.';

  return createEmbed(client, {
    section: 'Weather',
    title: `Weather for ${placeLabel(place)}`,
    url: 'https://open-meteo.com/',
    color: COLORS.info,
    description: `**${current.emoji} ${current.label}**  ·  **${valueWithUnit(current.temperature, units.temperature)}**`,
    fields: [
      {
        name: '🌡️ Temperature',
        value: `**${valueWithUnit(current.temperature, units.temperature)}**\nFeels like **${valueWithUnit(current.feelsLike, units.temperature)}**`,
        inline: true,
      },
      { name: '💧 Humidity', value: percent(current.humidity), inline: true },
      { name: '💨 Wind', value: valueWithUnit(current.windSpeed, ` ${units.wind}`), inline: true },
      { name: '🌧️ Precipitation', value: valueWithUnit(current.precipitation, ` ${units.precipitation}`, 1), inline: true },
      { name: '☔ Rain chance', value: today ? percent(today.precipitationChance) : '—', inline: true },
      { name: '🕒 Timezone', value: place.timezone || 'Unknown', inline: true },
      { name: `📅 Next days (${units.temperature})`, value: forecast, inline: false },
    ],
    footer: `Requested by ${requestedBy}  ·  Data from Open-Meteo${privateMode ? '  ·  Private to you' : ''}`,
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get the current weather and a short forecast for any place')
    .addStringOption((option) =>
      option
        .setName('location')
        .setDescription('City or place name, for example Berlin or New York')
        .setRequired(true)
        .setMaxLength(100),
    )
    .addStringOption((option) =>
      option
        .setName('units')
        .setDescription('Temperature and wind units')
        .addChoices(
          { name: 'Celsius (default)', value: 'metric' },
          { name: 'Fahrenheit', value: 'imperial' },
        ),
    )
    .addBooleanOption((option) =>
      option
        .setName('private')
        .setDescription('Only show the weather to you; remembered until you set private:false'),
    ),

  async execute(interaction) {
    const location = interaction.options.getString('location', true);
    const units = interaction.options.getString('units') ?? 'metric';
    const requestedPrivate = interaction.options.getBoolean('private');
    const userId = interaction.user?.id;
    let privateMode = requestedPrivate;

    if (privateMode === null || privateMode === undefined) {
      privateMode = userId
        ? await isWeatherPrivate(userId).catch((error) => {
          console.warn(`[weather] Could not read the private preference: ${error.message}`);
          return false;
        })
        : false;
    } else if (userId) {
      await setWeatherPrivate(userId, privateMode).catch((error) => {
        console.warn(`[weather] Could not save the private preference: ${error.message}`);
      });
    }

    await interaction.deferReply(privateMode ? { flags: MessageFlags.Ephemeral } : {});

    try {
      const weather = await fetchWeather(location, { units });
      await interaction.editReply({
        embeds: [buildEmbed(interaction.client, weather, interaction.user.username, privateMode)],
      });
    } catch (error) {
      console.warn(`[weather] Could not load ${location}: ${error.message}`);
      await interaction.editReply({
        content: error instanceof WeatherError
          ? error.message
          : 'I could not load the weather right now. Please try again in a moment.',
      });
    }
  },
};
