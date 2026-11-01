const DEFAULT_THEME_ID = 'aurora';

const CARD_THEMES = Object.freeze([
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'The classic Zen violet and pink gradient.',
    price: 0,
    pattern: 'blobs',
    colors: {
      background: ['#171827', '#211b36', '#2d1f3d'],
      decor: ['#6d5efc', '#ff6fb5'],
      accent: '#8f83ff',
      shadow: 'rgba(109, 94, 252, 0.55)',
      pill: ['#6d5efc', '#a75efc'],
      bar: ['#6d5efc', '#9b6dff', '#ff6fb5'],
      muted: '#aaa7bd',
      dim: '#8f8ca6',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm coral and gold light for evening chats.',
    price: 600,
    pattern: 'sun',
    colors: {
      background: ['#2a1220', '#4c1c2f', '#7a2a3a'],
      decor: ['#ff8a5c', '#ffd166'],
      accent: '#ffb86b',
      shadow: 'rgba(255, 138, 92, 0.5)',
      pill: ['#ff8a5c', '#ff5d73'],
      bar: ['#ffd166', '#ff8a5c', '#ff5d73'],
      muted: '#d8b9bd',
      dim: '#b9959d',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep teal water with a bright aqua current.',
    price: 900,
    pattern: 'waves',
    colors: {
      background: ['#06202e', '#0a3a4d', '#0f5c6b'],
      decor: ['#4adede', '#4aa8ff'],
      accent: '#7ce7e1',
      shadow: 'rgba(74, 222, 222, 0.45)',
      pill: ['#4aa8ff', '#4adede'],
      bar: ['#4aa8ff', '#4adede', '#7ee7c4'],
      muted: '#a9cbd4',
      dim: '#7fa7b3',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Mossy greens and soft leaves for a calm card.',
    price: 1200,
    pattern: 'leaves',
    colors: {
      background: ['#0b1f16', '#123326', '#1d4b34'],
      decor: ['#7ee787', '#32d583'],
      accent: '#7ee787',
      shadow: 'rgba(50, 213, 131, 0.45)',
      pill: ['#32d583', '#7ee787'],
      bar: ['#32d583', '#7ee787', '#d6f5a3'],
      muted: '#b3cbb8',
      dim: '#8aa892',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'A dark navy sky scattered with tiny stars.',
    price: 1600,
    pattern: 'stars',
    colors: {
      background: ['#06070f', '#0d1022', '#161a33'],
      decor: ['#a75efc', '#6d5efc'],
      accent: '#a75efc',
      shadow: 'rgba(167, 94, 252, 0.55)',
      pill: ['#6d5efc', '#a75efc'],
      bar: ['#6d5efc', '#a75efc', '#ff6fb5'],
      muted: '#b6b3c9',
      dim: '#8b88a0',
    },
  },
  {
    id: 'candy',
    name: 'Candy',
    description: 'Bright pink, sherbet gold and a sprinkle of confetti.',
    price: 2200,
    pattern: 'confetti',
    colors: {
      background: ['#2a1029', '#4a1b44', '#732a5d'],
      decor: ['#ff6fb5', '#ffd166'],
      accent: '#ff9ac9',
      shadow: 'rgba(255, 111, 181, 0.5)',
      pill: ['#ff6fb5', '#ffd166'],
      bar: ['#ff6fb5', '#ffd166', '#a75efc'],
      muted: '#e7c3d8',
      dim: '#c79bb8',
    },
  },
]);

const THEME_IDS = new Set(CARD_THEMES.map((theme) => theme.id));

function getCardTheme(id) {
  return CARD_THEMES.find((theme) => theme.id === id) ?? CARD_THEMES[0];
}

function isCardTheme(id) {
  return THEME_IDS.has(id);
}

module.exports = {
  CARD_THEMES,
  DEFAULT_THEME_ID,
  getCardTheme,
  isCardTheme,
};
