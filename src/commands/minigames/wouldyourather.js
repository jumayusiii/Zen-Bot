const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { castVote, createSession } = require('../../lib/wyr');

function percentage(count, total) {
  return total > 0 ? `${Math.round((count / total) * 100)}%` : '0%';
}

function chooseLabel(count, total) {
  return total > 0 ? `${count} ${count === 1 ? 'vote' : 'votes'}  ·  ${percentage(count, total)}` : 'No votes yet';
}

function buildPayload(client, session) {
  const { a, b, total } = session.counts ?? { a: 0, b: 0, total: 0 };

  const embed = createEmbed(client, {
    section: 'Minigames',
    title: 'Would you rather…',
    description: session.question,
    color: COLORS.game,
    fields: [
      {
        name: '🅰️ Option A',
        value: `**${session.aText}**\n${chooseLabel(a, total)}`,
        inline: true,
      },
      {
        name: '🅱️ Option B',
        value: `**${session.bText}**\n${chooseLabel(b, total)}`,
        inline: true,
      },
      {
        name: '🗳️ Total',
        value: total > 0 ? `**${total}** ${total === 1 ? 'vote' : 'votes'}` : 'Be the first',
        inline: true,
      },
    ],
    footer: 'Tap a button to vote  ·  you can change your choice',
  });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`wyr:vote:a:${session.id}`)
          .setLabel('Option A')
          .setEmoji('🅰️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`wyr:vote:b:${session.id}`)
          .setLabel('Option B')
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
    const session = createSession();
    session.question = `**Would you rather…**\n🅰️ ${session.a}\n🅱️ ${session.b}`;
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
        content: 'This vote has expired. Start a new one with `/wouldyourather`.',
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
