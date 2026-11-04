const { Routes } = require('discord.js');

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;
const REQUEST_TIMEOUT_MS = 15000;

function httpsUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function timeoutSignal() {
  return typeof AbortSignal?.timeout === 'function'
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : undefined;
}

function contentTypeOf(response) {
  const raw = response?.headers?.get?.('content-type');
  return raw ? raw.split(';')[0].trim().toLowerCase() : '';
}

function mimeFromBuffer(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
  if (buffer.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return 'image/png';
}

/**
 * Downloads a public image and enforces Discord's size and format limits
 * before it is handed to the avatar or banner endpoint.
 *
 * @param {string} source
 * @param {{fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
async function readImage(source, { fetchImpl = globalThis.fetch } = {}) {
  const url = httpsUrl(source);
  if (!url) throw new Error('Use a direct https:// image link.');

  let response;

  try {
    response = await fetchImpl(url, {
      headers: { accept: 'image/*' },
      signal: timeoutSignal(),
    });
  } catch (error) {
    throw new Error(`Could not download that image: ${error.message}`);
  }

  if (!response?.ok) {
    throw new Error(`The image server returned HTTP ${response?.status ?? 'unknown'}.`);
  }

  const contentType = contentTypeOf(response);
  if (contentType && !IMAGE_TYPES.test(contentType)) {
    throw new Error('That link is not a PNG, JPG, WEBP or GIF image.');
  }

  let buffer;

  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw new Error(`Could not read that image: ${error.message}`);
  }

  if (buffer.length === 0) throw new Error('That image is empty.');
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('That image is larger than 10 MB.');

  return { buffer, contentType: contentType || mimeFromBuffer(buffer) };
}

/** Downloads an uploaded attachment after checking its declared size and type. */
async function readAttachment(attachment, options = {}) {
  if (!attachment?.url) throw new Error('Attach an image or pass an image URL.');
  if (Number(attachment.size) > MAX_IMAGE_BYTES) throw new Error('That image is larger than 10 MB.');

  if (attachment.contentType && !IMAGE_TYPES.test(attachment.contentType)) {
    throw new Error('Use a PNG, JPG, WEBP or GIF image.');
  }

  return readImage(attachment.url, options);
}

async function setBotAvatar(client, buffer) {
  try {
    await client.user.setAvatar(buffer);
  } catch (error) {
    throw new Error(`Discord rejected the avatar: ${error.message}`);
  }
}

/**
 * Applies a new bot banner. ClientUser#setBanner is used when the installed
 * discord.js version exposes it, with a REST fallback so an older library
 * still updates the profile instead of silently doing nothing.
 */
async function setBotBanner(client, buffer, contentType = 'image/png') {
  if (typeof client.user?.setBanner === 'function') {
    try {
      await client.user.setBanner(buffer);
      return;
    } catch (error) {
      throw new Error(`Discord rejected the banner: ${error.message}`);
    }
  }

  const banner = `data:${contentType};base64,${buffer.toString('base64')}`;

  try {
    await client.rest.patch(Routes.user(), { body: { banner } });
  } catch (error) {
    throw new Error(`Discord rejected the banner: ${error.message}`);
  }
}

/** Removes the bot banner so the profile falls back to Discord's default. */
async function clearBotBanner(client) {
  if (typeof client.user?.setBanner === 'function') {
    try {
      await client.user.setBanner(null);
      return;
    } catch (error) {
      throw new Error(`Discord rejected the banner reset: ${error.message}`);
    }
  }

  try {
    await client.rest.patch(Routes.user(), { body: { banner: null } });
  } catch (error) {
    throw new Error(`Discord rejected the banner reset: ${error.message}`);
  }
}

module.exports = {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  clearBotBanner,
  httpsUrl,
  mimeFromBuffer,
  readAttachment,
  readImage,
  setBotAvatar,
  setBotBanner,
};
