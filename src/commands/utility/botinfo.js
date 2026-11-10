const { SlashCommandBuilder, version: discordVersion } = require('discord.js');
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

function formatNumber(value) {
  return Number(value).toLocaleString('en-US');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Show information about the bot'),

  async execute(interaction) {
    const client = interaction.client;
    const memberCount = client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
    const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

    const embed = createEmbed(client, {
      title: 'Bot Information',
      color: COLORS.brand,
      thumbnail: client.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields: [
        { name: '🌐 Servers', value: formatNumber(client.guilds.cache.size), inline: true },
        { name: '👥 Members', value: formatNumber(memberCount), inline: true },
        { name: '⌨️ Commands', value: formatNumber(client.commands.size), inline: true },
        { name: '📶 Ping', value: client.ws.ping >= 0 ? `${Math.round(client.ws.ping)} ms` : '—', inline: true },
        {
          name: '⏱️ Uptime',
          value: formatUptime(client.uptime ?? process.uptime() * 1000),
          inline: true,
        },
        { name: '🧠 Memory', value: `${memoryMb} MB`, inline: true },
      ],
      footer: `Requested by ${interaction.user.username}  ·  discord.js v${discordVersion}  ·  Node ${process.version}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
