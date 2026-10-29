# Juma Habbo Bot

**Public beta · v1.11.0-beta.1** · [GitHub release](https://github.com/jumayusiii/Juma-Habbo-Bot/releases) · [Discord Bot List](https://discordbotlist.com/bots/juma-habbo) · [MIT license](LICENSE)

A Discord bot written in JavaScript with [discord.js](https://discord.js.org/) v14. It uses a recursive command handler, an event handler, and slash commands only. The bot covers memes, button minigames, dice, decision picks, per-server levels with rendered rank cards, a Discord timestamp builder, profile-image tools, live polls, persistent reminders, moderation with audit logs, welcome and leave messages, a tabbed help directory, invite tools, role and server diagnostics, directory stats posting, detailed website uptime monitoring, and TikTok video previews that play inline.

## Highlights

- **Real slash commands** loaded automatically from `src/commands/`.
- **Tabbed help** with an overview plus Fun, Moderation, Minigames, Levels and Utilities tabs, generated from the command modules.
- **Level system** with chat XP, a rendered rank card, a top-ten server leaderboard and automatic role rewards.
- **Moderation** with timed mutes, persistent temporary bans, kicks and reversals, plus permission and role-hierarchy checks.
- **Audit logs** with `/modlog`: every moderation action and automatic unban is posted to a channel you choose.
- **Greetings** with `/welcome` and `/leave`, custom templates, live test previews and compact inline embeds.
- **More fun** with compliments and roasts, repeatable ratings, a number-guessing round, a reaction test, slots, jokes, word scrambles and a live would-you-rather vote.
- **Timestamp builder** for six Discord styles, from relative or absolute input and Unix timestamps.
- **Site monitoring** for a configurable website, with HTTP, TLS, DNS, page, security-header and logo checks.
- **Uptime history** sampled every five minutes, with availability, latency, daily bars and incident timelines.
- **Live polls** with buttons, vote switching and a creator-only close control.
- **Persistent reminders** delivered by DM or in the channel where they were created.
- **Directory ready**: optional top.gg and Discord Bot List stat posting, with submission copy in `docs/`.
- **TikTok previews**: `/tiktok` attaches a TikTok video so it plays inline in Discord, with creator and engagement details plus an **Open on TikTok** fallback for oversized or private posts.
- **Modern embeds** with a shared palette, plain titles, branded headers, timestamps and clamped text limits.
- **Self-host friendly**: configurable site details, no hardcoded guild IDs or tokens, and no message content access. The **Server Members** intent is used for greetings.

## Commands

| Command | Description |
| --- | --- |
| `/meme` | Fetches a random meme from [meme-api.com](https://meme-api.com) and posts it in an embed. Falls back to Imgflip. |
| `/tiktok <url>` | 🧪 Downloads a TikTok video and posts it so it plays inline, with creator, duration and engagement details. Oversized, private and photo posts fall back to a cover image and an **Open on TikTok** button. |
| `/8ball <question>` | 🧪 Asks the Magic 8-Ball a question. |
| `/coinflip [side]` | 🧪 Flips a coin and lets you call heads or tails. |
| `/rps <choice>` | 🧪 Plays rock-paper-scissors against the bot. |
| `/roll [dice]` | 🧪 Rolls dice in `1d6`, `2d20` or `4d6+2` notation, up to 20 dice. |
| `/choose <options> [question]` | Picks one option from a 2–10 item list, with an optional question. |
| `/ship <user> [second]` | Calculates a playful, repeatable compatibility score for two members. |
| `/fact` | Shares a random fun fact with a reroll button. |
| `/joke` | 🧪 Tells a clean joke with a button that reveals the punchline. |
| `/compliment [user]` | Sends a random compliment to a member. |
| `/roast [user]` | 🧪 Serves a playful, harmless roast with compact target, tone and requester fields. |
| `/rate <thing>` | Gives something a deterministic 0–100 rating with a verdict. |
| `/trivia` | 🧪 Asks a multiple-choice trivia question with live answer buttons, score tracking and up to five refreshes. |
| `/tictactoe` | 🧪 Starts a button tic-tac-toe board against the bot. |
| `/higherlower` | 🧪 Guess whether the next number is higher or lower, up to 10 rounds. |
| `/hangman` | 🧪 Guess a hidden word one letter at a time, with six wrong guesses. |
| `/blackjack` | 🧪 Plays a hand against the dealer with Hit, Stand and Play again controls. |
| `/guessnumber [guess]` | Guesses the bot's number between 1 and 100 in up to seven attempts. |
| `/reaction` | Tests your reaction time with a button that unlocks after a random delay. |
| `/slots` | 🧪 Spins a three-reel slot machine with weighted symbols and a compact result. |
| `/wouldyourather` | 🧪 Starts a two-option vote with live inline results and changeable votes. |
| `/wordscramble` | 🧪 Unscramble five words across five rounds with four answer buttons, a hint and live scoring. |
| `/rank [user]` | Renders a profile card with level, XP progress, server rank and total XP. |
| `/levels` | Shows the top ten members by chat XP, plus your rank if you are outside the top ten. |
| `/levelreward [role] [level] [clear]` | Configures a role that members earn automatically when they reach a level. |
| `/mute <member> <duration> [reason]` | Times out a member for **5 minutes to 28 days**, with an audit-log reason. |
| `/unmute <member> [reason]` | Removes a member's timeout. |
| `/kick <member> [reason]` | Removes a member from the server with an audit-log reason. |
| `/ban <user> <duration> [reason] [delete_messages]` | Bans a user for **1 hour to 30 days** or permanently, optionally deleting recent messages. |
| `/unban <user_id> [reason]` | Lifts a ban and cancels its scheduled auto-unban. |
| `/modlog [channel] [disable]` | 🧪 Chooses the channel that receives every moderation action and automatic unban. |
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
| `/welcome [channel] [message] [disable] [test]` | 🧪 Configures the join message with placeholders and an optional test preview. |
| `/leave [channel] [message] [disable] [test]` | 🧪 Configures the leave message with placeholders and an optional test preview. |
| `/roleinfo <role>` | 🧪 Shows a role's color, position, creation date, permissions, mentionable/hoisted/managed state and icon. |
| `/botinfo` | 🧪 Shows bot uptime, gateway ping, memory, server/member counts, version and runtime versions. |
| `/ping` | Shows gateway latency, command round-trip, uptime and connection status. |
| `/invite` | Builds an install link with the permissions the bot needs plus a source-code link. |
| `/changelog` | Shows the current version, update date and release notes. |
| `/helplist` | Opens a tabbed directory — Overview, Fun, Moderation, Minigames, Levels and Utilities — with every command, its usage and a beta marker. |

🧪 marks beta commands. The help directory is generated from the loaded command modules, so it stays accurate when new commands are added.

## Guild context

`/serverinfo` and `/servericon` resolve the server from the interaction instead of trusting the local guild cache alone. If Discord sends a guild id that is not cached yet, the bot fetches it by id. A command used in a DM with exactly one available server shows that server with a note; if the bot is not a member of the requested server, it says so instead of returning generic information.

## Minigames

`/trivia`, `/tictactoe`, `/higherlower`, `/hangman`, `/blackjack`, `/guessnumber`, `/reaction` and `/wordscramble` are limited to the person who started the round. `/slots` and `/wouldyourather` are open to everyone; the vote buttons stay live for one hour and update the result in place. `/joke` is owner-controlled so the punchline is only revealed by the person who started it. After each trivia answer, the refresh button loads a new question and updates the score in place, up to **five refreshes** per round. Higher or Lower asks for a higher/lower call up to ten times, hangman reveals a six-piece drawing as letters miss, and blackjack lets you hit or stand against a dealer that stands on 17. Word Scramble shows a hint and four shuffled choices for each of five rounds, updating the score and showing **Play again** at the end. Finished games keep a **Play again** control where supported. Guess the Number gives higher/lower feedback across seven attempts, while Reaction unlocks a button after a random 2–5 second delay and reports your click time. Rounds expire after 15 minutes (reaction tests after 10), and tic-tac-toe boards after 20. Game state is held in memory, so an in-progress round ends if the bot restarts; starting the command again creates a fresh round.

## Levels

Every member earns XP by chatting. A message awards **25–35 XP**, with one award per user per server every **60 seconds**. XP is stored per server in `data/levels.json` and survives restarts.

`/rank [user]` renders a **900 × 280 rank card** locally with the member's avatar, display name, level, server rank, total XP and a progress bar to the next level. `/levels` shows the top ten members by XP, with medals for the podium and the caller's rank when outside the top ten.

The level curve starts at **50 XP** for level 1 and grows with each level (`5 × level² + 25 × level + 50` XP for the next level), so two awards at the 25 XP minimum unlock the first level. The next thresholds are **80, 120, 170 and 230 XP**. The bot uses the non-privileged **GuildMessages** intent for message events and never reads message content. Rank cards need `@napi-rs/canvas`, which installs prebuilt binaries through npm; if rendering fails, `/rank` falls back to a text embed.

`/levelreward` lets a server manager choose one reward role and the level that unlocks it. The configuration is stored in `data/level-rewards.json`. When a member levels up, the bot checks its **Manage Roles** permission and role position before assigning the role; a failed assignment is logged without interrupting the level-up announcement. Existing members receive the role on their next level-up after the reward is configured. `/levelreward clear` removes the configuration but leaves already-assigned roles in place.

## Moderation

Admin commands are grouped in the **Moderation** tab and are hidden from members without the matching Discord permission.

- `/mute <member> <duration> [reason]` times a member out for **5 minutes to 28 days**. `/unmute` clears it early.
- `/ban <user> <duration> [reason] [delete_messages]` supports **1-hour to 30-day temporary bans**, permanent bans, and message cleanup up to seven days. `/unban <user_id>` lifts a ban.
- `/kick <member> [reason]` removes a member immediately; Discord does not support timed kicks.
- Temporary bans are written to `data/moderation.json`. The scheduler checks every 30 seconds and lifts overdue bans after a restart.
- Every command checks the caller's permission, the bot's permission, the server owner, the bot's role position and the caller's role position. The bot needs **Moderate Members**, **Kick Members** and **Ban Members**, and its role must sit above the target's highest role.
- `/modlog channel:#audit-log` stores a channel in `data/moderation-logs.json`. Mutes, unmutes, kicks, bans, unbans and automatic temporary-ban expiry are posted there with the target, moderator, duration, reason and action time. `/modlog` shows the current setting, and `/modlog disable:true` turns it off.

## Welcome & leave messages

`/welcome` and `/leave` post clean inline embeds when a member joins or leaves. Choose a channel, optionally replace the message, and run the command with `test:true` to send a preview without waiting for a member event.

The templates support `{user}` (mention), `{username}` (display name), `{server}`, `{count}`, `{created}` (account age) and `{joined}` (join age). Settings are stored per server in `data/greetings.json` and survive restarts. Both commands require **Manage Server**, and the bot needs **View Channel**, **Send Messages** and **Embed Links** in the selected channel.

The bot requests the privileged **Server Members** intent for these events. Enable it under **Bot → Privileged Gateway Intents** in the Developer Portal. It never requests message content.

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

The bot is live on [Discord Bot List](https://discordbotlist.com/bots/juma-habbo). Its post still carries the pre-1.11 copy; [docs/discordbotlist-post.md](docs/discordbotlist-post.md) has the exact replacement text, the GitHub links and the edit checklist. The [listing editor](https://discordbotlist.com/bots/juma-habbo/edit) requires the owner's Discord sign-in.

[top.gg](https://top.gg/bot/new) is the other directory target. [docs/bot-listing.md](docs/bot-listing.md) has ready-to-paste descriptions, categories, reviewer notes and a submission checklist.

1. Update or submit the listing with that copy and keep the bot online while it is reviewed.
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
- The **Server Members** privileged intent enabled for welcome and leave events
- A persistent disk if you want uptime, poll, reminder, level, greeting, audit-log and scheduled-ban state to survive restarts
- `@napi-rs/canvas` for rank cards, installed automatically by `npm install`
- Outbound HTTPS access to TikTok and `www.tikwm.com` for `/tiktok`

## 1. Create your bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application**.
2. Go to **Bot** and copy the token. Keep it private; anyone with it controls the bot.
3. Under **Bot → Privileged Gateway Intents**, enable **Server Members** for join and leave messages. The bot otherwise uses `Guilds` and `GuildMessages` and never reads message content.
4. Under **OAuth2 → URL Generator**, select the scopes `bot` and `applications.commands`, and the permissions **View Channels**, **Send Messages**, **Embed Links**, **Attach Files**, **Read Message History**, **Moderate Members**, **Kick Members**, **Ban Members** and **Manage Roles**.
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
[moderation] Temporary-ban scheduler enabled (checking every 30s).
```

## Development

```bash
npm test
npm run dev
```

The test suite uses the built-in Node.js test runner and covers command loading, guild resolution, tic-tac-toe rules, trivia data and refresh rounds, dice notation, choice parsing, timestamp parsing and Discord markup, higher-or-lower, hangman and blackjack rules, ship scores, facts, compliments, ratings, number-guess rules, reaction bands, level math and persistence, level reward configuration and assignment, rank-card rendering, help tabs, uptime aggregation, poll voting and persistence, reminder parsing/delivery/cancellation, moderation durations and scheduled unbans, audit-log configuration and delivery, greeting templates and delivery, slots, jokes, would-you-rather voting, roasts, word scramble rounds, TikTok link parsing, metadata mapping and download limits, presence payloads, bot-list payloads and embed limits. GitHub Actions runs it on Node 20 and 22.

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
│   ├── ready.js                 # Presence, uptime monitor, reminders, moderation, bot lists
│   ├── guildMemberAdd.js        # Sends the configured welcome message
│   ├── guildMemberRemove.js     # Sends the configured leave message
│   ├── interactionCreate.js     # Routes slash commands and components
│   └── messageCreate.js         # Chat XP, cooldowns and level-up announcements
├── lib/
│   ├── blackjack.js             # Cards, hand values and dealer rules
│   ├── botLists.js              # Optional top.gg / Discord Bot List stats
│   ├── changelog.js             # Versioned release notes
│   ├── choices.js               # /choose parsing and random pick
│   ├── config.js                # Environment-backed site and presence settings
│   ├── dice.js                  # Dice notation parsing and rolling
│   ├── embeds.js                # Shared palette, branding and embed builder
│   ├── fun.js                   # Ship scores and the offline fact bank
│   ├── greetingCommand.js       # Shared /welcome and /leave command builder
│   ├── greetings.js             # Greeting templates, storage and member events
│   ├── guessNumber.js           # Number-guess rules and attempt limits
│   ├── jokes.js                 # Offline joke bank and random picker
│   ├── guilds.js                # Cache-safe guild resolution for commands
│   ├── hangman.js               # Word list, guesses and ASCII gallows
│   ├── help.js                  # Tabbed command directory and category metadata
│   ├── higherlower.js           # Higher-or-lower number rules
│   ├── images.js                # Size selector / download button helpers
│   ├── levels.js                # Per-server XP, level maths and persistence
│   ├── levelRewards.js          # Per-server reward roles and safe assignment
│   ├── moderation.js            # Durations, hierarchy checks and scheduled unbans
│   ├── moderationLogs.js        # Audit-log channel settings and delivery
│   ├── rankCard.js              # Canvas rank-card renderer
│   ├── reaction.js              # Reaction-time rating bands
│   ├── polls.js                 # Persistent button-poll state
│   ├── presence.js              # Playing rich presence and periodic refresh
│   ├── reminders.js             # Persistent reminders and dispatcher
│   ├── siteAutoRefresh.js       # Persisted auto-refresh subscriptions
│   ├── siteHistory.js           # Uptime samples, summaries and daily buckets
│   ├── siteMonitor.js           # Background site probe
│   ├── slots.js                 # Weighted slot symbols and result rules
│   ├── tictactoe.js             # Board rules and bot move selection
│   ├── tiktok.js                # TikTok link parsing, metadata and capped downloads
│   ├── timestamps.js            # Discord timestamp parsing and styles
│   ├── trivia.js                # Offline trivia question bank
│   ├── wordScramble.js          # Word bank, scrambling and choice rounds
│   └── wyr.js                   # In-memory would-you-rather rounds
└── commands/
    ├── fun/
    │   ├── 8ball.js
    │   ├── choose.js
    │   ├── compliment.js
    │   ├── fact.js
    │   ├── joke.js
    │   ├── meme.js
    │   ├── rate.js
    │   ├── roast.js
    │   ├── roll.js
    │   └── ship.js
    ├── levels/
    │   ├── levelreward.js
    │   ├── levels.js
    │   └── rank.js
    ├── moderation/
    │   ├── ban.js
    │   ├── kick.js
    │   ├── modlog.js
    │   ├── mute.js
    │   ├── unban.js
    │   └── unmute.js
    ├── minigames/
    │   ├── blackjack.js
    │   ├── coinflip.js
    │   ├── guessnumber.js
    │   ├── hangman.js
    │   ├── higherlower.js
    │   ├── reaction.js
    │   ├── rps.js
    │   ├── slots.js
    │   ├── tictactoe.js
    │   ├── trivia.js
    │   ├── wordscramble.js
    │   └── wouldyourather.js
    ├── social/
    │   └── tiktok.js
    └── utility/
        ├── avatar.js
        ├── botinfo.js
        ├── changelog.js
        ├── helplist.js
        ├── invite.js
        ├── leave.js
        ├── ping.js
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
        ├── userinfo.js
        └── welcome.js
```

## Data and privacy

The bot stores only what it needs to provide its features:

- Uptime samples in `data/sitestatus-history.json` (timestamp, success, HTTP status, latency, error code).
- Auto-refresh subscriptions in `data/sitestatus-autorefresh.json` (message, channel and owner IDs, interval, next run).
- Poll state in `data/polls.json` (question, options, voter user IDs, owner, timestamps).
- Reminders in `data/reminders.json` (user, source channel, reminder text, due time and delivery preference).
- Level records in `data/levels.json` (server and user IDs, display name, XP and last award time).
- Level reward roles in `data/level-rewards.json` (server ID, role ID and required level).
- Scheduled temporary bans in `data/moderation.json` (server and user IDs, username, moderator ID, reason and unban time).
- Audit-log channel IDs in `data/moderation-logs.json` (server and channel IDs, the admin who configured it and the update time).
- Welcome and leave settings in `data/greetings.json` (server and channel IDs, templates and the admin who last changed them).
- Guild and member totals are sent to top.gg and Discord Bot List only when the matching token is set.
- TikTok links are processed in memory only; no video, metadata or link history is stored.

No message content is read or stored. Deleting the matching JSON file resets that feature; deleting the `data/` folder resets everything. Poll voter IDs, reminder text and moderation reasons can be removed by deleting the relevant data files.

## Deployment notes

- Run the bot as a long-lived Node.js process with a persistent disk. Serverless platforms without a writable filesystem will lose poll, reminder, uptime, level and scheduled-ban state.
- Trivia, tic-tac-toe, Higher or Lower, hangman, blackjack, Guess the Number, Reaction and Would You Rather rounds are in memory and intentionally reset when the process restarts. Welcome, leave and audit-log settings persist in `data/`.
- Do not commit `.env`, logs or `data/*.json`.
- For a public bot, register commands globally and configure **Public Bot** and **Requires OAuth2 Code Grant** in the Developer Portal.
- Set `TOPGG_TOKEN` / `DISCORDBOTLIST_TOKEN` after a directory listing is approved; stats post on startup and every 30 minutes.
- `/tiktok` needs outbound HTTPS access to TikTok and `www.tikwm.com`. It posts the video as an attachment, so the host must allow uploads up to **8 MB**.
- Enable the privileged **Server Members** intent in the Developer Portal; without it, welcome and leave events do not fire. Message content is never requested.

## Troubleshooting

- **Commands not showing up** — run `npm run deploy`. Set `GUILD_ID` for instant updates, or wait for global propagation.
- **`401 Unauthorized`** — the token is wrong or has been reset.
- **`Missing Access` / `Unknown Guild` during deploy** — the bot is not in the guild, or `GUILD_ID` is incorrect.
- **Logo missing from `/sitestatus`** — `SITE_LOGO_URL` is blank or the remote image could not be downloaded. The rest of the report still works.
- **Reminder not delivered** — check that the bot can DM the user or still has access to the original channel. Closed DMs fall back to that channel.
- **Meme fetch fails** — the command automatically falls back to Imgflip; if both APIs are down it replies with a friendly error.
- **TikTok posts only a cover and link** — the video is private, region-locked, over the **8 MB** upload limit, or TikTok's media CDN refused the download. The metadata service is unofficial, so retry later; check that the host can reach TikTok and `www.tikwm.com`.
- **Bot-list stats not updating** — check the token, that the listing was approved, and the `[botLists]` line in the startup log.
- **Rich presence missing** — check `PRESENCE_TEXT` in `.env` and restart. The bot logs `[bot] Rich presence set: Playing …` at login and re-applies the activity every ten minutes and after a gateway resume.
- **Rank card missing** — the local canvas renderer failed; `/rank` still posts the text fallback. Check the `[rank]` log line and reinstall dependencies.
- **XP not moving** — XP is per server, awards **25–35 XP** and is limited to one award per user every 60 seconds; bot messages do not earn XP. Check `data/levels.json` and the `[levels]` line in `bot.log` after a member chats.
- **Moderation action fails** — the bot needs the matching **Moderate Members**, **Kick Members** or **Ban Members** permission, and its highest role must be above the target's. The server owner and the bot itself cannot be moderated.
- **Audit log stays empty** — run `/modlog channel:#channel` and check that the bot has **View Channel**, **Send Messages** and **Embed Links** in that channel. `/modlog` shows the current setting.
- **Welcome or leave message not sent** — enable **Server Members** under **Bot → Privileged Gateway Intents**, then run `/welcome channel:#channel test:true` or `/leave channel:#channel test:true` to verify the channel and permissions.
- **Level reward not assigned** — the bot needs **Manage Roles**, and its highest role must be above the reward role. Check the `[levels]` log line for the reason.

## License

MIT. See [LICENSE](LICENSE).
