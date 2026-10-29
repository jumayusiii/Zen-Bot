const { version: BOT_VERSION } = require('../../package.json');

const RELEASES = [
  {
    version: '1.11.0-beta.1',
    date: '2026-10-29',
    title: 'TikTok previews & a social command folder',
    summary: 'A beta TikTok player posts videos that play inline in Discord, and media commands now have their own Social tab in the directory.',
    added: [
      '`/tiktok` downloads a TikTok video and attaches it so it plays inline in Discord, with the creator, duration, views, likes, comments and shares.',
      'Full links, mobile links and short `vm.tiktok.com` share links are supported, and photo posts show their first image.',
      'A **Social** tab joins `/helplist`, raising the directory to **51 commands**.',
    ],
    improved: [
      'A dedicated `social/` command folder keeps media sharing separate from fun and utility commands.',
      'Videos over **8 MB**, private or region-locked posts fall back to the cover image and an **Open on TikTok** button instead of failing.',
      'TikTok downloads are capped at **8 MB**, checked before and after transfer, so the attachment fits Discord\'s default upload limit.',
    ],
    fixed: [],
  },
  {
    version: '1.10.0-beta.2',
    date: '2026-10-29',
    title: 'Roasts, word scramble & a steadier presence',
    summary: 'A quick-play word game, playful roasts and a more resilient Playing presence round out the 50-command directory.',
    added: [
      '`/wordscramble` starts a five-round word game with four shuffled answer buttons, a hint, live scoring and replay controls.',
      '`/roast` serves a playful, harmless roast with compact target, tone and requester details.',
    ],
    improved: [
      'The **Playing** activity is included in the initial gateway identify payload and refreshed every **10 minutes**.',
      'A gateway resume immediately re-applies **Playing I am Legend.** so the activity survives reconnects.',
      'The command directory now covers **50 commands** across six tabs.',
    ],
    fixed: [
      'The rich presence no longer depends on a single `ClientReady` call, which could leave the bot without an activity after a reconnect.',
    ],
  },
  {
    version: '1.10.0-beta.1',
    date: '2026-10-29',
    title: 'Audit logs, greetings & new games',
    summary: 'Moderation now writes to a configurable audit channel, welcome and leave messages ship with live previews, and three new commands join the directory.',
    added: [
      '`/modlog` selects a per-server audit channel; mutes, unmutes, kicks, bans, unbans and automatic temporary-ban expiry post a clean inline log.',
      '`/welcome` and `/leave` configure join and leave embeds with a channel, a custom template and a test preview.',
      '`/slots`, `/joke` and `/wouldyourather` add a slot machine, a button-revealed joke and a live two-option vote.',
      'Greetings support `{user}`, `{username}`, `{server}`, `{count}`, `{created}` and `{joined}` placeholders.',
      'The command directory now covers **48 commands** across six tabs.',
    ],
    improved: [
      'Every new result uses a compact three-column inline layout with the shared palette, avatars and version footer.',
      'Greeting and audit settings live in `data/greetings.json` and `data/moderation-logs.json` and survive restarts.',
      'The bot now requests the **Server Members** intent so join and leave events can fire; message content is still never read.',
    ],
    fixed: [],
  },
  {
    version: '1.9.0-beta.1',
    date: '2026-10-29',
    title: 'XP curve, rewards & moderation',
    summary: 'The shorter XP curve ships with automatic level rewards, timed moderation, new fun and minigame commands, and a ping diagnostic.',
    added: [
      '`/levelreward` lets admins attach a role reward to a level; eligible members receive it automatically on level-up.',
      '`/mute`, `/unmute`, `/kick`, `/ban` and `/unban` add timed moderation, reversals and persistent temporary bans.',
      '`/compliment` and `/rate` add two lightweight fun commands.',
      '`/guessnumber` and `/reaction` add two new minigames; `/ping` reports gateway latency, round-trip, uptime and status.',
      'A **Moderation** tab joins `/helplist`, raising the directory to **42 commands**.',
    ],
    improved: [
      'Chat XP keeps its **25–35 XP** cadence, with level 1 at **50 XP** and **80, 120, 170 and 230 XP** for the next levels.',
      'Temporary bans live in `data/moderation.json`; every action checks permissions, the server owner and role hierarchy.',
      'Level rewards live in `data/level-rewards.json`; the bot checks **Manage Roles** and its role position before assigning them.',
      'The invite link now requests **Moderate Members**, **Kick Members**, **Ban Members** and **Manage Roles**.',
    ],
    fixed: [],
  },
  {
    version: '1.8.2-beta.1',
    date: '2026-10-29',
    title: 'XP pacing & curve',
    summary: 'Chat XP awards 25–35 XP per minute, the first level now takes two awards, and a restart no longer extends a cooldown.',
    added: [
      'Members earn **25–35 XP** per eligible message, still limited to one award per server every **60 seconds**.',
      'Each award writes a `[levels]` line to `bot.log` with the gain, total XP and level.',
    ],
    improved: [
      'The opening curve is shorter: level 1 needs **50 XP**, then **80, 120, 170 and 230 XP** for the following levels, so the first level takes two awards at the 25 XP minimum.',
      'Stored XP totals are recalculated against the new curve; existing records are kept and no progress is reset.',
      'The in-memory cooldown now starts only after a successful award, so a failed write no longer locks the member out for a minute.',
      'On cooldown, the in-memory timer reuses the stored `lastXpAt` value instead of starting a fresh 60-second wait.',
    ],
    fixed: [
      'The first message after a restart no longer waits an extra full minute when the member was already partway through their cooldown.',
    ],
  },
  {
    version: '1.8.1-beta.1',
    date: '2026-10-29',
    title: 'Directory refresh',
    summary: 'A ready-to-paste Discord Bot List update carries the v1.8 feature set, the help command and GitHub links for the live post.',
    added: [
      '`docs/discordbotlist-post.md` holds the exact short and long descriptions, the editor link, the links list and the counts checklist for the live Discord Bot List post.',
      'The README now links the live Discord Bot List page and its editor.',
      'The listing copy names `/helplist` as the help command and adds the GitHub repository and issue links.',
    ],
    improved: [
      'The Discord Bot List instructions use the live slug, the existing tags and the direct editor instead of the old `new` form.',
      'Server and user counts are documented as stats posts: the page shows **Unknown** until `DISCORDBOTLIST_TOKEN` is configured and the bot posts.',
    ],
    fixed: [
      'The listing guide no longer points at a placeholder page URL.',
    ],
  },
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
