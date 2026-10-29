function rateReaction(milliseconds) {
  const value = Math.max(0, Number(milliseconds) || 0);

  if (value < 250) return { label: 'Lightning', emoji: '⚡' };
  if (value < 400) return { label: 'Quick', emoji: '🔥' };
  if (value < 700) return { label: 'Solid', emoji: '👍' };
  return { label: 'Slow and steady', emoji: '🐢' };
}

module.exports = { rateReaction };
