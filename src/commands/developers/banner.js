const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { isDeveloper } = require('../../lib/developers');
const { clearBotBanner, readAttachment, readImage, setBotBanner } = require('../../lib/botIdentity');

const DENIED = 'This command is restricted to the bot developer.';

module.exports = {
  developerOnly: true,

  data: new SlashCommandBuilder()
    .setName('devbanner')
    .setDescription('Developer: replace or remove the bot profile banner')
    .addAttachmentOption((option) =>
      option
        .setName('image')
        .setDescription('PNG, JPG, WEBP or GIF up to 10 MB (at least 600 × 240 px)'),
    )
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('Direct https:// image link instead of an attachment'),
    )
    .addBooleanOption((option) =>
      option.setName('reset').setDescription('Remove the banner instead'),
    ),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: DENIED, flags: MessageFlags.Ephemeral });
      return;
    }

    const attachment = interaction.options.getAttachment('image');
    const url = interaction.options.getString('url');
    const reset = interaction.options.getBoolean('reset') === true;

    if (!reset && !attachment && !url) {
      await interaction.reply({
        content: 'Attach an image, pass a direct https:// image link, or set `reset` to remove the banner.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (reset) {
        await clearBotBanner(interaction.client);
      } else {
        const image = attachment ? await readAttachment(attachment) : await readImage(url);
        await setBotBanner(interaction.client, image.buffer, image.contentType);
      }

      await interaction.client.user.fetch?.(true).catch(() => {});
      const banner = interaction.client.user.bannerURL?.({ extension: 'png', size: 2048 });

      await interaction.editReply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Developers',
            title: reset ? 'Bot banner removed' : 'Bot banner updated',
            description: reset
              ? 'The profile banner is back to Discord’s default.'
              : 'The profile banner now uses that image. Discord can cache the old banner for a few minutes.',
            color: COLORS.danger,
            image: banner ?? null,
            footer: `Requested by ${interaction.user.username}`,
          }),
        ],
      });
    } catch (error) {
      await interaction.editReply({ content: `Could not update the banner: ${error.message}` });
    }
  },
};
