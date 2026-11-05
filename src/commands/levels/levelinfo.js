const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_LEVEL, getProfile } = require('../../lib/levels');
const { getLevelReward } = require('../../lib/levelRewards');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function formatNumber(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelinfo')
    .setDescription('See how chat XP works and what your next level needs')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to inspect (defaults to you)'),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'levels.info.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const target = interaction.options.getUser('user') ?? interaction.user;
    const displayName = target.globalName ?? target.username;
    const [profile, reward] = await Promise.all([
      getProfile(interaction.guild.id, target.id),
      getLevelReward(interaction.guild.id),
    ]);

    const progress = profile.progress;
    const atMaxLevel = progress.level >= MAX_LEVEL;
    const remaining = atMaxLevel ? 0 : Math.max(0, progress.needed - progress.intoLevel);

    const fields = [
      {
        name: `⭐ ${t(language, 'levels.info.fields.level')}`,
        value: `**${progress.level}** / ${MAX_LEVEL}`,
        inline: true,
      },
      {
        name: `✨ ${t(language, 'levels.info.fields.xp')}`,
        value: progress.totalXp > 0
          ? `**${formatNumber(progress.totalXp, language)}** ${t(language, 'levels.info.total')}\n**${formatNumber(progress.intoLevel, language)} / ${formatNumber(progress.needed, language)}** ${t(language, 'levels.info.toNext')}`
          : t(language, 'levels.info.noData'),
        inline: true,
      },
      {
        name: `🏆 ${t(language, 'levels.info.fields.rank')}`,
        value: profile.rank
          ? `**#${profile.rank}** ${t(language, 'levels.info.of')} **${formatNumber(profile.totalUsers, language)}**`
          : t(language, 'levels.info.unranked'),
        inline: true,
      },
      {
        name: `📈 ${t(language, 'levels.info.fields.next')}`,
        value: atMaxLevel
          ? t(language, 'levels.info.maxLevel')
          : t(language, 'levels.info.nextValue', {
            remaining: formatNumber(remaining, language),
            next: progress.level + 1,
          }),
        inline: false,
      },
      {
        name: `💬 ${t(language, 'levels.info.fields.how')}`,
        value: t(language, 'levels.info.howValue'),
        inline: false,
      },
      {
        name: `🎁 ${t(language, 'levels.info.fields.reward')}`,
        value: reward
          ? t(language, 'levels.info.rewardValue', {
            role: `<@&${reward.roleId}>`,
            level: reward.level,
          })
          : t(language, 'levels.info.noReward'),
        inline: false,
      },
    ];

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.levels'),
      title: t(language, 'levels.info.title', { name: displayName }),
      description: t(language, 'levels.info.description', {
        level: progress.level,
        maxLevel: MAX_LEVEL,
        xp: formatNumber(progress.totalXp, language),
      }),
      color: COLORS.brand,
      thumbnail: target.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields,
      footer: t(language, 'common.requestedBy', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
