const dns = require('node:dns').promises;
const tls = require('node:tls');
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  siteHost,
  siteLogoFilename,
  siteLogoUrl,
  siteName,
  siteUrl,
} = require('../../lib/config');
const {
  formatDuration,
  readHistory,
  recordCheck,
  summarizeHistory,
} = require('../../lib/siteHistory');
const { monitorIntervalLabel } = require('../../lib/siteMonitor');
const {
  DEFAULT_REFRESH_INTERVAL,
  MAX_AUTO_REFRESHES,
  REFRESH_INTERVALS,
  loadSubscriptions,
  parseRefreshInterval,
  saveSubscriptions,
} = require('../../lib/siteAutoRefresh');

const SITE_URL = siteUrl();
const SITE_HOST = siteHost();
const SITE_NAME = siteName();
const SITE_LOGO_URL = siteLogoUrl();
const LOGO_NAME = siteLogoFilename() ?? 'site-logo.png';
const TIMEOUT_MS = 10000;
const MAX_HTML_BYTES = 128 * 1024;
const REFRESH_COOLDOWN_MS = 15000;
const REFRESH_BUTTON_PREFIX = 'sitestatus:refresh';
const AUTO_REFRESH_BUTTON_PREFIX = 'sitestatus:auto';
const INTERVAL_SELECT_PREFIX = 'sitestatus:interval';
const AUTO_REFRESH_RESUME_DELAY_MS = 5000;
const INTERVAL_EMOJI = Object.freeze({ 5: '⚡', 15: '⏱️', 30: '🕒' });

// Cooldowns are per report message, so each report can be refreshed independently.
const refreshCooldowns = new Map();

// Timers only exist in this process. The subscriptions are persisted so reports
// resume on the next start, including after an unexpected shutdown.
const autoRefreshes = new Map();
let autoRefreshStateLoaded = false;
let autoRefreshStateLoading = null;
let autoRefreshSaveQueue = Promise.resolve();

const SECURITY_HEADERS = [
  ['strict-transport-security', 'HSTS'],
  ['content-security-policy', 'CSP'],
  ['x-frame-options', 'XFO'],
  ['x-content-type-options', 'XCTO'],
  ['referrer-policy', 'Referrer'],
];

function decodeHtml(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, decimal) => {
      const code = Number.parseInt(decimal, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function cleanText(value) {
  return decodeHtml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatBytes(bytes, truncated) {
  if (!bytes) return 'Unknown';
  const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  return `${size}${truncated ? '+' : ''}`;
}

function formatLanguage(code) {
  if (!code) return null;

  try {
    const language = new Intl.DisplayNames(['en'], { type: 'language' }).of(code);
    return language ? `${language} (${code})` : code;
  } catch {
    return code;
  }
}

async function readPage(response) {
  if (!response.body) {
    return { title: null, language: null, description: null, bytes: 0, truncated: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let bytes = 0;
  let truncated = true;

  try {
    while (bytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) {
        truncated = false;
        break;
      }

      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }

    html += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const lang = html.match(/<html[^>]*\blang=["']([^"']+)["']/i);
  const description =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);

  return {
    title: title ? cleanText(title[1]).slice(0, 200) : null,
    language: lang ? lang[1].trim().slice(0, 20) : null,
    description: description ? cleanText(description[1]).slice(0, 300) : null,
    bytes,
    truncated,
  };
}

async function fetchPage() {
  const started = performance.now();

  const response = await fetch(SITE_URL, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': `Mozilla/5.0 (compatible; SiteStatusBot/1.4; +${SITE_URL})`,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const responseTime = Math.round(performance.now() - started);
  const contentType = response.headers.get('content-type') || 'Not disclosed';

  let page = { title: null, language: null, description: null, bytes: 0, truncated: false };
  if (contentType.includes('text/html')) {
    try {
      page = await readPage(response);
    } catch (error) {
      console.warn('[sitestatus] Could not read the page body:', error.message);
    }
  } else {
    await response.body?.cancel().catch(() => {});
  }

  return { response, responseTime, contentType, ...page };
}

async function fetchLogo() {
  if (!SITE_LOGO_URL) throw new Error('no site logo configured');

  const response = await fetch(SITE_LOGO_URL, {
    headers: {
      accept: 'image/*',
      referer: `${SITE_URL}/`,
      'user-agent': `Mozilla/5.0 (compatible; SiteStatusBot/1.4; +${SITE_URL})`,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`logo request returned HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`unexpected logo content type: ${contentType}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) throw new Error('invalid logo size');

  return buffer;
}

async function lookupAddresses() {
  const [ipv4, ipv6] = await Promise.allSettled([
    dns.resolve4(SITE_HOST),
    dns.resolve6(SITE_HOST),
  ]);

  return {
    ipv4: ipv4.status === 'fulfilled' ? ipv4.value : [],
    ipv6: ipv6.status === 'fulfilled' ? ipv6.value : [],
  };
}

function getTlsInfo() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const socket = tls.connect(
      {
        host: SITE_HOST,
        port: 443,
        servername: SITE_HOST,
        rejectUnauthorized: true,
        timeout: 6000,
      },
      () => {
        try {
          const certificate = socket.getPeerCertificate();
          const validTo = certificate.valid_to ? new Date(certificate.valid_to) : null;

          finish({
            protocol: socket.getProtocol(),
            issuer: certificate.issuer?.O || certificate.issuer?.CN || 'Unknown',
            validTo,
            daysRemaining: validTo
              ? Math.max(0, Math.floor((validTo.getTime() - Date.now()) / 86400000))
              : null,
          });
        } catch {
          finish(null);
        } finally {
          socket.end();
        }
      },
    );

    socket.once('error', () => finish(null));
    socket.once('timeout', () => {
      socket.destroy();
      finish(null);
    });
    socket.once('close', () => finish(null));
  });
}

function securitySummary(headers) {
  const present = SECURITY_HEADERS.filter(([header]) => headers.get(header));
  if (present.length === 0) return 'None detected';

  return `${present.length}/${SECURITY_HEADERS.length} · ${present.map(([, label]) => label).join(' · ')}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return value >= 99.95 ? '100%' : `${value.toFixed(1)}%`;
}

function formatMs(value) {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : '—';
}

function historyFields(summary24, summary7d) {
  const fields = [
    {
      name: '📈 Availability',
      value: summary24.samples > 0
        ? `**${formatPercent(summary24.availability)}** · 24h\n**${formatPercent(summary7d.availability)}** · 7d\n\`${summary24.samples}\` checks`
        : 'No checks recorded yet.\nHistory starts with the next probe.',
      inline: true,
    },
    {
      name: '⏱️ Latency',
      value: summary24.samples > 0
        ? `avg **${formatMs(summary24.averageMs)}**\np95 **${formatMs(summary24.p95Ms)}**\nmax **${formatMs(summary24.maxMs)}**`
        : 'Waiting for data.',
      inline: true,
    },
    {
      name: '🚨 Incidents · 24h',
      value: summary24.incidents.length > 0
        ? `**${summary24.incidents.length}** · ${formatDuration(summary24.downtimeMs)} down`
        : '**0** · all clear',
      inline: true,
    },
    {
      name: '📊 Latency · 24h',
      value: summary24.samples > 0
        ? `\`\`\`\n${summary24.sparkline}\n\`\`\`\n\`oldest → newest\`  ·  \`×\` failed check`
        : 'Waiting for the first background sample.',
      inline: false,
    },
  ];

  if (summary24.incidents.length > 0) {
    const lines = summary24.incidents
      .slice(-3)
      .reverse()
      .map((incident) => {
        const detail = incident.status
          ? ` · HTTP ${incident.status}`
          : incident.error
            ? ` · ${incident.error}`
            : '';
        return `${incident.ongoing ? '🔴' : '⚪'} <t:${Math.floor(incident.start / 1000)}:R> · ${formatDuration(incident.durationMs)}${detail}`;
      });

    fields.push({
      name: '🚨 Recent Outages',
      value: lines.join('\n'),
      inline: false,
    });
  }

  return fields;
}

function buildOnlineEmbed(client, result, details, hasLogo, summary24, summary7d) {
  const { response, responseTime, contentType, title, language, description, bytes, truncated } = result;
  const isError = response.status >= 400;
  const isServerError = response.status >= 500;
  const color = isServerError ? COLORS.danger : isError ? COLORS.warning : COLORS.success;
  const addresses = details.addresses?.ipv4?.slice(0, 2) || [];
  const tlsInfo = details.tls;
  const state = isServerError ? 'offline' : isError ? 'degraded' : 'online';
  const stateEmoji = isServerError ? '🔴' : isError ? '🟡' : '🟢';

  const fields = [
    {
      name: '📡 HTTP Status',
      value: `\`${response.status} ${response.statusText}\``.trim(),
      inline: true,
    },
    { name: '⚡ Response Time', value: `${responseTime} ms`, inline: true },
    { name: '🖥️ Edge Server', value: response.headers.get('server') || 'Not disclosed', inline: true },
  ];

  if (tlsInfo) {
    const expiry = tlsInfo.daysRemaining === null ? '' : ` · ${tlsInfo.daysRemaining}d left`;
    fields.push({
      name: '🔒 TLS',
      value: `${tlsInfo.protocol || 'HTTPS'}${expiry}`,
      inline: true,
    });
  }

  if (addresses.length > 0) {
    fields.push({ name: '🌍 IPv4', value: addresses.join('\n'), inline: true });
  }

  fields.push(...historyFields(summary24, summary7d));

  fields.push({
    name: '🛡️ Security Headers',
    value: securitySummary(response.headers),
    inline: false,
  });

  const pageLines = [];
  if (title) pageLines.push(`**${title}**`);
  pageLines.push(
    `${language ? `${formatLanguage(language)} · ` : ''}${contentType.split(';')[0]} · ${formatBytes(bytes, truncated)}`,
  );

  const lastModified = Date.parse(response.headers.get('last-modified') || '');
  if (Number.isFinite(lastModified)) {
    pageLines.push(`Updated <t:${Math.floor(lastModified / 1000)}:R>`);
  }

  fields.push({
    name: '📄 Page Status',
    value: pageLines.join('\n'),
    inline: false,
  });

  if (description) {
    fields.push({ name: '📝 Meta Description', value: description, inline: false });
  }

  if (response.url && response.url !== `${SITE_URL}/` && response.url !== SITE_URL) {
    fields.push({ name: '🔗 Resolved URL', value: response.url, inline: false });
  }

  return createEmbed(client, {
    section: 'Site Monitor',
    title: `${SITE_NAME} is ${state}`,
    url: SITE_URL,
    description: `${stateEmoji} **${state.toUpperCase()}**  ·  \`HTTP ${response.status}\`  ·  \`${responseTime} ms\`\nLive uptime, page and security report for **${SITE_NAME}**.`,
    color,
    image: hasLogo ? `attachment://${LOGO_NAME}` : null,
    fields,
    footer: `Live site check  ·  Sampled every ${monitorIntervalLabel()}`,
  });
}

function buildOfflineEmbed(client, error, details, hasLogo, summary24, summary7d) {
  const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
  const errorCode = error.cause?.code || error.code || error.name || 'Unknown error';
  const addresses = details.addresses?.ipv4?.slice(0, 2) || [];
  const fields = [
    { name: '📡 Status', value: '🔴 Offline', inline: true },
    { name: '⚠️ Error', value: String(errorCode).slice(0, 1024), inline: true },
  ];

  if (details.tls) {
    fields.push({
      name: '🔒 TLS',
      value: `${details.tls.protocol || 'HTTPS'}${details.tls.daysRemaining === null ? '' : ` · ${details.tls.daysRemaining}d left`}`,
      inline: true,
    });
  }

  if (addresses.length > 0) {
    fields.push({ name: '🌍 IPv4', value: addresses.join('\n'), inline: true });
  }

  fields.push(...historyFields(summary24, summary7d));

  if (summary7d.lastSuccessfulAt) {
    fields.push({
      name: '🕒 Last Successful Check',
      value: `<t:${Math.floor(summary7d.lastSuccessfulAt / 1000)}:R>`,
      inline: true,
    });
  }

  return createEmbed(client, {
    section: 'Site Monitor',
    title: `${SITE_NAME} is offline`,
    url: SITE_URL,
    color: COLORS.danger,
    description: `🔴 **UNREACHABLE**\n${isTimeout
      ? `The site did not respond within ${TIMEOUT_MS / 1000} seconds.`
      : 'The site could not be reached.'}`,
    image: hasLogo ? `attachment://${LOGO_NAME}` : null,
    fields,
    footer: `Live site check  ·  Sampled every ${monitorIntervalLabel()}`,
  });
}

function reportControls(invokerId, autoRefreshEnabled, intervalMinutes) {
  const interval = parseRefreshInterval(intervalMinutes) ?? DEFAULT_REFRESH_INTERVAL;
  const target = `${invokerId}:${interval}`;

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${REFRESH_BUTTON_PREFIX}:${target}`)
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${AUTO_REFRESH_BUTTON_PREFIX}:${target}`)
      .setLabel(autoRefreshEnabled ? 'Auto-refresh: On' : 'Auto-refresh: Off')
      .setEmoji('🔁')
      .setStyle(autoRefreshEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  const intervalMenu = new StringSelectMenuBuilder()
    .setCustomId(`${INTERVAL_SELECT_PREFIX}:${target}`)
    .setPlaceholder('Auto-refresh interval')
    .addOptions(
      REFRESH_INTERVALS.map((minutes) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`Every ${minutes} minutes`)
          .setDescription(
            minutes === DEFAULT_REFRESH_INTERVAL
              ? 'Default cadence'
              : `Refresh this report every ${minutes} minutes`,
          )
          .setEmoji(INTERVAL_EMOJI[minutes])
          .setValue(String(minutes))
          .setDefault(minutes === interval),
      ),
    );

  return [buttons, new ActionRowBuilder().addComponents(intervalMenu)];
}

async function ensureAutoRefreshState() {
  if (autoRefreshStateLoaded) return;

  if (!autoRefreshStateLoading) {
    autoRefreshStateLoading = loadSubscriptions()
      .then((subscriptions) => {
        for (const subscription of subscriptions) {
          if (autoRefreshes.has(subscription.messageId)) continue;
          autoRefreshes.set(subscription.messageId, {
            ...subscription,
            timer: null,
            running: false,
          });
        }
      })
      .catch((error) => {
        console.warn('[sitestatus] Could not load auto-refresh state:', error.message);
      })
      .finally(() => {
        autoRefreshStateLoaded = true;
      });
  }

  await autoRefreshStateLoading;
}

function persistAutoRefreshState() {
  const subscriptions = [...autoRefreshes.values()].map(({ messageId, channelId, ownerId, intervalMinutes, nextAt }) => ({
    messageId,
    channelId,
    ownerId,
    intervalMinutes,
    nextAt,
  }));

  const operation = autoRefreshSaveQueue.then(() => saveSubscriptions(subscriptions));
  autoRefreshSaveQueue = operation.catch((error) => {
    console.warn('[sitestatus] Could not save auto-refresh state:', error.message);
  });

  return autoRefreshSaveQueue;
}

function scheduleAutoRefresh(
  session,
  client,
  delayMs = (session.intervalMinutes ?? DEFAULT_REFRESH_INTERVAL) * 60 * 1000,
) {
  if (session.timer) clearTimeout(session.timer);

  const delay = Math.max(0, delayMs);
  session.nextAt = Date.now() + delay;
  session.timer = setTimeout(() => {
    session.timer = null;
    runAutoRefresh(session, client).catch((error) => {
      console.error('[sitestatus] Auto-refresh task failed:', error);
    });
  }, delay);
  session.timer.unref?.();
}

function isUnavailableError(error) {
  return [10003, 10008, 50001].includes(Number(error?.code)) || Number(error?.status) === 404;
}

async function runAutoRefresh(session, client) {
  if (session.running || autoRefreshes.get(session.messageId) !== session) return;

  session.running = true;
  let stopped = false;

  try {
    const channel = await client.channels.fetch(session.channelId);
    if (!channel?.messages) {
      const error = new Error('The report channel cannot hold messages');
      error.code = 10003;
      throw error;
    }

    const message = await channel.messages.fetch(session.messageId);
    const payload = await buildStatusPayload(client);

    // The owner may have turned auto-refresh off while this check was running.
    if (autoRefreshes.get(session.messageId) !== session) return;

    await message.edit({
      ...payload,
      components: reportControls(session.ownerId, true, session.intervalMinutes),
    });
  } catch (error) {
    if (isUnavailableError(error)) {
      stopped = true;
      autoRefreshes.delete(session.messageId);
      await persistAutoRefreshState();
      console.warn(`[sitestatus] Auto-refresh stopped for unavailable report ${session.messageId}.`);
    } else {
      console.error(`[sitestatus] Auto-refresh failed for ${session.messageId}:`, error.message);
    }
  } finally {
    session.running = false;
  }

  if (stopped || autoRefreshes.get(session.messageId) !== session) return;

  scheduleAutoRefresh(session, client);
  await persistAutoRefreshState();
}

async function resumeAutoRefresh(client) {
  await ensureAutoRefreshState();
  let resumed = 0;

  for (const session of autoRefreshes.values()) {
    if (session.timer) continue;

    const remaining = Number(session.nextAt) - Date.now();
    scheduleAutoRefresh(
      session,
      client,
      Math.max(AUTO_REFRESH_RESUME_DELAY_MS, remaining),
    );
    resumed += 1;
  }

  if (resumed > 0) {
    console.log(`[sitestatus] Resumed auto-refresh for ${resumed} report(s).`);
  }
}

async function enableAutoRefresh(interaction, ownerId, intervalMinutes) {
  const interval = parseRefreshInterval(intervalMinutes) ?? DEFAULT_REFRESH_INTERVAL;
  const reportId = interaction.message.id;

  if (autoRefreshes.size >= MAX_AUTO_REFRESHES) {
    await interaction.reply({
      content: `Auto-refresh is already watching **${MAX_AUTO_REFRESHES}** reports. Turn one off before enabling another.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channelId = interaction.channelId || interaction.message.channelId;
  if (!channelId) {
    await interaction.reply({
      content: 'I could not find this report\'s channel. Run `/sitestatus` again.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const session = {
    messageId: reportId,
    channelId,
    ownerId,
    intervalMinutes: interval,
    nextAt: 0,
    timer: null,
    running: false,
  };

  autoRefreshes.set(reportId, session);
  scheduleAutoRefresh(session, interaction.client);
  await persistAutoRefreshState();
  await interaction.update({ components: reportControls(ownerId, true, interval) });
}

async function toggleAutoRefresh(interaction, ownerId, intervalMinutes) {
  await ensureAutoRefreshState();

  const existing = autoRefreshes.get(interaction.message.id);
  if (!existing) {
    await enableAutoRefresh(interaction, ownerId, intervalMinutes);
    return;
  }

  if (existing.timer) clearTimeout(existing.timer);
  existing.timer = null;
  autoRefreshes.delete(existing.messageId);
  await persistAutoRefreshState();
  await interaction.update({
    components: reportControls(ownerId, false, existing.intervalMinutes),
  });
}

async function setAutoRefreshInterval(interaction, ownerId, intervalMinutes) {
  await ensureAutoRefreshState();

  const interval = parseRefreshInterval(intervalMinutes) ?? DEFAULT_REFRESH_INTERVAL;
  const existing = autoRefreshes.get(interaction.message.id);
  if (!existing) {
    await enableAutoRefresh(interaction, ownerId, interval);
    return;
  }

  if (existing.timer) clearTimeout(existing.timer);
  existing.timer = null;
  existing.intervalMinutes = interval;
  scheduleAutoRefresh(existing, interaction.client);
  await persistAutoRefreshState();
  await interaction.update({ components: reportControls(ownerId, true, interval) });
}

async function refreshReport(interaction, ownerId, fallbackInterval) {
  const reportId = interaction.message.id;
  const lastRefresh = refreshCooldowns.get(reportId) ?? 0;
  const waitMs = REFRESH_COOLDOWN_MS - (Date.now() - lastRefresh);

  if (waitMs > 0) {
    await interaction.reply({
      content: `This report was refreshed moments ago. Try again in **${Math.ceil(waitMs / 1000)}s**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  refreshCooldowns.set(reportId, Date.now());
  const cleanup = setTimeout(() => refreshCooldowns.delete(reportId), REFRESH_COOLDOWN_MS);
  cleanup.unref?.();

  await interaction.deferUpdate();

  try {
    const payload = await buildStatusPayload(interaction.client);
    const session = autoRefreshes.get(reportId);
    const interval = session?.intervalMinutes
      ?? parseRefreshInterval(fallbackInterval)
      ?? DEFAULT_REFRESH_INTERVAL;

    await interaction.editReply({
      ...payload,
      components: reportControls(ownerId, Boolean(session), interval),
    });

    if (session) {
      scheduleAutoRefresh(session, interaction.client);
      await persistAutoRefreshState();
    }
  } catch (error) {
    refreshCooldowns.delete(reportId);
    clearTimeout(cleanup);
    throw error;
  }
}

async function buildStatusPayload(client) {
  const [pageResult, logoResult, addressesResult, tlsResult] = await Promise.allSettled([
    fetchPage(),
    SITE_LOGO_URL ? fetchLogo() : Promise.resolve(null),
    lookupAddresses(),
    getTlsInfo(),
  ]);

  const details = {
    addresses: addressesResult.status === 'fulfilled' ? addressesResult.value : null,
    tls: tlsResult.status === 'fulfilled' ? tlsResult.value : null,
  };

  const logo = logoResult.status === 'fulfilled' ? logoResult.value : null;
  if (logoResult.status === 'rejected') {
    console.warn('[sitestatus] Logo unavailable:', logoResult.reason.message);
  }

  const sample = pageResult.status === 'fulfilled'
    ? {
        at: Date.now(),
        ok: pageResult.value.response.status < 500,
        status: pageResult.value.response.status,
        ms: pageResult.value.responseTime,
      }
    : {
        at: Date.now(),
        ok: false,
        status: null,
        ms: null,
        error: String(pageResult.reason?.cause?.code || pageResult.reason?.code || pageResult.reason?.name || 'Unknown error'),
      };

  let history;
  try {
    history = await recordCheck(sample);
  } catch (writeError) {
    console.warn('[sitestatus] Could not save the uptime sample:', writeError.message);
    history = await readHistory();
  }

  const summary24 = summarizeHistory(history, 24);
  const summary7d = summarizeHistory(history, 24 * 7);

  const embed =
    pageResult.status === 'fulfilled'
      ? buildOnlineEmbed(client, pageResult.value, details, Boolean(logo), summary24, summary7d)
      : buildOfflineEmbed(client, pageResult.reason, details, Boolean(logo), summary24, summary7d);

  const payload = { embeds: [embed] };
  if (logo) {
    payload.files = [new AttachmentBuilder(logo, { name: LOGO_NAME, description: `${SITE_NAME} logo` })];
  }

  return payload;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sitestatus')
    .setDescription("Check the site's status, uptime and page health"),

  async execute(interaction) {
    await interaction.deferReply();

    const payload = await buildStatusPayload(interaction.client);

    await interaction.editReply({
      ...payload,
      components: reportControls(
        interaction.user.id,
        false,
        DEFAULT_REFRESH_INTERVAL,
      ),
    });
  },

  async handleComponent(interaction) {
    const [commandName, action, invokerId, encodedInterval] = interaction.customId.split(':');
    if (commandName !== 'sitestatus' || !['refresh', 'auto', 'interval'].includes(action)) return;

    if (!invokerId || invokerId !== interaction.user.id) {
      await interaction.reply({
        content: invokerId
          ? `Only <@${invokerId}> can control this report. Run \`/sitestatus\` for your own.`
          : 'This control is outdated. Run `/sitestatus` again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const interval = action === 'interval'
      ? parseRefreshInterval(interaction.values?.[0])
      : parseRefreshInterval(encodedInterval);

    if (action === 'interval' && !interval) {
      await interaction.reply({
        content: 'That auto-refresh interval is not supported. Choose 5, 15, or 30 minutes.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await ensureAutoRefreshState();

    if (action === 'refresh') {
      await refreshReport(interaction, invokerId, encodedInterval);
      return;
    }

    if (action === 'interval') {
      await setAutoRefreshInterval(interaction, invokerId, interval);
      return;
    }

    await toggleAutoRefresh(
      interaction,
      invokerId,
      interval ?? DEFAULT_REFRESH_INTERVAL,
    );
  },

  resumeAutoRefresh,
};
