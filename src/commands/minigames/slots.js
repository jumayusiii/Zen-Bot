const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { evaluateSpin, spinSlots } = require('../../lib/slots');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function symbolLabel(language, name) {
  return t(language, `economy.slots.symbols.${String(name).toLowerCase()}`, {}, name);
}

function outcomeCopy(language, reels, result) {
  if (result.matches === 3) {
    return {
      title: t(language, 'economy.slots.jackpot'),
      detail: t(language, 'economy.slots.three', { symbol: symbolLabel(language, reels[0]?.name) }),
    };
  }

  if (result.matches === 2) {
    const counts = new Map();
    for (const reel of reels) counts.set(reel.name, (counts.get(reel.name) ?? 0) + 1);
    const pair = [...counts.entries()].find(([, count]) => count === 2)?.[0];
    return {
      title: t(language, 'economy.slots.pairTitle'),
      detail: t(language, 'economy.slots.pairDetail', { symbol: symbolLabel(language, pair) }),
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
    .setName('slots')
    .setDescription('Spin the slot machine and see if the reels line up'),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const reels = spinSlots();
    const result = evaluateSpin(reels);
    const copy = outcomeCopy(language, reels, result);

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.minigames'),
      title: t(language, 'minigames.slots.title'),
      description: `## ${reels.map((symbol) => symbol.emoji).join('  │  ')}`,
      color: COLORS[result.color] ?? COLORS.game,
      fields: [
        { name: t(language, 'minigames.slots.result'), value: `**${copy.title}**`, inline: true },
        { name: t(language, 'minigames.slots.matches'), value: `${result.matches}/3`, inline: true },
        {
          name: t(language, 'minigames.slots.symbols'),
          value: reels.map((symbol) => symbolLabel(language, symbol.name)).join(' · '),
          inline: true,
        },
        { name: t(language, 'minigames.slots.detail'), value: copy.detail, inline: false },
      ],
      footer: t(language, 'minigames.slots.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
