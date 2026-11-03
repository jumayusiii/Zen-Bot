const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
    const language = await getInteractionLanguage(interaction);
    const choice = interaction.options.getString('side');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = choice ? choice === result : null;

    const fields = [];
    if (choice) {
      fields.push(
        {
          name: t(language, 'minigames.coinflip.call'),
          value: t(language, choice === 'heads' ? 'minigames.coinflip.heads' : 'minigames.coinflip.tails'),
          inline: true,
        },
        {
          name: t(language, 'minigames.coinflip.outcome'),
          value: t(language, won ? 'minigames.coinflip.won' : 'minigames.coinflip.lost'),
          inline: true,
        },
      );
    }

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.minigames'),
      title: t(language, 'minigames.coinflip.title'),
      description: t(language, 'minigames.coinflip.landed', {
        side: t(language, result === 'heads' ? 'minigames.coinflip.heads' : 'minigames.coinflip.tails'),
      }),
      color: choice ? (won ? COLORS.success : COLORS.danger) : COLORS.game,
      fields,
      footer: t(language, 'minigames.coinflip.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
