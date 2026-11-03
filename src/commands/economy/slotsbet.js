const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { resolveSlotsBet } = require('../../lib/economyGames');
const { MAX_WAGER, settleWager } = require('../../lib/economy');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function localeFor(language) {
  return language === 'de' ? 'de-DE' : 'en-US';
}

function coins(value, language = 'en') {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(localeFor(language));
}

function signedCoins(value, language = 'en') {
  const amount = Math.floor(Number(value) || 0);
  return `${amount >= 0 ? '+' : ''}${amount.toLocaleString(localeFor(language))}`;
}

function multiplier(value, language = 'en') {
  return Number(value || 0).toLocaleString(localeFor(language), { maximumFractionDigits: 1 });
}

function symbolLabel(language, name) {
  return t(language, `economy.slots.symbols.${String(name).toLowerCase()}`, {}, name);
}

function pairName(reels) {
  const counts = new Map();
  for (const reel of reels) counts.set(reel.name, (counts.get(reel.name) ?? 0) + 1);
  return [...counts.entries()].find(([, count]) => count === 2)?.[0] ?? null;
}

function outcomeCopy(game, language) {
  if (game.outcome.matches === 3) {
    return {
      title: t(language, 'economy.slots.jackpot'),
      detail: t(language, 'economy.slots.three', {
        symbol: symbolLabel(language, game.reels[0]?.name),
      }),
    };
  }

  if (game.outcome.matches === 2) {
    return {
      title: t(language, 'economy.slots.pairTitle'),
      detail: t(language, 'economy.slots.pairDetail', {
        symbol: symbolLabel(language, pairName(game.reels)),
      }),
    };
  }

  return {
    title: t(language, 'economy.slots.noMatchTitle'),
    detail: t(language, 'economy.slots.noMatchDetail'),
  };
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('slotsbet')
    .setDescription('Wager coins on the slot machine — pairs pay 1.5×, triples up to 30×')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription(`Coins to wager (1–${MAX_WAGER.toLocaleString('en-US')})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_WAGER),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'economy.slotsbet.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const wager = interaction.options.getInteger('amount', true);
    await interaction.deferReply();

    const language = await getInteractionLanguage(interaction);

    try {
      const game = resolveSlotsBet({ wager });
      const settled = await settleWager({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        wager,
        payout: game.payout,
      });
      const copy = outcomeCopy(game, language);

      await interaction.editReply({
        embeds: [
          createEmbed(interaction.client, {
            section: t(language, 'help.tabs.economy'),
            title: copy.title,
            description: `## ${game.reels.map((symbol) => symbol.emoji).join('  │  ')}\n${copy.detail}`,
            color: game.payout > game.wager ? COLORS.success : COLORS.danger,
            fields: [
              {
                name: `🎰 ${t(language, 'economy.symbols', {}, 'Symbols')}`,
                value: game.reels.map((symbol) => symbolLabel(language, symbol.name)).join(' · '),
                inline: true,
              },
              {
                name: `✖️ ${t(language, 'economy.multiplier', {}, 'Multiplier')}`,
                value: `${multiplier(game.multiplier, language)}×`,
                inline: true,
              },
              {
                name: `💰 ${t(language, 'economy.wager')}`,
                value: `${coins(settled.wager, language)} ${t(language, 'common.coins')}`,
                inline: true,
              },
              {
                name: `🏆 ${t(language, 'economy.return')}`,
                value: `${coins(settled.payout, language)} ${t(language, 'common.coins')}`,
                inline: true,
              },
              {
                name: `📈 ${t(language, 'economy.net')}`,
                value: `${signedCoins(settled.net, language)} ${t(language, 'common.coins')}`,
                inline: true,
              },
              {
                name: `👛 ${t(language, 'economy.balance')}`,
                value: `${coins(settled.balance, language)} ${t(language, 'common.coins')}`,
                inline: true,
              },
            ],
            footer: t(language, 'economy.slotsbet.footer', { user: interaction.user.username }),
          }),
        ],
      });
    } catch (error) {
      if (error.code === 'insufficient') {
        await interaction.editReply({
          content: t(language, 'economy.coinbet.insufficient', {
            balance: coins(error.balance, language),
          }),
        });
        return;
      }

      if (error.code === 'invalid_wager') {
        await interaction.editReply({ content: t(language, 'economy.coinbet.invalidWager') });
        return;
      }

      if (error.code === 'wager_too_large') {
        await interaction.editReply({
          content: t(language, 'economy.coinbet.tooLarge', { max: coins(MAX_WAGER, language) }),
        });
        return;
      }

      console.error('[economy] /slotsbet failed:', error);
      await interaction.editReply({
        content: t(language, 'economy.slotsbet.error'),
      });
    }
  },
};
