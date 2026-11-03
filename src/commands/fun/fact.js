const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { randomFact } = require('../../lib/fun');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function buildPayload(client, fact, ownerId, requestedBy, language) {
  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.fun'),
    title: t(language, 'fun.fact.title'),
    description: fact.text,
    color: COLORS.fun,
    footer: t(language, 'fun.fact.footer', { user: requestedBy }),
  });

  const button = new ButtonBuilder()
    .setCustomId(`fact:again:${ownerId}:${fact.index}`)
    .setLabel(t(language, 'fun.fact.button'))
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
    const language = await getInteractionLanguage(interaction);
    const fact = randomFact(Math.random, null, language);

    await interaction.reply(
      buildPayload(interaction.client, fact, interaction.user.id, interaction.user.username, language),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex] = interaction.customId.split(':');
    if (action !== 'again') return;

    const language = await getInteractionLanguage(interaction);

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'fun.fact.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const previous = Number.parseInt(rawIndex, 10);
    const fact = randomFact(
      Math.random,
      Number.isInteger(previous) ? previous : null,
      language,
    );

    await interaction.update(
      buildPayload(interaction.client, fact, ownerId, interaction.user.username, language),
    );
  },
};
