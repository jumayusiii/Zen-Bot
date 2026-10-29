# Discord Bot List post update

Live page: https://discordbotlist.com/bots/juma-habbo
Editor: https://discordbotlist.com/bots/juma-habbo/edit
The editor redirects to Discord sign-in, so the post has to be saved from the
owner's account.

The live post still carries the old name and earlier copy. This is the exact
replacement for the short and long descriptions, the help command and the GitHub
links for **v1.12.0-beta.1** and the **53-command** directory.

## Fields

| Field | Value |
| --- | --- |
| Bot name | Zen |
| Prefix | `/` (slash commands only) |
| Help command | `/helplist` |
| Tags | Games, Utility, Levelling, Fun, Meme |
| Library | discord.js v14 · JavaScript · Node.js |
| GitHub | https://github.com/jumayusiii/Juma-Habbo-Bot |
| Issues | https://github.com/jumayusiii/Juma-Habbo-Bot/issues |
| Invite | https://discord.com/oauth2/authorize?client_id=1564936469305364480&permissions=1099780180998&scope=bot%20applications.commands |

Change the listing's display name to **Zen**; the public URL slug stays `juma-habbo`. Keep the existing **No NSFW** setting.

## Short description

Under 140 characters:

```text
Fun, minigames, levels, moderation, polls, TikTok previews, weather, Wikipedia and site uptime — all in clean slash commands.
```

## Long description

```markdown
**Zen** is a lightweight Discord bot for fun breaks, a friendlier community and keeping an eye on a website.

### What it does

- **Fun** — memes, Magic 8-Ball, dice, coin flips, rock-paper-scissors, `/ship`, `/fact`, `/joke`, `/compliment`, `/roast` and `/rate`.
- **Media** — `/tiktok` turns a TikTok link into an inline video with creator and engagement details; oversized, private or photo posts fall back to a cover and an **Open on TikTok** link.
- **Weather & knowledge** — `/weather` gives current conditions and a four-day forecast in °C or °F, and `/wikipedia` finds an article and posts its summary with a link to the full page.
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
3. Try `/rank` for your card, `/weather Tokyo` for a forecast, `/wikipedia Jupiter` for a summary, `/sitestatus` for the monitored site or `/slots` and `/wouldyourather` for a quick round.
4. Configure `/welcome`, `/leave` and `/modlog` to make the server feel finished.

**Help command:** `/helplist`
**Source and issues:** [GitHub repository](https://github.com/jumayusiii/Juma-Habbo-Bot) · [Report an issue](https://github.com/jumayusiii/Juma-Habbo-Bot/issues)

Slash commands only. No prefix and no message content access. Polls, reminders, uptime history, chat levels, scheduled bans, greeting settings and audit-log channels survive restarts. The Server Members intent is used for welcome and leave events.
```

## Links to add

- GitHub repository: https://github.com/jumayusiii/Juma-Habbo-Bot
- GitHub issues: https://github.com/jumayusiii/Juma-Habbo-Bot/issues
- Invite: the URL in the fields table above
- Support server: keep the existing Discord invite if it is still current

## Apply the update

1. Sign in at https://discordbotlist.com with the owner's Discord account.
2. Open https://discordbotlist.com/bots/juma-habbo/edit.
3. Replace the short and long descriptions with the blocks above.
4. Set the help command to `/helplist` and keep the five tags.
5. Add the GitHub repository and issues links, then save.
6. Check the public page for the new copy, the GitHub link and the help command.

## Fix the server and user counts

The page currently shows **Servers: Unknown** and **Users: Unknown** unless a
stats token has already been configured. Those numbers come from stats posts,
not from the public page automatically.

1. Open the bot's admin page on Discord Bot List and generate an API token.
2. Add it to `.env` on the host:

   ```dotenv
   DISCORDBOTLIST_TOKEN=
   ```

3. Restart the bot. It posts the current guild and member counts at startup and
   then every **30 minutes**.

A healthy start logs:

```text
[botLists] Discord Bot List: stats posted (HTTP 200).
```

`[botLists] No list tokens configured; stats sync is off.` means the token is
missing. Never commit `.env`, paste the token in chat or put it in the
repository.

## Checklist

- [ ] Signed in as the listing owner.
- [ ] Short description replaced (under 140 characters).
- [ ] Long description replaced with the Zen copy.
- [ ] Help command set to `/helplist`.
- [ ] Tags kept: Games, Utility, Levelling, Fun, Meme.
- [ ] GitHub repository and issues links added.
- [ ] No NSFW setting kept.
- [ ] Changes saved and visible on the public page.
- [ ] `DISCORDBOTLIST_TOKEN` added to `.env` and the bot restarted.
- [ ] `[botLists] Discord Bot List: stats posted (HTTP 200).` in the log.
