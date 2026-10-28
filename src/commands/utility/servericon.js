const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { DEFAULT_SIZE, buildImageComponents, parseSize } = require('../../lib/images');

function iconUrl(guild, size) {
  return guild.iconURL({ extension: 'png', size, forceStatic: true });
}

function buildEmbed(client, guild, size, requestedBy) {
  const url = iconUrl(guild, size);

  return createEmbed(client, {
    section: 'Server Icons',
    title: `${guild.name} — icon`,
    url,
    image: url,
    color: guild.members?.me?.displayColor || COLORS.brand,
    description: `Server icon · **PNG** · ${size} × ${size} px`,
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
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used inside a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.guild.icon) {
      await interaction.reply({
        content: 'This server does not have an icon set.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      embeds: [buildEmbed(interaction.client, interaction.guild, DEFAULT_SIZE, interaction.user.username)],
      components: buildImageComponents(
        'servericon:size',
        DEFAULT_SIZE,
        iconUrl(interaction.guild, DEFAULT_SIZE),
      ),
    });
  },

  async handleComponent(interaction) {
    const guild = interaction.guild;
    const size = parseSize(interaction.values?.[0]);

    if (!size) {
      await interaction.reply({ content: 'That image size is not supported.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!guild?.icon) {
      await interaction.reply({
        content: 'This server does not have an icon set.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update({
      embeds: [buildEmbed(interaction.client, guild, size, interaction.user.username)],
      components: buildImageComponents('servericon:size', size, iconUrl(guild, size)),
    });
  },
};
