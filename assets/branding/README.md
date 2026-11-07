# Zen brand assets

Zen's identity is a modern Material-style bot icon: a rounded white robot head with a dark visor, bright cyan eyes, a slim antenna, and a small Z badge. The avatar is a compact icon for Discord's circular crop; the banner keeps the focus on the ZEN wordmark and the same robot mark in a rounded material card.

| File | Use |
| --- | --- |
| `zen-avatar.svg` | Avatar master vector; edit this file |
| `zen-avatar-1024.png` | High-resolution bot avatar and app icon |
| `zen-avatar-512.png` | Standard Discord upload size |
| `zen-banner.svg` | Wide 5:2 banner master vector |
| `zen-banner-1500x600.png` | High-resolution bot profile banner |
| `zen-banner-750x300.png` | Preview and smaller upload size |

## Palette

| Role | Hex |
| --- | --- |
| Background ink | `#070911` |
| Deep indigo | `#111326` |
| Material plum | `#211C45` |
| Violet field | `#402C6E` |
| Bot shell | `#FFFFFF` |
| Shell shade | `#DCD5F2` |
| Visor | `#1A1B39` |
| Eye highlight | `#8DF1FF` |
| Eye cyan | `#29BDE8` |
| Accent blue | `#6A9DFF` |
| Accent violet | `#8E6BFF` |
| Body text | `#D6CEF0` |

## Usage

- Keep the robot's visor, both eyes and forehead Z badge inside the central safe area for Discord's circular avatar crop.
- Preserve the rounded shell, dark visor, cyan eyes, antenna and layered indigo/violet background; these carry the Material bot identity.
- Keep the banner's 5:2 composition: the ZEN wordmark on the left and the robot icon card on the right, with no additional copy.
- Edit the SVG masters, then run `npm run branding` from the project root to regenerate all four PNGs.
- Upload the PNG through the Discord Developer Portal, or use the file directly with the bot avatar or banner API.
