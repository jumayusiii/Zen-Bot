# Zen brand assets

Zen's identity is a calm, precision-built mark: a luminous white **Z** inside an open **ensō** ring, set on an obsidian disc with restrained violet and cyan orbital light. The avatar keeps the mark inside Discord's circular safe area; the banner uses the same mark in a quiet orbital field with **no wordmark or copy**.

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
| Background ink | `#05070D` |
| Deep indigo | `#10172C` |
| Disc highlight | `#1D2647` |
| Ice white | `#F4F1FF` |
| Soft lavender | `#C9BFEA` |
| Accent violet | `#8E6BFF` |
| Accent blue | `#6D8DFF` |
| Accent cyan | `#5CE7FF` |

## Usage

- Keep the Z and the ensō ring inside the central safe area so both survive Discord's circular avatar crop.
- Preserve the open ring, the rounded Z stroke and the obsidian disc; these carry the Zen identity.
- Keep the banner text-free. It should read as a calm orbital field around the mark, not as a wordmark.
- Edit the SVG masters, then run `npm run branding` from the project root to regenerate all four PNGs.
- Upload the PNG through the Discord Developer Portal, or use the file directly with the bot avatar or banner API.
