const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const polls = require('../src/lib/polls');

async function withPollFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-polls-'));
  process.env.POLLS_FILE = path.join(directory, 'polls.json');

  try {
    await run();
  } finally {
    delete process.env.POLLS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('a poll supports switching votes and toggling the same vote off', async () => {
  await withPollFile(async () => {
    const poll = await polls.createPoll({
      channelId: '100000000000000001',
      guildId: '100000000000000002',
      ownerId: '200000000000000001',
      question: 'Where should we eat?',
      labels: ['Pizza', 'Sushi', 'Tacos'],
    });

    assert.equal(poll.options.length, 3);
    assert.equal(poll.messageId, null);

    const attached = await polls.attachPollMessage(poll.id, '300000000000000001', '100000000000000001');
    assert.equal(attached.messageId, '300000000000000001');

    let result = await polls.recordVote(poll.id, '400000000000000001', 1);
    assert.equal(result.action, 'added');
    assert.deepEqual(result.poll.options[1].voters, ['400000000000000001']);

    result = await polls.recordVote(poll.id, '400000000000000001', 2);
    assert.equal(result.action, 'added');
    assert.deepEqual(result.poll.options[1].voters, []);
    assert.deepEqual(result.poll.options[2].voters, ['400000000000000001']);

    result = await polls.recordVote(poll.id, '400000000000000001', 2);
    assert.equal(result.action, 'removed');
    assert.deepEqual(result.poll.options[2].voters, []);

    const persisted = await polls.getPoll(poll.id);
    assert.equal(persisted.options.length, 3);
    assert.equal(persisted.question, 'Where should we eat?');
  });
});

test('only the poll creator can close it and closed polls reject votes', async () => {
  await withPollFile(async () => {
    const poll = await polls.createPoll({
      channelId: '100000000000000001',
      ownerId: '200000000000000001',
      question: 'Ship it?',
      labels: ['Yes', 'No'],
    });

    const forbidden = await polls.closePoll(poll.id, '299999999999999999');
    assert.equal(forbidden.error, 'forbidden');
    assert.ok(forbidden.poll);

    const closed = await polls.closePoll(poll.id, '200000000000000001');
    assert.equal(closed.error, null);
    assert.ok(closed.poll.closedAt);

    const vote = await polls.recordVote(poll.id, '299999999999999999', 0);
    assert.equal(vote.action, 'closed');
    assert.ok(vote.poll.closedAt);
  });
});

test('duplicate or insufficient poll options are rejected', async () => {
  await withPollFile(async () => {
    await assert.rejects(
      polls.createPoll({
        channelId: '100000000000000001',
        ownerId: '200000000000000001',
        question: 'Duplicate?',
        labels: ['Same', 'same'],
      }),
      /at least two different options/,
    );
  });
});

test('deleted polls are removed from persistence', async () => {
  await withPollFile(async () => {
    const poll = await polls.createPoll({
      channelId: '100000000000000001',
      ownerId: '200000000000000001',
      question: 'Temporary',
      labels: ['A', 'B'],
    });

    await polls.deletePoll(poll.id);
    assert.equal(await polls.getPoll(poll.id), null);
  });
});
