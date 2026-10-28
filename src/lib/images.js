const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

/** Image sizes accepted by the Discord CDN (powers of two). */
const SIZES = [64, 128, 256, 512, 1024, 2048, 4096];

const DEFAULT_SIZE = 1024;

/**
 * Builds the size picker + download button rows for a command.
 *
 * @param {string} customId custom id in the form `<command>:size[:targetId]`
 * @param {number} selectedSize
 * @param {string} downloadUrl
 * @returns {ActionRowBuilder[]}
 */
function buildImageComponents(customId, selectedSize, downloadUrl) {
  const sizeMenu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder('Choose an image size')
    .addOptions(
      SIZES.map((size) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${size} × ${size} px`)
          .setValue(String(size))
          .setDefault(size === selectedSize),
      ),
    );

  const downloadButton = new ButtonBuilder()
    .setLabel('Download')
    .setEmoji('📥')
    .setStyle(ButtonStyle.Link)
    .setURL(downloadUrl);

  return [
    new ActionRowBuilder().addComponents(sizeMenu),
    new ActionRowBuilder().addComponents(downloadButton),
  ];
}

/**
 * @param {unknown} value
 * @returns {number | null} the size if it is supported, otherwise null
 */
function parseSize(value) {
  const size = Number(value);
  return SIZES.includes(size) ? size : null;
}

module.exports = { SIZES, DEFAULT_SIZE, buildImageComponents, parseSize };
