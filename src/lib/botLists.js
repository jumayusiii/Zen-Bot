const TOPGG_URL = (clientId) => `https://top.gg/api/bots/${encodeURIComponent(clientId)}/stats`;
const DISCORDBOTLIST_URL = (clientId) =>
  `https://discordbotlist.com/api/v1/bots/${encodeURIComponent(clientId)}/stats`;

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10 * 1000;

/**
 * Builds the list payloads for every token that is configured. Missing tokens
 * simply disable that list, so self-hosted copies never post accidentally.
 *
 * @param {{env?: NodeJS.ProcessEnv, clientId: string, guildCount: number, memberCount?: number}} options
 * @returns {{name: string, url: string, token: string, body: object}[]}
 */
function buildTargets({ env = process.env, clientId, guildCount, memberCount = 0 }) {
  if (!clientId) return [];

  const targets = [];
  const topggToken = env.TOPGG_TOKEN?.trim();

  if (topggToken) {
    targets.push({
      name: 'top.gg',
      url: TOPGG_URL(clientId),
      token: topggToken,
      body: { server_count: guildCount },
    });
  }

  const listToken = env.DISCORDBOTLIST_TOKEN?.trim();

  if (listToken) {
    const body = { guilds: guildCount };
    if (memberCount > 0) body.users = memberCount;

    targets.push({
      name: 'Discord Bot List',
      url: DISCORDBOTLIST_URL(clientId),
      token: listToken,
      body,
    });
  }

  return targets;
}

async function postTarget(target, fetchImpl) {
  if (typeof fetchImpl !== 'function') {
    return { service: target.name, ok: false, error: 'fetch is unavailable' };
  }

  try {
    const signal =
      typeof AbortSignal?.timeout === 'function'
        ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        : undefined;

    const response = await fetchImpl(target.url, {
      method: 'POST',
      headers: {
        Authorization: target.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(target.body),
      signal,
    });

    if (!response.ok) {
      return { service: target.name, ok: false, status: response.status };
    }

    return { service: target.name, ok: true, status: response.status };
  } catch (error) {
    return {
      service: target.name,
      ok: false,
      error: error?.name || 'request failed',
    };
  }
}

/**
 * Posts the current guild and member counts to every configured list.
 * Never throws; the caller gets one result per configured service.
 *
 * @param {{client: import('discord.js').Client, env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{service: string, ok: boolean, status?: number, error?: string}[]>}
 */
async function syncBotLists({ client, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const clientId = client?.application?.id ?? client?.user?.id;
  if (!clientId) return [];

  const guilds = client.guilds?.cache;
  const guildCount = guilds?.size ?? 0;
  const memberCount =
    typeof guilds?.reduce === 'function'
      ? guilds.reduce((total, guild) => total + (guild.memberCount || 0), 0)
      : 0;

  const targets = buildTargets({ env, clientId, guildCount, memberCount });
  return Promise.all(targets.map((target) => postTarget(target, fetchImpl)));
}

/**
 * Posts immediately and then every 30 minutes for as long as the bot runs.
 *
 * @param {import('discord.js').Client} client
 * @param {{env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch, intervalMs?: number, logger?: Console}} [options]
 * @returns {NodeJS.Timeout|null}
 */
function startBotListSync(
  client,
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    intervalMs = DEFAULT_INTERVAL_MS,
    logger = console,
  } = {},
) {
  const configured = buildTargets({
    env,
    clientId: client?.application?.id ?? client?.user?.id,
    guildCount: 0,
  });

  if (configured.length === 0) {
    logger.log('[botLists] No list tokens configured; stats sync is off.');
    return null;
  }

  const run = async () => {
    try {
      const results = await syncBotLists({ client, env, fetchImpl });

      for (const result of results) {
        if (result.ok) {
          logger.log(`[botLists] ${result.service}: stats posted (HTTP ${result.status ?? 200}).`);
        } else {
          logger.warn(
            `[botLists] ${result.service}: ${result.status ? `HTTP ${result.status}` : result.error}.`,
          );
        }
      }
    } catch (error) {
      logger.warn(`[botLists] Could not post stats: ${error.message}`);
    }
  };

  run();

  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return timer;
}

module.exports = {
  DEFAULT_INTERVAL_MS,
  DISCORDBOTLIST_URL,
  TOPGG_URL,
  buildTargets,
  startBotListSync,
  syncBotLists,
};
