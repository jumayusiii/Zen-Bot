const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { claimDaily } = require('../../lib/economy');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coins and build a streak'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'economy.daily.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);

    try {
      const result = await claimDaily({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      if (!result.claimed) {
        const embed = createEmbed(interaction.client, {
          section: t(language, 'help.tabs.economy'),
          title: t(language, 'economy.daily.title'),
          description: t(language, 'economy.daily.alreadyDescription', {
            time: `<t:${Math.floor(result.nextAt / 1000)}:R>`,
          }),
          color: COLORS.warning,
          fields: [
            {
              name: `🔥 ${t(language, 'economy.streak')}`,
              value: t(language, result.streak === 1 ? 'economy.day' : 'economy.days', {
                count: result.streak,
              }),
              inline: true,
            },
            {
              name: `💰 ${t(language, 'economy.balance')}`,
              value: `**${coins(result.balance, language)}** ${t(language, 'common.coins')}`,
              inline: true,
            },
          ],
          footer: t(language, 'common.requestedBy', { user: interaction.user.username }),
        });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.economy'),
        title: t(language, 'economy.daily.claimedTitle'),
        description: t(language, 'economy.daily.description', {
          amount: coins(result.amount, language),
        }),
        color: COLORS.success,
        fields: [
          {
            name: `💰 ${t(language, 'economy.balance')}`,
            value: `**${coins(result.balance, language)}** ${t(language, 'common.coins')}`,
            inline: true,
          },
          {
            name: `🔥 ${t(language, 'economy.streak')}`,
            value: t(language, result.streak === 1 ? 'economy.day' : 'economy.days', {
              count: result.streak,
            }),
            inline: true,
          },
          {
            name: `⏰ ${t(language, 'economy.nextReward')}`,
            value: `<t:${Math.floor(result.nextAt / 1000)}:R>`,
            inline: true,
          },
        ],
        footer: t(language, 'economy.daily.footer'),
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[economy] /daily failed:', error);
      await interaction.reply({
        content: t(language, 'economy.daily.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
