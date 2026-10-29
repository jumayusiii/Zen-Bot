# Discord Bot List post update

Live page: https://discordbotlist.com/bots/juma-habbo
Editor: https://discordbotlist.com/bots/juma-habbo/edit  
The editor redirects to Discord sign-in, so the post has to be saved from the
owner's account.

The live post carries the pre-1.8 copy. This is the exact replacement for the
short and long descriptions, the help command and the GitHub links.

## Fields

| Field | Value |
| --- | --- |
| Bot name | Juma Habbo |
| Prefix | `/` (slash commands only) |
| Help command | `/helplist` |
| Tags | Games, Utility, Levelling, Fun, Meme |
| Library | discord.js v14 · JavaScript · Node.js |
| GitHub | https://github.com/jumayusiii/Juma-Habbo-Bot |
| Issues | https://github.com/jumayusiii/Juma-Habbo-Bot/issues |
| Invite | https://discord.com/oauth2/authorize?client_id=1564936469305364480&permissions=117760&scope=bot%20applications.commands |

Keep the existing **No NSFW** setting.

## Short description

130 characters:

```text
Memes, minigames, chat levels and rank cards, polls, reminders and deep site uptime monitoring — all through clean slash commands.
```

## Long description

```markdown
**Juma Habbo** is a lightweight Discord bot for fun breaks, quick decisions and keeping an eye on a website.

### What it does

- **Fun** — memes, Magic 8-Ball, dice, coin flips, rock-paper-scissors, `/ship` and `/fact`.
- **Minigames** — trivia with five refreshes, button tic-tac-toe, Higher or Lower, hangman and blackjack.
- **Levels** — chat XP with a rendered rank card, server rank, XP progress and a top-ten `/levels` leaderboard.
- **Server tools** — server, user and role info, plus icon, banner and avatar grabbers with size pickers and download buttons.
- **Utilities** — live button polls, persistent reminders, a Discord timestamp builder, tabbed help and an invite link.
- **Monitoring** — `/sitestatus` checks HTTP, TLS, DNS, page metadata and security headers. `/uptime` adds seven-day bars and an incident timeline.

### Try it

1. Add the bot with the invite button.
2. Run `/helplist` to browse every command by tab.
3. Try `/rank` for your card, `/sitestatus` for the monitored site or `/higherlower` for a quick round.

**Help command:** `/helplist`  
**Source and issues:** [GitHub repository](https://github.com/jumayusiii/Juma-Habbo-Bot) · [Report an issue](https://github.com/jumayusiii/Juma-Habbo-Bot/issues)

Slash commands only. No prefix and no message content access. Polls, reminders, uptime history and chat levels survive restarts.
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

The page currently shows **Servers: Unknown** and **Users: Unknown**. Those
numbers come from stats posts, not from the public page automatically.

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
missing. Never commit `.env`, paste the token in chat or put it in the repository.

## Checklist

- [ ] Signed in as the listing owner.
- [ ] Short description replaced (130 characters).
- [ ] Long description replaced with the 1.8 copy.
- [ ] Help command set to `/helplist`.
- [ ] Tags kept: Games, Utility, Levelling, Fun, Meme.
- [ ] GitHub repository and issues links added.
- [ ] No NSFW setting kept.
- [ ] Changes saved and visible on the public page.
- [ ] `DISCORDBOTLIST_TOKEN` added to `.env` and the bot restarted.
- [ ] `[botLists] Discord Bot List: stats posted (HTTP 200).` in the log.
