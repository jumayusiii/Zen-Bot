const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { claimWork } = require('../../lib/economy');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work a short shift for coins every 45 minutes'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'economy.work.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);

    try {
      const result = await claimWork({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      if (!result.worked) {
        await interaction.reply({
          embeds: [
            createEmbed(interaction.client, {
              section: t(language, 'help.tabs.economy'),
              title: t(language, 'economy.work.alreadyTitle'),
              description: t(language, 'economy.work.alreadyDescription', {
                time: `<t:${Math.floor(result.nextAt / 1000)}:R>`,
              }),
              color: COLORS.warning,
              fields: [
                {
                  name: `💰 ${t(language, 'economy.balance')}`,
                  value: `**${coins(result.balance, language)}** ${t(language, 'common.coins')}`,
                  inline: true,
                },
              ],
              footer: t(language, 'economy.work.footerIdle'),
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        embeds: [
          createEmbed(interaction.client, {
            section: t(language, 'help.tabs.economy'),
            title: t(language, 'economy.work.completeTitle'),
            description: t(language, 'economy.work.completeDescription', {
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
                name: `⏰ ${t(language, 'economy.nextShift')}`,
                value: `<t:${Math.floor(result.nextAt / 1000)}:R>`,
                inline: true,
              },
            ],
            footer: t(language, 'economy.work.footer', { user: interaction.user.username }),
          }),
        ],
      });
    } catch (error) {
      console.error('[economy] /work failed:', error);
      await interaction.reply({
        content: t(language, 'economy.work.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
