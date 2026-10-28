const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const uptime = require('../src/commands/utility/uptime');

test('/uptime renders a valid embed with seven daily rows and many incidents', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-uptime-'));
  const historyFile = path.join(directory, 'history.json');
  process.env.SITE_HISTORY_FILE = historyFile;

  const now = Date.now();
  const samples = [];

  for (let index = 0; index < 20; index += 1) {
    const failedAt = now - (index + 1) * 6 * 60 * 60 * 1000;
    samples.push(
      { at: failedAt, ok: false, status: 503, ms: 80, error: 'HTTP 503' },
      { at: failedAt + 5 * 60 * 1000, ok: true, status: 200, ms: 130, error: null },
    );
  }

  samples.push({ at: now - 60 * 1000, ok: true, status: 200, ms: 120, error: null });

  await fs.writeFile(historyFile, JSON.stringify({
    site: 'https://habbo.gd',
    createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now).toISOString(),
    samples,
  }));

  let payload;
  const client = {
    user: {
      username: 'TestBot',
      displayAvatarURL: () => 'https://example.com/avatar.png',
    },
  };

  try {
    await uptime.execute({
      client,
      deferReply: async () => {},
      editReply: async (value) => {
        payload = value;
      },
    });
  } finally {
    delete process.env.SITE_HISTORY_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }

  assert.ok(payload);
  const embed = payload.embeds[0].toJSON();
  assert.match(embed.title, /Seven-day uptime/);
  assert.ok(embed.fields.length <= 25);

  const daily = embed.fields.find((field) => field.name.includes('Daily uptime'));
  assert.ok(daily);
  assert.equal(daily.value.split('\n').filter((line) => /^[A-Z][a-z]{2} \d{1,2}  /.test(line)).length, 7);

  const timeline = embed.fields.find((field) => field.name.includes('Incident timeline'));
  assert.ok(timeline);
  assert.match(timeline.value, /more incident/);

  for (const field of embed.fields) {
    assert.ok(field.value.length <= 1024, `${field.name} is too long`);
    assert.ok(field.name.length <= 256);
  }

  assert.ok(JSON.stringify(embed).length < 5900);
});
