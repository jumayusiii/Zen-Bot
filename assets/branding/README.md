# Zen brand assets

The Zen mark is a bold geometric Z: one solid white form on a flat black field. It stays readable at Discord's smallest avatar sizes and needs no gradients, shadows or secondary colours. The banner sets the same mark in a thin ring beside the ZEN wordmark.

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
| Black | `#000000` |
| White | `#FFFFFF` |
| Graphite | `#A3A3A3` |

## Usage

- Keep the Z centered on the black field; it is sized for Discord's circular avatar crop.
- Keep the field solid black and the Z solid white. Do not add gradients, glows, outlines or extra colours.
- Do not stretch, rotate or rearrange the strokes of the Z.
- Keep the banner's 5:2 composition: ringed Z on the left, wordmark and tagline on the right.
- Edit the SVG master, then run `npm run branding` from the project root to regenerate all four PNGs.
- Upload the PNG through the Discord Developer Portal, or use the file directly with the bot avatar or banner API.
