const { recordCheck } = require('./siteHistory');
const { siteUrl } = require('./config');

const DEFAULT_INTERVAL_SECONDS = 300;
const MIN_INTERVAL_SECONDS = 60;
const TIMEOUT_MS = 10000;

let monitor = null;

function monitorIntervalMs() {
  const configured = Number(process.env.SITE_MONITOR_INTERVAL_SECONDS);
  const seconds = Number.isFinite(configured) && configured >= MIN_INTERVAL_SECONDS
    ? configured
    : DEFAULT_INTERVAL_SECONDS;

  return Math.round(seconds * 1000);
}

function errorCode(error) {
  return error?.cause?.code || error?.code || error?.name || 'Unknown error';
}

/**
 * Probes the site without downloading the whole page.
 *
 * @returns {Promise<{at: number, ok: boolean, status: number|null, ms: number|null, error: string|null}>}
 */
async function probeSite() {
  const started = performance.now();
  const target = siteUrl();

  try {
    const response = await fetch(target, {
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': `Mozilla/5.0 (compatible; SiteMonitorBot/1.4; +${target})`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const responseTime = Math.round(performance.now() - started);
    await response.body?.cancel().catch(() => {});

    return {
      at: Date.now(),
      ok: response.status < 500,
      status: response.status,
      ms: responseTime,
      error: response.status >= 500 ? `HTTP ${response.status}` : null,
    };
  } catch (error) {
    return {
      at: Date.now(),
      ok: false,
      status: null,
      ms: Math.round(performance.now() - started),
      error: errorCode(error),
    };
  }
}

/**
 * Starts the background uptime sampler. Called once when the Discord client is
 * ready; checks are persisted so history survives bot restarts.
 *
 * @param {import('discord.js').Client} client
 */
function startSiteMonitor(client) {
  if (monitor) return monitor;

  const intervalMs = monitorIntervalMs();
  const target = siteUrl();
  let running = false;
  let lastState = null;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      const sample = await probeSite();
      await recordCheck(sample);

      const state = sample.ok ? 'online' : 'offline';
      if (state !== lastState) {
        const detail = sample.status ? `HTTP ${sample.status}` : sample.error;
        console.log(`[siteMonitor] ${target} is ${state}${detail ? ` (${detail})` : ''}.`);
        lastState = state;
      }
    } catch (error) {
      console.error('[siteMonitor] Check failed:', error.message);
    } finally {
      running = false;
    }
  };

  const firstCheck = setTimeout(tick, 4000);
  const timer = setInterval(tick, intervalMs);
  firstCheck.unref?.();
  timer.unref?.();

  monitor = {
    intervalMs,
    stop() {
      clearTimeout(firstCheck);
      clearInterval(timer);
      monitor = null;
    },
  };

  const label = client?.user?.username ? ` for ${client.user.username}` : '';
  console.log(
    `[siteMonitor] Uptime sampling enabled${label} every ${formatInterval(intervalMs)}.`,
  );

  return monitor;
}

function formatInterval(milliseconds) {
  const seconds = Math.round(milliseconds / 1000);
  return seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds}s`;
}

function monitorIntervalLabel() {
  return formatInterval(monitorIntervalMs());
}

function stopSiteMonitor() {
  monitor?.stop();
}

module.exports = {
  DEFAULT_INTERVAL_SECONDS,
  monitorIntervalLabel,
  probeSite,
  startSiteMonitor,
  stopSiteMonitor,
};
