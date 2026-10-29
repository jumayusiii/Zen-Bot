const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const reminders = require('../src/lib/reminders');

async function withReminderFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-reminders-'));
  process.env.REMINDERS_FILE = path.join(directory, 'reminders.json');

  try {
    await run();
  } finally {
    delete process.env.REMINDERS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeClient({ dmFails = false } = {}) {
  const sent = [];

  return {
    sent,
    user: {
      username: 'TestBot',
      displayAvatarURL: () => 'https://example.com/avatar.png',
    },
    users: {
      fetch: async () => {
        if (dmFails) throw new Error('DMs are closed');
        return {
          send: async (payload) => {
            sent.push({ kind: 'dm', payload });
          },
        };
      },
    },
    channels: {
      fetch: async () => ({
        isTextBased: () => true,
        send: async (payload) => {
          sent.push({ kind: 'channel', payload });
        },
      }),
    },
  };
}

test('duration parsing accepts compact values in a safe range', () => {
  assert.equal(reminders.parseDuration('10m'), 10 * 60 * 1000);
  assert.equal(reminders.parseDuration('2h'), 2 * 60 * 60 * 1000);
  assert.equal(reminders.parseDuration('3 days'), 3 * 24 * 60 * 60 * 1000);
  assert.equal(reminders.parseDuration('1w'), 7 * 24 * 60 * 60 * 1000);
  assert.equal(reminders.parseDuration('30d'), 30 * 24 * 60 * 60 * 1000);

  assert.equal(reminders.parseDuration('5s'), null);
  assert.equal(reminders.parseDuration('31d'), null);
  assert.equal(reminders.parseDuration('1.5h'), null);
  assert.equal(reminders.parseDuration('soon'), null);
});

test('reminders persist, appear when due, and can be removed', async () => {
  await withReminderFile(async () => {
    const dueAt = Date.now() + 10 * 60 * 1000;
    const created = await reminders.createReminder({
      userId: '400000000000000001',
      channelId: '100000000000000001',
      guildId: '100000000000000002',
      message: 'Drink some water',
      dueAt,
      where: 'dm',
    });

    const pending = await reminders.listReminders('400000000000000001');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, created.id);
    assert.equal(pending[0].message, 'Drink some water');

    assert.deepEqual(await reminders.getDueReminders(dueAt - 1000), []);

    const due = await reminders.getDueReminders(dueAt + 1000);
    assert.equal(due.length, 1);
    assert.equal(due[0].id, created.id);

    await reminders.removeReminder(created.id);
    assert.deepEqual(await reminders.listReminders('400000000000000001'), []);
  });
});

test('reminders can only be cancelled by their owner', async () => {
  await withReminderFile(async () => {
    const userId = '400000000000000001';
    const created = await reminders.createReminder({
      userId,
      channelId: '100000000000000001',
      message: 'Check the event schedule',
      dueAt: Date.now() + 10 * 60 * 1000,
      where: 'dm',
    });

    assert.equal(await reminders.cancelReminder(created.id, '400000000000000009'), null);
    assert.equal((await reminders.listReminders(userId)).length, 1);

    const cancelled = await reminders.cancelReminder(created.id, userId);
    assert.equal(cancelled.id, created.id);
    assert.deepEqual(await reminders.listReminders(userId), []);
  });
});

test('reminder delivery prefers DMs', async () => {
  const client = fakeClient();
  const reminder = {
    id: 'reminder-1',
    userId: '400000000000000001',
    channelId: '100000000000000001',
    message: 'Take a break',
    dueAt: Date.now() + 60 * 1000,
    where: 'dm',
  };

  assert.equal(await reminders.deliverReminder(client, reminder), true);
  assert.equal(client.sent.length, 1);
  assert.equal(client.sent[0].kind, 'dm');
  assert.equal(client.sent[0].payload.embeds[0].data.title, '⏰ Reminder');
});

test('closed DMs fall back to the original channel with one mention', async () => {
  const client = fakeClient({ dmFails: true });
  const reminder = {
    id: 'reminder-2',
    userId: '400000000000000001',
    channelId: '100000000000000001',
    message: 'Take a break',
    dueAt: Date.now() + 60 * 1000,
    where: 'dm',
  };

  assert.equal(await reminders.deliverReminder(client, reminder), true);
  assert.equal(client.sent.length, 1);
  assert.equal(client.sent[0].kind, 'channel');
  assert.equal(client.sent[0].payload.content, '<@400000000000000001>');
  assert.deepEqual(client.sent[0].payload.allowedMentions, { users: ['400000000000000001'] });
});

test('reminder creation rejects invalid and out-of-range times', async () => {
  await withReminderFile(async () => {
    await assert.rejects(
      reminders.createReminder({
        userId: '400000000000000001',
        channelId: '100000000000000001',
        message: 'Too soon',
        dueAt: Date.now() + 1000,
      }),
      /between 1 minute and 30 days/,
    );

    await assert.rejects(
      reminders.createReminder({
        userId: '400000000000000001',
        channelId: '100000000000000001',
        message: '',
        dueAt: Date.now() + 10 * 60 * 1000,
      }),
      /cannot be empty/,
    );
  });
});
