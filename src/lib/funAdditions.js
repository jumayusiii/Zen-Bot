const MAX_EMOJIFY_CHARS = 80;
const MAX_MOCK_CHARS = 200;

const MOCK_TEMPLATES = Object.freeze({
  en: {
    both: [
      '{user} really said “{message}” 💀',
      '“{message}” — {user}, everyone 🤡',
      '{user} actually typed “{message}” and hit send 💀',
    ],
    message: [
      '“{message}” — bold words from someone who asked 💀',
      'Bro really said “{message}” and thought that was a take 💀',
      '“{message}” is crazy work 💀',
    ],
    user: [
      '{user} is out here acting like that 💀',
      'Somebody tell {user} it’s not that deep 🤡',
      '{user} really woke up and chose this 💀',
    ],
  },
  de: {
    both: [
      '{user} hat wirklich „{message}“ geschrieben 💀',
      '„{message}“ — {user}, ernsthaft? 🤡',
      '{user} tippt „{message}“ und drückt wirklich auf Senden 💀',
    ],
    message: [
      '„{message}“ — starke Worte für jemanden, der nicht gefragt hat 💀',
      'Bruder sagt wirklich „{message}“ und denkt, das sei ein Argument 💀',
      '„{message}“ ist schon wild 💀',
    ],
    user: [
      '{user} benimmt sich wieder so 💀',
      'Sagt {user} bitte, dass es nicht so tief ist 🤡',
      '{user} ist heute wieder mutig 💀',
    ],
  },
});

const DAD_JOKES = Object.freeze([
  "I only know 25 letters of the alphabet. I don't know y.",
  'Why did the scarecrow win an award? He was outstanding in his field.',
  "I'm reading a book about anti-gravity. It's impossible to put down.",
  "Why don't scientists trust atoms? Because they make up everything.",
  'What do you call a fake noodle? An impasta.',
  'Why did the bicycle fall over? It was two-tired.',
  'I used to hate facial hair, but then it grew on me.',
  "What do you call cheese that isn't yours? Nacho cheese.",
  "Why can't your nose be 12 inches long? Because then it would be a foot.",
  "I would tell you a construction joke, but I'm still working on it.",
  'What do you call a bear with no teeth? A gummy bear.',
  'Why did the coffee file a police report? It got mugged.',
  'How does a penguin build its house? Igloos it together.',
  "What's orange and sounds like a parrot? A carrot.",
  'Why did the math book look sad? It had too many problems.',
  "I'm on a seafood diet. I see food and I eat it.",
]);

const DAD_JOKES_DE = Object.freeze([
  'Ich kenne nur 25 Buchstaben. Das Y fehlt mir.',
  'Warum hat die Vogelscheuche einen Preis gewonnen? Weil sie auf ihrem Feld herausragend war.',
  'Ich lese gerade ein Buch über Schwerelosigkeit. Ich kann es einfach nicht weglegen.',
  'Warum trauen Wissenschaftler Atomen nicht? Weil sie alles erfinden.',
  'Was sagt eine Wand zur anderen? Wir treffen uns an der Ecke.',
  'Warum fällt ein Fahrrad nicht um? Es hat zwei Reifen und gute Balance.',
  'Ich fand Barthaare früher furchtbar. Dann sind sie mir ans Herz gewachsen.',
  'Was ist orange und klingt wie ein Papagei? Eine Karotte.',
  'Warum war das Mathebuch traurig? Es hatte zu viele Probleme.',
  'Ich bin auf Diät: Ich sehe Essen und esse es.',
  'Wie nennt man einen Bären ohne Zähne? Einen Gummibären.',
  'Warum hat der Kaffee die Polizei gerufen? Er wurde ausgeraubt.',
  'Wie baut ein Pinguin sein Haus? Er igloot es zusammen.',
  'Warum kann deine Nase nicht 30 cm lang sein? Dann wäre sie ein Fuß.',
  'Ich wollte einen Witz über Baustellen erzählen, aber ich arbeite noch daran.',
  'Was ist der Lieblingssport von Elektronen? Voltball.',
]);

const RIDDLES = Object.freeze([
  { question: "What has keys but can't open locks?", answer: 'A piano.' },
  { question: "What has hands but can't clap?", answer: 'A clock.' },
  { question: 'What gets wetter the more it dries?', answer: 'A towel.' },
  { question: "What has a head and a tail but no body?", answer: 'A coin.' },
  { question: 'What can travel around the world while staying in a corner?', answer: 'A stamp.' },
  { question: "What has many teeth but can't bite?", answer: 'A comb.' },
  { question: "What has one eye but can't see?", answer: 'A needle.' },
  { question: 'What goes up but never comes down?', answer: 'Your age.' },
  { question: 'What has words but never speaks?', answer: 'A book.' },
  { question: "What has a neck but no head?", answer: 'A bottle.' },
]);

const RIDDLES_DE = Object.freeze([
  { question: 'Was hat Tasten, kann aber keine Schlösser öffnen?', answer: 'Ein Klavier.' },
  { question: 'Was hat Zeiger, kann aber nicht winken?', answer: 'Eine Uhr.' },
  { question: 'Was wird nasser, je mehr es trocknet?', answer: 'Ein Handtuch.' },
  { question: 'Was hat Kopf und Zahl, aber keinen Körper?', answer: 'Eine Münze.' },
  { question: 'Was reist um die Welt und bleibt in einer Ecke?', answer: 'Eine Briefmarke.' },
  { question: 'Was hat viele Zähne, kann aber nicht beißen?', answer: 'Ein Kamm.' },
  { question: 'Was hat ein Auge, kann aber nicht sehen?', answer: 'Eine Nadel.' },
  { question: 'Was steigt und steigt und kommt nie herunter?', answer: 'Das Alter.' },
  { question: 'Was hat Wörter, spricht aber nie?', answer: 'Ein Buch.' },
  { question: 'Was hat einen Hals, aber keinen Kopf?', answer: 'Eine Flasche.' },
]);

function randomItem(list, random = Math.random) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(random() * list.length)];
}

function randomDadJoke(random = Math.random, language = 'en') {
  return randomItem(language === 'de' ? DAD_JOKES_DE : DAD_JOKES, random);
}

function randomRiddle(random = Math.random, language = 'en') {
  return randomItem(language === 'de' ? RIDDLES_DE : RIDDLES, random);
}

/**
 * Turns Latin letters and digits into regional-indicator and keycap emoji.
 * Spaces are widened so the result reads as words rather than one block.
 */
function emojify(text) {
  return [...String(text ?? '').toLowerCase()]
    .map((char) => {
      const index = char.charCodeAt(0) - 97;
      if (index >= 0 && index < 26) return String.fromCodePoint(0x1f1e6 + index);
      if (char >= '0' && char <= '9') return `${char}\uFE0F\u20E3`;
      if (char === ' ') return '   ';
      return char;
    })
    .join('');
}

/** Alternating-case text, toggling only letters so punctuation stays put. */
function mockText(text) {
  let upper = false;

  return [...String(text ?? '')]
    .map((char) => {
      if (!/[a-z]/i.test(char)) return char;
      upper = !upper;
      return upper ? char.toUpperCase() : char.toLowerCase();
    })
    .join('');
}

/**
 * Builds the mocking line for /mock from an optional message and user.
 * The quoted message is returned in alternating case, like the meme.
 */
function buildMockLine({ message = '', user = '', language = 'en', random = Math.random } = {}) {
  const text = String(message ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_MOCK_CHARS);
  const mention = String(user ?? '').trim() ? `<@${String(user).trim()}>` : '';
  if (!text && !mention) return null;

  const templates = MOCK_TEMPLATES[language] ?? MOCK_TEMPLATES.en;
  const key = text && mention ? 'both' : mention ? 'user' : 'message';
  const template = randomItem(templates[key], random) ?? templates[key][0];

  return template.replace('{user}', mention).replace('{message}', mockText(text));
}

module.exports = {
  DAD_JOKES,
  DAD_JOKES_DE,
  MAX_EMOJIFY_CHARS,
  MAX_MOCK_CHARS,
  RIDDLES,
  RIDDLES_DE,
  buildMockLine,
  emojify,
  mockText,
  randomDadJoke,
  randomItem,
  randomRiddle,
};
