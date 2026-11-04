const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { RIDDLES, RIDDLES_DE } = require('../../lib/funAdditions');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function riddlesFor(language) {
  return language === 'de' ? RIDDLES_DE : RIDDLES;
}

function buildPayload(client, riddle, index, ownerId, revealed, requestedBy, language) {
  const riddles = riddlesFor(language);

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.fun'),
    title: t(language, 'fun.riddle.title'),
    description: riddle.question,
    color: COLORS.game,
    fields: revealed
      ? [{ name: t(language, 'fun.riddle.answer'), value: riddle.answer, inline: false }]
      : [{ name: t(language, 'fun.riddle.hidden'), value: t(language, 'fun.riddle.hiddenValue'), inline: false }],
    footer: t(language, 'fun.riddle.footer', {
      index: index + 1,
      total: riddles.length,
      user: requestedBy,
    }),
  });

  const button = revealed
    ? new ButtonBuilder()
        .setCustomId(`riddle:next:${ownerId}:${index}`)
        .setLabel(t(language, 'fun.riddle.next'))
        .setEmoji('🎲')
        .setStyle(ButtonStyle.Secondary)
    : new ButtonBuilder()
        .setCustomId(`riddle:reveal:${ownerId}:${index}`)
        .setLabel(t(language, 'fun.riddle.reveal'))
        .setEmoji('💡')
        .setStyle(ButtonStyle.Primary);

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
    .setName('riddle')
    .setDescription('Solve a riddle with a hidden answer'),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const riddles = riddlesFor(language);
    const index = Math.floor(Math.random() * riddles.length);

    await interaction.reply(
      buildPayload(interaction.client, riddles[index], index, interaction.user.id, false, interaction.user.username, language),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawIndex] = interaction.customId.split(':');
    if (action !== 'reveal' && action !== 'next') return;

    const language = await getInteractionLanguage(interaction);

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'fun.riddle.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const riddles = riddlesFor(language);
    const current = Number.parseInt(rawIndex, 10);

    if (!Number.isInteger(current) || current < 0 || current >= riddles.length) {
      await interaction.reply({
        content: t(language, 'fun.riddle.expired'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'reveal') {
      await interaction.update(
        buildPayload(interaction.client, riddles[current], current, ownerId, true, interaction.user.username, language),
      );
      return;
    }

    const index = nextIndex(current, riddles.length);
    await interaction.update(
      buildPayload(interaction.client, riddles[index], index, ownerId, false, interaction.user.username, language),
    );
  },
};
