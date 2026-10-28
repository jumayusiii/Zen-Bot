const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { DEFAULT_SIZE, buildImageComponents, parseSize } = require('../../lib/images');

function avatarUrl(user, size) {
  return user.displayAvatarURL({ extension: 'png', size, forceStatic: true });
}

function buildEmbed(client, user, size, requestedBy) {
  const url = avatarUrl(user, size);

  return createEmbed(client, {
    section: 'Avatar Studio',
    title: `${user.displayName}'s avatar`,
    url,
    image: url,
    color: user.accentColor || COLORS.brand,
    description: `Profile picture · **PNG** · ${size} × ${size} px`,
    fields: [
      { name: '🖼️ Format', value: 'PNG', inline: true },
      { name: '📐 Resolution', value: `${size} × ${size}`, inline: true },
      { name: '🆔 User', value: `\`${user.id}\``, inline: true },
    ],
    footer: `Requested by ${requestedBy}`,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Grab a user avatar / profile picture in any size')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to grab (defaults to you)'),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;

    await interaction.reply({
      embeds: [buildEmbed(interaction.client, user, DEFAULT_SIZE, interaction.user.username)],
      components: buildImageComponents(
        `avatar:size:${user.id}`,
        DEFAULT_SIZE,
        avatarUrl(user, DEFAULT_SIZE),
      ),
    });
  },

  async handleComponent(interaction) {
    const [, , targetId] = interaction.customId.split(':');
    const size = parseSize(interaction.values?.[0]);

    if (!size) {
      await interaction.reply({ content: 'That image size is not supported.', flags: MessageFlags.Ephemeral });
      return;
    }

    let user = interaction.client.users.cache.get(targetId);
    if (!user && targetId) {
      user = await interaction.client.users.fetch(targetId).catch(() => null);
    }

    if (!user) {
      await interaction.reply({
        content: 'That user could not be found anymore. Run the command again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update({
      embeds: [buildEmbed(interaction.client, user, size, interaction.user.username)],
      components: buildImageComponents(`avatar:size:${user.id}`, size, avatarUrl(user, size)),
    });
  },
};
