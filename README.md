# Juma Habbo Bot

**Public beta · v1.7.0-beta.1** · [GitHub release](https://github.com/jumayusiii/Juma-Habbo-Bot/releases) · [MIT license](LICENSE)

A Discord bot written in JavaScript with [discord.js](https://discord.js.org/) v14. It uses a recursive command handler, an event handler, and slash commands only. The bot covers memes, button minigames, dice, decision picks, a Discord timestamp builder, profile-image tools, live polls, persistent reminders, a tabbed help directory, invite tools, role and server diagnostics, directory stats posting, and detailed website uptime monitoring.

## Highlights

- **Real slash commands** loaded automatically from `src/commands/`.
- **Tabbed help** with an overview plus Fun, Minigames and Utilities tabs, generated from the command modules.
- **Timestamp builder** for six Discord styles, from relative or absolute input and Unix timestamps.
- **Site monitoring** for a configurable website, with HTTP, TLS, DNS, page, security-header and logo checks.
- **Uptime history** sampled every five minutes, with availability, latency, daily bars and incident timelines.
- **Live polls** with buttons, vote switching and a creator-only close control.
- **Persistent reminders** delivered by DM or in the channel where they were created.
- **Directory ready**: optional top.gg and Discord Bot List stat posting, with submission copy in `docs/`.
- **Modern embeds** with a shared palette, plain titles, branded headers, timestamps and clamped text limits.
- **Self-host friendly**: configurable site details, no hardcoded guild IDs or tokens, and no privileged intents.

## Commands

| Command | Description |
| --- | --- |
| `/meme` | Fetches a random meme from [meme-api.com](https://meme-api.com) and posts it in an embed. Falls back to Imgflip. |
| `/8ball <question>` | 🧪 Asks the Magic 8-Ball a question. |
| `/coinflip [side]` | 🧪 Flips a coin and lets you call heads or tails. |
| `/rps <choice>` | 🧪 Plays rock-paper-scissors against the bot. |
| `/roll [dice]` | 🧪 Rolls dice in `1d6`, `2d20` or `4d6+2` notation, up to 20 dice. |
| `/choose <options> [question]` | Picks one option from a 2–10 item list, with an optional question. |
| `/trivia` | 🧪 Asks a multiple-choice trivia question with live answer buttons, score tracking and up to five refreshes. |
| `/tictactoe` | 🧪 Starts a button tic-tac-toe board against the bot. |
| `/higherlower` | 🧪 Guess whether the next number is higher or lower, up to 10 rounds. |
| `/avatar [user]` | Shows a user avatar with a 64–4096 px size selector and a **Download** button. |
| `/servericon` | Shows the current server icon with the same size selector and download button. |
| `/serverbanner` | Shows the current server banner with a download button. |
| `/sitestatus` | Full live report: HTTP status, response time, TLS, DNS, edge server, page details, security headers and the site logo. Includes uptime summary plus **Refresh**, **Auto-refresh** and a **5 / 15 / 30 minute** interval picker. |
| `/uptime` | Seven-day report with one uptime bar per day, availability, average/p95/max latency, monitoring coverage and a detailed incident timeline. |
| `/timestamp [time]` | Builds a Discord timestamp in six styles from now, a duration, a date or a Unix timestamp. |
| `/poll <question> <options>` | 🧪 Creates a live button poll with 2–5 options. Votes update in place, can be changed or removed, and only the creator can close the poll. |
| `/remind <when> <message> [where]` | 🧪 Sets a persistent reminder from 1 minute to 30 days ahead, sent by DM or in the original channel. |
| `/reminders` | 🧪 Lists your pending reminders and lets you cancel one from a select menu. The list is private. |
| `/serverinfo` | Shows the server owner, ID, creation date, member/role/channel counts, boosts, verification level and language. |
| `/userinfo [user]` | Shows a user's display name, ID, account type, creation date, join date, top role, nickname and roles. |
| `/roleinfo <role>` | 🧪 Shows a role's color, position, creation date, permissions, mentionable/hoisted/managed state and icon. |
| `/botinfo` | 🧪 Shows bot uptime, gateway ping, memory, server/member counts, version and runtime versions. |
| `/invite` | Builds an install link with the permissions the bot needs plus a source-code link. |
| `/changelog` | Shows the current version, update date and release notes. |
| `/helplist` | Opens a tabbed directory — Overview, Fun, Minigames and Utilities — with every command, its usage and a beta marker. |

🧪 marks beta commands. The help directory is generated from the loaded command modules, so it stays accurate when new commands are added.

## Guild context

`/serverinfo` and `/servericon` resolve the server from the interaction instead of trusting the local guild cache alone. If Discord sends a guild id that is not cached yet, the bot fetches it by id. A command used in a DM with exactly one available server shows that server with a note; if the bot is not a member of the requested server, it says so instead of returning generic information.

## Minigames

`/trivia`, `/tictactoe` and `/higherlower` use Discord buttons and are limited to the person who started the round. After each trivia answer, the refresh button loads a new question and updates the score in place, up to **five refreshes** per round. Higher or Lower asks for a higher/lower call up to ten times, tracks the streak, and offers **Play again** when the round ends. Trivia and Higher or Lower rounds expire after 15 minutes, and tic-tac-toe boards after 20 minutes. Game state is held in memory, so an in-progress round ends if the bot restarts; starting the command again creates a fresh round.

## Site monitoring

Set `SITE_URL` to the page you want to watch. The default is `https://habbo.gd`.

`/sitestatus` runs a live check and records it. While the bot is online, a background probe also records a sample every five minutes. Samples are kept for seven days in `data/sitestatus-history.json`; restarting the bot does not wipe the history.

`/uptime` reads that history and shows:

- **Daily bars** for the last seven UTC calendar days, one row per day.
- **Availability** for the whole window and successful/total checks.
- **Latency** average, 95th percentile and maximum.
- **Coverage**, the configured probe interval and the last check time.
- **Incident timeline** with start/end times, duration, status or network error, and the number of failed checks.

A day without samples is shown as `no data` rather than 0%, so a new install does not look like an outage. Changing `SITE_URL` starts a clean history instead of mixing two sites.

Set `SITE_NAME` to control the name shown in embeds. Set `SITE_LOGO_URL` to an image URL, or leave it blank to disable the logo in `/sitestatus`. The default monitoring interval is 300 seconds; `SITE_MONITOR_INTERVAL_SECONDS` accepts 60 or more.

Older `/sitestatus` messages created before the control changes only have the buttons they were created with. Run the command again to get the current controls.

## Auto-refreshing reports

Each `/sitestatus` report can update itself without spamming the channel.

- **Refresh** reruns the check and replaces the report in place. It has a 15-second cooldown and resets the auto-refresh countdown.
- **Auto-refresh** toggles the five-minute default on or off.
- The **interval picker** offers every 5, 15 or 30 minutes. Choosing an interval while auto-refresh is off starts it; changing it while active reschedules immediately.
- Only the person who ran the command can use its controls.
- Up to 50 reports can auto-refresh at once. Subscriptions persist in `data/sitestatus-autorefresh.json` and resume after a restart.
- A report stops refreshing automatically if its message or channel is deleted.

## Discord bot lists

The bot can keep its server count current on [top.gg](https://top.gg/bot/new) and [Discord Bot List](https://discordbotlist.com/new). Submitting the listing is a signed-in web step; [docs/bot-listing.md](docs/bot-listing.md) has ready-to-paste descriptions, categories, reviewer notes and a checklist.

1. Submit the bot with that copy and keep it online for review.
2. Create an API token — top.gg under **Account → Tokens**, Discord Bot List on the bot's admin page.
3. Add `TOPGG_TOKEN` and/or `DISCORDBOTLIST_TOKEN` to `.env`, then restart.

Once a token is present, the bot posts its guild and member counts at startup and every **30 minutes**. A missing token disables that directory, and a failed post is logged without stopping the bot. Tokens stay on the host and are never sent to Discord.

## Polls

```text
/poll question:Where should we eat? options:Pizza | Sushi | Tacos
```

Separate 2–5 options with `|` (newlines also work). The poll is posted publicly and every option becomes a button. Results are shown as a bar, vote count and percentage, and update in place.

- A voter can switch options by pressing another button, or press the same button again to remove their vote.
- Only the poll creator can close the poll; the close control is visible to everyone but enforced by the bot.
- Closed polls show the winner or tie and disable all buttons.
- Polls are stored in `data/polls.json` so buttons keep working after a restart. Closed polls are retained for seven days; open polls expire after 30 days.

## Reminders

```text
/remind when:2h message:Check the event schedule
/remind when:1d message:Send the weekly update where:This channel
```

`when` accepts compact durations such as `10m`, `2h`, `3d` or `1w`, from **1 minute** to **30 days**. The default delivery is a DM. If DMs are closed, the bot falls back to the channel where the reminder was created and mentions the user once.

Reminders are written to `data/reminders.json` and restored when the bot starts. Overdue reminders are delivered after a restart with a note showing how late they are. Each user can have up to 25 pending reminders.

## Requirements

- Node.js **18 or newer**
- A Discord application with a bot token
- A persistent disk if you want uptime, poll and reminder state to survive restarts

## 1. Create your bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application**.
2. Go to **Bot** and copy the token. Keep it private; anyone with it controls the bot.
3. No privileged intents are required. The bot only uses the `Guilds` intent and never reads message content.
4. Under **OAuth2 → URL Generator**, select the scopes `bot` and `applications.commands`, and the permissions **View Channels**, **Send Messages**, **Embed Links** and **Attach Files**.
5. Open the generated URL and add the bot to your server.

If you want other people to add your hosted instance, enable **Public Bot** in the installation settings and disable **Requires OAuth2 Code Grant** under **Bot → Authorization Flow**. Without those settings, only you can install the app.

## 2. Configure

```bash
cp .env.example .env
```

```dotenv
DISCORD_TOKEN=your-bot-token

# Optional: one server for instant command updates while developing.
GUILD_ID=your-server-id

# Optional: defaults to the application ID read from the token.
CLIENT_ID=your-application-id

# Monitored site and display details.
SITE_URL=https://habbo.gd
SITE_NAME=habbo.gd
SITE_LOGO_URL=https://cdn.habbo.gd/cms/habbo/logo.png
SITE_MONITOR_INTERVAL_SECONDS=300

# Rich presence.
PRESENCE_TEXT=I am Legend.

# Optional: Discord bot list stats (see docs/bot-listing.md).
TOPGG_TOKEN=
DISCORDBOTLIST_TOKEN=
```

`.env` is gitignored. Never commit or share the token.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | Yes | — | Bot token from the Developer Portal. |
| `GUILD_ID` | No | Global commands | Registers commands in one server for instant updates. |
| `CLIENT_ID` | No | Read from token | Application ID used during command registration. |
| `SITE_URL` | No | `https://habbo.gd` | Website watched by `/sitestatus`, `/uptime` and the monitor. |
| `SITE_NAME` | No | Site hostname | Display name used in status embeds. |
| `SITE_LOGO_URL` | No | habbo.gd logo | Logo attached to status reports; leave blank to disable. |
| `SITE_MONITOR_INTERVAL_SECONDS` | No | `300` | Background probe interval, minimum 60 seconds. |
| `PRESENCE_TEXT` | No | `I am Legend.` | Text shown as the bot's **Playing** activity. |
| `TOPGG_TOKEN` | No | — | top.gg API token; enables stats posting. |
| `DISCORDBOTLIST_TOKEN` | No | — | Discord Bot List API token; enables stats posting. |

## 3. Install and run

```bash
npm install
npm run deploy
npm start
```

- With `GUILD_ID` set, `npm run deploy` updates that server immediately.
- Without `GUILD_ID`, commands are registered globally. Discord can take up to an hour to show them.
- Use `npm run deploy:global` to register globally even when `GUILD_ID` is set.
- Re-run a deploy command whenever a command name, description or option changes.

The Windows development setup for this repository uses a portable Node.js in the gitignored `.tools/node` folder:

```powershell
.\.tools\node\npm.cmd install
.\.tools\node\npm.cmd run deploy
.\.tools\node\npm.cmd start
```

A healthy start looks like:

```text
[commands] Loaded /poll
[bot] Logged in as Juma Habbo#2257 (123456789012345678)
[bot] Rich presence set: Playing I am Legend.
[siteMonitor] Uptime sampling enabled for Juma Habbo every 5 min.
[reminders] Dispatcher enabled (checking every 15s).
```

## Development

```bash
npm test
npm run dev
```

The test suite uses the built-in Node.js test runner and covers command loading, guild resolution, tic-tac-toe rules, trivia data and refresh rounds, dice notation, choice parsing, timestamp parsing and Discord markup, higher-or-lower rules, help tabs, uptime aggregation, poll voting and persistence, reminder parsing/delivery/cancellation, bot-list payloads and embed limits. GitHub Actions runs it on Node 20 and 22.

Add a command by creating a file under `src/commands/<category>/`:

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello'),

  async execute(interaction) {
    await interaction.reply('Hello!');
  },
};
```

The command handler discovers it on the next start. Interactive components are routed back to the command whose name prefixes their `customId`, for example `poll:vote:<pollId>:<optionIndex>`. A command that uses components exports `handleComponent(interaction)`.

## Project structure

```text
src/
├── index.js                     # Creates the client, loads handlers, logs in
├── deploy-commands.js           # Registers slash commands (guild or global)
├── handlers/
│   ├── commandHandler.js        # Recursively loads src/commands/**/*.js
│   └── eventHandler.js          # Binds src/events/*.js to the client
├── events/
│   ├── ready.js                 # Presence, uptime monitor, reminders, auto-refresh, bot lists
│   └── interactionCreate.js     # Routes slash commands and components
├── lib/
│   ├── botLists.js              # Optional top.gg / Discord Bot List stats
│   ├── changelog.js             # Versioned release notes
│   ├── choices.js               # /choose parsing and random pick
│   ├── config.js                # Environment-backed site and presence settings
│   ├── dice.js                  # Dice notation parsing and rolling
│   ├── embeds.js                # Shared palette, branding and embed builder
│   ├── guilds.js                # Cache-safe guild resolution for commands
│   ├── help.js                  # Tabbed command directory and category metadata
│   ├── higherlower.js           # Higher-or-lower number rules
│   ├── images.js                # Size selector / download button helpers
│   ├── polls.js                 # Persistent button-poll state
│   ├── reminders.js             # Persistent reminders and dispatcher
│   ├── siteAutoRefresh.js       # Persisted auto-refresh subscriptions
│   ├── siteHistory.js           # Uptime samples, summaries and daily buckets
│   ├── siteMonitor.js           # Background site probe
│   ├── tictactoe.js             # Board rules and bot move selection
│   ├── timestamps.js            # Discord timestamp parsing and styles
│   └── trivia.js                # Offline trivia question bank
└── commands/
    ├── fun/
    │   ├── 8ball.js
    │   ├── choose.js
    │   ├── meme.js
    │   └── roll.js
    ├── minigames/
    │   ├── coinflip.js
    │   ├── higherlower.js
    │   ├── rps.js
    │   ├── tictactoe.js
    │   └── trivia.js
    └── utility/
        ├── avatar.js
        ├── botinfo.js
        ├── changelog.js
        ├── helplist.js
        ├── invite.js
        ├── poll.js
        ├── remind.js
        ├── reminders.js
        ├── roleinfo.js
        ├── serverbanner.js
        ├── servericon.js
        ├── serverinfo.js
        ├── sitestatus.js
        ├── timestamp.js
        ├── uptime.js
        └── userinfo.js
```

## Data and privacy

The bot stores only what it needs to provide its features:

- Uptime samples in `data/sitestatus-history.json` (timestamp, success, HTTP status, latency, error code).
- Auto-refresh subscriptions in `data/sitestatus-autorefresh.json` (message, channel and owner IDs, interval, next run).
- Poll state in `data/polls.json` (question, options, voter user IDs, owner, timestamps).
- Reminders in `data/reminders.json` (user, source channel, reminder text, due time and delivery preference).
- Guild and member totals are sent to top.gg and Discord Bot List only when the matching token is set.

No message content is read or stored. Deleting the matching JSON file resets that feature; deleting the `data/` folder resets everything. Poll voter IDs and reminder text can be removed by deleting the relevant data files.

## Deployment notes

- Run the bot as a long-lived Node.js process with a persistent disk. Serverless platforms without a writable filesystem will lose poll, reminder and uptime state.
- Trivia, tic-tac-toe and Higher or Lower rounds are in memory and intentionally reset when the process restarts.
- Do not commit `.env`, logs or `data/*.json`.
- For a public bot, register commands globally and configure **Public Bot** and **Requires OAuth2 Code Grant** in the Developer Portal.
- Set `TOPGG_TOKEN` / `DISCORDBOTLIST_TOKEN` after a directory listing is approved; stats post on startup and every 30 minutes.
- Discord does not need privileged intents for this bot.

## Troubleshooting

- **Commands not showing up** — run `npm run deploy`. Set `GUILD_ID` for instant updates, or wait for global propagation.
- **`401 Unauthorized`** — the token is wrong or has been reset.
- **`Missing Access` / `Unknown Guild` during deploy** — the bot is not in the guild, or `GUILD_ID` is incorrect.
- **Logo missing from `/sitestatus`** — `SITE_LOGO_URL` is blank or the remote image could not be downloaded. The rest of the report still works.
- **Reminder not delivered** — check that the bot can DM the user or still has access to the original channel. Closed DMs fall back to that channel.
- **Meme fetch fails** — the command automatically falls back to Imgflip; if both APIs are down it replies with a friendly error.
- **Bot-list stats not updating** — check the token, that the listing was approved, and the `[botLists]` line in the startup log.

## License

MIT. See [LICENSE](LICENSE).
