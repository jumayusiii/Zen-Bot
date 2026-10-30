const MAX_PURGE = 100;
const MAX_PURGE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function formatSlowmode(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  if (value === 0) return 'Off';

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secondsLeft = value % 60;

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}${secondsLeft > 0 ? ` ${secondsLeft}s` : ''}`;
  }
  if (minutes > 0) {
    return `${minutes}m${secondsLeft > 0 ? ` ${secondsLeft}s` : ''}`;
  }
  return `${secondsLeft}s`;
}

/**
 * Keeps messages that Discord can safely bulk-delete right now.
 *
 * @param {Iterable<object>|object} messages Collection, array or other iterable
 * @param {{userId?: string|null, now?: number, maxAgeMs?: number, includePinned?: boolean}} [options]
 * @returns {object[]}
 */
function selectPurgeable(messages, {
  userId = null,
  now = Date.now(),
  maxAgeMs = MAX_PURGE_AGE_MS,
  includePinned = false,
} = {}) {
  const source = messages && typeof messages.values === 'function'
    ? [...messages.values()]
    : Array.from(messages ?? []);
  const ageLimit = Math.max(0, Number(maxAgeMs) || 0);

  return source
    .filter((message) => {
      if (!message?.author?.id) return false;
      if (!includePinned && message.pinned) return false;
      if (userId && message.author.id !== String(userId)) return false;

      const createdAt = Number(message.createdTimestamp);
      if (!Number.isFinite(createdAt)) return false;

      const age = now - createdAt;
      return age >= 0 && age <= ageLimit;
    })
    .slice(0, MAX_PURGE);
}

/**
 * Deletes one message at a time or bulk-deletes when Discord allows it.
 *
 * @param {object} channel
 * @param {object[]} messages
 * @returns {Promise<number>}
 */
async function deletePurgeable(channel, messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;

  if (messages.length === 1) {
    await messages[0].delete();
    return 1;
  }

  if (typeof channel?.bulkDelete === 'function') {
    const deleted = await channel.bulkDelete(messages, true);
    return deleted?.size ?? messages.length;
  }

  let deleted = 0;
  for (const message of messages) {
    await message.delete();
    deleted += 1;
  }
  return deleted;
}

module.exports = {
  MAX_PURGE,
  MAX_PURGE_AGE_MS,
  deletePurgeable,
  formatSlowmode,
  selectPurgeable,
};
