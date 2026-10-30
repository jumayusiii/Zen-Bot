const SOCIAL_ACTIONS = Object.freeze({
  hug: Object.freeze({
    id: 'hug',
    title: 'Hug delivered',
    description: 'Send a warm hug to a member',
    emoji: '🤗',
    verb: 'hug',
    mood: 'Cozy',
    footer: 'A little kindness goes a long way',
    lines: Object.freeze([
      '**{actor}** wraps **{target}** in a warm, squishy hug.',
      '**{actor}** gives **{target}** the kind of hug that fixes a rough day.',
      '**{actor}** sends **{target}** a hug with extra cozy energy.',
      '**{actor}** hugs **{target}** tightly. No take-backs.',
    ]),
  }),
  pat: Object.freeze({
    id: 'pat',
    title: 'Head pat delivered',
    description: 'Give a member a gentle head pat',
    emoji: '🫳',
    verb: 'pat',
    mood: 'Wholesome',
    footer: 'Head pats are serious business',
    lines: Object.freeze([
      '**{actor}** gives **{target}** a gentle head pat.',
      '**{actor}** pats **{target}** three times for good luck.',
      '**{actor}** crowns **{target}** with a perfectly timed head pat.',
      '**{actor}** pats **{target}** and says “good job.”',
    ]),
  }),
  highfive: Object.freeze({
    id: 'highfive',
    title: 'High five landed',
    description: 'Celebrate with a member',
    emoji: '🙌',
    verb: 'high-five',
    mood: 'Hype',
    footer: 'Teamwork makes the dream work',
    lines: Object.freeze([
      '**{actor}** meets **{target}** in a thunderous high five.',
      '**{actor}** high-fives **{target}** so hard the server shakes.',
      '**{actor}** shares a flawless high five with **{target}**.',
      '**{actor}** and **{target}** land the high five. Instant win.',
    ]),
  }),
});

function cleanName(value, fallback) {
  const name = String(value ?? '').replace(/\s+/g, ' ').trim();
  return name || fallback;
}

/**
 * Picks a social line and fills in both names.
 *
 * @param {string} actionId
 * @param {string} actorName
 * @param {string} targetName
 * @param {() => number} [random]
 * @returns {string}
 */
function socialLine(actionId, actorName, targetName, random = Math.random) {
  const action = SOCIAL_ACTIONS[actionId];
  if (!action) throw new Error(`Unknown social action: ${actionId}`);

  const index = Math.min(
    action.lines.length - 1,
    Math.floor(Math.max(0, Number(random()) || 0) * action.lines.length),
  );
  const actor = cleanName(actorName, 'Someone');
  const target = cleanName(targetName, 'a friend');

  return action.lines[index]
    .replaceAll('{actor}', actor)
    .replaceAll('{target}', target);
}

module.exports = { SOCIAL_ACTIONS, socialLine };
