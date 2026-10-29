const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { randomFact } = require('../../lib/fun');

function buildPayload(client, fact, ownerId, requestedBy) {
  const embed = createEmbed(client, {
    section: 'Fun',
    title: 'Did you know?',
    description: fact.text,
    color: COLORS.fun,
    footer: `Random fact  ·  requested by ${requestedBy}`,
  });

  const button = new ButtonBuilder()
    .setCustomId(`fact:again:${ownerId}:${fact.index}`)
    .setLabel('Another fact')
    .setEmoji('🎲')
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)],
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Share a random fun fact'),

  async execute(interaction) {
    const fact = randomFact();

    await interaction.reply(
      buildPayload(interaction.client, fact, interaction.user.id, interaction.user.username),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex] = interaction.customId.split(':');
    if (action !== 'again') return;

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'Only the person who shared this fact can roll another one.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const previous = Number.parseInt(rawIndex, 10);
    const fact = randomFact(Math.random, Number.isInteger(previous) ? previous : null);

    await interaction.update(
      buildPayload(interaction.client, fact, ownerId, interaction.user.username),
    );
  },
};
