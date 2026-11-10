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

/** Remove leading/trailing noise and collapse accidental blank lines. */
function compactText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
      name: clamp(compactText(String(field.name)), LIMITS.fieldName),
      value: clamp(compactText(String(field.value)), LIMITS.fieldValue),
      inline: Boolean(field.inline),
    }))
    .filter((field) => field.name && field.value)
    .slice(0, LIMITS.fields);
}

/**
 * Creates a compact branded embed with the shared palette and timestamp.
 * The bot author header is intentionally omitted; commands can still opt into
 * one with `author`, but the default card starts with its title or description.
 *
 * @param {import('discord.js').Client} client
 * @param {object} [options]
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {number} [options.color]
 * @param {string} [options.url]
 * @param {object|string|null} [options.author] Optional author override
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

  const title = options.title ? compactText(options.title) : '';
  const description = options.description ? compactText(options.description) : '';

  if (title) embed.setTitle(clamp(title, LIMITS.title));
  if (description) embed.setDescription(clamp(description, LIMITS.description));
  if (options.url) embed.setURL(options.url);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);

  const fields = normalizeFields(options.fields);
  if (fields.length > 0) embed.addFields(fields);

  if (options.author) {
    const author = typeof options.author === 'string'
      ? { name: options.author }
      : { ...options.author };
    if (!author.name) {
      author.name = client?.user?.username ?? 'Zen';
    }
    author.name = clamp(compactText(author.name), LIMITS.author);

    const iconURL = botIcon(client);
    if (!author.iconURL && iconURL) author.iconURL = iconURL;
    embed.setAuthor(author);
  }

  if (options.footer !== false) {
    const parts = [];
    if (options.footer) parts.push(compactText(options.footer));
    parts.push(`v${BOT_VERSION}`);

    embed.setFooter({
      text: clamp(parts.join('  •  '), LIMITS.footer),
    });
  }

  return embed;
}

module.exports = {
  BOT_VERSION,
  COLORS,
  LIMITS,
  compactText,
  createEmbed,
};
