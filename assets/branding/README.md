# Zen brand assets

The Zen mark is a rounded black Z on a raised white disc, set on a black field with a soft monochrome halo. The disc gives the mark a Material-style surface and depth while staying strictly black and white. The banner uses the same medallion beside the ZEN wordmark.

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
| Halo graphite | `#333333` |
| White surface | `#FFFFFF` |
| Surface shade | `#DEDEDE` |
| Graphite text | `#A3A3A3` |

## Usage

- Keep the white disc centered and the rounded Z centered inside it; the mark is sized for Discord's circular avatar crop.
- Keep the palette monochrome. The disc gradient, halo and soft shadow are the only effects; do not add colours, outlines or glows.
- Keep the Z's rounded line caps and joins. Do not stretch, rotate or square off the strokes.
- Keep the banner's 5:2 composition: disc medallion on the left, wordmark, divider and tagline on the right.
- Edit the SVG master, then run `npm run branding` from the project root to regenerate all four PNGs.
- Upload the PNG through the Discord Developer Portal, or use the file directly with the bot avatar or banner API.
