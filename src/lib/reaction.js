const LABELS_DE = Object.freeze({
  lightning: 'Blitzschnell',
  quick: 'Schnell',
  solid: 'Solide',
  slow: 'Langsam und stetig',
});

function rateReaction(milliseconds, language = 'en') {
  const value = Math.max(0, Number(milliseconds) || 0);
  const german = String(language ?? '').toLowerCase().startsWith('de');

  let key = 'slow';
  if (value < 250) key = 'lightning';
  else if (value < 400) key = 'quick';
  else if (value < 700) key = 'solid';

  const english = {
    lightning: 'Lightning',
    quick: 'Quick',
    solid: 'Solid',
    slow: 'Slow and steady',
  };

  return {
    label: german ? LABELS_DE[key] : english[key],
    emoji: key === 'lightning' ? '⚡' : key === 'quick' ? '🔥' : key === 'solid' ? '👍' : '🐢',
  };
}

module.exports = { LABELS_DE, rateReaction };
