const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  STEAL_COOLDOWN_MS,
  STEAL_MAX,
  STEAL_MIN,
  STEAL_SUCCESS_CHANCE,
  attemptSteal,
} = require('../../lib/economy');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const COOLDOWN_MINUTES = Math.round(STEAL_COOLDOWN_MS / 60000);
const CHANCE_PERCENT = Math.round(STEAL_SUCCESS_CHANCE * 100);

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription(`Try to lift ${STEAL_MIN}–${STEAL_MAX} coins from the vault every ${COOLDOWN_MINUTES} minutes`),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'economy.steal.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);

    try {
      const result = await attemptSteal({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      if (result.reason === 'cooldown') {
        await interaction.reply({
          embeds: [
            createEmbed(interaction.client, {
              section: t(language, 'help.tabs.economy'),
              title: t(language, 'economy.steal.cooldownTitle'),
              description: t(language, 'economy.steal.cooldownDescription', {
                time: `<t:${Math.floor(result.nextAt / 1000)}:R>`,
              }),
              color: COLORS.warning,
              fields: [
                {
                  name: `👛 ${t(language, 'economy.wallet')}`,
                  value: `**${coins(result.balance, language)}** ${t(language, 'common.coins')}`,
                  inline: true,
                },
                {
                  name: `⏰ ${t(language, 'economy.cooldown')}`,
                  value: t(language, 'economy.minutes', { count: COOLDOWN_MINUTES }),
                  inline: true,
                },
              ],
              footer: t(language, 'economy.steal.footerIdle'),
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
            title: t(language, result.stole ? 'economy.steal.successTitle' : 'economy.steal.failTitle'),
            description: result.stole
              ? t(language, 'economy.steal.successDescription', {
                amount: coins(result.amount, language),
              })
              : t(language, 'economy.steal.failDescription'),
            color: result.stole ? COLORS.success : COLORS.danger,
            fields: [
              {
                name: result.stole
                  ? `💰 ${t(language, 'economy.steal.stolen')}`
                  : `💨 ${t(language, 'economy.steal.getaway')}`,
                value: result.stole
                  ? `${coins(result.amount, language)} ${t(language, 'common.coins')}`
                  : t(language, 'common.none'),
                inline: true,
              },
              {
                name: `👛 ${t(language, 'economy.wallet')}`,
                value: `**${coins(result.balance, language)}** ${t(language, 'common.coins')}`,
                inline: true,
              },
              {
                name: `⏰ ${t(language, 'economy.nextAttempt')}`,
                value: `<t:${Math.floor(result.nextAt / 1000)}:R>`,
                inline: true,
              },
            ],
            footer: t(language, 'economy.steal.footer', {
              user: interaction.user.username,
              chance: CHANCE_PERCENT,
              minutes: COOLDOWN_MINUTES,
            }),
          }),
        ],
      });
    } catch (error) {
      console.error('[economy] /steal failed:', error);
      await interaction.reply({
        content: t(language, 'economy.steal.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
