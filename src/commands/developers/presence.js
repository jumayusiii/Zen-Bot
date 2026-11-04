const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { isDeveloper } = require('../../lib/developers');
const {
  ACTIVITY_LABELS,
  applyPresence,
  clearPresenceOverride,
  presenceState,
  setPresenceOverride,
} = require('../../lib/presence');

const DENIED = 'This command is restricted to the bot developer.';

function activityLabel(type) {
  return ACTIVITY_LABELS[type] ?? 'Playing';
}

function statusEmbed(interaction, notes) {
  const state = presenceState();
  const source = state.updatedAt > 0
    ? `Developer override${state.updatedBy ? ` by <@${state.updatedBy}>` : ''}`
    : '`PRESENCE_TEXT` from the environment';

  return createEmbed(interaction.client, {
    section: 'Developers',
    title: 'Rich presence updated',
    description: [
      notes.length > 0 ? notes.join('\n') : 'This is the presence Discord is showing right now.',
      '-# Only the rich presence changes here. Use `/devavatar` or `/devbanner` for the bot’s pictures.',
    ].join('\n'),
    color: COLORS.danger,
    fields: [
      {
        name: '🎭 Activity',
        value: `**${activityLabel(state.type)}** ${state.text}`,
        inline: false,
      },
      {
        name: '🔗 Stream URL',
        value: state.type === 'streaming' && state.url ? state.url : '—',
        inline: false,
      },
      { name: '💾 Source', value: source, inline: false },
    ],
    footer: `Requested by ${interaction.user.username}`,
  });
}

module.exports = {
  developerOnly: true,

  data: new SlashCommandBuilder()
    .setName('devpresence')
    .setDescription('Developer: change the bot’s rich presence instantly')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('New activity text, up to 128 characters')
        .setMaxLength(128),
    )
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Activity type shown before the text')
        .addChoices(
          { name: 'Playing', value: 'playing' },
          { name: 'Watching', value: 'watching' },
          { name: 'Listening', value: 'listening' },
          { name: 'Competing', value: 'competing' },
          { name: 'Streaming', value: 'streaming' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('Stream link, required for the Streaming type'),
    )
    .addBooleanOption((option) =>
      option.setName('reset').setDescription('Restore the presence from PRESENCE_TEXT'),
    ),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: DENIED, flags: MessageFlags.Ephemeral });
      return;
    }

    const text = interaction.options.getString('text');
    const type = interaction.options.getString('type');
    const url = interaction.options.getString('url');
    const reset = interaction.options.getBoolean('reset') === true;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const notes = [];
    const wantsChange = text !== null || type !== null || url !== null;

    try {
      if (reset) {
        await clearPresenceOverride();
        notes.push('Presence restored from `PRESENCE_TEXT`.');
      } else if (wantsChange) {
        await setPresenceOverride({ text, type, url, userId: interaction.user.id });
        notes.push('Presence override saved and applied.');
      } else {
        notes.push('Nothing to change — this is the current presence.');
      }
    } catch (error) {
      await interaction.editReply({ content: `Could not update the presence: ${error.message}` });
      return;
    }

    if (reset || wantsChange) applyPresence(interaction.client);

    await interaction.editReply({ embeds: [statusEmbed(interaction, notes)] });
  },
};
