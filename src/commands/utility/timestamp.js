const {
  ActionRowBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { STYLES, formatTimestamp, parseTimeInput, styleById } = require('../../lib/timestamps');

function buildPayload(client, at, styleId, requestedBy, ownerId) {
  const style = styleById(styleId);
  const preview = formatTimestamp(at, style.id);

  const embed = createEmbed(client, {
    section: 'Timestamps',
    title: 'Discord timestamp',
    description: [
      `**${preview}**`,
      `-# ${style.label} preview  ·  Discord renders this in every viewer's own timezone.`,
    ].join('\n'),
    color: COLORS.info,
    fields: [
      { name: 'Relative', value: formatTimestamp(at, 'relative'), inline: true },
      {
        name: 'Time',
        value: [formatTimestamp(at, 'short_time'), formatTimestamp(at, 'long_time')].join('\n'),
        inline: true,
      },
      {
        name: 'Date',
        value: [formatTimestamp(at, 'short_date'), formatTimestamp(at, 'long_date')].join('\n'),
        inline: true,
      },
      { name: 'Copyable markup', value: `\`${preview}\``, inline: false },
    ],
    footer: `Requested by ${requestedBy}`,
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`timestamp:style:${ownerId}:${Math.floor(at / 1000)}`)
    .setPlaceholder('Change preview style')
    .addOptions(
      STYLES.map((entry) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(entry.label)
          .setDescription(entry.example)
          .setValue(entry.id)
          .setEmoji(entry.emoji)
          .setDefault(entry.id === style.id),
      ),
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Create a Discord timestamp in any style')
    .addStringOption((option) =>
      option
        .setName('time')
        .setDescription('Now, a duration like 2h, a date, or a Unix timestamp (default: now)')
        .setMaxLength(100),
    ),

  async execute(interaction) {
    const input = interaction.options.getString('time')?.trim() || 'now';
    const parsed = parseTimeInput(input);

    if (!parsed) {
      await interaction.reply({
        content: [
          'I could not read that time.',
          'Try `now`, `in 2h`, `30m`, `2h ago`, `2026-12-31 18:00` or a Unix timestamp.',
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply(
      buildPayload(
        interaction.client,
        parsed.at,
        'full',
        interaction.user.username,
        interaction.user.id,
      ),
    );
  },

  async handleComponent(interaction) {
    const [, action, ownerId, rawSeconds] = interaction.customId.split(':');
    if (action !== 'style') return;

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'Only the person who created this timestamp can change its preview.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const at = Number(rawSeconds) * 1000;
    if (!Number.isFinite(at)) {
      await interaction.reply({
        content: 'This timestamp is no longer valid. Run `/timestamp` again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update(
      buildPayload(
        interaction.client,
        at,
        interaction.values?.[0],
        interaction.user.username,
        interaction.user.id,
      ),
    );
  },
};
