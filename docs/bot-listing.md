# Discord bot list submission

Ready-to-paste copy for the public beta. Submitting a directory listing is a
signed-in web step, so this file holds the fields, links and the small amount of
setup needed to keep the server count current afterwards.

## Bot facts

| Field | Value |
| --- | --- |
| Name | Zen |
| Application ID | `1564936469305364480` |
| Version | `1.11.0-beta.2` |
| Prefix | Slash commands only (`/`) |
| Library | discord.js v14 · JavaScript · Node.js |
| Invite | `https://discord.com/oauth2/authorize?client_id=1564936469305364480&permissions=1099780180998&scope=bot%20applications.commands` |
| Source | https://github.com/jumayusiii/Juma-Habbo-Bot |
| Support | https://github.com/jumayusiii/Juma-Habbo-Bot/issues |
| Privacy | No message content is read. Member events require the Server Members intent. Poll, reminder, uptime, level, greeting and audit-log state stays on the host. |

## top.gg

1. Sign in at https://top.gg and open https://top.gg/bot/new.
2. Paste the application ID, then fill in the fields below.
3. Keep the bot online while it waits for review.
4. After approval, create an API token at https://top.gg/account/tokens and add
   it to `.env` as `TOPGG_TOKEN`.

The public page will be https://top.gg/bot/1564936469305364480.

### Short description (under 140 characters)

```text
Fun, minigames, levels, moderation with audit logs, polls, TikTok previews and site uptime — all in clean slash commands.
```

### Long description

```markdown
**Zen** is a lightweight Discord bot for fun breaks, a friendlier community and keeping an eye on a website.

### What it does

- **Fun** — memes, Magic 8-Ball, dice, coin flips, rock-paper-scissors, `/ship`, `/fact`, `/joke`, `/compliment`, `/roast` and `/rate`.
- **Media** — `/tiktok` turns a TikTok link into an inline video with creator and engagement details; oversized, private or photo posts fall back to a cover and an **Open on TikTok** link.
- **Minigames** — trivia with five refreshes, button tic-tac-toe, Higher or Lower, hangman, blackjack, number guessing, a reaction test, slots, five-round word scrambles and live would-you-rather votes.
- **Levels** — chat XP with a rendered rank card, server rank, XP progress, a top-ten `/levels` leaderboard and automatic role rewards.
- **Moderation** — timed mutes, persistent temporary bans, kicks and reversals, with permission checks, role-hierarchy protection and a configurable `/modlog` audit channel.
- **Community** — `/welcome` and `/leave` embeds with custom templates, a test preview and clean inline member details.
- **Server tools** — server, user and role info, plus icon, banner and avatar grabbers with size pickers and download buttons.
- **Utilities** — live button polls, persistent reminders, a Discord timestamp builder, `/ping`, tabbed help and an invite link.
- **Monitoring** — `/sitestatus` checks HTTP, TLS, DNS, page metadata and security headers. `/uptime` adds seven-day bars and an incident timeline.

### Try it

1. Add the bot with the invite button.
2. Run `/helplist` to browse every command by tab.
3. Try `/rank` for your card, `/sitestatus` for the monitored site or `/slots` and `/wouldyourather` for a quick round.
4. Configure `/welcome`, `/leave` and `/modlog` to make the server feel finished.

**Help command:** `/helplist`
**Source and issues:** [GitHub repository](https://github.com/jumayusiii/Juma-Habbo-Bot) · [Report an issue](https://github.com/jumayusiii/Juma-Habbo-Bot/issues)

Slash commands only. No prefix and no message content access. Polls, reminders, uptime history, chat levels, scheduled bans, greeting settings and audit-log channels survive restarts. The Server Members intent is used for welcome and leave events.
```

### Categories

`Fun`, `Games`, `Leveling`, `Moderation`, `Utility`, `Website`, `Community`

### Notes for the reviewer

```text
Slash commands only. Try /helplist first for the full 51-command directory,
then /rank for a level card and /slots, /wordscramble, /wouldyourather, /hangman or /blackjack
for a game. /tiktok posts a TikTok video inline; videos over 8 MB fall back to a cover and link. Moderation uses /mute, /kick and /ban behind Discord permissions and
role checks; /modlog records every action in a chosen channel. /welcome and
/leave post configurable join and leave embeds. /sitestatus monitors
https://habbo.gd and /uptime reads its history. Message content is never read.
The Server Members intent is enabled for welcome and leave events.
```

## Discord Bot List

Zen is live at https://discordbotlist.com/bots/juma-habbo. Change the listing's display name to **Zen**; the public URL slug stays `juma-habbo`.

1. Sign in at https://discordbotlist.com with the owner's Discord account and
   open https://discordbotlist.com/bots/juma-habbo/edit.
2. Replace the short and long descriptions using
   [discordbotlist-post.md](discordbotlist-post.md).
3. Set the help command to `/helplist` and keep the tags **Games**, **Utility**,
   **Levelling**, **Fun** and **Meme**.
4. Add the GitHub repository and issues links, then save.
5. Generate an API token on the bot's admin page and add it to `.env` as
   `DISCORDBOTLIST_TOKEN` so the server and user counts update.

The live post carries the earlier copy until the edit is saved. The
ready-to-paste Zen replacement, the exact links and the counts checklist are in
[docs/discordbotlist-post.md](discordbotlist-post.md).

## Keep the count in sync

```dotenv
TOPGG_TOKEN=
DISCORDBOTLIST_TOKEN=
```

Set either token, restart the bot, and it will post the current guild and member
counts immediately and then every 30 minutes. A missing token simply disables
that directory. Tokens are read server-side only; never commit `.env`.

A healthy start logs one of:

```text
[botLists] No list tokens configured; stats sync is off.
[botLists] top.gg: stats posted (HTTP 200).
[botLists] Discord Bot List: stats posted (HTTP 200).
```

## Submission checklist

- [ ] Bot is public in the Discord Developer Portal.
- [ ] **Requires OAuth2 Code Grant** is off under **Bot → Authorization Flow**.
- [ ] **Server Members** is enabled under **Bot → Privileged Gateway Intents**.
- [ ] Global slash commands are deployed with `npm run deploy:global`.
- [ ] The bot will stay online during review.
- [ ] Invite uses `permissions=1099780180998` and the `bot` + `applications.commands` scopes.
- [ ] Source and support links point to the GitHub repository and its issues.
- [ ] top.gg is submitted from https://top.gg/bot/new.
- [ ] The Discord Bot List post is updated from [discordbotlist-post.md](discordbotlist-post.md).
- [ ] Directory tokens are added to `.env` after approval and the bot is restarted.
- [ ] The repository homepage is updated to the live directory page once approved.
