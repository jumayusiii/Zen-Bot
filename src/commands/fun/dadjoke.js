const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { DAD_JOKES, DAD_JOKES_DE } = require('../../lib/funAdditions');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function jokesFor(language) {
  return language === 'de' ? DAD_JOKES_DE : DAD_JOKES;
}

function buildPayload(client, joke, index, ownerId, requestedBy, language) {
  const jokes = jokesFor(language);

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.fun'),
    title: t(language, 'fun.dadjoke.title'),
    description: joke,
    color: COLORS.fun,
    footer: t(language, 'fun.dadjoke.footer', {
      index: index + 1,
      total: jokes.length,
      user: requestedBy,
    }),
  });

  const button = new ButtonBuilder()
    .setCustomId(`dadjoke:next:${ownerId}:${index}`)
    .setLabel(t(language, 'fun.dadjoke.button'))
    .setEmoji('🎲')
    .setStyle(ButtonStyle.Secondary);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] };
}

function nextIndex(current, total, random = Math.random) {
  if (total <= 1) return 0;
  const offset = 1 + Math.floor(random() * (total - 1));
  return (current + offset) % total;
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('dadjoke')
    .setDescription('Tell a groan-worthy dad joke'),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const jokes = jokesFor(language);
    const index = Math.floor(Math.random() * jokes.length);

    await interaction.reply(
      buildPayload(interaction.client, jokes[index], index, interaction.user.id, interaction.user.username, language),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex] = interaction.customId.split(':');
    if (action !== 'next') return;

    const language = await getInteractionLanguage(interaction);

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'fun.dadjoke.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const jokes = jokesFor(language);
    const current = Number.parseInt(rawIndex, 10);

    if (!Number.isInteger(current) || current < 0 || current >= jokes.length) {
      await interaction.reply({
        content: t(language, 'fun.dadjoke.expired'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const index = nextIndex(current, jokes.length);
    await interaction.update(
      buildPayload(interaction.client, jokes[index], index, ownerId, interaction.user.username, language),
    );
  },
};
