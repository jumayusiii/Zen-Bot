const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');

const CHOICES = {
  rock: { label: 'Rock', emoji: '🪨', beats: 'scissors' },
  paper: { label: 'Paper', emoji: '📄', beats: 'rock' },
  scissors: { label: 'Scissors', emoji: '✂️', beats: 'paper' },
};

const CHOICE_KEYS = Object.keys(CHOICES);

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play rock-paper-scissors against the bot')
    .addStringOption((option) =>
      option
        .setName('choice')
        .setDescription('Your move')
        .setRequired(true)
        .addChoices(
          { name: 'Rock 🪨', value: 'rock' },
          { name: 'Paper 📄', value: 'paper' },
          { name: 'Scissors ✂️', value: 'scissors' },
        ),
    ),

  async execute(interaction) {
    const player = interaction.options.getString('choice', true);
    const bot = CHOICE_KEYS[Math.floor(Math.random() * CHOICE_KEYS.length)];

    let result;
    let color;

    if (player === bot) {
      result = 'It’s a draw!';
      color = COLORS.warning;
    } else if (CHOICES[player].beats === bot) {
      result = 'You win!';
      color = COLORS.success;
    } else {
      result = 'You lose!';
      color = COLORS.danger;
    }

    const embed = createEmbed(interaction.client, {
      section: 'Minigames',
      title: '🎮 Rock Paper Scissors',
      description: `**${result}**`,
      color,
      fields: [
        {
          name: '🙋 You',
          value: `${CHOICES[player].emoji} ${CHOICES[player].label}`,
          inline: true,
        },
        {
          name: '🤖 Bot',
          value: `${CHOICES[bot].emoji} ${CHOICES[bot].label}`,
          inline: true,
        },
        { name: '🏆 Result', value: result, inline: true },
      ],
      footer: `Played by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
