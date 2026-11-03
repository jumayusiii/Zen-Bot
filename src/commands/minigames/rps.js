const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
    const language = await getInteractionLanguage(interaction);
    const player = interaction.options.getString('choice', true);
    const bot = CHOICE_KEYS[Math.floor(Math.random() * CHOICE_KEYS.length)];

    let color;
    let resultKey;
    if (player === bot) {
      resultKey = 'minigames.rps.draw';
      color = COLORS.warning;
    } else if (CHOICES[player].beats === bot) {
      resultKey = 'minigames.rps.win';
      color = COLORS.success;
    } else {
      resultKey = 'minigames.rps.lose';
      color = COLORS.danger;
    }

    const result = t(language, resultKey);
    const label = (key) => t(language, `minigames.rps.${key}`);

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.minigames'),
      title: t(language, 'minigames.rps.title'),
      description: `**${result}**`,
      color,
      fields: [
        {
          name: t(language, 'minigames.rps.you'),
          value: `${CHOICES[player].emoji} ${label(player)}`,
          inline: true,
        },
        {
          name: t(language, 'minigames.rps.bot'),
          value: `${CHOICES[bot].emoji} ${label(bot)}`,
          inline: true,
        },
        { name: t(language, 'minigames.rps.result'), value: result, inline: true },
      ],
      footer: t(language, 'minigames.rps.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
