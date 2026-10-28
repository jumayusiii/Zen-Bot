const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');

const VERIFICATION_LEVELS = {
  0: 'None',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Very High',
};

function timestamp(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `<t:${seconds}:F> (<t:${seconds}:R>)`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server'),

  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used inside a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);
    const channels = guild.channels.cache;
    const textChannels = channels.filter(
      (channel) =>
        channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement,
    ).size;
    const voiceChannels = channels.filter(
      (channel) =>
        channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice,
    ).size;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const embed = createEmbed(interaction.client, {
      section: 'Server Overview',
      title: guild.name,
      color: guild.members.me?.displayColor || COLORS.brand,
      thumbnail: guild.iconURL({ extension: 'png', size: 256, forceStatic: true }),
      image: guild.bannerURL({ extension: 'png', size: 1024, forceStatic: true }),
      description: guild.description?.slice(0, 4096) || 'A snapshot of this server and its setup.',
      footer: `Requested by ${interaction.user.username}`,
      fields: [
        {
          name: '👑 Owner',
          value: owner ? owner.toString() : `<@${guild.ownerId}>`,
          inline: true,
        },
        { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
        { name: '📅 Created', value: timestamp(guild.createdTimestamp), inline: true },
        { name: '👥 Members', value: guild.memberCount.toLocaleString('en-US'), inline: true },
        { name: '🎭 Roles', value: guild.roles.cache.size.toLocaleString('en-US'), inline: true },
        {
          name: '💬 Channels',
          value: `${channels.size.toLocaleString('en-US')} total\n${textChannels} text · ${voiceChannels} voice`,
          inline: true,
        },
        {
          name: '🚀 Boosts',
          value: `Level ${guild.premiumTier} · ${boostCount.toLocaleString('en-US')} boost${boostCount === 1 ? '' : 's'}`,
          inline: true,
        },
        {
          name: '🛡️ Verification',
          value: VERIFICATION_LEVELS[guild.verificationLevel] ?? 'Unknown',
          inline: true,
        },
        { name: '🌐 Language', value: guild.preferredLocale || 'Unknown', inline: true },
      ],
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
