/**
 * Resolves the guild for an interaction without trusting the local cache alone.
 *
 * Discord can deliver a valid guild id while the guild is missing from the
 * client cache, and user-install commands can arrive from a DM. Prefer the
 * interaction context, fetch the guild by id when needed, and only fall back to
 * the bot's sole guild for a DM.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {string|null} [guildId] Optional target id stored in a component id.
 * @returns {Promise<{guild: import('discord.js').Guild|null, source: 'context'|'fetched'|'dm'|'not_member'|'dm_ambiguous'}>}
 */
async function resolveGuild(interaction, guildId = interaction.guildId) {
  const cached =
    interaction.guild ??
    (guildId ? interaction.client.guilds.cache.get(guildId) : null) ??
    null;

  if (cached) return { guild: cached, source: 'context' };

  if (guildId) {
    const fetched = await interaction.client.guilds.fetch(guildId).catch(() => null);
    return fetched
      ? { guild: fetched, source: 'fetched' }
      : { guild: null, source: 'not_member' };
  }

  // A DM has no guild context. If the bot only belongs to one server, that
  // server is unambiguous, so /serverinfo and /servericon can still work.
  if (interaction.client.guilds.cache.size === 1) {
    return { guild: interaction.client.guilds.cache.first(), source: 'dm' };
  }

  return { guild: null, source: 'dm_ambiguous' };
}

/**
 * @param {'not_member'|'dm_ambiguous'|string} source
 * @returns {string}
 */
function guildFailureMessage(source) {
  if (source === 'not_member') {
    return 'I cannot read this server because I am not a member of it. Run the command in a server that has the bot, or add me there first.';
  }

  if (source === 'dm_ambiguous') {
    return 'I cannot tell which server you mean from a direct message. Run this command in a server channel.';
  }

  return 'This command needs a server. Run it in a server channel.';
}

/**
 * @param {'dm'|string} source
 * @param {import('discord.js').Guild} guild
 * @returns {string|null}
 */
function dmContextNote(source, guild) {
  if (source !== 'dm') return null;
  return `> Used in a direct message, so this shows **${guild.name}** — the bot's only server.`;
}

module.exports = { dmContextNote, guildFailureMessage, resolveGuild };
