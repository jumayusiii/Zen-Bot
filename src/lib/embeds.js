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

const LIMITS = Object.freeze({
  author: 256,
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  fields: 25,
});

/** Discord rejects over-long embed text, so clamp it before it is sent. */
function clamp(text, max) {
  if (typeof text !== 'string') return text;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function botIcon(client) {
  return client?.user?.displayAvatarURL({
    extension: 'png',
    size: 128,
    forceStatic: true,
  });
}

function normalizeFields(fields) {
  if (!Array.isArray(fields)) return [];

  return fields
    .filter((field) => field && field.name != null && field.value != null)
    .map((field) => ({
      name: clamp(String(field.name), LIMITS.fieldName) || '\u200b',
      value: clamp(String(field.value), LIMITS.fieldValue) || '\u200b',
      inline: Boolean(field.inline),
    }))
    .slice(0, LIMITS.fields);
}

/**
 * Creates a branded embed with the shared palette, bot identity and timestamp.
 * The author line carries the bot name and section, so the footer only needs
 * the command's own context plus the running version.
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

  if (options.title) embed.setTitle(clamp(options.title, LIMITS.title));
  if (options.description) embed.setDescription(clamp(options.description, LIMITS.description));
  if (options.url) embed.setURL(options.url);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);

  const fields = normalizeFields(options.fields);
  if (fields.length > 0) embed.addFields(fields);

  const iconURL = botIcon(client);
  if (options.author !== null) {
    const author = options.author
      ? (typeof options.author === 'string' ? { name: options.author } : { ...options.author })
      : (client?.user
        ? {
            name: clamp(
              `${client.user.username}${options.section ? ` • ${options.section}` : ''}`,
              LIMITS.author,
            ),
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
    parts.push(`v${BOT_VERSION}`);

    embed.setFooter({
      text: clamp(parts.join('  •  '), LIMITS.footer),
      ...(iconURL ? { iconURL } : {}),
    });
  }

  return embed;
}

module.exports = { BOT_VERSION, COLORS, LIMITS, createEmbed };
