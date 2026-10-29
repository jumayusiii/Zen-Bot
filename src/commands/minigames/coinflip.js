const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin and optionally call the side')
    .addStringOption((option) =>
      option
        .setName('side')
        .setDescription('Call heads or tails before the flip')
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' },
        ),
    ),

  async execute(interaction) {
    const choice = interaction.options.getString('side');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = choice ? choice === result : null;

    const fields = [];
    if (choice) {
      fields.push(
        { name: '🎯 Your Call', value: choice === 'heads' ? 'Heads' : 'Tails', inline: true },
        { name: '🏆 Outcome', value: won ? 'You won!' : 'You lost.', inline: true },
      );
    }

    const embed = createEmbed(interaction.client, {
      section: 'Minigames',
      title: 'Coin Flip',
      description: `The coin landed on **${result === 'heads' ? 'Heads' : 'Tails'}**.`,
      color: choice ? (won ? COLORS.success : COLORS.danger) : COLORS.game,
      fields,
      footer: `Flipped by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
