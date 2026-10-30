const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const test = require('node:test');

const chatgptCommand = require('../src/commands/utility/chatgpt');
const {
  ChatGptError,
  DEFAULT_MODEL,
  askChatGpt,
  extractOutputText,
} = require('../src/lib/chatgpt');

const USER_ID = '980000000000000001';

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function mockFetch({ flagged = false, responseStatus = 200, responseBody } = {}) {
  const calls = [];

  return {
    calls,
    impl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });

      if (String(url).endsWith('/moderations')) {
        return jsonResponse(200, { results: [{ flagged }] });
      }

      return jsonResponse(
        responseStatus,
        responseBody ?? {
          model: DEFAULT_MODEL,
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: 'A calm, useful answer.' }],
            },
          ],
          usage: { total_tokens: 42 },
        },
      );
    },
  };
}

function chatInteraction({
  prompt = 'How do I stay focused?',
  privateMode = false,
  userId = USER_ID,
  username = 'Tester',
} = {}) {
  const captured = {};

  return {
    captured,
    client,
    user: { id: userId, username },
    options: {
      getString: (name) => (name === 'prompt' ? prompt : null),
      getBoolean: (name) => (name === 'private' ? privateMode : null),
    },
    async deferReply(payload) {
      captured.deferred = payload;
      this.deferred = true;
    },
    async reply(payload) {
      captured.reply = payload;
    },
    async editReply(payload) {
      captured.edit = payload;
    },
  };
}

async function withEnvironment(run, { key = 'test-key', model = DEFAULT_MODEL } = {}) {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = key;
  process.env.OPENAI_MODEL = model;

  try {
    await run();
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  }
}

async function withFetch(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;

  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test('extractOutputText handles SDK-style and raw Responses API payloads', () => {
  assert.equal(
    extractOutputText({
      output: [
        { type: 'reasoning', summary: [] },
        {
          type: 'message',
          content: [
            { type: 'output_text', text: 'First line.' },
            { type: 'output_text', text: 'Second line.' },
          ],
        },
      ],
    }),
    'First line.\nSecond line.',
  );
  assert.equal(extractOutputText({ output_text: 'Direct text.' }), 'Direct text.');
  assert.equal(extractOutputText({ output: [] }), '');
});

test('askChatGpt moderates first and sends a non-stored Responses request', async () => {
  const mock = mockFetch();
  const result = await askChatGpt('hello there', {
    apiKey: 'test-key',
    model: DEFAULT_MODEL,
    fetchImpl: mock.impl,
  });

  assert.equal(result.text, 'A calm, useful answer.');
  assert.equal(mock.calls.length, 2);
  assert.ok(mock.calls[0].url.endsWith('/moderations'));
  assert.equal(mock.calls[0].body.model, 'omni-moderation-latest');
  assert.ok(mock.calls[1].url.endsWith('/responses'));
  assert.equal(mock.calls[1].body.model, DEFAULT_MODEL);
  assert.equal(mock.calls[1].body.store, false);
  assert.equal(mock.calls[1].body.max_output_tokens, 700);
  assert.match(mock.calls[1].body.instructions, /Discord assistant/);
});

test('flagged prompts stop before the generation request', async () => {
  const mock = mockFetch({ flagged: true });

  await assert.rejects(
    askChatGpt('unsafe request', { apiKey: 'test-key', fetchImpl: mock.impl }),
    (error) => error instanceof ChatGptError && error.code === 'unsafe',
  );
  assert.equal(mock.calls.length, 1);
});

test('OpenAI status errors map to safe user-facing errors', async () => {
  const cases = [
    [401, 'invalid_key'],
    [404, 'model_unavailable'],
    [429, 'rate_limited'],
    [500, 'unavailable'],
  ];

  for (const [status, code] of cases) {
    const mock = mockFetch({
      responseStatus: status,
      responseBody: { error: { message: 'provider detail' } },
    });

    await assert.rejects(
      askChatGpt('hello', { apiKey: 'test-key', fetchImpl: mock.impl }),
      (error) => error instanceof ChatGptError && error.code === code,
    );
  }
});

test('askChatGpt rejects missing keys and empty prompts', async () => {
  const mock = mockFetch();

  await assert.rejects(
    askChatGpt('hello', { apiKey: '', fetchImpl: mock.impl }),
    (error) => error instanceof ChatGptError && error.code === 'not_configured',
  );
  await assert.rejects(
    askChatGpt(' ', { apiKey: 'test-key', fetchImpl: mock.impl }),
    (error) => error instanceof ChatGptError && error.code === 'invalid_prompt',
  );
  assert.equal(mock.calls.length, 0);
});

test('/chatgpt replies with the generated answer and remaining quota', async () => {
  await withEnvironment(async () => {
    const mock = mockFetch();
    const interaction = chatInteraction();

    await withFetch(mock.impl, () => chatgptCommand.execute(interaction));

    assert.deepEqual(interaction.captured.deferred, {});
    const embed = interaction.captured.edit.embeds[0].data;
    assert.equal(embed.title, 'ChatGPT · beta');
    assert.equal(embed.description, 'A calm, useful answer.');
    assert.equal(embed.fields.length, 3);
    assert.equal(embed.fields[2].name, '🎟️ Requests left');
    assert.equal(embed.fields[2].value, '**7** / 8');
    assert.deepEqual(interaction.captured.edit.allowedMentions.parse, []);
  });
});

test('/chatgpt supports private replies and reports a missing key', async () => {
  await withEnvironment(async () => {
    const mock = mockFetch();
    const interaction = chatInteraction({ privateMode: true });

    await withFetch(mock.impl, () => chatgptCommand.execute(interaction));
    assert.equal(interaction.captured.deferred.flags, MessageFlags.Ephemeral);
  });

  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const interaction = chatInteraction({ userId: 'missing-key-user' });
    await chatgptCommand.execute(interaction);
    assert.match(interaction.captured.reply.content, /OPENAI_API_KEY/);
    assert.equal(interaction.captured.deferred, undefined);
  } finally {
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
  }
});

test('/chatgpt enforces the per-user quota', async () => {
  await withEnvironment(async () => {
    const mock = mockFetch();
    const userId = 'quota-user-980';

    await withFetch(mock.impl, async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const interaction = chatInteraction({ userId });
        await chatgptCommand.execute(interaction);
        assert.ok(interaction.captured.edit, `attempt ${attempt + 1} should answer`);
      }

      const blocked = chatInteraction({ userId });
      await chatgptCommand.execute(blocked);
      assert.match(blocked.captured.reply.content, /limit of \*\*8\*\*/);
      assert.equal(blocked.captured.deferred, undefined);
    });
  });
});
