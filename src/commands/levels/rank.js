const {
  AttachmentBuilder,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getProfile } = require('../../lib/levels');
const { renderRankCard } = require('../../lib/rankCard');

function formatNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

function textEmbed(client, profile, displayName, requestedBy, image = null) {
  const { progress } = profile;
  const rank = profile.rank ? `#${profile.rank}` : 'Unranked';

  return createEmbed(client, {
    section: 'Levels',
    title: `${displayName}'s rank`,
    description: profile.entry
      ? `**Level ${progress.level}**  ·  Rank **${rank}** of **${formatNumber(profile.totalUsers)}**`
      : 'No XP yet — send a message in this server to start earning.',
    color: COLORS.brand,
    image,
    fields: [
      { name: '⭐ Level', value: `**${progress.level}**`, inline: true },
      { name: '🏆 Rank', value: `**${rank}**`, inline: true },
      { name: '✨ Total XP', value: `**${formatNumber(progress.totalXp)}**`, inline: true },
    ],
    footer: `Requested by ${requestedBy}  ·  +25–35 XP per message, once a minute`,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Show a member's level and XP rank card")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to show (defaults to you)'),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Levels are tracked per server. Run `/rank` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    await interaction.deferReply();

    let member = interaction.guild.members.cache.get(targetUser.id) ?? null;
    if (!member) {
      member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    }

    const displayName = member?.displayName ?? targetUser.displayName ?? targetUser.username;
    const avatarUrl = (member ?? targetUser).displayAvatarURL({
      extension: 'png',
      size: 256,
      forceStatic: true,
    });
    const profile = await getProfile(interaction.guild.id, targetUser.id);
    const fileName = `rank-${targetUser.id}.png`;

    let attachment = null;
    let image = null;

    try {
      const buffer = await renderRankCard({
        displayName,
        username: targetUser.username,
        avatarUrl,
        level: profile.progress.level,
        rank: profile.rank,
        totalUsers: profile.totalUsers,
        xpIntoLevel: profile.progress.intoLevel,
        xpNeeded: profile.progress.needed,
        totalXp: profile.progress.totalXp,
      });

      attachment = new AttachmentBuilder(buffer, { name: fileName });
      image = `attachment://${fileName}`;
    } catch (error) {
      console.warn(`[rank] Card rendering failed: ${error.message}`);
    }

    await interaction.editReply({
      embeds: [textEmbed(interaction.client, profile, displayName, interaction.user.username, image)],
      files: attachment ? [attachment] : [],
    });
  },
};
