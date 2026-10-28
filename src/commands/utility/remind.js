const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { createReminder, parseDuration } = require('../../lib/reminders');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder that survives bot restarts')
    .addStringOption((option) =>
      option
        .setName('when')
        .setDescription('When to remind you, for example 10m, 2h, 3d or 1w')
        .setRequired(true)
        .setMaxLength(20),
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('What should the reminder say?')
        .setRequired(true)
        .setMaxLength(500),
    )
    .addStringOption((option) =>
      option
        .setName('where')
        .setDescription('Where should the reminder be delivered?')
        .addChoices(
          { name: 'Direct message (default)', value: 'dm' },
          { name: 'This channel', value: 'channel' },
        ),
    ),

  async execute(interaction) {
    const when = interaction.options.getString('when', true);
    const message = interaction.options.getString('message', true).trim();
    const where = interaction.options.getString('where') ?? 'dm';
    const delayMs = parseDuration(when);

    if (!delayMs) {
      await interaction.reply({
        content: 'Use a duration between **1 minute and 30 days**, such as `10m`, `2h`, `3d` or `1w`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.channelId) {
      await interaction.reply({
        content: 'This command needs a channel to fall back to. Run it in a server or use a DM reminder.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const dueAt = Date.now() + delayMs;
    const unix = Math.floor(dueAt / 1000);

    try {
      await createReminder({
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        message,
        dueAt,
        where,
      });
    } catch (error) {
      await interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = createEmbed(interaction.client, {
      section: 'Reminders',
      title: '⏰ Reminder set',
      description: `> ${message}`,
      color: COLORS.success,
      fields: [
        { name: '📅 Due', value: `<t:${unix}:F> (<t:${unix}:R>)`, inline: false },
        { name: '📍 Delivery', value: where === 'dm' ? 'Direct message' : 'This channel', inline: true },
      ],
      footer: where === 'dm'
        ? 'Closed DMs fall back to this channel'
        : `Reminder for ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
