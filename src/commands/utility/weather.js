const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  WeatherError,
  fetchWeather,
  formatDay,
  placeLabel,
} = require('../../lib/weather');

function valueWithUnit(value, unit, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${unit}`;
}

function percent(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : '—';
}

function buildEmbed(client, weather, requestedBy) {
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
    footer: `Requested by ${requestedBy}  ·  Data from Open-Meteo`,
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
    ),

  async execute(interaction) {
    const location = interaction.options.getString('location', true);
    const units = interaction.options.getString('units') ?? 'metric';

    await interaction.deferReply();

    try {
      const weather = await fetchWeather(location, { units });
      await interaction.editReply({
        embeds: [buildEmbed(interaction.client, weather, interaction.user.username)],
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
