const fs = require('node:fs/promises');
const path = require('node:path');
const { siteUrl } = require('./config');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'sitestatus-history.json');
const MAX_SAMPLES = 2016; // Seven days at five-minute intervals.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

let writeQueue = Promise.resolve();

function historyFile() {
  return process.env.SITE_HISTORY_FILE
    ? path.resolve(process.env.SITE_HISTORY_FILE)
    : DEFAULT_FILE;
}

function emptyHistory() {
  return {
    site: siteUrl(),
    createdAt: new Date().toISOString(),
    updatedAt: null,
    samples: [],
  };
}

function normalizeSample(input) {
  const at = input?.at == null ? Date.now() : Number(input.at);
  const status = input?.status == null ? null : Number(input.status);
  const ms = input?.ms == null ? null : Number(input.ms);

  return {
    at: Number.isFinite(at) ? at : Date.now(),
    ok: Boolean(input?.ok),
    status: Number.isInteger(status) ? status : null,
    ms: Number.isFinite(ms) && ms >= 0 ? Math.round(ms) : null,
    error: input?.error ? String(input.error).slice(0, 200) : null,
  };
}

/**
 * Reads the persisted history. A missing or unreadable file simply starts fresh;
 * uptime history must never stop the bot from starting.
 *
 * @returns {Promise<{site: string, createdAt: string, updatedAt: string|null, samples: object[]}>}
 */
async function readHistory() {
  try {
    const parsed = JSON.parse(await fs.readFile(historyFile(), 'utf8'));

    if (!parsed || !Array.isArray(parsed.samples)) {
      throw new Error('history file has an unexpected shape');
    }

    // A changed SITE_URL should not mix one site's availability into another's.
    if (parsed.site && parsed.site !== siteUrl()) return emptyHistory();

    const samples = parsed.samples
      .filter((sample) => sample && Number.isFinite(Number(sample.at)))
      .map(normalizeSample)
      .sort((a, b) => a.at - b.at);

    return {
      site: parsed.site || siteUrl(),
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt || null,
      samples,
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[siteHistory] Could not read ${historyFile()}: ${error.message}`);
    }
    return emptyHistory();
  }
}

async function saveHistory(history) {
  const file = historyFile();
  await fs.mkdir(path.dirname(file), { recursive: true });

  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, file);
}

/**
 * Appends a health check to the persisted history. Writes are serialized so the
 * monitor and a manual /sitestatus check cannot clobber each other.
 *
 * @param {{at?: number, ok: boolean, status?: number|null, ms?: number|null, error?: string|null}} sample
 * @returns {Promise<object>} the updated history
 */
function recordCheck(sample) {
  const normalized = normalizeSample(sample);

  const operation = writeQueue.then(async () => {
    const history = await readHistory();
    const cutoff = Date.now() - RETENTION_MS;

    history.samples = history.samples
      .concat(normalized)
      .filter((entry) => entry.at >= cutoff)
      .sort((a, b) => a.at - b.at)
      .slice(-MAX_SAMPLES);
    history.updatedAt = new Date().toISOString();

    await saveHistory(history);
    return history;
  });

  writeQueue = operation.catch(() => {});
  return operation;
}

function formatDuration(milliseconds) {
  const seconds = Math.max(1, Math.round(milliseconds / 1000));

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.round((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function average(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

/** Builds an hour-by-hour latency sparkline for the requested window. */
function buildSparkline(samples, hours, buckets = 24) {
  const now = Date.now();
  const since = now - hours * 3600 * 1000;
  const window = samples.filter((sample) => sample.at >= since);
  const bucketMs = (hours * 3600 * 1000) / buckets;
  const values = Array.from({ length: buckets }, () => ({ total: 0, count: 0, failed: false }));

  for (const sample of window) {
    const index = Math.min(buckets - 1, Math.max(0, Math.floor((sample.at - since) / bucketMs)));
    const bucket = values[index];

    if (!sample.ok) {
      bucket.failed = true;
      continue;
    }

    if (Number.isFinite(sample.ms)) {
      bucket.total += sample.ms;
      bucket.count += 1;
    }
  }

  const averages = values.map((bucket) => (bucket.count > 0 ? bucket.total / bucket.count : null));
  const peak = Math.max(1, ...averages.filter(Number.isFinite));

  return values
    .map((bucket, index) => {
      if (bucket.failed) return '×';
      const latency = averages[index];
      if (!Number.isFinite(latency)) return '·';
      const level = Math.min(SPARK_CHARS.length - 1, Math.floor((latency / peak) * (SPARK_CHARS.length - 1)));
      return SPARK_CHARS[level];
    })
    .join('');
}

/**
 * Summarizes checks inside a rolling time window.
 *
 * @param {object} history
 * @param {number} hours
 * @param {number} [now]
 * @returns {object}
 */
function summarizeHistory(history, hours, now = Date.now()) {
  now = Number.isFinite(now) ? now : Date.now();
  const since = now - hours * 3600 * 1000;
  const samples = (history?.samples || [])
    .filter((sample) => sample.at >= since)
    .sort((a, b) => a.at - b.at);

  const successful = samples.filter((sample) => sample.ok);
  const lastSuccessfulAt = successful.length > 0 ? successful[successful.length - 1].at : null;
  const latencies = successful
    .map((sample) => sample.ms)
    .filter((value) => Number.isFinite(value));
  const availability = samples.length > 0 ? (successful.length / samples.length) * 100 : null;

  const incidents = [];
  let incident = null;

  for (const sample of samples) {
    if (!sample.ok) {
      if (!incident) {
        incident = { start: sample.at, last: sample.at, checks: 1, status: sample.status, error: sample.error };
      } else {
        incident.last = sample.at;
        incident.checks += 1;
        incident.status = sample.status ?? incident.status;
        incident.error = sample.error ?? incident.error;
      }
      continue;
    }

    if (incident) {
      incidents.push({ ...incident, end: sample.at, ongoing: false });
      incident = null;
    }
  }

  if (incident) {
    incidents.push({ ...incident, end: now, ongoing: true });
  }

  const downtimeMs = incidents.reduce((total, item) => total + Math.max(0, item.end - item.start), 0);

  return {
    hours,
    samples: samples.length,
    successful: successful.length,
    availability,
    averageMs: average(latencies),
    p95Ms: percentile(latencies, 95),
    maxMs: latencies.length > 0 ? Math.max(...latencies) : null,
    incidents: incidents.map((item) => ({
      ...item,
      durationMs: Math.max(0, item.end - item.start),
    })),
    lastSuccessfulAt,
    downtimeMs,
    sparkline: buildSparkline(history?.samples || [], hours),
    windowStart: since,
  };
}

function startOfUtcDay(at) {
  const date = new Date(at);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Splits history into calendar days in UTC so daily bars are deterministic and
 * comparable between servers.
 *
 * @param {object} history
 * @param {number} [days]
 * @param {number} [now]
 * @returns {{dayStart: number, dayEnd: number, date: string, label: string, samples: number, successful: number, availability: number|null, averageMs: number|null}[]}
 */
function buildDailyBreakdown(history, days = 7, now = Date.now()) {
  const dayCount = Math.min(31, Math.max(1, Math.trunc(Number(days)) || 7));
  const endDay = startOfUtcDay(Number.isFinite(now) ? now : Date.now());
  const allSamples = Array.isArray(history?.samples) ? history.samples : [];
  const buckets = [];

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const dayStart = endDay - offset * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const samples = allSamples.filter((sample) => sample.at >= dayStart && sample.at < dayEnd);
    const successfulSamples = samples.filter((sample) => sample.ok);
    const latencies = successfulSamples
      .map((sample) => sample.ms)
      .filter((value) => Number.isFinite(value));

    buckets.push({
      dayStart,
      dayEnd,
      date: new Date(dayStart).toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(dayStart),
      samples: samples.length,
      successful: successfulSamples.length,
      availability: samples.length > 0 ? (successfulSamples.length / samples.length) * 100 : null,
      averageMs: average(latencies),
    });
  }

  return buckets;
}

module.exports = {
  MAX_SAMPLES,
  RETENTION_MS,
  buildDailyBreakdown,
  formatDuration,
  historyFile,
  readHistory,
  recordCheck,
  summarizeHistory,
};
