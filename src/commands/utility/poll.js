const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MAX_OPTIONS,
  attachPollMessage,
  closePoll,
  createPoll,
  deletePoll,
  recordVote,
} = require('../../lib/polls');

const BAR_WIDTH = 12;

function formatBar(votes, total) {
  const ratio = total > 0 ? votes / total : 0;
  const filled = Math.round(ratio * BAR_WIDTH);
  return `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)}`;
}

function winningText(poll, totalVotes) {
  if (totalVotes === 0) return 'No votes were cast.';

  const best = Math.max(...poll.options.map((option) => option.voters.length));
  const winners = poll.options.filter((option) => option.voters.length === best);
  const names = winners.map((option) => `**${option.label}**`).join(' and ');

  return winners.length === 1
    ? `🏆 ${names} wins with **${best}** vote${best === 1 ? '' : 's'}.`
    : `🏆 ${names} tie with **${best}** vote${best === 1 ? '' : 's'} each.`;
}

function buildPollPayload(client, poll) {
  const totalVotes = poll.options.reduce((total, option) => total + option.voters.length, 0);
  const closed = Boolean(poll.closedAt);

  const fields = poll.options.map((option, index) => {
    const votes = option.voters.length;
    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

    return {
      name: `${index + 1}. ${option.label}`,
      value: `\`${formatBar(votes, totalVotes)}\`  **${votes}** vote${votes === 1 ? '' : 's'} · ${percentage}%`,
      inline: false,
    };
  });

  const embed = createEmbed(client, {
    section: 'Polls',
    title: poll.question,
    description: [
      `**${totalVotes}** vote${totalVotes === 1 ? '' : 's'}  ·  ${closed ? 'Poll closed' : 'Click an option to vote. Click again to remove your vote.'}`,
      poll.ownerId ? `Poll by <@${poll.ownerId}>` : null,
      closed ? winningText(poll, totalVotes) : null,
    ].filter(Boolean).join('\n'),
    color: closed ? COLORS.neutral : COLORS.brand,
    fields,
    footer: closed ? 'Final results' : 'Live results update in place',
    timestamp: poll.createdAt,
  });

  const voteButtons = new ActionRowBuilder().addComponents(
    poll.options.map((option, index) =>
      new ButtonBuilder()
        .setCustomId(`poll:vote:${poll.id}:${index}`)
        .setLabel(`${index + 1} · ${option.label}`.slice(0, 80))
        .setStyle(closed ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(closed),
    ),
  );

  const closeButton = new ButtonBuilder()
    .setCustomId(`poll:close:${poll.id}`)
    .setLabel(closed ? 'Poll closed' : 'Close poll')
    .setEmoji(closed ? '🔒' : '🛑')
    .setStyle(closed ? ButtonStyle.Secondary : ButtonStyle.Danger)
    .setDisabled(closed);

  return {
    embeds: [embed],
    components: [voteButtons, new ActionRowBuilder().addComponents(closeButton)],
  };
}

function parseLabels(raw) {
  const labels = raw
    .split(/\s*[|\n]\s*/)
    .map((label) => label.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return {
    labels,
    uniqueCount: new Set(labels.map((label) => label.toLowerCase())).size,
  };
}

function optionsError(labels, uniqueCount) {
  if (labels.length < 2) return 'Add at least **two** options separated by `|`.';
  if (uniqueCount < labels.length) return 'Each poll option must be different.';
  if (labels.length > MAX_OPTIONS) return `Polls support up to **${MAX_OPTIONS}** options.`;
  if (labels.some((label) => label.length > 80)) return 'Each option must be **80 characters or fewer**.';
  return null;
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This poll no longer exists. Run `/poll` to start a new one.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a live button poll (2–5 options)')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('What should people vote on?')
        .setRequired(true)
        .setMaxLength(200),
    )
    .addStringOption((option) =>
      option
        .setName('options')
        .setDescription('Two to five options, separated with | (for example: Pizza | Sushi | Tacos)')
        .setRequired(true)
        .setMaxLength(500),
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question', true).replace(/\s+/g, ' ').trim();
    const { labels, uniqueCount } = parseLabels(interaction.options.getString('options', true));
    const error = optionsError(labels, uniqueCount);

    if (error) {
      await interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();

    let poll;
    try {
      poll = await createPoll({
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        ownerId: interaction.user.id,
        question,
        labels,
      });
    } catch (createError) {
      await interaction.editReply({ content: createError.message });
      return;
    }

    try {
      const message = await interaction.editReply(buildPollPayload(interaction.client, poll));
      await attachPollMessage(poll.id, message.id, message.channelId);
    } catch (replyError) {
      await deletePoll(poll.id).catch(() => {});
      throw replyError;
    }
  },

  async handleComponent(interaction) {
    const [commandName, action, pollId, rawIndex] = interaction.customId.split(':');
    if (commandName !== 'poll' || !pollId) return;

    if (action === 'close') {
      const { poll, error } = await closePoll(pollId, interaction.user.id);

      if (error === 'not_found') {
        await replyExpired(interaction);
        return;
      }

      if (error === 'forbidden') {
        await interaction.reply({
          content: 'Only the person who created this poll can close it.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.update(buildPollPayload(interaction.client, poll));
      return;
    }

    if (action !== 'vote') return;

    const index = Number.parseInt(rawIndex, 10);
    const { poll, action: voteAction } = await recordVote(pollId, interaction.user.id, index);

    if (voteAction === 'invalid') {
      await replyExpired(interaction);
      return;
    }

    if (voteAction === 'closed') {
      await interaction.update(buildPollPayload(interaction.client, poll));
      await interaction.followUp({
        content: 'This poll is closed. Results are shown above.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update(buildPollPayload(interaction.client, poll));
  },
};
