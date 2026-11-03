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

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const AVATAR_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;
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
      '-# Discord does not expose presence artwork for bots, so `image` replaces the bot avatar instead.',
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

/**
 * Replaces the bot avatar. Discord limits this endpoint, so a rejection is
 * reported instead of throwing.
 *
 * @returns {Promise<string|null>} an explanation when it failed
 */
async function applyAvatar(interaction, attachment) {
  if (attachment.size > MAX_AVATAR_BYTES) return 'That image is larger than 10 MB.';

  if (attachment.contentType && !AVATAR_TYPES.test(attachment.contentType)) {
    return 'Use a PNG, JPG, WEBP or GIF image.';
  }

  let buffer;

  try {
    const signal = typeof AbortSignal?.timeout === 'function'
      ? AbortSignal.timeout(15000)
      : undefined;
    const response = await fetch(attachment.url, { signal });

    if (!response.ok) return `Discord returned HTTP ${response.status} for that image.`;
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    return `Could not download that image: ${error.message}`;
  }

  if (buffer.length === 0) return 'That image is empty.';
  if (buffer.length > MAX_AVATAR_BYTES) return 'That image is larger than 10 MB.';

  try {
    await interaction.client.user.setAvatar(buffer);
  } catch (error) {
    return `Discord rejected the avatar: ${error.message}`;
  }

  return null;
}

module.exports = {
  developerOnly: true,

  data: new SlashCommandBuilder()
    .setName('devpresence')
    .setDescription('Developer: change the bot’s rich presence and avatar instantly')
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
    .addAttachmentOption((option) =>
      option
        .setName('image')
        .setDescription('New bot avatar: PNG, JPG, WEBP or GIF up to 10 MB'),
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
    const image = interaction.options.getAttachment('image');
    const reset = interaction.options.getBoolean('reset') === true;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const notes = [];

    if (image) {
      const failure = await applyAvatar(interaction, image);
      if (failure) {
        await interaction.editReply({ content: failure });
        return;
      }
      notes.push(`Avatar replaced with \`${image.name}\`.`);
    }

    const wantsChange = text !== null || type !== null || url !== null;
    let changed = false;

    try {
      if (reset) {
        await clearPresenceOverride();
        notes.push('Presence restored from `PRESENCE_TEXT`.');
        changed = true;
      } else if (wantsChange) {
        await setPresenceOverride({ text, type, url, userId: interaction.user.id });
        notes.push('Presence override saved and applied.');
        changed = true;
      }
    } catch (error) {
      await interaction.editReply({ content: `Could not update the presence: ${error.message}` });
      return;
    }

    if (changed) applyPresence(interaction.client);

    await interaction.editReply({ embeds: [statusEmbed(interaction, notes)] });
  },
};
