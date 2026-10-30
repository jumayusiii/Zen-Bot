const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { TOPIC_CATEGORIES, categoryFor, randomTopic } = require('../../lib/topics');

function buildPayload(client, topic, ownerId, requestedBy) {
  const meta = topic.meta ?? categoryFor(topic.category);

  const embed = createEmbed(client, {
    section: 'Fun',
    title: 'Conversation starter',
    description: [
      `## ${topic.text}`,
      '',
      '-# Ask the room to answer, then pass it on.',
    ].join('\n'),
    color: COLORS.fun,
    fields: [
      { name: '🧭 Theme', value: `${meta.emoji} ${meta.label}`, inline: true },
      { name: '🙋 Started by', value: requestedBy, inline: true },
    ],
    footer: 'One prompt, one good conversation',
  });

  const button = new ButtonBuilder()
    .setCustomId(`topic:again:${ownerId}:${topic.index}:${meta.id}`)
    .setLabel('Another topic')
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
    const theme = interaction.options.getString('theme');
    const topic = randomTopic(Math.random, { category: theme });

    await interaction.reply(
      buildPayload(interaction.client, topic, interaction.user.id, interaction.user.username),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex, rawTheme] = interaction.customId.split(':');
    if (action !== 'again') return;

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'Only the person who started this topic can shuffle it.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const previous = Number.parseInt(rawIndex, 10);
    const category = categoryFor(rawTheme);
    const topic = randomTopic(Math.random, {
      category: category?.id ?? null,
      excludeIndex: Number.isInteger(previous) ? previous : null,
    });

    await interaction.update(
      buildPayload(interaction.client, topic, ownerId, interaction.user.username),
    );
  },
};
