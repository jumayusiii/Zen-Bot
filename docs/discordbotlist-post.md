# Discord Bot List post update

The canonical, current guide is
[Releasing Zen on Discord bot lists](bot-listing.md), specifically
[section 6](bot-listing.md#6-discord-bot-list--full-submission). The public
version is <https://site-e6edf6fc47c8417fbd4cd9fc08cf507d.freebuff.page#discordbotlist>.

Current listing: <https://discordbotlist.com/bots/juma-habbo>

Editor: <https://discordbotlist.com/bots/juma-habbo/edit>

The editor requires the owner's Discord sign-in.

## Current fields

| Field | Value |
| --- | --- |
| Bot name | Zen |
| Version | `1.19.0-beta.18` |
| Commands | 98 |
| Prefix | `/` (slash commands only) |
| Help command | `/helplist` |
| Tags | Fun, Games, Leveling, Moderation, Memes, Social, Utility, Economy, Community, Images |
| Library | discord.js v14 · JavaScript · Node.js |
| GitHub | <https://github.com/jumayusiii/Zen-Bot> |
| Issues | <https://github.com/jumayusiii/Zen-Bot/issues> |
| Invite | `https://discord.com/oauth2/authorize?client_id=1564936469305364480&permissions=1099780180998&scope=bot%20applications.commands` |
| NSFW | Off |

Change the display name to **Zen**; the public slug stays `juma-habbo`.

## Copy

Use the short description, long description, tags and reviewer note in
[Zen's listing kit](bot-listing.md#4-zens-listing-kit). Do not use an older
command-count copy.

## Stats

1. Open the bot's admin page and choose **Generate Token**.
2. Add the token to the host's `.env`:
   ```dotenv
   DISCORDBOTLIST_TOKEN=
   ```
3. Restart the bot and confirm:
   ```text
   [botLists] Discord Bot List: stats posted (HTTP 200).
   ```

Zen posts the guild and member counts every 30 minutes. The token is separate
from the Discord bot token and must never be committed.

## Before saving

- [ ] Display name set to Zen.
- [ ] Current short and long descriptions pasted.
- [ ] Help command set to `/helplist`.
- [ ] Tags updated.
- [ ] GitHub and issues links added.
- [ ] SFW setting retained.
- [ ] Public page checked after saving.
