const {
  AttachmentBuilder,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { CARD_THEMES, getCardTheme } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getAccount, setCardTheme } = require('../../lib/economy');
const { getProfile } = require('../../lib/levels');
const { renderRankCard } = require('../../lib/rankCard');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function formatNumber(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

function textEmbed(client, profile, displayName, requestedBy, language, image = null) {
  const { progress } = profile;
  const rank = profile.rank ? `#${profile.rank}` : t(language, 'levels.rank.unranked');

  return createEmbed(client, {
    section: t(language, 'help.tabs.levels'),
    title: t(language, 'levels.rank.title', { name: displayName }),
    description: profile.entry
      ? t(language, 'levels.rank.description', {
        level: progress.level,
        rank,
        total: formatNumber(profile.totalUsers, language),
      })
      : t(language, 'levels.rank.empty'),
    color: COLORS.brand,
    image,
    fields: [
      { name: `⭐ ${t(language, 'levels.rank.level')}`, value: `**${progress.level}**`, inline: true },
      { name: `🏆 ${t(language, 'levels.rank.rankLabel')}`, value: `**${rank}**`, inline: true },
      {
        name: `✨ ${t(language, 'levels.rank.totalXp')}`,
        value: `**${formatNumber(progress.totalXp, language)}**`,
        inline: true,
      },
    ],
    footer: t(language, 'levels.rank.footer', { user: requestedBy }),
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Show a member's rank card or equip an owned card theme")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to show (defaults to you)'),
    )
    .addStringOption((option) =>
      option
        .setName('theme')
        .setDescription('Equip an owned card theme instead of showing a card')
        .addChoices(...CARD_THEMES.map((theme) => ({ name: theme.name, value: theme.id }))),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'levels.rank.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const themeId = interaction.options.getString('theme');

    if (themeId) {
      try {
        const account = await getAccount(interaction.guild.id, interaction.user.id);
        if (!account.owned.includes(themeId)) {
          const theme = getCardTheme(themeId);
          await interaction.reply({
            content: t(language, 'levels.card.notOwned', {
              theme: theme.name,
              price: formatNumber(theme.price, language),
            }),
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const result = await setCardTheme({
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          themeId,
        });

        const embed = createEmbed(interaction.client, {
          section: t(language, 'help.tabs.levels'),
          title: t(language, 'levels.card.equippedTitle'),
          description: t(language, 'levels.card.equippedDescription', { theme: result.theme.name }),
          color: COLORS.success,
          fields: [
            { name: `🎨 ${t(language, 'economy.buy.theme')}`, value: result.theme.name, inline: true },
            {
              name: `💰 ${t(language, 'economy.balance')}`,
              value: `${formatNumber(result.balance, language)} ${t(language, 'common.coins')}`,
              inline: true,
            },
          ],
          footer: t(language, 'levels.card.equippedFooter'),
        });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error('[levels] /rank theme failed:', error);
        await interaction.reply({
          content: t(language, 'levels.card.error'),
          flags: MessageFlags.Ephemeral,
        });
      }
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
    const [profile, account] = await Promise.all([
      getProfile(interaction.guild.id, targetUser.id),
      getAccount(interaction.guild.id, targetUser.id).catch(() => null),
    ]);
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
        theme: account?.theme,
        language,
      });

      attachment = new AttachmentBuilder(buffer, { name: fileName });
      image = `attachment://${fileName}`;
    } catch (error) {
      console.warn(`[rank] Card rendering failed: ${error.message}`);
    }

    await interaction.editReply({
      embeds: [
        textEmbed(
          interaction.client,
          profile,
          displayName,
          interaction.user.username,
          language,
          image,
        ),
      ],
      files: attachment ? [attachment] : [],
    });
  },
};
