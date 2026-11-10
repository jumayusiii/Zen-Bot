# Zen brand assets

Zen's face is **Zeni, the Ensō Guardian** (ZEN-ee): an original celestial magical girl drawn with a clean, 1990s shoujo-inspired line. She has deep indigo hair, violet eyes, an ivory-and-midnight uniform, a star-tipped open ensō hairpin and a matching chest brooch.

Her gimmick is simple: Zeni is the calm guardian who gathers a server's scattered moments into constellations. The avatar is a close portrait built for Discord's circular crop. The banner places her beside an open ensō ring, joined by a starlight thread from her hairpin. It stays **text-free**.

## Character rules

- Keep the design original: asymmetrical indigo fringe, star-tipped ensō hairpin, ivory-and-midnight uniform, and four-point star motifs.
- Keep her expression calm and quietly warm rather than exaggerated.
- Do not copy an existing magical-girl character's hairstyle, costume, symbols or pose.
- Keep the open ring and orbital light from Zen's previous identity; they connect the mascot to the bot's history.

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
| Character hair | `#1A1C43` |
| Hair highlight | `#3A3172` |
| Skin | `#FBE7EE` |
| Blush | `#F18BA8` |
| Ice white | `#F4F1FF` |
| Soft lavender | `#C9BFEA` |
| Accent violet | `#8E6BFF` |
| Accent blue | `#6D8DFF` |
| Accent cyan | `#5CE7FF` |

## Usage

- Keep Zeni's face, eyes and hairpin inside the central safe area so they survive Discord's circular avatar crop.
- Keep the banner text-free. The character, the open ensō ring and the starlight thread should carry the composition without a wordmark.
- The avatar and banner share the same portrait construction. Update both SVG masters when changing the character, then run `npm run branding` from the project root to regenerate all four PNGs.
- Upload the PNG through the Discord Developer Portal, or use the file directly with the bot avatar or banner API.
