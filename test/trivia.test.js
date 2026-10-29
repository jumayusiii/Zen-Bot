const assert = require('node:assert/strict');
const test = require('node:test');

const { QUESTIONS, randomQuestion } = require('../src/lib/trivia');

test('the trivia bank has unique, well-formed questions', () => {
  assert.ok(QUESTIONS.length >= 15);
  assert.equal(new Set(QUESTIONS.map((question) => question.question)).size, QUESTIONS.length);

  for (const question of QUESTIONS) {
    assert.equal(typeof question.category, 'string');
    assert.ok(question.category.length > 0);
    assert.ok(question.question.length > 0 && question.question.length <= 240);
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(Number.isInteger(question.answer));
    assert.ok(question.answer >= 0 && question.answer < question.options.length);

    for (const option of question.options) {
      assert.ok(option.length > 0 && option.length <= 80);
    }
  }
});

test('randomQuestion can skip the previous question but still returns one', () => {
  const first = QUESTIONS[0].question;
  assert.notEqual(randomQuestion(() => 0, [first]).question, first);

  const everything = QUESTIONS.map((question) => question.question);
  assert.ok(randomQuestion(() => 0, everything).question.length > 0);
});

test('randomQuestion clamps its index and returns a copy of the options', () => {
  assert.equal(randomQuestion(() => 0).question, QUESTIONS[0].question);
  assert.equal(
    randomQuestion(() => 1).question,
    QUESTIONS[QUESTIONS.length - 1].question,
  );

  const selected = randomQuestion(() => 0);
  selected.options[0] = 'Mutated';
  assert.notEqual(QUESTIONS[0].options[0], 'Mutated');
});
