const { version: BOT_VERSION } = require('../../package.json');

const RELEASES = [
  {
    version: '1.8.0-beta.1',
    date: '2026-10-29',
    title: 'Levels, cards & table games',
    summary: 'A per-server XP system with rendered rank cards, two table games, two quick fun commands and a fifth help tab.',
    added: [
      '**Levels:** members earn **15–25 XP per message** once a minute. `/rank` renders a 900×280 profile card and `/levels` shows the top ten leaderboard.',
      '`/ship` calculates a deterministic compatibility score, and `/fact` shares a random fun fact with a reroll button.',
      '`/hangman` and `/blackjack` add two button/select minigames with replay controls and player-locked rounds.',
      'A **Levels** tab joins Fun, Minigames and Utilities in `/helplist`, covering all **31 commands**.',
      'Rank cards are drawn locally with `@napi-rs/canvas`, including a gradient card, avatar ring and XP progress bar.',
    ],
    improved: [
      'Chat XP uses the non-privileged **GuildMessages** intent and never reads message content.',
      'XP, levels and usernames persist in `data/levels.json`; rank cards fall back to text if image rendering fails.',
      'Finished hangman and blackjack rounds stay available for **Play again** until they expire.',
    ],
    fixed: [],
  },
  {
    version: '1.7.0-beta.1',
    date: '2026-10-29',
    title: 'Picks, timestamps & directory day',
    summary: 'A timestamp builder, a decision picker and a higher-or-lower game arrive with bot-list stats posting and submission-ready directory copy.',
    added: [
      '`/timestamp` builds Discord timestamps in six styles from `now`, a duration such as `2h`, a date or a Unix timestamp.',
      '`/choose` picks one option from a 2–10 item list, with an optional question.',
      '`/higherlower` is a beta button minigame: guess higher or lower for up to ten rounds and build a streak.',
      'Optional stats posting to **top.gg** and **Discord Bot List** every 30 minutes when their tokens are configured.',
      '`docs/bot-listing.md` carries ready-to-paste listing copy, reviewer notes and a submission checklist.',
    ],
    improved: [
      'The command directory now covers **25 commands**, with the new utilities and game in their own tabs.',
      'The timestamp preview switches between all six Discord styles in place, without rerunning the command.',
      'Failed bot-list posts are logged without affecting startup, commands or monitoring.',
    ],
    fixed: [],
  },
  {
    version: '1.6.0-beta.1',
    date: '2026-10-28',
    title: 'Tabs, rerolls & sharing',
    summary: 'A tabbed command directory, five-refresh trivia rounds and new sharing tools land with a cleaner embed system.',
    added: [
      '`/helplist` is now a tabbed directory: overview plus Fun, Minigames and Utilities, each listing signatures and beta markers.',
      '`/trivia` tracks your score and can refresh into a new question up to **five** times per round.',
      '`/roll` rolls dice in `1d6`, `2d20` or `4d6+2` notation, with up to 20 dice.',
      '`/serverbanner` grabs a server banner at a full-width size with a download button.',
      '`/invite` builds an install link with the required permissions and a source-code link.',
    ],
    improved: [
      'Every embed now shares one tighter system: plain titles, clamped text limits and a footer that no longer repeats the bot name.',
      'Help categories are generated from the command folders, so new commands appear in the right tab automatically.',
      'Trivia keeps the round message in place while the score and refresh counter update live.',
    ],
    fixed: [
      '`/reminders` now renders real line breaks between its list entries.',
    ],
  },
  {
    version: '1.5.0-beta.1',
    date: '2026-10-28',
    title: 'Guild tools & games',
    summary: 'New button minigames, reminder management and role inspection arrive with a fix for guild-only commands.',
    added: [
      '`/trivia` asks a multiple-choice question with live answer buttons.',
      '`/tictactoe` starts a button board against the bot.',
      '`/reminders` lists your pending reminders and lets you cancel one from a select menu.',
      '`/roleinfo` shows a role\'s color, position, creation date, permissions and settings.',
      'Guild commands now resolve an uncached server by ID, and DMs can fall back to the bot\'s only server.',
      '`npm run deploy:global` now explicitly registers commands globally even when `GUILD_ID` is set.',
    ],
    improved: [
      '`/servericon` size changes keep working in DMs by carrying the selected server in the component id.',
      'The command directory automatically includes the new commands and their beta labels.',
    ],
    fixed: [
      '`/serverinfo` and `/servericon` no longer reject valid guild interactions just because the guild was missing from the cache.',
    ],
  },
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
