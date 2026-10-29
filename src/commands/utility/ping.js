const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');

function formatUptime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function pingColor(gateway, roundtrip) {
  if (gateway >= 0 && gateway < 200 && roundtrip < 500) return COLORS.success;
  if (gateway < 500 && roundtrip < 1000) return COLORS.warning;
  return COLORS.danger;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot’s response time and connection'),

  async execute(interaction) {
    const client = interaction.client;
    await interaction.deferReply();

    const roundtrip = Math.max(
      0,
      Date.now() - (Number(interaction.createdTimestamp) || Date.now()),
    );
    const gateway = Number.isFinite(client.ws?.ping) ? Math.round(client.ws.ping) : -1;
    const uptime = formatUptime(client.uptime ?? process.uptime() * 1000);
    const status = client.isReady?.() ? '🟢 Online' : '🟡 Starting';

    const embed = createEmbed(client, {
      section: 'System',
      title: 'Pong!',
      description: [
        `**${roundtrip} ms** command round-trip`,
        `-# Gateway latency and bot connection details.`,
      ].join('\n'),
      color: pingColor(gateway, roundtrip),
      fields: [
        {
          name: '📶 Gateway',
          value: gateway >= 0 ? `**${gateway} ms**` : 'N/A',
          inline: true,
        },
        { name: '⚡ Round-trip', value: `**${roundtrip} ms**`, inline: true },
        { name: '⏱️ Uptime', value: uptime, inline: true },
        { name: '🟢 Status', value: status, inline: true },
      ],
      footer: `Requested by ${interaction.user.username}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
