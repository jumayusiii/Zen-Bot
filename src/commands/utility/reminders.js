const {
  ActionRowBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { cancelReminder, listReminders } = require('../../lib/reminders');

const MAX_OPTIONS = 25;

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function relativeDue(dueAt, now = Date.now()) {
  const difference = dueAt - now;
  if (difference <= 0) return 'overdue';

  const minutes = Math.ceil(difference / (60 * 1000));
  if (minutes < 60) return `in ${minutes}m`;

  const hours = Math.ceil(difference / (60 * 60 * 1000));
  if (hours < 24) return `in ${hours}h`;

  return `in ${Math.ceil(difference / (24 * 60 * 60 * 1000))}d`;
}

function buildPayload(client, reminders, requestedBy) {
  const now = Date.now();
  const shown = reminders.slice(0, MAX_OPTIONS);

  const lines = shown.flatMap((reminder, index) => {
    const delivery = reminder.where === 'channel' ? 'channel' : 'DM';
    return `${index + 1}. ${truncate(reminder.message, 70)} — <t:${Math.floor(reminder.dueAt / 1000)}:R> · ${delivery}`;
  });

  if (reminders.length > shown.length) {
    lines.push(`…and ${reminders.length - shown.length} more.`);
  }

  const embed = createEmbed(client, {
    section: 'Reminders',
    title: 'Your reminders',
    description: reminders.length === 0
      ? 'You have no pending reminders. Use `/remind` to set one.'
      : `You have **${reminders.length}** pending reminder${reminders.length === 1 ? '' : 's'}.\n\n${lines.join('\n')}`,
    color: reminders.length === 0 ? COLORS.neutral : COLORS.brand,
    footer: `Private to ${requestedBy} · select a reminder to cancel it`,
  });

  if (shown.length === 0) return { embeds: [embed], components: [] };

  const menu = new StringSelectMenuBuilder()
    .setCustomId('reminders:cancel')
    .setPlaceholder('Select a reminder to cancel')
    .addOptions(
      shown.map((reminder, index) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${index + 1}. ${truncate(reminder.message, 90)}`)
          .setDescription(`Due ${relativeDue(reminder.dueAt, now)} · ${reminder.where === 'channel' ? 'Channel' : 'Direct message'}`)
          .setValue(reminder.id),
      ),
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('reminders')
    .setDescription('Review or cancel your pending reminders'),

  async execute(interaction) {
    const reminders = await listReminders(interaction.user.id);

    await interaction.reply({
      ...buildPayload(interaction.client, reminders, interaction.user.username),
      flags: MessageFlags.Ephemeral,
    });
  },

  async handleComponent(interaction) {
    if (interaction.customId !== 'reminders:cancel') return;

    const reminder = await cancelReminder(interaction.values?.[0], interaction.user.id);
    if (!reminder) {
      await interaction.reply({
        content: 'That reminder no longer exists. Run `/reminders` to refresh your list.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const reminders = await listReminders(interaction.user.id);
    await interaction.update(buildPayload(interaction.client, reminders, interaction.user.username));
    await interaction.followUp({
      content: `✅ Cancelled reminder: **${truncate(reminder.message, 200)}**`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
