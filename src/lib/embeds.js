const { EmbedBuilder } = require('discord.js');
const { version: BOT_VERSION } = require('../../package.json');

const COLORS = Object.freeze({
  brand: 0x6d5efc,
  info: 0x4aa8ff,
  success: 0x32d583,
  warning: 0xf5b041,
  danger: 0xff5d73,
  fun: 0xff6fb5,
  game: 0xffc857,
  neutral: 0x2b2d31,
});

function botIcon(client) {
  return client?.user?.displayAvatarURL({
    extension: 'png',
    size: 128,
    forceStatic: true,
  });
}

/**
 * Creates a branded embed with the shared palette, bot identity and timestamp.
 *
 * @param {import('discord.js').Client} client
 * @param {object} [options]
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {number} [options.color]
 * @param {string} [options.url]
 * @param {object|string|null} [options.author]
 * @param {string} [options.section] Small label shown beside the bot name
 * @param {string|null} [options.thumbnail]
 * @param {string|null} [options.image]
 * @param {object[]} [options.fields]
 * @param {string|false} [options.footer] Context appended before the bot version
 * @param {number} [options.timestamp]
 * @returns {EmbedBuilder}
 */
function createEmbed(client, options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color ?? COLORS.brand)
    .setTimestamp(options.timestamp ?? Date.now());

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.url) embed.setURL(options.url);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.fields?.length) embed.addFields(options.fields);

  const iconURL = botIcon(client);
  if (options.author !== null) {
    const author = options.author
      ? (typeof options.author === 'string' ? { name: options.author } : { ...options.author })
      : (client?.user
        ? {
            name: `${client.user.username}${options.section ? ` • ${options.section}` : ''}`,
          }
        : null);

    if (author) {
      if (!author.iconURL && iconURL) author.iconURL = iconURL;
      embed.setAuthor(author);
    }
  }

  if (options.footer !== false) {
    const parts = [];
    if (options.footer) parts.push(options.footer);
    if (client?.user) parts.push(`${client.user.username} • v${BOT_VERSION}`);
    else parts.push(`v${BOT_VERSION}`);

    embed.setFooter({
      text: parts.join('  •  ').slice(0, 2048),
      ...(iconURL ? { iconURL } : {}),
    });
  }

  return embed;
}

module.exports = { BOT_VERSION, COLORS, createEmbed };
