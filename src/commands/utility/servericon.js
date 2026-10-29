const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { dmContextNote, guildFailureMessage, resolveGuild } = require('../../lib/guilds');
const { DEFAULT_SIZE, buildImageComponents, parseSize } = require('../../lib/images');

function iconUrl(guild, size) {
  return guild.iconURL({ extension: 'png', size, forceStatic: true });
}

function buildEmbed(client, guild, size, requestedBy, contextNote = null) {
  const url = iconUrl(guild, size);

  return createEmbed(client, {
    section: 'Server Icons',
    title: `${guild.name} — icon`,
    url,
    image: url,
    color: guild.members?.me?.displayColor || COLORS.brand,
    description: [
      `Server icon · **PNG** · ${size} × ${size} px`,
      contextNote,
    ].filter(Boolean).join('\n\n'),
    fields: [
      { name: '🖼️ Format', value: 'PNG', inline: true },
      { name: '📐 Resolution', value: `${size} × ${size}`, inline: true },
      { name: '🆔 Server', value: `\`${guild.id}\``, inline: true },
    ],
    footer: `Requested by ${requestedBy}`,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servericon')
    .setDescription('Grab this server icon in any size'),

  async execute(interaction) {
    const resolution = await resolveGuild(interaction);

    if (!resolution.guild) {
      await interaction.reply({
        content: guildFailureMessage(resolution.source),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = resolution.guild;

    if (!guild.icon) {
      await interaction.reply({
        content: 'This server does not have an icon set.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const contextNote = dmContextNote(resolution.source, guild);

    await interaction.reply({
      embeds: [buildEmbed(interaction.client, guild, DEFAULT_SIZE, interaction.user.username, contextNote)],
      components: buildImageComponents(
        `servericon:size:${guild.id}`,
        DEFAULT_SIZE,
        iconUrl(guild, DEFAULT_SIZE),
      ),
    });
  },

  async handleComponent(interaction) {
    const [, , targetGuildId] = interaction.customId.split(':');
    const resolution = await resolveGuild(interaction, targetGuildId || interaction.guildId);
    const size = parseSize(interaction.values?.[0]);

    if (!size) {
      await interaction.reply({ content: 'That image size is not supported.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!resolution.guild) {
      await interaction.reply({
        content: guildFailureMessage(resolution.source),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = resolution.guild;

    if (!guild.icon) {
      await interaction.reply({
        content: 'This server does not have an icon set.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update({
      embeds: [buildEmbed(
        interaction.client,
        guild,
        size,
        interaction.user.username,
        dmContextNote(resolution.source, guild),
      )],
      components: buildImageComponents(`servericon:size:${guild.id}`, size, iconUrl(guild, size)),
    });
  },
};
