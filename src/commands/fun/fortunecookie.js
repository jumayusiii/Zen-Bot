const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { randomFortune } = require('../../lib/fortunes');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function buildPayload(client, fortune, ownerId, requestedBy, language) {
  const numbers = fortune.luckyNumbers
    .map((number) => `\`${String(number).padStart(2, '0')}\``)
    .join(' ');

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.fun'),
    title: t(language, 'fun.fortune.title'),
    description: `**${fortune.text}**`,
    color: COLORS.fun,
    fields: [
      { name: t(language, 'fun.fortune.theme'), value: fortune.category, inline: true },
      { name: t(language, 'fun.fortune.lucky'), value: numbers, inline: true },
      { name: t(language, 'fun.fortune.requested'), value: requestedBy, inline: true },
    ],
    footer: t(language, 'fun.fortune.footer'),
  });

  const button = new ButtonBuilder()
    .setCustomId(`fortunecookie:again:${ownerId}:${fortune.index}`)
    .setLabel(t(language, 'fun.fortune.button'))
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
    const language = await getInteractionLanguage(interaction);
    const fortune = randomFortune(Math.random, null, language);
    await interaction.reply(
      buildPayload(interaction.client, fortune, interaction.user.id, interaction.user.username, language),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex] = interaction.customId.split(':');
    if (action !== 'again') return;

    const language = await getInteractionLanguage(interaction);

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'fun.fortune.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const previous = Number.parseInt(rawIndex, 10);
    const fortune = randomFortune(
      Math.random,
      Number.isInteger(previous) ? previous : null,
      language,
    );

    await interaction.update(
      buildPayload(interaction.client, fortune, ownerId, interaction.user.username, language),
    );
  },
};
