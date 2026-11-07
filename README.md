# Zen

![Zen banner](assets/branding/zen-banner-750x300.png)

**Public beta · v1.19.0-beta.16** · [GitHub release](https://github.com/jumayusiii/Zen-Bot/releases) · [Discord Bot List](https://discordbotlist.com/bots/juma-habbo) · [MIT license](LICENSE)

A Discord bot written in JavaScript with [discord.js](https://discord.js.org/) v14. It uses a recursive command handler, an event handler, and slash commands only. The bot covers memes, animal memes, customizable image captions, Reddit thread cards, social actions, cat and dog photos, styleable memes, button minigames, dice, decision picks, per-server levels with ten customizable rank card themes, a beta coin economy with work shifts, coin wagers, admin coin grants and removals and a card-theme shop, a Discord timestamp builder, profile-image tools, live polls, persistent reminders, moderation with warnings, purge, slowmode, channel locks, soft bans and audit logs, welcome and leave messages, a tabbed help directory, invite tools, role and server diagnostics, directory stats posting, detailed website uptime monitoring, TikTok video previews that play inline, live Bluesky, Reddit and YouTube lookups, live weather forecasts, Wikipedia summaries, fortune cookies, themed conversation starters, sequence memory, modal typing races, a per-server Type Race leaderboard and a beta ChatGPT assistant.

## Highlights

- **Real slash commands** loaded automatically from `src/commands/`.
- **Tabbed help** with an overview plus Fun, Images, Moderation, Minigames, Levels, Economy, Social and Utilities tabs, generated from the command modules.
- **Level system** with chat XP, level-up coin payouts, ten customizable rank card themes, level tools, a top-ten server leaderboard and automatic role rewards.
- **Moderation** with timed mutes, persistent temporary bans, kicks, reversals, soft bans, channel locks, warnings, purge and slowmode, plus permission and role-hierarchy checks.
- **Audit logs** with `/modlog`: every moderation action — including locks, soft bans and admin coin grants — and automatic unbans are posted to a channel you choose.
- **Greetings** with `/welcome` and `/leave`, custom templates, live test previews and compact inline embeds.
- **More fun** with compliments and roasts, repeatable ratings, a number-guessing round, a reaction test, slots, jokes, word scrambles, fortune cookies, themed conversation starters and a live would-you-rather vote.
- **Social media** with live `/bluesky`, `/reddit`, `/youtube` and `/tiktok` lookups, plus `/hug`, `/pat` and `/highfive` social actions.
- **Images** with random cat, dog and animal memes, `/xkcd` for random comics, `/caption` for styled image text, `/redditcard` for live comment cards, and `/memegen` with animal templates, fonts, text colours, layouts and custom backgrounds.
- **Economy** with per-server wallets, `/daily` and `/work` income, level-up coin payouts, `/steal` heists, coin-flip, slot and blackjack wagers, an `/ecoleaderboard` rich list, admin coin grants and removals, a ten-theme shop and purchasable rank card wallpapers.
- **Languages** with a per-server `/language` switch between **English** and **German** for help, fun, minigames, wallets, the economy, levels and rank cards, moderation and the audit log, and the language menu.
- **Timestamp builder** for six Discord styles, from relative or absolute input and Unix timestamps.
- **Site monitoring** for a configurable website, with HTTP, TLS, DNS, page, security-header and logo checks.
- **Uptime history** sampled every five minutes, with availability, latency, daily bars and incident timelines.
- **Live polls** with buttons, vote switching and a creator-only close control.
- **Persistent reminders** delivered by DM or in the channel where they were created.
- **Directory ready**: optional top.gg and Discord Bot List stat posting, with submission copy in `docs/`.
- **Release automation**: pushing a `v*` tag tests the tree and publishes the matching changelog entry as a GitHub release, with beta versions marked as pre-releases.
- **TikTok previews**: `/tiktok` attaches a TikTok video so it plays inline in Discord, with creator and engagement details plus an **Open on TikTok** fallback for oversized or private posts.
- **Social feeds**: `/bluesky`, `/reddit` and `/youtube` connect to live public feeds with profile, post, community and video details.
- **Weather**: `/weather` looks up any city and posts current conditions plus a four-day forecast from [Open-Meteo](https://open-meteo.com/), in Celsius or Fahrenheit. Set `private:true` to keep replies private to you; the choice is remembered for your user ID until you set `private:false`. No API key needed.
- **Knowledge**: `/wikipedia` searches Wikipedia and posts a clean summary, article image and a **Read on Wikipedia** button.
- **ChatGPT beta**: `/chatgpt` sends a moderated question to OpenAI and posts the answer, with an optional private reply and **8 requests per 10 minutes**. Requires `OPENAI_API_KEY`; prompts are not stored by Zen.
- **Type Race records**: every exact run updates a per-server personal best, and `/typeraceleaderboard` ranks the ten fastest members.
- **Modern embeds** with a shared palette, plain titles, branded headers, timestamps and clamped text limits.
- **Self-host friendly**: configurable site details, no hardcoded guild IDs or tokens, and no message content access. The **Server Members** intent is used for greetings.

## Commands

| Command | Description |
| --- | --- |
| `/meme` | Fetches a random meme from [meme-api.com](https://meme-api.com) and posts it in an embed. Falls back to Imgflip. |
| `/cat` | Fetches a random cat photo from The Cat API. |
| `/dog` | Fetches a random dog photo from Dog CEO, with breed details when available. |
| `/memegen <template> <top> [bottom]` | Creates an editable meme with your own text, optional font, colour, layout, uppercase text and a custom HTTPS background. |
| `/animalmeme [community]` | Fetches a random meme from public animal communities, with an optional community picker and upvote details. |
| `/caption <image> [top] [bottom]` | Adds styled top and bottom text to an uploaded image, with four styles, five colours, three sizes and optional uppercase. |
| `/redditcard <url> [comments] [theme]` | 👷‍♂️ Renders a public Reddit thread and up to four comments as a dark, light or sepia image card. |
| `/xkcd` | Posts a random comic from xkcd.com with its alt text, publication date and a link to the original page. |
| `/tiktok <url>` | 👷‍♂️ Downloads a TikTok video and posts it so it plays inline, with creator, duration and engagement details. Oversized, private and photo posts fall back to a cover image and an **Open on TikTok** button. |
| `/bluesky <handle>` | 👷‍♂️ Loads a live Bluesky profile, bio, follower counts and latest public post, with profile and post links. |
| `/reddit [subreddit]` | 👷‍♂️ Reads Reddit’s public Atom feed and posts a random hot item from a curated SFW community. Defaults to `popular`. |
| `/youtube <url>` | 👷‍♂️ Resolves a YouTube video, Shorts or `youtu.be` link into a live title, channel, thumbnail and watch link. |
| `/8ball <question>` | 👷‍♂️ Asks the Magic 8-Ball a question. |
| `/coinflip [side]` | 👷‍♂️ Flips a coin and lets you call heads or tails. |
| `/rps <choice>` | 👷‍♂️ Plays rock-paper-scissors against the bot. |
| `/roll [dice]` | 👷‍♂️ Rolls dice in `1d6`, `2d20` or `4d6+2` notation, up to 20 dice. |
| `/choose <options> [question]` | Picks one option from a 2–10 item list, with an optional question. |
| `/ship <user> [second]` | Calculates a playful, repeatable compatibility score for two members. |
| `/fact` | Shares a random fun fact with a reroll button. |
| `/joke` | 👷‍♂️ Tells a clean joke with a button that reveals the punchline. |
| `/fortunecookie` | 👷‍♂️ Opens a fortune with a theme and six lucky numbers. |
| `/topic [theme]` | 👷‍♂️ Starts a conversation with a themed prompt and a one-click shuffle. |
| `/compliment [user]` | Sends a random compliment to a member. |
| `/roast [user]` | 👷‍♂️ Serves a playful, harmless roast with compact target, tone and requester fields. |
| `/rate <thing>` | Gives something a deterministic 0–100 rating with a verdict. |
| `/hug <user>` | Sends a warm hug to a member. |
| `/pat <user>` | Gives a member a gentle head pat. |
| `/highfive <user>` | Celebrates with a member using a high five. |
| `/trivia` | 👷‍♂️ Asks a multiple-choice trivia question with live answer buttons, score tracking and up to five refreshes. |
| `/tictactoe` | 👷‍♂️ Starts a button tic-tac-toe board against the bot. |
| `/higherlower` | 👷‍♂️ Guess whether the next number is higher or lower, up to 10 rounds. |
| `/hangman` | 👷‍♂️ Guess a hidden word one letter at a time, with six wrong guesses. |
| `/blackjack [bet]` | 👷‍♂️ Plays a hand against the dealer with Hit, Stand and Play again. Add a bet of up to **5,000 coins** to win **2×**, or get the stake back on a push. |
| `/guessnumber [guess]` | Guesses the bot's number between 1 and 100 in up to seven attempts. |
| `/reaction` | Tests your reaction time with a button that unlocks after a random delay. |
| `/slots` | 👷‍♂️ Spins a three-reel slot machine with weighted symbols and a compact result. |
| `/wouldyourather` | 👷‍♂️ Starts a two-option vote with live inline results and changeable votes. |
| `/wordscramble` | 👷‍♂️ Unscramble five words across five rounds with four answer buttons, a hint and live scoring. |
| `/memory` | 👷‍♂️ Shows a growing symbol sequence, hides it, then scores your repeat. |
| `/typerace` | 👷‍♂️ Opens a typing box, times an exact phrase, reports words per minute and saves a personal best. |
| `/typeraceleaderboard` | 👷‍♂️ Ranks the ten fastest Type Race times in the server and shows your best. |
| `/rank [user] [theme]` | Renders a profile card with level, XP progress, server rank, total XP and the member’s selected card theme. Pass an owned theme to equip it. |
| `/levels` | Shows the top ten members by chat XP, plus your rank if you are outside the top ten. |
| `/levelinfo [user]` | Explains the XP rules and shows a member’s level, rank, next-level requirement and role reward. |
| `/leveladmin <member> <action> [amount] [reason]` | Adds, removes, sets or resets a member’s chat XP. Limited to **Administrator** or the server owner, with an audit-log entry. |
| `/levelreward [role] [level] [clear]` | Configures a role that members earn automatically when they reach a level. |
| `/balance [user]` | 👷‍♂️ Shows a member's coin balance, server rank, daily streak and equipped card theme. |
| `/daily` | 👷‍♂️ Claims the daily coin reward and advances the streak. |
| `/shop` | 👷‍♂️ Lists the rank card themes, their prices, the ones you own and the one equipped, with your balance. |
| `/buy <theme>` | 👷‍♂️ Buys a card theme with coins and equips it immediately. |
| `/work` | 👷‍♂️ Works a short shift for **40–110 coins** every 45 minutes. |
| `/coinbet <amount> <side>` | 👷‍♂️ Wagers up to **5,000 coins** on heads or tails and returns **1.9×** on a win. |
| `/slotsbet <amount>` | 👷‍♂️ Wagers coins on the slot machine: pairs pay **1.5×** and triples pay **3×–30×**. |
| `/steal` | 👷‍♂️ Tries a vault heist for **25–75 coins** with a **45%** success rate and a **25-minute** cooldown. |
| `/ecoleaderboard` | 👷‍♂️ Ranks the ten richest members in the server, with medals and your rank when you are outside the top ten. |
| `/mute <member> <duration> [reason]` | Times out a member for **5 minutes to 28 days**, with an audit-log reason. |
| `/unmute <member> [reason]` | Removes a member's timeout. |
| `/kick <member> [reason]` | Removes a member from the server with an audit-log reason. |
| `/ban <user> <duration> [reason] [delete_messages]` | Bans a user for **1 hour to 30 days** or permanently, optionally deleting recent messages. |
| `/unban <user_id> [reason]` | Lifts a ban and cancels its scheduled auto-unban. |
| `/warn <member> <reason>` | Records a persistent warning, sends a DM when possible and writes to the audit log. |
| `/warnings <member> [clear] [reason]` | Shows a member's recorded warnings, newest first, or clears them with `clear:true`. Listing is private to moderators; clearing needs **Manage Server**. |
| `/purge <amount> [user] [channel] [reason]` | Deletes up to 100 recent messages, optionally from one member and channel. |
| `/slowmode <seconds> [channel] [reason]` | Sets a channel cooldown from 0 seconds to 6 hours. |
| `/lock [channel] [reason]` | Locks a text channel so @everyone cannot send messages and saves the previous setting. |
| `/unlock [channel] [reason]` | Restores the @everyone SendMessages setting saved by `/lock`. |
| `/softban <member> [delete_messages] [reason]` | Bans a member, cleans recent messages (24 hours by default), then immediately lifts the ban. |
| `/grantcoins <member> <amount> [reason]` | 👷‍♂️ Grants up to **100,000 coins** to a member. Limited to **Administrator** or the server owner, with an audit-log entry. |
| `/removecoins <member> <amount> [reason]` | 👷‍♂️ Removes up to **100,000 coins** from a member's wallet, stopping at zero. Limited to **Administrator** or the server owner, with an audit-log entry. |
| `/modlog [channel] [disable]` | 👷‍♂️ Chooses the channel that receives every moderation action and automatic unban. |
| `/language` | 👷‍♂️ Switches Zen between **English** and **German** for this server with two buttons. Requires **Manage Server**. |
| `/avatar [user]` | Shows a user avatar with a 64–4096 px size selector and a **Download** button. |
| `/servericon` | Shows the current server icon with the same size selector and download button. |
| `/serverbanner` | Shows the current server banner with a download button. |
| `/sitestatus` | Full live report: HTTP status, response time, TLS, DNS, edge server, page details, security headers and the site logo. Includes uptime summary plus **Refresh**, **Auto-refresh** and a **5 / 15 / 30 minute** interval picker. |
| `/uptime` | Seven-day report with one uptime bar per day, availability, average/p95/max latency, monitoring coverage and a detailed incident timeline. |
| `/weather <location> [units] [private]` | 👷‍♂️ Current conditions and a four-day forecast from Open-Meteo, with Celsius or Fahrenheit units. Set `private:true` to keep replies private to you until you set `private:false`; the choice is remembered per user. |
| `/wikipedia <query>` | 👷‍♂️ Searches Wikipedia and posts a summary with a link to the full article. |
| `/calculate <expression>` | Calculates a maths expression with + - * / % ^ and parentheses. |
| `/chatgpt <prompt> [private]` | 👷‍♂️ Asks OpenAI’s ChatGPT a question with an optional private answer. Moderated, limited to 8 requests per member per 10 minutes, and no conversation history is stored. |
| `/timestamp [time]` | Builds a Discord timestamp in six styles from now, a duration, a date or a Unix timestamp. |
| `/poll <question> <options>` | 👷‍♂️ Creates a live button poll with 2–5 options. Votes update in place, can be changed or removed, and only the creator can close the poll. |
| `/remind <when> <message> [where]` | 👷‍♂️ Sets a persistent reminder from 1 minute to 30 days ahead, sent by DM or in the original channel. |
| `/reminders` | 👷‍♂️ Lists your pending reminders and lets you cancel one from a select menu. The list is private. |
| `/serverinfo` | Shows the server owner, ID, creation date, member/role/channel counts, boosts, verification level and language. |
| `/userinfo [user]` | Shows a user's display name, ID, account type, creation date, join date, top role, nickname and roles. |
| `/welcome [channel] [message] [disable] [test]` | 👷‍♂️ Configures the join message with placeholders and an optional test preview. |
| `/leave [channel] [message] [disable] [test]` | 👷‍♂️ Configures the leave message with placeholders and an optional test preview. |
| `/roleinfo <role>` | 👷‍♂️ Shows a role's color, position, creation date, permissions, mentionable/hoisted/managed state and icon. |
| `/botinfo` | 👷‍♂️ Shows bot uptime, gateway ping, memory, server/member counts, version and runtime versions. |
| `/ping` | Shows gateway latency, command round-trip, uptime and connection status. |
| `/invite` | Builds an install link with the permissions the bot needs plus a source-code link. |
| `/changelog` | Shows the current version, update date and release notes. |
| `/helplist` | Opens a tabbed directory — Overview, Fun, Images, Moderation, Minigames, Levels, Economy, Social and Utilities — with every command, its usage and a beta marker. |

👷‍♂️ marks beta commands. The directory covers **100 public commands** across nine tabs (plus seven developer-only commands for the owner), and is generated from the loaded command modules so it stays accurate when new commands are added.

## Guild context

`/serverinfo` and `/servericon` resolve the server from the interaction instead of trusting the local guild cache alone. If Discord sends a guild id that is not cached yet, the bot fetches it by id. A command used in a DM with exactly one available server shows that server with a note; if the bot is not a member of the requested server, it says so instead of returning generic information.

## Minigames

`/trivia`, `/tictactoe`, `/higherlower`, `/hangman`, `/guessnumber`, `/reaction`, `/wordscramble`, `/memory` and `/typerace` are limited to the person who started the round. `/slots` and `/wouldyourather` are open to everyone; the vote buttons stay live for one hour and update the result in place. `/joke` is owner-controlled so the punchline is only revealed by the person who started it. After each trivia answer, the refresh button loads a new question and updates the score in place, up to **five refreshes** per round. Higher or Lower asks for a higher/lower call up to ten times, hangman reveals a six-piece drawing as letters miss. Word Scramble shows a hint and four shuffled choices for each of five rounds, updating the score and showing **Play again** at the end. Memory hides a symbol sequence after you start and adds one symbol per completed round, while Type Race opens a modal and scores exact phrases in words per minute. Every correct run updates that member's personal best, and `/typeraceleaderboard` shows the ten fastest times in the server. Finished games keep a **Play again** control where supported. Guess the Number gives higher/lower feedback across seven attempts, while Reaction unlocks a button after a random 2–5 second delay and reports your click time. Rounds expire after 15 minutes (reaction tests after 10), and tic-tac-toe boards after 20. Game state is held in memory, so an in-progress round ends if the bot restarts; starting the command again creates a fresh round.

## Images

`/cat` and `/dog` fetch a fresh photo from The Cat API and Dog CEO, with source and breed details where available. `/animalmeme` pulls a random post from public animal communities through meme-api.com and shows the community and upvote count; pass a `community` to choose one feed. `/caption` downloads an uploaded PNG, JPEG, WebP or GIF and draws top and bottom text locally with a classic outline, clean shadow, boxed or subtle style, plus colour, size and uppercase controls.

`/memegen` uses fourteen templates, including Drake, This is Fine, Doge, Grumpy Cat, Bongo Cat, Socially Awesome Penguin and Seal of Approval-style classics, and accepts editable top and bottom text. Optional font, text colour, layout, uppercase and custom-background options feed memegen.link's renderer. The image services need outbound HTTPS but no API keys. `/memegen` links the generated image directly; no image files are stored on the host. `/redditcard` reads a thread's public comment RSS feed and renders the post plus up to four unique commenters to a **900 px** card with a dark, light or sepia theme. Reddit can rate-limit the feed; the command retries once and otherwise asks you to try again in a minute.

## Social & media

`/bluesky`, `/reddit`, `/youtube` and `/tiktok` connect to live public feeds. `/bluesky` loads a profile and latest post from the public Bluesky AppView API. `/reddit` reads a curated SFW community’s public Atom feed, because Reddit’s JSON endpoint is often blocked. `/youtube` resolves standard, Shorts and `youtu.be` links through YouTube oEmbed.

These commands need outbound HTTPS but no API keys. `/hug`, `/pat` and `/highfive` remain lightweight local interactions with a randomly chosen line, compact from/target/mood fields and safe mention handling. They reject self-targeting and work without external APIs.

## Levels

Every member earns XP by chatting. A message awards **25–35 XP**, with one award per user per server every **60 seconds**. XP is stored per server in `data/levels.json` and survives restarts. Each level-up also pays coins into the member's server wallet: **25 coins** at level 1, **5 more** per level and a **250-coin** cap per level, so active chat feeds the economy described below.

`/rank [user]` renders a **900 × 280 rank card** locally with the member's avatar, display name, level, server rank, total XP and a progress bar to the next level. The card uses the member's selected theme — Aurora by default — with matching wallpaper patterns, avatar ring, level pill and progress bar colours. `/rank theme:<name>` equips another owned theme, and `/levels` shows the top ten members by XP, with medals for the podium and the caller's rank when outside the top ten. `/levelinfo [user]` explains the XP rules and shows the member's level, rank, next-level requirement and the server's reward role. `/leveladmin` lets an administrator add, remove, set or reset a member's XP, with every change written to the audit log.

The level curve starts at **50 XP** for level 1 and grows with each level (`5 × level² + 25 × level + 50` XP for the next level), so two awards at the 25 XP minimum unlock the first level. The next thresholds are **80, 120, 170 and 230 XP**. The bot uses the non-privileged **GuildMessages** intent for message events and never reads message content. Rank cards need `@napi-rs/canvas`, which installs prebuilt binaries through npm; if rendering fails, `/rank` falls back to a text embed.

`/levelreward` lets a server manager choose one reward role and the level that unlocks it. The configuration is stored in `data/level-rewards.json`. When a member levels up, the bot checks its **Manage Roles** permission and role position before assigning the role; a failed role assignment or coin credit is logged without interrupting the level-up announcement. Existing members receive the role on their next level-up after the reward is configured. `/levelreward clear` removes the configuration but leaves already-assigned roles in place.

## Economy

Coins are **per server**, so the same member has a separate wallet and rank-card collection in each community. `/daily` pays **100 coins** on the first day, then adds **25 coins** for each consecutive day, up to **250 coins** by day seven. The cooldown is 24 hours and a gap of more than 48 hours resets the streak. Level-ups are the second income source: reaching level 1 pays **25 coins**, every later level adds **5 coins** more, and a single level pays at most **250 coins**. `/work` adds a **40–110 coin** shift every 45 minutes. `/steal` attempts a vault heist for **25–75 coins** with a **45%** success rate and a **25-minute** cooldown that starts even when the heist fails. `/blackjack` accepts an optional bet of up to **5,000 coins**: the stake is taken when the hand is dealt, a win returns **2×**, a push returns the stake and a loss returns nothing. `/ecoleaderboard` ranks the ten richest wallets in the server, with medals and your own rank when you are outside the top ten; only wallets with coins are listed. `/coinbet` wagers up to **5,000 coins** on heads or tails and returns **1.9×** on a win; `/slotsbet` pays **1.5×** for a pair and **3×–30×** for a triple. Coin wagers are settled in one queued write, so a stake is never charged without the result; blackjack holds the stake from the deal and credits its payout once at the end. `/balance` shows a wallet, its rank among funded wallets, the streak and the equipped card.

`/shop` lists ten card themes: the free **Aurora** plus **Sunset, Ocean, Forest, Midnight, Candy, Sakura, Cyber, Ember and Frost** at 600–4,400 coins. It marks the themes you own and the one equipped, and shows your balance. `/buy theme:<name>` deducts the price atomically and equips the theme; `/rank theme:<name>` switches between owned themes. Wallets are stored in `data/economy.json` and survive restarts.

Server owners and administrators can use `/grantcoins <member> <amount> [reason]` to add **1–100,000 coins** to a wallet, or `/removecoins <member> <amount> [reason]` to take them away. Both are limited to the server owner and members with **Administrator**, stop at the wallet limits, and are recorded in the audit log.

## Languages

`/language` opens a two-button menu for members with **Manage Server**. Pick **English** or **Deutsch** and the choice is saved per server in `data/languages.json`; switching is immediate and the active button is highlighted and disabled. German currently covers the help tabs and category copy, every fun command including its facts, jokes, fortunes, topics, compliments and roasts, every minigame including trivia questions, typing phrases, hangman categories and scramble hints, wallets and the rich list, every economy command (daily, work, heists, coin and slot wagers, blackjack, shop, inventory), the level commands including the rank card image, and the moderation commands with their audit-log entries. Images, social and utility responses still use English, and more command text can be added to the catalog in [i18n.js](src/lib/i18n.js).

## Moderation

Admin commands are grouped in the **Moderation** tab and are hidden from members without the matching Discord permission.

- `/mute <member> <duration> [reason]` times a member out for **5 minutes to 28 days**. `/unmute` clears it early.
- `/ban <user> <duration> [reason] [delete_messages]` supports **1-hour to 30-day temporary bans**, permanent bans, and message cleanup up to seven days. `/unban <user_id>` lifts a ban.
- `/kick <member> [reason]` removes a member immediately; Discord does not support timed kicks.
- `/warn <member> <reason>` and `/warnings <member> [clear] [reason]` manage warnings stored per server in `data/warnings.json`. Listing is private to moderators; clearing needs **Manage Server**. Warnings are DM'd when possible and recorded in the audit log.
- `/purge <amount> [user] [channel] [reason]` removes up to **100 recent messages**, optionally from one member. Messages older than 14 days are skipped because Discord cannot bulk-delete them.
- `/lock [channel] [reason]` denies **SendMessages** for **@everyone** and saves the previous setting in `data/channel-locks.json`. `/unlock` restores exactly that setting, so a channel that was already read-only stays read-only.
- `/softban <member> [delete_messages] [reason]` bans a member, cleans up to seven days of messages, then immediately removes the ban. It refuses users who are already banned so an existing ban is never replaced.
- `/grantcoins <member> <amount> [reason]` and `/removecoins <member> <amount> [reason]` are limited to the server owner and members with **Administrator**. They add or remove 1–100,000 coins at a time, respect the wallet limits and write to the audit log.
- Temporary bans are written to `data/moderation.json`. The scheduler checks every 30 seconds and lifts overdue bans after a restart.
- Every command checks the caller's permission, the bot's permission, the server owner, the bot's role position and the caller's role position. Depending on the command, the bot needs **Moderate Members**, **Kick Members**, **Ban Members**, **Manage Messages**, **Manage Channels** and **Manage Roles**, and its role must sit above the target's highest role.
- `/modlog channel:#audit-log` stores a channel in `data/moderation-logs.json`. Mutes, unmutes, kicks, bans, unbans, soft bans, channel locks and unlocks, coin grants and removals, level XP changes, warnings, cleared warnings, purges, slowmode changes and automatic temporary-ban expiry are posted there with the target, moderator, duration, reason and action time. `/modlog` shows the current setting, and `/modlog disable:true` turns it off.

## Welcome & leave messages

`/welcome` and `/leave` post clean inline embeds when a member joins or leaves. Choose a channel, optionally replace the message, and run the command with `test:true` to send a preview without waiting for a member event.

The templates support `{user}` (mention), `{username}` (display name), `{server}`, `{count}`, `{created}` (account age) and `{joined}` (join age). Settings are stored per server in `data/greetings.json` and survive restarts. Both commands require **Manage Server**, and the bot needs **View Channel**, **Send Messages** and **Embed Links** in the selected channel.

The bot requests the privileged **Server Members** intent for these events. Enable it under **Bot → Privileged Gateway Intents** in the Developer Portal. It never requests message content.

## Site monitoring

Set `SITE_URL` to the page you want to watch. The default is `https://habbo.si`.

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

The complete launch guide — current directories, per-site steps, Zen's copy, stats APIs, vote webhooks and review checks — is in [docs/bot-listing.md](docs/bot-listing.md) and published at [Zen Bot List Guide](https://site-e6edf6fc47c8417fbd4cd9fc08cf507d.freebuff.page). The public page source is in [guide/](guide/).

> **Before submitting:** **Requires OAuth2 Code Grant** is already off, and the application is public. The invite is ready; open it once in a fresh window before submitting. Most directories require a public, invitable bot.

Zen is live on [Discord Bot List](https://discordbotlist.com/bots/juma-habbo). The listing URL keeps its `juma-habbo` slug; update its display name and copy from [section 6 of the guide](docs/bot-listing.md#6-discord-bot-list--full-submission). The [listing editor](https://discordbotlist.com/bots/juma-habbo/edit) requires the owner's Discord sign-in.

[top.gg](https://top.gg/bot/new) is the primary directory target. Submit it now; code grant is off. Then add the other Tier 1 listings from the guide.

1. Keep the bot online during review; code grant is off. The guide's [privacy policy](https://site-e6edf6fc47c8417fbd4cd9fc08cf507d.freebuff.page/#privacy) is the public privacy URL.
2. Update or submit the listings with the ready-to-paste copy.
3. Create API tokens — top.gg under **Integrations & API**, Discord Bot List on the bot's admin page.
4. Add `TOPGG_TOKEN` and/or `DISCORDBOTLIST_TOKEN` to `.env`, then restart.

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
- A persistent disk if you want uptime, poll, reminder, level, greeting, warning, audit-log, scheduled-ban and Type Race best state to survive restarts
- `@napi-rs/canvas` for rank cards, captions and Reddit cards, installed automatically by `npm install`
- Outbound HTTPS access to TikTok and `www.tikwm.com` for `/tiktok`
- Outbound HTTPS access to `public.api.bsky.app`, `www.reddit.com` and `www.youtube.com` for the live social feeds
- Outbound HTTPS access to `api.thecatapi.com`, `dog.ceo`, `api.memegen.link` and `www.reddit.com` for the image commands
- Outbound HTTPS access to Open-Meteo and Wikipedia for `/weather` and `/wikipedia`
- An OpenAI API key and outbound HTTPS access to `api.openai.com` for the beta `/chatgpt` command

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
CLIENT_ID=1564936469305364480

# Monitored site and display details.
SITE_URL=https://habbo.si
SITE_NAME=habbo.si
SITE_LOGO_URL=https://habbo.si/apple-touch-icon.png
SITE_MONITOR_INTERVAL_SECONDS=300

# Rich presence.
PRESENCE_TEXT=use /helplist!

# Optional: Discord bot list stats (see docs/bot-listing.md).
TOPGG_TOKEN=
DISCORDBOTLIST_TOKEN=

# Optional: enables the beta /chatgpt command.
OPENAI_API_KEY=
OPENAI_MODEL=gpt-6-luna
```

`.env` is gitignored. Never commit or share the token.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | Yes | — | Bot token from the Developer Portal. |
| `GUILD_ID` | No | — | Required only by `npm run deploy:guild` for single-server development. |
| `CLIENT_ID` | No | Read from token | Application ID used during command registration. |
| `SITE_URL` | No | `https://habbo.si` | Website watched by `/sitestatus`, `/uptime` and the monitor. |
| `SITE_NAME` | No | Site hostname | Display name used in status embeds. |
| `SITE_LOGO_URL` | No | habbo.si icon | Logo attached to status reports; leave blank to disable. |
| `SITE_MONITOR_INTERVAL_SECONDS` | No | `300` | Background probe interval, minimum 60 seconds. |
| `PRESENCE_TEXT` | No | `use /helplist!` | Text shown as the bot's **Playing** activity. |
| `TOPGG_TOKEN` | No | — | top.gg API token; enables stats posting. |
| `DISCORDBOTLIST_TOKEN` | No | — | Discord Bot List API token; enables stats posting. |
| `OPENAI_API_KEY` | No | — | Enables the beta `/chatgpt` command; keep it server-side. |
| `OPENAI_MODEL` | No | `gpt-6-luna` | Model used by `/chatgpt`; set another Responses-compatible model if needed. |

## 3. Install and run

```bash
npm install
npm run deploy
npm start
```

- `npm run deploy` registers one global command set and clears guild-scoped copies from every server, so the picker never shows a command twice. Discord can take up to an hour to show global changes.
- `npm run deploy:guild` is for single-server development with `GUILD_ID`; it clears the global set first, so other servers lose commands until you run `npm run deploy` again.
- Re-run a deploy command whenever a command name, description or option changes.
- `npm run deploy:local` syncs this checkout into `~/Zen-Bot` (or `ZEN_DEPLOY_DIR`), preserves `.env`, `data/` and logs, reinstalls dependencies when the lockfile changes, registers slash commands and restarts the PM2 process.

The Windows development setup for this repository uses a portable Node.js in the gitignored `.tools/node` folder:

```powershell
.\.tools\node\npm.cmd install
.\.tools\node\npm.cmd run deploy
.\.tools\node\npm.cmd start
```

A healthy start looks like:

```text
[commands] Loaded /poll
[bot] Logged in as Zen#2257 (123456789012345678)
[bot] Rich presence set: Playing use /helplist!
[siteMonitor] Uptime sampling enabled for Zen every 5 min.
[reminders] Dispatcher enabled (checking every 15s).
[moderation] Temporary-ban scheduler enabled (checking every 30s).
```

## Development

```bash
npm test
npm run dev
```

The test suite uses the built-in Node.js test runner and covers command loading, guild resolution, tic-tac-toe rules, trivia data and refresh rounds, dice notation, choice parsing, timestamp parsing and Discord markup, higher-or-lower, hangman and blackjack rules, ship scores, facts, compliments, ratings, number-guess rules, reaction bands, level math and persistence, level-up coin rewards, level reward configuration and assignment, all rank-card themes, channel-lock restoration, soft-ban ordering, admin coin grants, changelog release notes, help tabs, language catalogs and per-server settings, uptime aggregation, poll voting and persistence, reminder parsing/delivery/cancellation, moderation durations and scheduled unbans, warning persistence, purge filtering and slowmode formatting, audit-log configuration and delivery, greeting templates and delivery, slots, jokes, would-you-rather voting, roasts, word scramble rounds, fortune cookies, conversation topics, memory sequences, typing races, Type Race personal-best persistence and ranking, social actions, social-media feed parsing, image feed parsing, caption rendering, Reddit card parsing, coin wagers, blackjack bets, vault heists, economy leaderboards, calculator parsing, xkcd selection, ChatGPT response parsing, moderation, errors and quotas, TikTok link parsing, metadata mapping and download limits, weather geocoding and forecast mapping, Wikipedia search and summary parsing, presence payloads, bot-list payloads and embed limits. GitHub Actions runs it on Node 20 and 22.

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
├── deploy-commands.js           # Registers one command scope and clears duplicates
├── handlers/
│   ├── commandHandler.js        # Recursively loads src/commands/**/*.js
│   └── eventHandler.js          # Binds src/events/*.js to the client
├── events/
│   ├── ready.js                 # Presence, uptime monitor, reminders, moderation, bot lists
│   ├── guildMemberAdd.js        # Sends the configured welcome message
│   ├── guildMemberRemove.js     # Sends the configured leave message
│   ├── interactionCreate.js     # Routes slash commands and components
│   └── messageCreate.js         # Chat XP, coins, cooldowns and level-up announcements
├── lib/
│   ├── blackjack.js             # Cards, hand values and dealer rules
│   ├── botLists.js              # Optional top.gg / Discord Bot List stats
│   ├── calculator.js           # Safe arithmetic parser for /calculate
│   ├── caption.js              # Local caption renderer and style choices
│   ├── cardThemes.js           # Rank card theme catalog, prices and palettes
│   ├── channelLocks.js         # Saved channel locks and previous permission state
│   ├── changelog.js             # Versioned release notes
│   ├── chatgpt.js               # OpenAI moderation, Responses API and error mapping
│   ├── choices.js               # /choose parsing and random pick
│   ├── config.js                # Environment-backed site and presence settings
│   ├── dice.js                  # Dice notation parsing and rolling
│   ├── economy.js              # Wallets, work, daily and level-up rewards, wagers and shop
│   ├── economyGames.js         # Coin-flip and slot payout rules
│   ├── embeds.js                # Shared palette, branding and embed builder
│   ├── fortunes.js              # Fortune-cookie bank and lucky numbers
│   ├── fun.js                   # Ship scores and the offline fact bank
│   ├── greetingCommand.js       # Shared /welcome and /leave command builder
│   ├── greetings.js             # Greeting templates, storage and member events
│   ├── guessNumber.js           # Number-guess rules and attempt limits
│   ├── jokes.js                 # Offline joke bank and random picker
│   ├── guilds.js                # Cache-safe guild resolution for commands
│   ├── hangman.js               # Word list, guesses and ASCII gallows
│   ├── help.js                  # Tabbed command directory and category metadata
│   ├── i18n.js                  # Per-server language store and English/German catalog
│   ├── higherlower.js           # Higher-or-lower number rules
│   ├── images.js                # Size selector / download button helpers
│   ├── imageFeeds.js            # Cat, dog, animal meme and styled meme helpers
│   ├── levels.js                # Per-server XP, level maths and persistence
│   ├── levelRewards.js          # Per-server reward roles and safe assignment
│   ├── memory.js                # Symbol sequences and step rules
│   ├── moderation.js            # Durations, hierarchy checks and scheduled unbans
│   ├── moderationLogs.js        # Audit-log channel settings and delivery
│   ├── moderationTools.js       # Purge filtering, deletion and slowmode labels
│   ├── rankCard.js              # Canvas rank-card renderer
│   ├── redditCard.js            # Reddit thread feed parser and canvas card renderer
│   ├── reaction.js              # Reaction-time rating bands
│   ├── polls.js                 # Persistent button-poll state
│   ├── presence.js              # Playing rich presence and periodic refresh
│   ├── reminders.js             # Persistent reminders and dispatcher
│   ├── siteAutoRefresh.js       # Persisted auto-refresh subscriptions
│   ├── siteHistory.js           # Uptime samples, summaries and daily buckets
│   ├── siteMonitor.js           # Background site probe
│   ├── slots.js                 # Weighted slot symbols and result rules
│   ├── social.js                # Social action lines and definitions
│   ├── socialCommand.js         # Shared /hug, /pat and /highfive builder
│   ├── socialMedia.js           # Bluesky, Reddit and YouTube feed helpers
│   ├── tictactoe.js             # Board rules and bot move selection
│   ├── tiktok.js                # TikTok link parsing, metadata and capped downloads
│   ├── typerace.js              # Phrases, matching and WPM scoring
│   ├── typeraceLeaderboard.js   # Per-server Type Race personal bests
│   ├── warnings.js              # Per-server warning persistence
│   ├── weather.js               # Open-Meteo geocoding, WMO labels and forecast mapping
│   ├── wikipedia.js             # Wikipedia search, summaries and fallbacks
│   ├── xkcd.js                  # Random xkcd comic lookup
│   ├── timestamps.js            # Discord timestamp parsing and styles
│   ├── topics.js                # Conversation starters and themes
│   ├── trivia.js                # Offline trivia question bank
│   ├── wordScramble.js          # Word bank, scrambling and choice rounds
│   └── wyr.js                   # In-memory would-you-rather rounds
└── commands/
    ├── economy/
    │   ├── balance.js
    │   ├── blackjack.js
    │   ├── buy.js
    │   ├── coinbet.js
    │   ├── daily.js
    │   ├── ecoleaderboard.js
    │   ├── shop.js
    │   ├── slotsbet.js
    │   ├── steal.js
    │   └── work.js
    ├── fun/
    │   ├── 8ball.js
    │   ├── choose.js
    │   ├── compliment.js
    │   ├── fact.js
    │   ├── fortunecookie.js
    │   ├── joke.js
    │   ├── meme.js
    │   ├── rate.js
    │   ├── roast.js
    │   ├── roll.js
    │   ├── ship.js
    │   └── topic.js
    ├── images/
    │   ├── animalmeme.js
    │   ├── caption.js
    │   ├── cat.js
    │   ├── dog.js
    │   ├── memegen.js
    │   ├── redditcard.js
    │   └── xkcd.js
    ├── levels/
    │   ├── leveladmin.js
    │   ├── levelinfo.js
    │   ├── levelreward.js
    │   ├── levels.js
    │   └── rank.js
    ├── moderation/
    │   ├── ban.js
    │   ├── grantcoins.js
    │   ├── removecoins.js
    │   ├── kick.js
    │   ├── language.js
    │   ├── lock.js
    │   ├── modlog.js
    │   ├── mute.js
    │   ├── purge.js
    │   ├── slowmode.js
    │   ├── softban.js
    │   ├── unban.js
    │   ├── unlock.js
    │   ├── unmute.js
    │   ├── warn.js
    │   └── warnings.js
    ├── minigames/
    │   ├── coinflip.js
    │   ├── guessnumber.js
    │   ├── hangman.js
    │   ├── higherlower.js
    │   ├── memory.js
    │   ├── reaction.js
    │   ├── rps.js
    │   ├── slots.js
    │   ├── tictactoe.js
    │   ├── trivia.js
    │   ├── typerace.js
    │   ├── typeraceleaderboard.js
    │   ├── wordscramble.js
    │   └── wouldyourather.js
    ├── social/
    │   ├── bluesky.js
    │   ├── highfive.js
    │   ├── hug.js
    │   ├── pat.js
    │   ├── reddit.js
    │   ├── tiktok.js
    │   └── youtube.js
    └── utility/
        ├── avatar.js
        ├── botinfo.js
        ├── calculate.js
        ├── changelog.js
        ├── chatgpt.js
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
        ├── weather.js
        ├── welcome.js
        └── wikipedia.js
```

Helper scripts:

- `scripts/deploy-local.js` syncs the checkout, registers commands and restarts PM2.
- `scripts/health-check.js` waits for PM2 to report the bot online with a fresh Discord login, then verifies that `DISCORD_TOKEN` belongs to that bot. Run `npm run health` after logon or a restart; it exits `1` when the bot is unhealthy.
- `scripts/reset-progression.js` previews every XP record and wallet in both progression files; add `--confirm` to back them up and clear all servers at once.
- `scripts/health-check-task.cmd` is the logon wrapper used by the `Zen Bot Health (Freebuff)` scheduled task; it runs the check one minute after sign-in and appends failures to `logs/health-failures.log`.
- `scripts/watchdog.js` runs the health check every five minutes and restarts the PM2 app after **two consecutive failures**. The `Zen Bot Watchdog (Freebuff)` scheduled task runs `scripts/watchdog-task.cmd`; events go to `logs/watchdog.log` and early failures to `logs/watchdog-task.log`.
- `scripts/release-notes.js` renders a changelog entry for a GitHub release.
- `scripts/render-branding.js` rasterises the branding SVGs into the tracked PNG sizes with `npm run branding`.
- `scripts/autostart-pm2.vbs` restores the saved PM2 process list at Windows logon.

## Data and privacy

The bot stores only what it needs to provide its features:

- Uptime samples in `data/sitestatus-history.json` (timestamp, success, HTTP status, latency, error code).
- Auto-refresh subscriptions in `data/sitestatus-autorefresh.json` (message, channel and owner IDs, interval, next run).
- Poll state in `data/polls.json` (question, options, voter user IDs, owner, timestamps).
- Reminders in `data/reminders.json` (user, source channel, reminder text, due time and delivery preference).
- Level records in `data/levels.json` (server and user IDs, display name, XP and last award time).
- Level reward roles in `data/level-rewards.json` (server ID, role ID and required level).
- Economy wallets in `data/economy.json` (server and user IDs, coin balance, daily, work and steal timestamps, owned theme IDs and equipped theme).
- The chosen bot language in `data/languages.json` (server ID, language, who changed it and when).
- Channel locks in `data/channel-locks.json` (server and channel IDs, the previous **@everyone** SendMessages state, moderator, reason and lock time).
- Scheduled temporary bans in `data/moderation.json` (server and user IDs, username, moderator ID, reason and unban time).
- Audit-log channel IDs in `data/moderation-logs.json` (server and channel IDs, the admin who configured it and the update time).
- Welcome and leave settings in `data/greetings.json` (server and channel IDs, templates and the admin who last changed them).
- Type Race personal bests in `data/typerace.json` (server and user IDs, display name, best time, WPM, phrase and timestamp).
- ChatGPT prompts are sent to OpenAI for moderation and generation; Zen does not store them or keep conversation history. OpenAI’s own data controls apply.
- Guild and member totals are sent to top.gg and Discord Bot List only when the matching token is set.
- TikTok links are processed in memory only; no video, metadata or link history is stored.
- Weather privacy preferences in `data/weather-preferences.json` (Discord user IDs with private mode enabled); weather locations, Wikipedia searches and returned metadata are processed in memory only, with no search history stored.

No message content is read or stored. Deleting the matching JSON file resets that feature; deleting the `data/` folder resets everything. Poll voter IDs, reminder text and moderation reasons can be removed by deleting the relevant data files.

To reset only chat progression, stop the bot and run `npm run reset:progression` to preview the counts. Re-run it with `--confirm` to write timestamped backups beside `data/levels.json` and `data/economy.json`, then clear every server’s XP and wallets. Server settings, reward-role configuration, moderation history, reminders and other data are untouched.

## Deployment notes

- Run the bot as a long-lived Node.js process with a persistent disk. Serverless platforms without a writable filesystem will lose poll, reminder, uptime, level, scheduled-ban and Type Race best state.
- Trivia, tic-tac-toe, Higher or Lower, hangman, blackjack, Guess the Number, Reaction, Memory, Type Race and Would You Rather rounds are in memory and intentionally reset when the process restarts. Welcome, leave and audit-log settings persist in `data/`, and Type Race personal bests persist in `data/typerace.json`.
- Do not commit `.env`, logs or `data/*.json`.
- Pushing a tag that matches `package.json` (for example `v1.19.0-beta.13`) runs `.github/workflows/release.yml`, tests the tree and publishes a GitHub release from the matching changelog entry. Beta tags are marked as pre-releases.
- For a public bot, register commands globally and configure **Public Bot** and **Requires OAuth2 Code Grant** in the Developer Portal.
- Set `TOPGG_TOKEN` / `DISCORDBOTLIST_TOKEN` after a directory listing is approved; stats post on startup and every 30 minutes.
- `/tiktok` needs outbound HTTPS access to TikTok and `www.tikwm.com`. It posts the video as an attachment, so the host must allow uploads up to **8 MB**.
- `/weather` and `/wikipedia` need outbound HTTPS access to Open-Meteo and Wikipedia.
- `/chatgpt` requires `OPENAI_API_KEY` and outbound HTTPS access to `api.openai.com`. Without a key the command replies with setup instructions; the key is read server-side only.
- Enable the privileged **Server Members** intent in the Developer Portal; without it, welcome and leave events do not fire. Message content is never requested.

## Troubleshooting

- **Commands not showing up** — run `npm run deploy` and wait for global propagation, or use `npm run deploy:guild` with `GUILD_ID` for an instant single-server scope.
- **Every command appears twice** — both global and guild registrations exist. Run `npm run deploy`; it clears the guild copies before registering the single global set.
- **`401 Unauthorized`** — the token is wrong or has been reset.
- **`Missing Access` / `Unknown Guild` during deploy** — the bot is not in the guild, or `GUILD_ID` is incorrect.
- **Logo missing from `/sitestatus`** — `SITE_LOGO_URL` is blank or the remote image could not be downloaded. The rest of the report still works.
- **Reminder not delivered** — check that the bot can DM the user or still has access to the original channel. Closed DMs fall back to that channel.
- **Meme fetch fails** — the command automatically falls back to Imgflip; if both APIs are down it replies with a friendly error.
- **TikTok posts only a cover and link** — the video is private, region-locked, over the **8 MB** upload limit, or TikTok's media CDN refused the download. The metadata service is unofficial, so retry later; check that the host can reach TikTok and `www.tikwm.com`.
- **Weather or Wikipedia fails** — both commands need outbound HTTPS access. Open-Meteo may not resolve very small places; try a nearby city. Wikipedia occasionally rate-limits anonymous requests, so retry in a moment.
- **`/chatgpt` says it is not configured** — add `OPENAI_API_KEY` to `.env` and restart. If the key is valid but the model is unavailable, set `OPENAI_MODEL` to another Responses-compatible model and redeploy.
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
