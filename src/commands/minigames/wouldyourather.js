const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { castVote, createSession } = require('../../lib/wyr');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function percentage(count, total) {
  return total > 0 ? `${Math.round((count / total) * 100)}%` : '0%';
}

function chooseLabel(count, total, language) {
  if (total <= 0) return t(language, 'minigames.wyr.noVotes');
  return t(
    language,
    count === 1 ? 'minigames.wyr.choiceOne' : 'minigames.wyr.choice',
    { count, percent: percentage(count, total) },
  );
}

function buildPayload(client, session) {
  const language = session.language ?? 'en';
  const { a, b, total } = session.counts ?? { a: 0, b: 0, total: 0 };

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.wyr.title'),
    description: session.question,
    color: COLORS.game,
    fields: [
      {
        name: t(language, 'minigames.wyr.optionA'),
        value: `**${session.aText}**\n${chooseLabel(a, total, language)}`,
        inline: true,
      },
      {
        name: t(language, 'minigames.wyr.optionB'),
        value: `**${session.bText}**\n${chooseLabel(b, total, language)}`,
        inline: true,
      },
      {
        name: t(language, 'minigames.wyr.total'),
        value: total > 0
          ? t(language, total === 1 ? 'minigames.wyr.totalOne' : 'minigames.wyr.totalVotes', { count: total })
          : t(language, 'minigames.wyr.first'),
        inline: true,
      },
    ],
    footer: t(language, 'minigames.wyr.footer'),
  });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`wyr:vote:a:${session.id}`)
          .setLabel(t(language, 'minigames.wyr.buttonA'))
          .setEmoji('🅰️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`wyr:vote:b:${session.id}`)
          .setLabel(t(language, 'minigames.wyr.buttonB'))
          .setEmoji('🅱️')
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Start a quick would-you-rather vote with live results'),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const session = createSession(Math.random, Date.now(), language);
    session.question = t(language, 'minigames.wyr.question', { a: session.a, b: session.b });
    session.aText = session.a;
    session.bText = session.b;

    await interaction.reply(buildPayload(interaction.client, session));
  },

  async handleComponent(interaction) {
    const [, action, choice, sessionId] = interaction.customId.split(':');
    if (action !== 'vote' || (choice !== 'a' && choice !== 'b')) return;

    const result = castVote(sessionId, interaction.user.id, choice);
    if (!result) {
      await interaction.reply({
        content: t(await getInteractionLanguage(interaction), 'minigames.wyr.expired'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const session = result.session;
    if (!session.counts) session.counts = { a: 0, b: 0, total: 0 };
    session.counts = result.counts;

    await interaction.update(buildPayload(interaction.client, session));
  },
};
