const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { isDeveloper } = require('../../lib/developers');
const { readAttachment, readImage, setBotAvatar } = require('../../lib/botIdentity');

const DENIED = 'This command is restricted to the bot developer.';

module.exports = {
  developerOnly: true,

  data: new SlashCommandBuilder()
    .setName('devavatar')
    .setDescription('Developer: replace the bot avatar with a new image')
    .addAttachmentOption((option) =>
      option
        .setName('image')
        .setDescription('PNG, JPG, WEBP or GIF up to 10 MB'),
    )
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('Direct https:// image link instead of an attachment'),
    ),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: DENIED, flags: MessageFlags.Ephemeral });
      return;
    }

    const attachment = interaction.options.getAttachment('image');
    const url = interaction.options.getString('url');

    if (!attachment && !url) {
      await interaction.reply({
        content: 'Attach an image or pass a direct https:// image link.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const image = attachment ? await readAttachment(attachment) : await readImage(url);
      await setBotAvatar(interaction.client, image.buffer);

      const avatar = interaction.client.user.displayAvatarURL({
        extension: 'png',
        size: 256,
        forceStatic: true,
      });

      await interaction.editReply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Developers',
            title: 'Bot avatar updated',
            description: [
              attachment
                ? `The avatar now uses \`${attachment.name}\`.`
                : 'The avatar now uses that image link.',
              '-# Discord can cache the old avatar for a few minutes.',
            ].join('\n'),
            color: COLORS.danger,
            thumbnail: avatar,
            footer: `Requested by ${interaction.user.username}`,
          }),
        ],
      });
    } catch (error) {
      await interaction.editReply({ content: `Could not update the avatar: ${error.message}` });
    }
  },
};
