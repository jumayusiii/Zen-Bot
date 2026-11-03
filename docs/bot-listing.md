# Releasing Zen on Discord bot lists

Last verified: **3 November 2026** · Zen **1.19.0-beta.4** · **92 slash commands**

Public guide: https://site-e6edf6fc47c8417fbd4cd9fc08cf507d.freebuff.page

This is the complete launch playbook for getting Zen discovered: pre-flight fixes,
the directories worth submitting to, ready-to-paste listing copy, stats APIs,
vote webhooks, and the mistakes that get bots declined.

> [!IMPORTANT]
> **Zen currently has OAuth2 code grant enabled.** The Discord application API
> reports `bot_require_code_grant: true`. Most bot lists require a public,
> invitable bot, and top.gg explicitly asks you to turn code grant off when you
> are not using it. Fix this **before** submitting:
> **Developer Portal → your app → Bot → Authorization Flow → Requires OAuth2
> Code Grant → Off**. Then wait about 30 minutes before retrying an invite.

## 1. Release readiness

| Check | Zen status | Action |
| --- | --- | --- |
| Bot is public | ✅ `bot_public: true` | None |
| OAuth2 code grant | ❌ enabled | Turn it off in the Developer Portal |
| Bot is online during review | ✅ PM2 process `zen-bot` | Keep the host running |
| Slash commands are registered | ✅ 92 | `npm run deploy` after command changes |
| Invite requests Administrator | ✅ no | Keep permissions at `1099780180998` |
| Help entry point | ✅ `/helplist` | Mention it in reviewer notes |
| NSFW content on listing | ✅ none | Keep the listing SFW |
| Vote-locked commands | ✅ none | Do not gate most commands |
| Icon | ✅ 1024×1024 | `assets/branding/zen-avatar-1024.png` |
| Banner | ✅ 1500×600 | `assets/branding/zen-banner-1500x600.png` |
| Public privacy policy URL | ✅ live in this guide | Use the [privacy section](https://site-e6edf6fc47c8417fbd4cd9fc08cf507d.freebuff.page/#privacy) |
| Support URL | ✅ GitHub Issues | Add a support server if you have one |
| Directory stats tokens | ❌ not configured | Add tokens after approval |
| Vote webhooks | ❌ not implemented | Optional; add only if rewarding votes |
| top.gg listing | ❌ not submitted | Submit after the code-grant fix |
| Discord Bot List | ✅ live at old slug | Update the copy and display name |

The only hard blocker is **code grant**. The public privacy URL is live in this
guide, so everything else can ship today.

## 2. What the directories actually are

Discord directories fall into three groups:

1. **Discovery and votes** — top.gg, Discord Bot List, Discords.com and
   botlist.me rank bots by votes and drive the most new users.
2. **Stats and credibility** — Discord Bots (bots.gg), Bots on Discord and the
   BotBlock long tail mainly provide a profile, a server-count widget and a
   backlink.
3. **Server lists** — DISBOARD and Discord Me are primarily for communities, not
   bots. DISBOARD has no bot-submission path. Discord Me has a small bot section
   but should be a low priority.

**Do not use old tutorials blindly.** Many lists that still appear in blog posts
are dead: `discord.boats`, `bladelist.gg`, `discordbots.co`,
`discordlist.space`, `discordbotindex.com`, `listcord.gg`, `fateslist.xyz`,
`wonderbotlist.com`, `topcord.xyz`, `paradisebots.net`, `discord.services`,
`discordapps.dev`, `divinediscordbots.com` and `botlist.co`. BotBlock maintains
the current active/defunct registry at <https://botblock.org/lists>.

## 3. Priority list

### Tier 1 — submit these first

| Priority | Directory | Submit | Login | Stats API | Votes |
| --- | --- | --- | --- | --- | --- |
| 1 | [top.gg](https://top.gg/) | [top.gg/bot/new](https://top.gg/bot/new) | Discord OAuth | v1 `PATCH /api/v1/projects/@me/metrics`; Zen uses legacy v0 `POST /api/bots/:id/stats` | ✅ vote webhook |
| 2 | [Discord Bot List](https://discordbotlist.com/) | [discordbotlist.com/bots/add](https://discordbotlist.com/bots/add) | Discord OAuth | `POST /api/v1/bots/:id/stats` | ✅ 12-hour votes + webhook |
| 3 | [Discord Bots](https://discord.bots.gg/) | [discord.bots.gg](https://discord.bots.gg/) → Add Bot | Discord OAuth | `POST /api/v1/bots/:id/stats` | No voting |
| 4 | [Discords.com](https://discords.com/bots) | [discords.com/bots](https://discords.com/bots) → Add Bot | Discord OAuth | `POST https://botsfordiscord.com/api/bot/:id` | ✅ reviews/votes |
| 5 | [Bots on Discord](https://bots.ondiscord.xyz/) | [bots.ondiscord.xyz](https://bots.ondiscord.xyz/) → Add Bot | Discord OAuth | `POST /bot-api/bots/:id/guilds` | ✅ reviews; webhook support |
| 6 | [botlist.me](https://botlist.me/) | [botlist.me](https://botlist.me/) → Add Bot | Discord OAuth | `POST https://api.botlist.me/api/v1/bots/:id/stats` | ✅ 12-hour votes + webhook |

### Tier 2 — worthwhile secondary listings

| Directory | URL | Notes |
| --- | --- | --- |
| Discord Me | <https://discord.me/bots> | Mostly a server directory; low-priority bot section |
| discordlist.gg | <https://discordlist.gg/> | BotBlock-tracked |
| voidbots.net | <https://voidbots.net/> | BotBlock-tracked |
| Discord Extreme List | <https://discordextremelist.xyz/> | BotBlock-tracked |
| YABL | <https://yabl.xyz/> | BotBlock-tracked |
| TopBot | <https://topbot.gg/> | BotBlock-tracked |
| The Discord List | <https://thediscordlist.com/> | BotBlock-tracked |
| Disforge | <https://disforge.com/> | BotBlock-tracked |
| DList | <https://dlist.space/> | BotBlock-tracked |
| VCodes | <https://vcodes.xyz/> | BotBlock-tracked |
| Omniplex | <https://omniplex.gg/> | BotBlock-tracked |
| Radarcord | <https://radarcord.net/> | BotBlock-tracked |
| JustDiscord | <https://justdiscord.org/> | BotBlock-tracked |
| Fluxpoint | <https://discover.fluxpoint.dev/> | BotBlock-tracked |
| Stellar Bot List | <https://stellarbotlist.com/> | BotBlock-tracked; no BotBlock API support |
| Disq | <https://disq.ink/> | BotBlock-tracked |
| Discord Place | <https://discord.place/> | BotBlock-tracked |
| Cybralist | <https://cybralist.com/> | BotBlock-tracked |
| Carbonitex | <https://carbonitex.net/> | BotBlock-tracked |

Do **not** submit to DISBOARD as a bot. Its public site and guidelines are for
servers, and there is no bot-submission path. Use DISBOARD to promote a support
server, not the bot.

## 4. Zen's listing kit

### Facts

| Field | Value |
| --- | --- |
| Name | Zen |
| Application ID | `1564936469305364480` |
| Version | `1.19.0-beta.4` |
| Status | Public beta |
| Prefix | Slash commands only (`/`) |
| Library | discord.js v14 · JavaScript · Node.js |
| Commands | 92 |
| Invite | `https://discord.com/oauth2/authorize?client_id=1564936469305364480&permissions=1099780180998&scope=bot%20applications.commands` |
| Source | <https://github.com/jumayusiii/Zen-Bot> |
| Support | <https://github.com/jumayusiii/Zen-Bot/issues> |
| Directory page | <https://discordbotlist.com/bots/juma-habbo> |
| Help | `/helplist` |

### Short description

**Under 140 characters** — use this on top.gg and as the default short field:

```text
Memes, minigames, levels, economy, moderation and live social feeds — 92 clean slash commands for your server.
```

Alternative, 115 characters:

```text
A friendly all-in-one Discord bot with memes, games, levels, economy, moderation and live feeds. 92 slash commands.
```

Do not pad this field with keywords. top.gg lists keyword stuffing as a
rejection reason.

### Long description

Paste this into top.gg, Discord Bot List, bots.gg and any directory that supports
Markdown:

```markdown
**Zen** is a friendly, slash-command-only Discord bot that keeps a community fun,
social and tidy without reading message content.

### Fun and games
- Memes, animal memes, xkcd comics, editable memes, cat and dog photos.
- Trivia, tic-tac-toe, blackjack, hangman, Higher or Lower, word scramble, memory,
  slots, reaction tests, number guessing and typing races.
- Live would-you-rather votes, polls, reminders, timestamps and quick decisions.

### Levels and economy
- Chat XP with rendered rank cards, server rank, progress and a top-ten
  leaderboard.
- Ten card themes: Aurora, Sunset, Ocean, Forest, Midnight, Candy, Sakura,
  Cyber, Ember and Frost.
- A beta per-server economy with `/daily` streaks, `/work` shifts, level-up payouts,
  `/steal` heists, coin wagers and blackjack bets, a theme shop, an inventory and
  admin-only `/grantcoins`.

### Moderation and community
- Timed mutes, temporary and permanent bans, kicks, soft bans, warnings, purge,
  slowmode, channel locks and unlocks.
- Configurable `/modlog` audit channel and a full permission/role-hierarchy
  check before every action.
- `/welcome` and `/leave` with custom templates and test previews.

### Images, social and knowledge
- Live `/bluesky`, `/reddit`, `/youtube` and `/tiktok` lookups.
- `/weather` forecasts from Open-Meteo, `/wikipedia` summaries, `/xkcd` comics and
  a `/calculate` maths parser.
- `/sitestatus` and `/uptime` for website monitoring, TLS, DNS, headers and
  incident history.

### Built for clean servers
- 92 slash commands, no prefix and no message-content access.
- Persistent polls, reminders, levels, warnings, greetings, channel locks and
  uptime history.
- Optional beta `/chatgpt`; works only when the owner configures an OpenAI key,
  and Zen does not store prompts.

**Try it:** add Zen, run `/helplist`, then try `/rank`, `/cat`, `/animalmeme`,
`/weather Tokyo`, `/wikipedia Jupiter`, `/typerace` or `/sitestatus`.

**Source and issues:** [GitHub](https://github.com/jumayusiii/Zen-Bot) ·
[Report a bug](https://github.com/jumayusiii/Zen-Bot/issues)
```

### Categories and tags

Use the closest available matches; do not add a tag the bot does not satisfy.

```text
Fun, Games, Leveling, Moderation, Memes, Social, Utility, Economy, Community, Images, Website
```

- **Languages:** English.
- **Prefix:** `/` (slash commands only).
- **NSFW:** off.
- **Help command:** `/helplist`.

### Reviewer note

Paste this into the private reviewer-notes field:

```text
Zen is slash-command only. Start with /helplist for the full 92-command directory.
No Administrator permission is requested.

Good quick tests:
/rank (after a few messages), /cat, /animalmeme, /weather Tokyo,
/wikipedia Jupiter, /typerace, /slots, /poll, /sitestatus.

/chatgpt is optional and may reply with setup instructions if OPENAI_API_KEY is
not configured; every other public command works without it.

Moderation commands require Discord permissions and role hierarchy, so they may
be unavailable in the review server. No message content is read. The Server
Members intent is used only for welcome/leave events. The bot will stay online
during review.
```

### Asset checklist

| Asset | File | Size |
| --- | --- | --- |
| App icon / avatar | `assets/branding/zen-avatar-1024.png` | 1024×1024 |
| Small avatar | `assets/branding/zen-avatar-512.png` | 512×512 |
| Banner | `assets/branding/zen-banner-1500x600.png` | 1500×600 |
| Compact banner | `assets/branding/zen-banner-750x300.png` | 750×300 |

Use the 1024 avatar for directory pages and the 1500×600 banner for social cards.
If a directory asks for a square icon, use the 1024 file; if it asks for a wide
banner, use the 1500×600 file.

### Privacy policy

Use this as the public privacy-policy page or link to this section. It matches
Zen's data handling:

```text
Zen stores only the data needed for its features. That can include Discord
server, channel and user IDs, display names, XP and coin balances, owned card
themes, warnings and moderation settings, audit-log channel IDs, polls, reminder
text, greeting templates, uptime samples, Type Race bests and channel-lock
restore state.

Zen does not read or store message content. The Server Members intent is used
only for welcome and leave events. /chatgpt sends the prompt to OpenAI only when
that command is used; Zen does not store prompts or conversation history. Poll
votes, profile settings and other feature data are stored on the bot owner's
host in local JSON files. Removing the relevant file resets that feature;
removing data/ resets everything.

For privacy requests or data deletion, open an issue at
https://github.com/jumayusiii/Zen-Bot/issues.
```

## 5. top.gg — full submission

1. Sign in at <https://top.gg> with Discord, then open <https://top.gg/bot/new>.
2. Paste the **Application ID** `1564936469305364480` and select **Find Bot**.
3. Confirm the bot is public and code grant is **off**. If you just changed it,
   wait about 30 minutes.
4. Paste the **short description** from section 4 (under 140 characters).
5. Paste the **long description** (Markdown is supported).
6. Set **Prefix** to `/`. A wrong prefix is a rejection reason.
7. Add the tags from section 4. top.gg allows up to 12 categories; type the name
   and press Enter. Do not include `#`.
8. Set **Languages** to English.
9. Use the invite URL from section 4. Do not add Administrator.
10. Set **Support URL** to <https://github.com/jumayusiii/Zen-Bot/issues>, or a
    never-expiring support-server invite if you have one.
11. Add GitHub, website and privacy links. The GitHub URL is
    <https://github.com/jumayusiii/Zen-Bot>.
12. Paste the **reviewer note** from section 4.
13. Tick the confirmation that the bot must stay online during review, and
    submit.

### What happens next

- Reviews are a chronological volunteer queue. The published expectation is
  **around a week or more**, depending on volume.
- Reviewers read the page, invite the bot to the Verification Center server
  (`333949691962195969`) with **permissions 0**, test the commands, then approve
  or decline.
- Notifications arrive by email, a Discord ping in the top.gg server, and
  sometimes a DM. Join the top.gg Discord so you do not miss a decline.
- Disputes go through `#staff-tickets`.
- Three declines for the **same reason** trigger a warning; the next same-reason
  decline can block you from submitting. Fix the issue before resubmitting.

### After approval

1. Open the project dashboard → **Integrations & API** (or the dashboard's
   integrations page) and copy the token.
2. Add it to the host's `.env`:
   ```dotenv
   TOPGG_TOKEN=
   ```
3. Restart the bot. Zen posts guild counts immediately and every 30 minutes.
4. Look for:
   ```text
   [botLists] top.gg: stats posted (HTTP 200).
   ```

Zen's current integration uses top.gg's legacy stats endpoint
`POST https://top.gg/api/bots/:id/stats` with a raw token and
`{"server_count": N}`. The newer v1 API uses
`PATCH https://top.gg/api/v1/projects/@me/metrics` with
`Authorization: Bearer ...` and `{"server_count": N}`. If your dashboard only
issues a v1 token, update `src/lib/botLists.js` before adding the token.

A vote webhook is optional. Zen does not currently expose an HTTP webhook
endpoint; if you reward votes later, follow the signature and idempotency rules
in section 8.

## 6. Discord Bot List — full submission

Zen already has a live listing at
<https://discordbotlist.com/bots/juma-habbo>. The public slug stays `juma-habbo`;
change the display name to **Zen** and replace the old copy.

1. Sign in at <https://discordbotlist.com> with the owner's Discord account.
2. Open <https://discordbotlist.com/bots/juma-habbo/edit>, or
   <https://discordbotlist.com/bots/add> for a new bot.
3. Set the name to **Zen**, the prefix to `/`, the help command to `/helplist`
   and the tags from section 4.
4. Paste the short and long descriptions.
5. Add the GitHub repository, issues page and invite URL.
6. Keep the listing SFW.
7. Save and open the public page to confirm the copy.

### Stats

1. Open the bot's admin page.
2. Choose **Generate Token**.
3. Add it to `.env`:
   ```dotenv
   DISCORDBOTLIST_TOKEN=
   ```
4. Restart and look for:
   ```text
   [botLists] Discord Bot List: stats posted (HTTP 200).
   ```

Zen posts `{"guilds": N, "users": M}` to
`POST https://discordbotlist.com/api/v1/bots/:id/stats` with the raw token.

### Votes

Discord Bot List uses a 12-hour vote window. If you add rewards, configure the
webhook URL and secret on the **Edit Bot** page. The request carries the secret
in the `Authorization` header and a body like:

```json
{ "admin": false, "avatar": "hash", "username": "name", "id": "user_id" }
```

Return `2xx` quickly, verify the secret, and treat repeat deliveries
idempotently. A polling fallback exists at
`GET /api/v1/bots/:id/upvotes`.

## 7. The second tier

These are worth doing after top.gg and Discord Bot List are approved.

### Discord Bots (bots.gg)

- Submit at <https://discord.bots.gg/> (Discord login).
- Stats endpoint: `POST https://discord.bots.gg/api/v1/bots/:id/stats`
  with `{"guildCount": N}`. It supports `shardId` and `shardCount` properly.
- No voting or vote webhook. This is a credibility and discovery listing.
- Zen does not currently post here; add a small target in `src/lib/botLists.js`
  if you want its count widget live.

### Discords.com / Bots for Discord

- Start at <https://discords.com/bots> and choose Add Bot.
- Stats endpoint: `POST https://botsfordiscord.com/api/bot/:id` with
  `{"server_count": N}`.
- Reviews/votes and vote webhooks are supported. The site is JavaScript-heavy;
  use the page's Add Bot flow rather than guessing a direct form URL.

### Bots on Discord

- Submit at <https://bots.ondiscord.xyz/>.
- Stats endpoint: `POST https://bots.ondiscord.xyz/bot-api/bots/:id/guilds`
  with `{"guildCount": N}`.
- Rate limit is strict: **2 requests per 4 minutes per bot**.
- Updating stats for a bot that is not approved returns `404`.
- Reviews and vote webhooks are supported.

### botlist.me

- Start at <https://botlist.me/>.
- Stats endpoint: `POST https://api.botlist.me/api/v1/bots/:id/stats` with
  `{"server_count": N}`. It supports `shard_count`.
- Votes use a 12-hour window. Vote webhook body:
  `{ "bot": "...", "user": "...", "type": "Upvote" }`, with the secret in the
  `Authorization` header.

### Discord Me

Treat this as a low-priority server-directory placement. The site is primarily
communities and paid placement, and its bot section is incidental. Do not spend a
premium budget here before the Tier 1 and Tier 2 listings are done.

## 8. Stats, votes and BotBlock

### Current Zen behavior

Zen only posts stats when a token is present. With neither token configured it
logs:

```text
[botLists] No list tokens configured; stats sync is off.
```

With tokens it posts immediately and then every 30 minutes, logging HTTP status
per service. A failed post is logged and never stops the bot. Tokens are read
server-side only and must stay in `.env`.

If you list on more than two directories, use **BotBlock** instead of writing a
separate client for every site:

- Registry and feature matrix: <https://botblock.org/lists>
- API: `POST https://botblock.org/api/count` with `server_count`, `bot_id` and
  each list's key.
- Rate limit: one successful request per 120 seconds.
- The response separates `success` and `failure` per list, which is exactly what
  you want for alerting.

Do not send tokens to the browser, commit them to the repository, or paste them
into Discord. Rotate a token immediately if it leaks.

### Vote webhooks

Vote webhooks are only worth adding if you reward voters. If you do:

- Accept `POST` and read the **raw body** before JSON parsing.
- Return `2xx` within **5 seconds**; queue any slow work.
- Verify the signature or secret before trusting the payload.
  - top.gg v1 uses `x-topgg-signature: t=...,v1=...` with HMAC-SHA256 over
    `{timestamp}.{rawBody}`.
  - Discord Bot List uses the configured secret in the `Authorization` header.
  - botlist.me uses its configured `Authorization` header.
- Deduplicate by user and vote window. Top.gg and Discord Bot List both use a
  **12-hour** window.
- Reward only after a verified, first-time vote.
- Provide an opt-out for vote reminders.
- Never auto-vote or buy votes.

Zen does not currently have a webhook HTTP server. Adding one is a separate
feature; do not expose the bot's Discord token as a webhook secret.

## 9. Review rules that get bots declined

These are the highest-value checks from top.gg's published guidelines:

1. **Bot is offline, private or has code grant on.** Keep it online and
   invitable throughout review.
2. **Wrong prefix.** Zen is `/`, not a text prefix.
3. **Requires Administrator.** Not allowed. Zen's invite does not request it.
4. **No clear entry point.** `/helplist` is Zen's. Put it in the listing.
5. **Vote-locking most commands.** Keep this to no more than 3–5 commands, or do
   not vote-lock at all.
6. **Owner commands not locked.** Zen has no public eval/status command.
7. **Unmodified fork or duplicate clone.** Do not list the same codebase as
   multiple bots.
8. **Keyword-stuffed short description.** Use the provided copy.
9. **Advertising other bot lists or unrelated servers.** Keep the listing about
   Zen.
10. **NSFW in the name, avatar, banner or description.** Keep the page SFW.
11. **DM features without disclosure or opt-out.** Zen does not DM members
    except warning notices and reminder delivery; mention this in the privacy
    policy.
12. **Asking for usernames, passwords or tokens.** Never do this.
13. **Premium commands without reviewer access.** If you add premium features,
    put a reviewer key or test-server whitelist in the reviewer note.
14. **Broken buttons or links.** Test every listing link after saving.

Three declines for the same reason can lead to a platform block. Fix first,
resubmit second.

## 10. Launch checklist

### Before submitting

- [ ] Turn **Requires OAuth2 Code Grant** off.
- [ ] Confirm the bot is public and invitable.
- [ ] Deploy all 92 slash commands: `npm run deploy`.
- [ ] Confirm `/helplist` works from a clean account.
- [ ] Publish a public privacy-policy URL.
- [ ] Check the support URL and invite URL.
- [ ] Prepare the 1024 icon and 1500×600 banner.
- [ ] Copy the short description, long description, tags and reviewer note.
- [ ] Confirm no NSFW, no Administrator request and no vote-locking.
- [ ] Keep the bot online for the whole review.

### Submit

- [ ] top.gg: <https://top.gg/bot/new>
- [ ] Discord Bot List: update <https://discordbotlist.com/bots/juma-habbo/edit>
- [ ] bots.gg: <https://discord.bots.gg/>
- [ ] Discords.com: <https://discords.com/bots>
- [ ] Bots on Discord: <https://bots.ondiscord.xyz/>
- [ ] botlist.me: <https://botlist.me/>
- [ ] Pick 2–5 Tier 2 directories from section 3.

### After approval

- [ ] Create the top.gg token and set `TOPGG_TOKEN`.
- [ ] Create the Discord Bot List token and set `DISCORDBOTLIST_TOKEN`.
- [ ] Restart and confirm `[botLists] ... HTTP 200` in the log.
- [ ] Update the GitHub repository homepage with the best listing URL.
- [ ] Add a listing badge to the README if the directory provides one.
- [ ] Recheck the public page on desktop and mobile.
- [ ] Watch reviews/votes and respond without incentivising reviews.

## 11. Zen links and sources

| Link | URL |
| --- | --- |
| Public guide | https://site-e6edf6fc47c8417fbd4cd9fc08cf507d.freebuff.page |
| GitHub | <https://github.com/jumayusiii/Zen-Bot> |
| Issues | <https://github.com/jumayusiii/Zen-Bot/issues> |
| Discord Bot List | <https://discordbotlist.com/bots/juma-habbo> |
| top.gg submission | <https://top.gg/bot/new> |
| BotBlock active lists | <https://botblock.org/lists> |
| BotBlock defunct lists | <https://botblock.org/lists/defunct> |
| top.gg API docs | <https://docs.top.gg/> |
| Discord Bot List API docs | <https://docs.discordbotlist.com/> |

### Sources read for this guide

- <https://support.top.gg/hc/en-us/articles/23135162935708-How-to-Add-Your-Bot>
- <https://support.top.gg/hc/en-us/articles/23135298323996-How-the-Project-Reviewal-Process-Works>
- <https://support.top.gg/hc/en-us/articles/23146912808988-Discord-Bot-Guidelines>
- <https://support.top.gg/hc/en-us/articles/23146974461596-Voting-Guidelines>
- <https://docs.top.gg/>
- <https://docs.top.gg/authentication>
- <https://docs.top.gg/api/v0/bots>
- <https://docs.top.gg/api/v1/projects>
- <https://docs.top.gg/webhooks/overview>
- <https://docs.discordbotlist.com/>
- <https://docs.discordbotlist.com/bot-statistics.md>
- <https://docs.discordbotlist.com/implementing-voting.md>
- <https://docs.discordbotlist.com/vote-webhooks.md>
- <https://botblock.org/lists>
- <https://botblock.org/docs>
- <https://bots.ondiscord.xyz/info/api>
- <https://docs.botlist.me/Webhooks/Vote_Webhooks>
- <https://disboard.org/site/guidelines>

> Directory forms and policies change. The links above were checked on
> **1 November 2026**; if a page is login-gated or has moved, use the directory's
> current Add Bot flow rather than an old direct form URL.
