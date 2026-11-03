const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { MESSAGES, t } = require('../src/lib/i18n');
const { randomCompliment, randomFact, randomRoast, rateVerdict, shipVerdict } = require('../src/lib/fun');
const { randomFortune } = require('../src/lib/fortunes');
const { randomJoke } = require('../src/lib/jokes');
const { randomTopic } = require('../src/lib/topics');
const { QUESTIONS_DE, randomQuestion } = require('../src/lib/trivia');
const { createRound } = require('../src/lib/wordScramble');
const { randomPhrase, rateTyping } = require('../src/lib/typerace');
const { rateReaction } = require('../src/lib/reaction');
const { createSession } = require('../src/lib/wyr');

const eightball = require('../src/commands/fun/8ball');
const trivia = require('../src/commands/minigames/trivia');
const wordscramble = require('../src/commands/minigames/wordscramble');
const typerace = require('../src/commands/minigames/typerace');
const wouldyourather = require('../src/commands/minigames/wouldyourather');

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function flatten(value, prefix = '', output = {}) {
  for (const [key, entry] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === 'object') flatten(entry, full, output);
    else output[full] = entry;
  }

  return output;
}

async function withGermanServer(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-german-games-'));
  const file = path.join(directory, 'languages.json');
  process.env.LANGUAGES_FILE = file;
  await fs.writeFile(file, JSON.stringify({
    version: 1,
    guilds: [{ guildId: 'guild-de', language: 'de' }],
  }));

  try {
    await run();
  } finally {
    delete process.env.LANGUAGES_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function interaction(overrides = {}) {
  const captured = {};

  return {
    captured,
    client,
    guild: { id: 'guild-de', name: 'Testserver' },
    guildId: 'guild-de',
    user: { id: 'user-1', username: 'ada' },
    member: { displayName: 'Ada', displayAvatarURL: () => 'https://cdn.example/a.png' },
    options: {
      getString: () => null,
      getInteger: () => null,
      getUser: () => null,
      getMember: () => null,
    },
    async reply(payload) {
      captured.reply = payload;
    },
    async update(payload) {
      captured.update = payload;
    },
    ...overrides,
  };
}

test('the German catalog covers every Fun and Minigames key', () => {
  const english = flatten(MESSAGES.en);
  const german = flatten(MESSAGES.de);

  assert.deepEqual(
    Object.keys(english).filter((key) => !(key in german)),
    [],
  );
  assert.equal(t('de', 'fun.fact.title'), 'Wusstest du schon?');
  assert.equal(t('de', 'minigames.hangman.title'), 'Galgenmännchen');
  assert.equal(t('de', 'minigames.trivia.correct'), '✅ **Richtig** — das ist die Antwort.');
  assert.equal(t('en', 'minigames.trivia.correct'), '✅ **Correct** — that is the answer.');
});

test('German content packs keep the English index order', () => {
  const fact = randomFact(() => 0, null, 'de');
  assert.equal(fact.index, 0);
  assert.match(fact.text, /Honig/);

  const compliment = randomCompliment(() => 0, null, 'de');
  assert.equal(compliment.index, 0);
  assert.match(compliment.text, /heller/);

  const roast = randomRoast(() => 0, null, 'de');
  assert.equal(roast.index, 0);
  assert.match(roast.text, /Selbstvertrauen/);

  const fortune = randomFortune(() => 0, null, 'de');
  assert.equal(fortune.index, 0);
  assert.equal(fortune.category, 'Weisheit');

  const joke = randomJoke(() => 0, null, 'de');
  assert.equal(joke.index, 0);
  assert.match(joke.punchline, /Bugs/);

  const topic = randomTopic(() => 0, { category: 'food', language: 'de' });
  assert.equal(topic.meta.label, 'Essen');
  assert.match(topic.text, /Gericht|Belag|Restaurant|Kombination/);

  assert.equal(shipVerdict(100, 'de').label, 'Seelenverwandte');
  assert.equal(rateVerdict(100, 'de').label, 'Zertifizierte Elite');
  assert.equal(rateTyping(95, 'de').label, 'Blitzschnell');
  assert.equal(rateReaction(100, 'de').label, 'Blitzschnell');
});

test('German minigame data is translated', () => {
  const question = randomQuestion(() => 0, [], 'de');
  assert.equal(question.category, 'Wissenschaft');
  assert.equal(question.question, 'Welcher Planet ist als Roter Planet bekannt?');
  assert.deepEqual(question.options, ['Mars', 'Venus', 'Jupiter', 'Merkur']);

  const round = createRound(() => 0, null, 'de');
  assert.equal(round.hint, 'Wo dieser Bot lebt');

  const phrase = randomPhrase(() => 0, null, 'de');
  assert.equal(phrase.text, 'klarer kopf, sauberer code');

  const session = createSession(() => 0, Date.now(), 'de');
  assert.equal(session.language, 'de');
  assert.equal(session.a, 'Ein Jahr lang unbegrenzt Pizza');
});

test('/8ball answers with the German title in a German server', async () => {
  await withGermanServer(async () => {
    const start = interaction({
      options: { getString: () => 'Klappt es?' },
    });

    await eightball.execute(start);
    const embed = start.captured.reply.embeds[0].data;

    assert.equal(embed.title, 'Die 8-Kugel hat gesprochen');
    assert.match(embed.description, /Klappt es\?/);
  });
});

test('/trivia starts with a German question and labels', async () => {
  await withGermanServer(async () => {
    const start = interaction();

    await trivia.execute(start);
    const embed = start.captured.reply.embeds[0].data;

    assert.ok(QUESTIONS_DE.some((question) => question.question === embed.title));
    assert.deepEqual(embed.fields.map((field) => field.name), ['Antworten', '📊 Punktestand', '🔁 Aktualisierungen']);
    assert.match(embed.description, /Wähle die Antwort/);
  });
});

test('/wordscramble shows a German hint while keeping the word', async () => {
  await withGermanServer(async () => {
    const start = interaction();

    await wordscramble.execute(start);
    const embed = start.captured.reply.embeds[0].data;

    assert.equal(embed.title, 'Wortsalat');
    assert.match(embed.description, /Entwirre das Wort/);
    assert.match(embed.description, /Hinweis:/);
  });
});

test('/typerace opens a German race card', async () => {
  await withGermanServer(async () => {
    const start = interaction();

    await typerace.execute(start);
    const embed = start.captured.reply.embeds[0].data;

    assert.equal(embed.title, 'Tipprennen');
    assert.deepEqual(embed.fields.map((field) => field.name), ['🎯 Ziel', '⏱️ Zeit', '🙋 Spieler']);
    assert.equal(start.captured.reply.components[0].components[0].data.label, 'Tippen starten');
  });
});

test('/wouldyourather starts a German vote with German option labels', async () => {
  await withGermanServer(async () => {
    const start = interaction();

    await wouldyourather.execute(start);
    const embed = start.captured.reply.embeds[0].data;

    assert.equal(embed.title, 'Was würdest du eher …');
    assert.match(embed.description, /Was würdest du eher/);
    assert.deepEqual(embed.fields.map((field) => field.name), ['🅰️ Option A', '🅱️ Option B', '🗳️ Gesamt']);
    assert.equal(start.captured.reply.components[0].components[0].data.label, 'Option A');
  });
});
