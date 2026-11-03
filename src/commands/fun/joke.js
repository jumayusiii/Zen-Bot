const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { JOKES, JOKES_DE, randomJoke } = require('../../lib/jokes');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function buildPayload(client, joke, ownerId, revealed, requestedBy, language) {
  const total = language === 'de' ? JOKES_DE.length : JOKES.length;

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.fun'),
    title: t(language, 'fun.joke.title'),
    description: joke.setup,
    color: COLORS.fun,
    fields: revealed
      ? [{ name: t(language, 'fun.joke.punchline'), value: joke.punchline, inline: false }]
      : [{ name: t(language, 'fun.joke.hidden'), value: t(language, 'fun.joke.hiddenValue'), inline: false }],
    footer: t(language, 'fun.joke.footer', {
      index: joke.index + 1,
      total,
      user: requestedBy,
    }),
  });

  const button = revealed
    ? new ButtonBuilder()
        .setCustomId(`joke:next:${ownerId}:${joke.index}`)
        .setLabel(t(language, 'fun.joke.next'))
        .setEmoji('🎲')
        .setStyle(ButtonStyle.Secondary)
    : new ButtonBuilder()
        .setCustomId(`joke:reveal:${ownerId}:${joke.index}`)
        .setLabel(t(language, 'fun.joke.reveal'))
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
    const language = await getInteractionLanguage(interaction);
    const joke = randomJoke(Math.random, null, language);

    await interaction.reply(
      buildPayload(interaction.client, joke, interaction.user.id, false, interaction.user.username, language),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex] = interaction.customId.split(':');
    if (action !== 'reveal' && action !== 'next') return;

    const language = await getInteractionLanguage(interaction);

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'fun.joke.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const currentIndex = Number.parseInt(rawIndex, 10);
    const jokes = language === 'de' ? JOKES_DE : JOKES;

    if (action === 'reveal') {
      const joke = jokes[currentIndex];
      if (!joke) {
        await interaction.reply({
          content: t(language, 'fun.joke.expired'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.update(
        buildPayload(interaction.client, { ...joke, index: currentIndex }, ownerId, true, interaction.user.username, language),
      );
      return;
    }

    const joke = randomJoke(
      Math.random,
      Number.isInteger(currentIndex) ? currentIndex : null,
      language,
    );
    await interaction.update(
      buildPayload(interaction.client, joke, ownerId, false, interaction.user.username, language),
    );
  },
};
