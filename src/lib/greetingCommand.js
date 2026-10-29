const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('./embeds');
const {
  DEFAULT_MESSAGES,
  buildGreetingPayload,
  disableGreeting,
  getGreeting,
  resolveChannel,
  setGreeting,
} = require('./greetings');

const REQUIRED_CHANNEL_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
];

const LABELS = Object.freeze({
  welcome: {
    title: 'Welcome message',
    description: 'Configure the message sent when a member joins',
    section: 'Greetings',
    emoji: '👋',
  },
  leave: {
    title: 'Leave message',
    description: 'Configure the message sent when a member leaves',
    section: 'Farewell',
    emoji: '🚪',
  },
});

function canSend(channel, guild) {
  const permissions = channel?.permissionsFor?.(guild.members.me);
  return !permissions || permissions.has(REQUIRED_CHANNEL_PERMISSIONS);
}

function statusEmbed(client, { type, config, channel, saved, requestedBy }) {
  const label = LABELS[type];
  const enabled = config.enabled && config.channelId;

  return createEmbed(client, {
    section: label.section,
    title: `${label.emoji} ${label.title} settings`,
    description: saved
      ? 'Your greeting settings were saved.'
      : enabled
        ? `This message is sent whenever a member ${type === 'welcome' ? 'joins' : 'leaves'}.`
        : `No ${type} message is active yet. Choose a channel to turn it on.`,
    color: enabled ? COLORS.success : COLORS.neutral,
    fields: [
      {
        name: '📁 Channel',
        value: config.channelId ? `<#${config.channelId}>` : 'Not configured',
        inline: true,
      },
      {
        name: '🛡️ Status',
        value: enabled ? (channel ? 'Enabled' : '⚠️ Channel missing') : 'Disabled',
        inline: true,
      },
      {
        name: '💬 Message',
        value: config.message || DEFAULT_MESSAGES[type],
        inline: false,
      },
      {
        name: '🧩 Placeholders',
        value: '`{user}` mention · `{username}` display name · `{server}` server name · `{count}` member count · `{created}` account age · `{joined}` join age',
        inline: false,
      },
    ],
    footer: `Requested by ${requestedBy}`,
  });
}

function createGreetingCommand(type) {
  const label = LABELS[type];

  return {
    beta: true,

    data: new SlashCommandBuilder()
      .setName(type)
      .setDescription(label.description)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription(`The channel for ${type} messages`)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
      )
      .addStringOption((option) =>
        option
          .setName('message')
          .setDescription('Use placeholders such as {user}, {server} and {count}')
          .setMaxLength(500),
      )
      .addBooleanOption((option) =>
        option
          .setName('disable')
          .setDescription(`Stop sending ${type} messages`),
      )
      .addBooleanOption((option) =>
        option
          .setName('test')
          .setDescription('Send a preview of the current message to its channel'),
      ),

    async execute(interaction) {
      const guild = interaction.guild;

      if (!guild) {
        await interaction.reply({
          content: 'This command only works in a server.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: 'You need the **Manage Server** permission to configure greetings.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const channelOption = interaction.options.getChannel('channel');
      const messageOption = interaction.options.getString('message')?.trim() || null;
      const disable = interaction.options.getBoolean('disable') ?? false;
      const test = interaction.options.getBoolean('test') ?? false;
      let config = await getGreeting(guild.id, type);

      if (!channelOption && !messageOption && !disable && !test) {
        const current = config.channelId ? guild.channels.cache.get(config.channelId) : null;
        await interaction.reply({
          embeds: [
            statusEmbed(interaction.client, {
              type,
              config,
              channel: current,
              saved: false,
              requestedBy: interaction.user.username,
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (disable && (channelOption || test)) {
        await interaction.reply({
          content: 'Choose `disable:true` by itself, without a channel or a test.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (disable) {
        config = await disableGreeting(guild.id, type);
        await interaction.reply({
          embeds: [
            statusEmbed(interaction.client, {
              type,
              config,
              channel: config.channelId ? guild.channels.cache.get(config.channelId) : null,
              saved: true,
              requestedBy: interaction.user.username,
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      let saved = false;

      if (channelOption || messageOption) {
        const channelId = channelOption?.id ?? config.channelId;

        if (!channelId) {
          await interaction.reply({
            content: 'Choose a channel first so the bot knows where to send the message.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const targetChannel = await resolveChannel(interaction.client, channelId);

        if (!targetChannel?.isTextBased?.() || targetChannel.guildId !== guild.id) {
          await interaction.reply({
            content: 'Choose a text channel from this server.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (!canSend(targetChannel, guild)) {
          await interaction.reply({
            content: `I need **View Channel**, **Send Messages** and **Embed Links** in ${targetChannel}.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        config = await setGreeting(guild.id, type, {
          channelId,
          message: messageOption ?? config.message,
          updatedBy: interaction.user.id,
        });
        saved = true;
      }

      if (test) {
        if (!config.enabled || !config.channelId) {
          await interaction.reply({
            content: `Configure a channel first, then run \`/${type} test:true\`.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const targetChannel = await resolveChannel(interaction.client, config.channelId);
        if (!targetChannel?.isTextBased?.()) {
          await interaction.reply({
            content: `The configured ${type} channel no longer exists. Choose a new one.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        try {
          await targetChannel.send(
            buildGreetingPayload(interaction.client, {
              type,
              member: interaction.member,
              config,
            }),
          );
        } catch (error) {
          console.warn(`[greetings] Test message failed: ${error.message}`);
          await interaction.reply({
            content: `I could not send a test to ${targetChannel}. Check my channel permissions.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.reply({
          embeds: [
            statusEmbed(interaction.client, {
              type,
              config,
              channel: targetChannel,
              saved,
              requestedBy: interaction.user.username,
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const current = config.channelId ? guild.channels.cache.get(config.channelId) : null;
      await interaction.reply({
        embeds: [
          statusEmbed(interaction.client, {
            type,
            config,
            channel: current,
            saved,
            requestedBy: interaction.user.username,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    },
  };
}

module.exports = { createGreetingCommand };
