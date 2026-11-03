const FACTS = Object.freeze([
  'Honey can last for thousands of years without spoiling.',
  'Octopuses have three hearts and blue blood.',
  'A day on Venus is longer than a year on Venus.',
  'Sharks existed before trees did.',
  'The Eiffel Tower can grow about 15 cm taller in hot weather.',
  'Bananas are berries, but strawberries are not.',
  'Wombat droppings are cube-shaped.',
  'A group of flamingos is called a flamboyance.',
  'Sea otters hold hands while sleeping so they do not drift apart.',
  'Lightning is roughly five times hotter than the surface of the Sun.',
  'The shortest recorded war lasted about 38 minutes.',
  'The Moon drifts about 3.8 cm farther from Earth every year.',
  'Mars is home to Olympus Mons, the tallest volcano in the solar system.',
  'The first computer bug was a real moth found in a relay in 1947.',
  'The dot over the letters i and j is called a tittle.',
  'Cows form close friendships and can become stressed when separated.',
  'Antarctica is the largest desert on Earth; the Sahara is the largest hot desert.',
  'A jiffy is a real unit of time used in physics and computing.',
  'The unicorn is the national animal of Scotland.',
  'A group of crows is called a murder.',
  'Earth has more trees than the Milky Way has stars, by current estimates.',
  'A human heart beats roughly 100,000 times a day.',
  'A blue whale heart can weigh around 180 kg.',
  'The first webcam watched a coffee pot at Cambridge University.',
  'Nintendo was founded in 1889 as a playing-card company.',
  'The word "robot" comes from the Czech word robota, meaning forced labor.',
  'The Eiffel Tower was originally meant to be a temporary structure.',
  'Some turtles can absorb oxygen through their cloaca.',
  'A "moment" was a medieval unit of time equal to about 90 seconds.',
  'The average person walks the equivalent of several times around the world in a lifetime.',
]);

const FACTS_DE = Object.freeze([
  'Honig kann Tausende Jahre halten, ohne zu verderben.',
  'Oktopusse haben drei Herzen und blaues Blut.',
  'Ein Tag auf der Venus ist länger als ein Jahr auf der Venus.',
  'Haie gab es schon vor den ersten Bäumen.',
  'Der Eiffelturm kann bei Hitze etwa 15 cm höher werden.',
  'Bananen sind Beeren, Erdbeeren nicht.',
  'Wombat-Kot ist würfelförmig.',
  'Eine Gruppe Flamingos heißt Flamboyance.',
  'Seeotter halten beim Schlafen Händchen, damit sie nicht auseinandertreiben.',
  'Blitze sind rund fünfmal heißer als die Oberfläche der Sonne.',
  'Der kürzeste aufgezeichnete Krieg dauerte etwa 38 Minuten.',
  'Der Mond entfernt sich jedes Jahr etwa 3,8 cm weiter von der Erde.',
  'Auf dem Mars steht Olympus Mons, der höchste Vulkan des Sonnensystems.',
  'Der erste Computer-Bug war eine echte Motte in einem Relais im Jahr 1947.',
  'Der Punkt über den Buchstaben i und j heißt Tittle.',
  'Kühe schließen enge Freundschaften und können unter Trennung leiden.',
  'Die Antarktis ist die größte Wüste der Erde; die Sahara ist die größte heiße Wüste.',
  'Ein Jiffy ist eine echte Zeiteinheit aus Physik und Informatik.',
  'Das Einhorn ist das Nationaltier von Schottland.',
  'Eine Gruppe Krähen heißt Mord.',
  'Schätzungen zufolge gibt es auf der Erde mehr Bäume als Sterne in der Milchstraße.',
  'Ein menschliches Herz schlägt etwa 100.000 Mal am Tag.',
  'Das Herz eines Blauwals kann rund 180 kg wiegen.',
  'Die erste Webcam beobachtete eine Kaffeekanne an der Universität Cambridge.',
  'Nintendo wurde 1889 als Spielkartenfirma gegründet.',
  'Das Wort "Roboter" kommt aus dem Tschechischen robota und bedeutet Frondienst.',
  'Der Eiffelturm war ursprünglich nur als temporäre Konstruktion geplant.',
  'Manche Schildkröten können Sauerstoff über ihre Kloake aufnehmen.',
  'Ein "Moment" war im Mittelalter eine Zeiteinheit von etwa 90 Sekunden.',
  'Ein Mensch läuft im Laufe seines Lebens rechnerisch mehrfach um die Erde.',
]);

const VERDICTS = Object.freeze([
  { min: 90, label: 'Soulmates', emoji: '💞' },
  { min: 75, label: 'Perfect match', emoji: '💘' },
  { min: 60, label: 'Strong connection', emoji: '💖' },
  { min: 40, label: 'Worth a shot', emoji: '✨' },
  { min: 25, label: 'Just friends', emoji: '🤝' },
  { min: 0, label: 'Not meant to be', emoji: '💔' },
]);

const VERDICTS_DE = Object.freeze([
  { min: 90, label: 'Seelenverwandte', emoji: '💞' },
  { min: 75, label: 'Perfektes Match', emoji: '💘' },
  { min: 60, label: 'Starke Verbindung', emoji: '💖' },
  { min: 40, label: 'Einen Versuch wert', emoji: '✨' },
  { min: 25, label: 'Nur Freunde', emoji: '🤝' },
  { min: 0, label: 'Nicht füreinander bestimmt', emoji: '💔' },
]);

const COMPLIMENTS = Object.freeze([
  'You make every room a little brighter.',
  'Your energy is genuinely contagious.',
  'You have excellent taste.',
  'You are the kind of person who makes teamwork easy.',
  'Your curiosity is one of your best traits.',
  'You always know how to make someone laugh.',
  'You handle challenges with real grace.',
  'Your ideas are worth listening to.',
  'You bring out the best in the people around you.',
  'You are more capable than you give yourself credit for.',
  'Your kindness does not go unnoticed.',
  'You have a talent for making things feel possible.',
  'You are a great person to have in a server.',
  'Your creativity is seriously underrated.',
  'You make ordinary moments feel fun.',
  'You are doing better than you think.',
  'Your patience is impressive.',
  'You have a genuinely good heart.',
  'You are the reason someone smiled today.',
  'You bring good vibes wherever you go.',
]);

const COMPLIMENTS_DE = Object.freeze([
  'Du machst jeden Raum ein bisschen heller.',
  'Deine Energie ist wirklich ansteckend.',
  'Du hast einen großartigen Geschmack.',
  'Du bist die Art Mensch, mit der Teamarbeit leichtfällt.',
  'Deine Neugier ist eine deiner besten Eigenschaften.',
  'Du weißt immer, wie man jemanden zum Lachen bringt.',
  'Du meisterst Herausforderungen mit echter Gelassenheit.',
  'Deine Ideen sind es wert, angehört zu werden.',
  'Du holst das Beste aus den Menschen um dich herum heraus.',
  'Du bist fähiger, als du dir selbst zutraust.',
  'Deine Freundlichkeit bleibt nicht unbemerkt.',
  'Du hast ein Talent dafür, Dinge möglich wirken zu lassen.',
  'Du bist ein großartiger Mensch für einen Server.',
  'Deine Kreativität wird stark unterschätzt.',
  'Du machst gewöhnliche Momente unterhaltsam.',
  'Du machst das besser, als du denkst.',
  'Deine Geduld ist beeindruckend.',
  'Du hast ein wirklich gutes Herz.',
  'Du bist der Grund, warum heute jemand gelächelt hat.',
  'Du verbreitest gute Laune, wo du auch bist.',
]);

const ROASTS = Object.freeze([
  'You have the confidence of a browser with 47 tabs open.',
  'Your Wi-Fi has stronger connections than your plans do.',
  'You bring a lot to the table — mostly snacks.',
  'You are the human equivalent of a software update at the worst possible time.',
  'Your comebacks load slower than a dial-up modem.',
  'You are not lazy; you are just in energy-saving mode.',
  'Your ideas are like fireworks: bright for a second, then gone.',
  'You have the attention span of a goldfish with a premium subscription.',
  'You are the plot twist nobody asked for.',
  'You have a great personality — somewhere in the backlog.',
  'Your jokes would be funnier with a laugh track.',
  'You are not a morning person; you are barely a person before noon.',
  'Your playlist has more drama than a reality show.',
  'You are the bug that somehow became a feature.',
  'Your energy is unmatched, especially at 3 a.m.',
  'You are one browser refresh away from a fresh start.',
  'Your best quality is that you never run out of tabs — or confidence.',
  'You are the reason the group chat needs an admin.',
  'Your ideas have great uptime and terrible latency.',
  'You are proof that a draft folder can have a personality.',
]);

const ROASTS_DE = Object.freeze([
  'Du hast das Selbstvertrauen eines Browsers mit 47 offenen Tabs.',
  'Dein WLAN hat stärkere Verbindungen als deine Pläne.',
  'Du bringst viel auf den Tisch — vor allem Snacks.',
  'Du bist das menschliche Äquivalent zu einem Update zur falschen Zeit.',
  'Deine Konter laden langsamer als ein Modem.',
  'Du bist nicht faul; du bist im Energiesparmodus.',
  'Deine Ideen sind wie Feuerwerk: kurz hell, dann weg.',
  'Du hast die Aufmerksamkeitsspanne eines Goldfischs mit Premium-Abo.',
  'Du bist die Wendung, nach der niemand gefragt hat.',
  'Du hast eine tolle Persönlichkeit — irgendwo im Backlog.',
  'Deine Witze wären mit Lachspur lustiger.',
  'Du bist kein Morgenmensch; vor Mittag bist du kaum ein Mensch.',
  'Deine Playlist hat mehr Drama als eine Realityshow.',
  'Du bist der Bug, der irgendwie zum Feature wurde.',
  'Deine Energie ist unschlagbar, besonders um 3 Uhr nachts.',
  'Du bist einen Browser-Refresh von einem Neuanfang entfernt.',
  'Deine beste Eigenschaft: Dir gehen nie die Tabs aus — oder das Selbstvertrauen.',
  'Du bist der Grund, warum der Gruppenchat einen Admin braucht.',
  'Deine Ideen haben super Uptime und schreckliche Latenz.',
  'Du bist der Beweis, dass ein Entwurfsordner Persönlichkeit haben kann.',
]);

const RATE_VERDICTS = Object.freeze([
  { min: 90, label: 'Certified elite', emoji: '🏆' },
  { min: 75, label: 'Very good', emoji: '🔥' },
  { min: 60, label: 'Solid', emoji: '👍' },
  { min: 40, label: 'Mid', emoji: '😐' },
  { min: 25, label: 'Needs work', emoji: '📉' },
  { min: 0, label: 'Not it', emoji: '💀' },
]);

const RATE_VERDICTS_DE = Object.freeze([
  { min: 90, label: 'Zertifizierte Elite', emoji: '🏆' },
  { min: 75, label: 'Sehr gut', emoji: '🔥' },
  { min: 60, label: 'Solide', emoji: '👍' },
  { min: 40, label: 'Mittelmäßig', emoji: '😐' },
  { min: 25, label: 'Ausbaufähig', emoji: '📉' },
  { min: 0, label: 'Nicht gut', emoji: '💀' },
]);

function isGerman(language) {
  return String(language ?? '').toLowerCase().startsWith('de');
}

function contentFor(language) {
  return isGerman(language)
    ? { facts: FACTS_DE, compliments: COMPLIMENTS_DE, roasts: ROASTS_DE }
    : { facts: FACTS, compliments: COMPLIMENTS, roasts: ROASTS };
}

function hashString(value) {
  let hash = 2_166_136_261;

  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

/**
 * A deterministic, symmetric compatibility score. The same pair always gets
 * the same playful result, regardless of who runs the command.
 *
 * @param {string} firstId
 * @param {string} secondId
 * @returns {number} 0–100
 */
function shipScore(firstId, secondId) {
  const key = [String(firstId), String(secondId)].sort().join(':');
  return hashString(key) % 101;
}

function shipVerdict(score, language = 'en') {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const verdicts = isGerman(language) ? VERDICTS_DE : VERDICTS;
  return verdicts.find((verdict) => value >= verdict.min) ?? verdicts[verdicts.length - 1];
}

/**
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 * @returns {{text: string, index: number}}
 */
function randomFact(random = Math.random, excludeIndex = null, language = 'en') {
  const facts = contentFor(language).facts;
  const pool = facts
    .map((text, index) => ({ text, index }))
    .filter((fact) => fact.index !== excludeIndex);

  const index = Math.min(
    pool.length - 1,
    Math.floor(Math.min(0.999999, Math.max(0, random())) * pool.length),
  );

  return pool[index];
}

/**
 * A deterministic 0–100 rating. The same normalized input always gets the
 * same playful score, regardless of who runs the command.
 *
 * @param {string} value
 * @returns {number}
 */
function rateThing(value) {
  return hashString(String(value ?? '').trim().toLowerCase()) % 101;
}

function rateVerdict(score, language = 'en') {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const verdicts = isGerman(language) ? RATE_VERDICTS_DE : RATE_VERDICTS;
  return verdicts.find((verdict) => value >= verdict.min) ?? verdicts[verdicts.length - 1];
}

/**
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 * @returns {{text: string, index: number}}
 */
function randomCompliment(random = Math.random, excludeIndex = null, language = 'en') {
  const compliments = contentFor(language).compliments;
  const pool = compliments
    .map((text, index) => ({ text, index }))
    .filter((compliment) => compliment.index !== excludeIndex);

  const index = Math.min(
    pool.length - 1,
    Math.floor(Math.min(0.999999, Math.max(0, random())) * pool.length),
  );

  return pool[index];
}

/**
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 * @returns {{text: string, index: number}}
 */
function randomRoast(random = Math.random, excludeIndex = null, language = 'en') {
  const roasts = contentFor(language).roasts;
  const pool = roasts
    .map((text, index) => ({ text, index }))
    .filter((roast) => roast.index !== excludeIndex);

  const index = Math.min(
    pool.length - 1,
    Math.floor(Math.min(0.999999, Math.max(0, random())) * pool.length),
  );

  return pool[index];
}

module.exports = {
  COMPLIMENTS,
  COMPLIMENTS_DE,
  FACTS,
  FACTS_DE,
  RATE_VERDICTS,
  RATE_VERDICTS_DE,
  ROASTS,
  ROASTS_DE,
  VERDICTS,
  VERDICTS_DE,
  randomCompliment,
  randomFact,
  randomRoast,
  rateThing,
  rateVerdict,
  shipScore,
  shipVerdict,
};
