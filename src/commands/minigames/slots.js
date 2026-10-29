const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { evaluateSpin, spinSlots } = require('../../lib/slots');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Spin the slot machine and see if the reels line up'),

  async execute(interaction) {
    const reels = spinSlots();
    const result = evaluateSpin(reels);

    const embed = createEmbed(interaction.client, {
      section: 'Minigames',
      title: 'Slot Machine',
      description: `## ${reels.map((symbol) => symbol.emoji).join('  │  ')}`,
      color: COLORS[result.color] ?? COLORS.game,
      fields: [
        { name: '🎯 Result', value: `**${result.label}**`, inline: true },
        { name: '🔢 Matches', value: `${result.matches}/3`, inline: true },
        {
          name: '🎰 Symbols',
          value: reels.map((symbol) => symbol.name).join(' · '),
          inline: true,
        },
        { name: '📝 Detail', value: result.detail, inline: false },
      ],
      footer: `Pulled by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
