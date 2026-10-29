const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { siteName, siteUrl } = require('../../lib/config');
const {
  buildDailyBreakdown,
  formatDuration,
  readHistory,
  summarizeHistory,
} = require('../../lib/siteHistory');
const { monitorIntervalLabel } = require('../../lib/siteMonitor');

const DAYS = 7;
const BAR_WIDTH = 10;

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return value >= 99.95 ? '100%' : `${value.toFixed(1)}%`;
}

function formatMs(value) {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : '—';
}

function dailyBar(availability) {
  if (!Number.isFinite(availability)) return '─'.repeat(BAR_WIDTH);

  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((availability / 100) * BAR_WIDTH)));
  return `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)}`;
}

function dailyUptimeBlock(days) {
  const rows = days.map((day) => {
    const availability = Number.isFinite(day.availability) ? `${day.availability.toFixed(1)}%` : 'no data';
    const latency = Number.isFinite(day.averageMs) ? `${Math.round(day.averageMs)} ms` : '—';

    return `${day.label.padEnd(6)}  ${dailyBar(day.availability)}  ${availability.padStart(7)}  ${latency.padStart(7)}`;
  });

  return ['```', ...rows, '```', '`Each bar = 10%`  ·  `UTC days`'].join('\n');
}

function incidentLine(incident) {
  const startedAt = Math.floor(incident.start / 1000);
  const endedAt = Math.floor(incident.end / 1000);
  const status = incident.status ? `HTTP ${incident.status}` : incident.error || 'No response';
  const checks = `${incident.checks} failed check${incident.checks === 1 ? '' : 's'}`;

  if (incident.ongoing) {
    return `🔴 **Ongoing** · started <t:${startedAt}:R> (<t:${startedAt}:f>)\n\`${formatDuration(incident.durationMs)}\` · ${status} · ${checks}`;
  }

  return `⚪ <t:${startedAt}:f> → <t:${endedAt}:f>\n\`${formatDuration(incident.durationMs)}\` · ${status} · ${checks}`;
}

function incidentTimeline(incidents) {
  if (incidents.length === 0) return '✅ No outages recorded in the last seven days.';

  const newestFirst = [...incidents].sort((a, b) => b.start - a.start);
  const lines = [];
  let omitted = 0;

  for (const incident of newestFirst) {
    const line = incidentLine(incident);
    const projected = [...lines, line].join('\n\n');

    if (projected.length > 900) {
      omitted += 1;
      continue;
    }

    lines.push(line);
  }

  if (lines.length === 0) {
    lines.push(incidentLine(newestFirst[0]));
    omitted = newestFirst.length - 1;
  }

  if (omitted > 0) {
    lines.push(`…and **${omitted}** more incident${omitted === 1 ? '' : 's'} in the last seven days.`);
  }

  return lines.join('\n\n');
}

function overallStatus(summary) {
  if (summary.samples === 0) return { label: '🟡 Awaiting data', color: COLORS.neutral };
  if (summary.incidents.some((incident) => incident.ongoing)) {
    return { label: '🔴 Outage in progress', color: COLORS.danger };
  }
  if ((summary.availability ?? 0) >= 99.5) return { label: '🟢 Operational', color: COLORS.success };
  if ((summary.availability ?? 0) >= 95) return { label: '🟡 Degraded', color: COLORS.warning };
  return { label: '🔴 Unstable', color: COLORS.danger };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Show seven-day uptime bars and the incident timeline'),

  async execute(interaction) {
    await interaction.deferReply();

    const history = await readHistory();
    const summary = summarizeHistory(history, 24 * DAYS);
    const days = buildDailyBreakdown(history, DAYS);
    const status = overallStatus(summary);
    const lastSample = history.samples.at(-1);
    const lastSuccess = summary.lastSuccessfulAt;

    const fields = [
      {
        name: '📅 Availability · 7d',
        value: summary.samples > 0
          ? `**${formatPercent(summary.availability)}**\n\`${summary.successful}/${summary.samples}\` successful`
          : 'No checks yet.\nHistory starts with the next probe.',
        inline: true,
      },
      {
        name: '⚡ Latency · 7d',
        value: summary.samples > 0
          ? `avg **${formatMs(summary.averageMs)}**\np95 **${formatMs(summary.p95Ms)}**\nmax **${formatMs(summary.maxMs)}**`
          : 'Waiting for data.',
        inline: true,
      },
      {
        name: '🩺 Coverage',
        value: summary.samples > 0
          ? `\`${summary.samples}\` checks\nEvery ${monitorIntervalLabel()}`
          : `Every ${monitorIntervalLabel()}\nNo samples yet`,
        inline: true,
      },
      {
        name: '📊 Daily uptime · UTC',
        value: dailyUptimeBlock(days),
        inline: false,
      },
      {
        name: '🚨 Incident timeline · 7d',
        value: incidentTimeline(summary.incidents),
        inline: false,
      },
    ];

    if (lastSample) {
      fields.push({
        name: '🕒 Last check',
        value: `<t:${Math.floor(lastSample.at / 1000)}:R>${lastSuccess ? `\nLast success <t:${Math.floor(lastSuccess / 1000)}:R>` : ''}`,
        inline: false,
      });
    }

    const embed = createEmbed(interaction.client, {
      section: 'Uptime',
      title: `Seven-day uptime · ${siteName()}`,
      url: siteUrl(),
      description: `**${status.label}**  ·  **${formatPercent(summary.availability)}** over ${DAYS} days\n\`${summary.samples}\` checks  ·  \`${summary.incidents.length}\` incident${summary.incidents.length === 1 ? '' : 's'}  ·  \`UTC\``,
      color: status.color,
      fields,
      footer: 'Rolling seven-day history  ·  daily bars show check availability',
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
