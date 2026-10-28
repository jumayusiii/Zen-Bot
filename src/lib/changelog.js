const { version: BOT_VERSION } = require('../../package.json');

const RELEASES = [
  {
    version: '1.4.0-beta.1',
    date: '2026-10-28',
    title: 'Public beta',
    summary: 'Seven-day uptime reporting, live polls and persistent reminders arrive in the first public beta.',
    added: [
      '`/uptime` shows **seven daily uptime bars**, seven-day availability/latency and a detailed incident timeline.',
      '`/poll` creates live button polls with 2–5 options. Votes can be changed or removed, and the creator can close the poll.',
      '`/remind` stores reminders for **1 minute to 30 days**, delivered by DM or in the original channel.',
      'Polls and reminders are written to `data/` and survive bot restarts.',
      '`SITE_URL`, `SITE_NAME`, `SITE_LOGO_URL` and `PRESENCE_TEXT` make self-hosting more flexible.',
      'Added an MIT license, a test suite and continuous integration for the public repository.',
    ],
    improved: [
      'Status embeds use the configured site name and logo instead of fixed habbo.gd text.',
      'Changing `SITE_URL` starts a clean uptime history instead of mixing two sites.',
      'The README now covers public setup, data storage, and the beta release.',
    ],
    fixed: [
      'Reminder storage never expires reminders that are still waiting for a future due date.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-28',
    title: 'Tuned monitoring',
    summary: 'Status reports can now choose their own refresh cadence, and the bot is back to a playing status.',
    added: [
      '`/sitestatus` now has a per-report interval picker for **5, 15 or 30 minute** auto-refresh.',
      'The chosen interval is saved with active reports and restored after a restart.',
      'Rich presence now uses the **Playing** activity type: **I am Legend.**',
    ],
    improved: [
      'Changing the interval reschedules the next check immediately.',
      'Choosing an interval starts auto-refresh if it was off, and pausing keeps the selected interval visible.',
      'Manual refreshes keep the report\'s selected interval.',
    ],
    fixed: [],
  },
  {
    version: '1.2.0',
    date: '2026-10-28',
    title: 'Uptime & polish',
    summary: 'The status command now builds a real uptime history, and the whole bot got a cleaner visual identity.',
    added: [
      '`/sitestatus` now records checks and shows **24h / 7d availability**, latency, a sparkline and recent incidents.',
      '`/changelog` shows the current build, release date and what changed.',
      'Rich presence: **I am Legend.**',
    ],
    improved: [
      'Refreshed every embed with a branded header, footer and a sharper color palette.',
      'Background uptime probes run every five minutes while the bot is online.',
      'Status history is stored locally and survives bot restarts.',
    ],
    fixed: [
      'Status checks continue normally when the logo or history file cannot be read.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-28',
    title: 'Beta commands & richer status',
    summary: 'More ways to use the bot, plus a much deeper look at habbo.gd.',
    added: [
      '`/8ball`, `/coinflip` and `/rps` beta minigames.',
      '`/botinfo` diagnostics and the dynamic `/helplist` directory.',
    ],
    improved: [
      '`/sitestatus` expanded with TLS, DNS, security headers and the site logo.',
      '`/serverinfo` and `/userinfo` received richer, easier-to-read layouts.',
    ],
    fixed: [],
  },
  {
    version: '1.0.0',
    date: '2026-10-28',
    title: 'First release',
    summary: 'The original command handler, meme feed, image grabbers and server utilities.',
    added: [
      'Recursive slash-command and event handlers.',
      '`/meme`, `/avatar`, `/servericon`, `/serverinfo`, `/userinfo` and `/sitestatus`.',
    ],
    improved: [],
    fixed: [],
  },
];

function getLatestRelease() {
  return RELEASES.find((release) => release.version === BOT_VERSION) ?? RELEASES[0];
}

function releaseTimestamp(release) {
  const parsed = Date.parse(`${release.date}T12:00:00Z`);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function releaseDate(release) {
  return `<t:${Math.floor(releaseTimestamp(release) / 1000)}:D>`;
}

module.exports = { BOT_VERSION, RELEASES, getLatestRelease, releaseDate, releaseTimestamp };
