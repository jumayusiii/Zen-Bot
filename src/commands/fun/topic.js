const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { TOPIC_CATEGORIES, categoryFor, randomTopic } = require('../../lib/topics');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function buildPayload(client, topic, ownerId, requestedBy, language) {
  const meta = topic.meta ?? categoryFor(topic.category, language);

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.fun'),
    title: t(language, 'fun.topic.title'),
    description: [
      `## ${topic.text}`,
      '',
      t(language, 'fun.topic.note'),
    ].join('\n'),
    color: COLORS.fun,
    fields: [
      { name: t(language, 'fun.topic.theme'), value: `${meta.emoji} ${meta.label}`, inline: true },
      { name: t(language, 'fun.topic.started'), value: requestedBy, inline: true },
    ],
    footer: t(language, 'fun.topic.footer'),
  });

  const button = new ButtonBuilder()
    .setCustomId(`topic:again:${ownerId}:${topic.index}:${meta.id}`)
    .setLabel(t(language, 'fun.topic.button'))
    .setEmoji('💬')
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)],
  };
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('topic')
    .setDescription('Break the ice with a themed conversation starter')
    .addStringOption((option) =>
      option
        .setName('theme')
        .setDescription('Pick a theme, or leave it open for any topic')
        .addChoices(
          ...TOPIC_CATEGORIES.map((category) => ({
            name: `${category.emoji} ${category.label}`,
            value: category.id,
          })),
        ),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const theme = interaction.options.getString('theme');
    const topic = randomTopic(Math.random, { category: theme, language });

    await interaction.reply(
      buildPayload(interaction.client, topic, interaction.user.id, interaction.user.username, language),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex, rawTheme] = interaction.customId.split(':');
    if (action !== 'again') return;

    const language = await getInteractionLanguage(interaction);

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'fun.topic.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const previous = Number.parseInt(rawIndex, 10);
    const category = categoryFor(rawTheme, language);
    const topic = randomTopic(Math.random, {
      category: category?.id ?? null,
      excludeIndex: Number.isInteger(previous) ? previous : null,
      language,
    });

    await interaction.update(
      buildPayload(interaction.client, topic, ownerId, interaction.user.username, language),
    );
  },
};
