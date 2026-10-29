# Discord bot list submission

Ready-to-paste copy for the public beta. Submitting a directory listing is a
signed-in web step, so this file holds the fields, links and the small amount of
setup needed to keep the server count current afterwards.

## Bot facts

| Field | Value |
| --- | --- |
| Name | Juma Habbo |
| Application ID | `1564936469305364480` |
| Version | `1.7.0-beta.1` |
| Prefix | Slash commands only (`/`) |
| Library | discord.js v14 · JavaScript · Node.js |
| Invite | `https://discord.com/oauth2/authorize?client_id=1564936469305364480&permissions=117760&scope=bot%20applications.commands` |
| Source | https://github.com/jumayusiii/Juma-Habbo-Bot |
| Support | https://github.com/jumayusiii/Juma-Habbo-Bot/issues |
| Privacy | No message content is read. Poll, reminder and uptime state stays on the host. |

## top.gg

1. Sign in at https://top.gg and open https://top.gg/bot/new.
2. Paste the application ID, then fill in the fields below.
3. Keep the bot online while it waits for review.
4. After approval, create an API token at https://top.gg/account/tokens and add
   it to `.env` as `TOPGG_TOKEN`.

The public page will be https://top.gg/bot/1564936469305364480.

### Short description (under 140 characters)

```text
Memes, minigames, polls, reminders and deep site uptime monitoring — all through clean slash commands.
```

### Long description

```markdown
**Juma Habbo** is a lightweight Discord bot for fun breaks, quick decisions and keeping an eye on a website.

### What it does

- **Fun** — memes, Magic 8-Ball, dice, coin flips, rock-paper-scissors and a picker for everyday choices.
- **Minigames** — trivia with five refreshes, button tic-tac-toe and Higher or Lower.
- **Server tools** — server, user and role info, plus icon, banner and avatar grabbers with size pickers and download buttons.
- **Utilities** — live button polls, persistent reminders, a Discord timestamp builder, tabbed help and an invite link.
- **Monitoring** — `/sitestatus` checks HTTP, TLS, DNS, page metadata and security headers. `/uptime` adds seven-day bars and an incident timeline.

### Getting started

1. Add the bot with the invite button.
2. Run `/helplist` to browse every command by tab.
3. Try `/sitestatus` for the monitored site or `/higherlower` for a quick round.

Slash commands only. No prefix and no message content access. Polls, reminders and uptime history survive restarts. Source and issues: https://github.com/jumayusiii/Juma-Habbo-Bot
```

### Categories

`Fun`, `Games`, `Utility`, `Website`, `Community`

### Notes for the reviewer

```text
Slash commands only. Try /helplist first for the full directory, then /higherlower
or /trivia for the button minigames. /sitestatus monitors https://habbo.gd and
/uptime reads its history. No privileged intents or message content access.
```

## Discord Bot List

1. Sign in at https://discordbotlist.com and open https://discordbotlist.com/new.
2. Use the same short and long descriptions, tags and links as above.
3. Generate an API token on the bot's admin page and add it to `.env` as
   `DISCORDBOTLIST_TOKEN`.

The public page will be https://discordbotlist.com/bots/1564936469305364480.

Suggested tags: `fun`, `games`, `utility`, `uptime`, `polls`, `reminders`,
`discord.js`.

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
- [ ] Global slash commands are deployed with `npm run deploy:global`.
- [ ] The bot will stay online during review.
- [ ] Invite uses `permissions=117760` and the `bot` + `applications.commands` scopes.
- [ ] Source and support links point to the GitHub repository and its issues.
- [ ] Listings are submitted from https://top.gg/bot/new and https://discordbotlist.com/new.
- [ ] Directory tokens are added to `.env` after approval and the bot is restarted.
- [ ] The repository homepage is updated to the live directory page once approved.
