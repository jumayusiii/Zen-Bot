const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { JOKES, randomJoke } = require('../../lib/jokes');

function buildPayload(client, joke, ownerId, revealed, requestedBy) {
  const embed = createEmbed(client, {
    section: 'Fun',
    title: 'Joke break',
    description: joke.setup,
    color: COLORS.fun,
    fields: revealed
      ? [{ name: '😂 Punchline', value: joke.punchline, inline: false }]
      : [{ name: '🙈 Punchline', value: 'Press the button below to reveal it.', inline: false }],
    footer: `Joke ${joke.index + 1}/${JOKES.length}  ·  requested by ${requestedBy}`,
  });

  const button = revealed
    ? new ButtonBuilder()
        .setCustomId(`joke:next:${ownerId}:${joke.index}`)
        .setLabel('Another joke')
        .setEmoji('🎲')
        .setStyle(ButtonStyle.Secondary)
    : new ButtonBuilder()
        .setCustomId(`joke:reveal:${ownerId}:${joke.index}`)
        .setLabel('Reveal punchline')
        .setEmoji('😂')
        .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)],
  };
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Tell a clean joke with a hidden punchline'),

  async execute(interaction) {
    const joke = randomJoke();

    await interaction.reply(
      buildPayload(interaction.client, joke, interaction.user.id, false, interaction.user.username),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex] = interaction.customId.split(':');
    if (action !== 'reveal' && action !== 'next') return;

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'Only the person who started this joke can control it.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const currentIndex = Number.parseInt(rawIndex, 10);

    if (action === 'reveal') {
      const joke = JOKES[currentIndex];
      if (!joke) {
        await interaction.reply({
          content: 'That joke is no longer available. Run `/joke` again.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.update(
        buildPayload(interaction.client, { ...joke, index: currentIndex }, ownerId, true, interaction.user.username),
      );
      return;
    }

    const joke = randomJoke(Math.random, Number.isInteger(currentIndex) ? currentIndex : null);
    await interaction.update(
      buildPayload(interaction.client, joke, ownerId, false, interaction.user.username),
    );
  },
};
