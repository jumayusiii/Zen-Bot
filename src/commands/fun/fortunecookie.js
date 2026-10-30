const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { randomFortune } = require('../../lib/fortunes');

function buildPayload(client, fortune, ownerId, requestedBy) {
  const numbers = fortune.luckyNumbers
    .map((number) => `\`${String(number).padStart(2, '0')}\``)
    .join(' ');

  const embed = createEmbed(client, {
    section: 'Fun',
    title: 'Fortune cookie',
    description: `**${fortune.text}**`,
    color: COLORS.fun,
    fields: [
      { name: '🧭 Theme', value: fortune.category, inline: true },
      { name: '🎟️ Lucky numbers', value: numbers, inline: true },
      { name: '🙋 Requested by', value: requestedBy, inline: true },
    ],
    footer: 'A little luck for your day',
  });

  const button = new ButtonBuilder()
    .setCustomId(`fortunecookie:again:${ownerId}:${fortune.index}`)
    .setLabel('Another fortune')
    .setEmoji('🥠')
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)],
  };
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('fortunecookie')
    .setDescription('Open a fortune cookie with a lucky number line'),

  async execute(interaction) {
    const fortune = randomFortune();
    await interaction.reply(
      buildPayload(interaction.client, fortune, interaction.user.id, interaction.user.username),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex] = interaction.customId.split(':');
    if (action !== 'again') return;

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'Only the person who opened this cookie can ask for another fortune.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const previous = Number.parseInt(rawIndex, 10);
    const fortune = randomFortune(
      Math.random,
      Number.isInteger(previous) ? previous : null,
    );

    await interaction.update(
      buildPayload(interaction.client, fortune, ownerId, interaction.user.username),
    );
  },
};
