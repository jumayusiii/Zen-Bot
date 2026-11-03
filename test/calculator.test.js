const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CalculatorError,
  evaluateExpression,
  formatNumber,
  normalizeExpression,
} = require('../src/lib/calculator');

test('calculate follows precedence, parentheses and exponents', () => {
  assert.equal(evaluateExpression('2 + 3 * 4'), 14);
  assert.equal(evaluateExpression('(2 + 3) * 4'), 20);
  assert.equal(evaluateExpression('2 ^ 3 ^ 2'), 512);
  assert.equal(evaluateExpression('-2 ^ 2'), -4);
  assert.equal(evaluateExpression('2 * -3'), -6);
  assert.equal(evaluateExpression('10 % 4'), 2);
  assert.equal(evaluateExpression('1.5 + 2.25'), 3.75);
});

test('calculate accepts common maths symbols', () => {
  assert.equal(normalizeExpression('6 × 7'), '6 * 7');
  assert.equal(evaluateExpression('6 × 7'), 42);
  assert.equal(evaluateExpression('12 ÷ 4'), 3);
  assert.equal(evaluateExpression('5 − 8'), -3);
});

test('calculate formats results without floating-point noise', () => {
  assert.equal(formatNumber(evaluateExpression('0.1 + 0.2')), '0.3');
  assert.equal(formatNumber(1 / 3), '0.3333333333');
  assert.equal(formatNumber(1200), '1200');
  assert.equal(formatNumber(-0), '0');
});

test('calculate reports invalid input instead of evaluating code', () => {
  assert.throws(
    () => evaluateExpression('1 / 0'),
    (error) => error instanceof CalculatorError && error.code === 'divide_by_zero',
  );
  assert.throws(
    () => evaluateExpression('process.exit()'),
    (error) => error instanceof CalculatorError && error.code === 'invalid_character',
  );
  assert.throws(
    () => evaluateExpression('(2 + 3'),
    (error) => error instanceof CalculatorError && error.code === 'missing_parenthesis',
  );
  assert.throws(
    () => evaluateExpression('2 +'),
    (error) => error instanceof CalculatorError && error.code === 'unexpected_end',
  );
  assert.throws(
    () => evaluateExpression('   '),
    (error) => error instanceof CalculatorError && error.code === 'empty',
  );
  assert.throws(
    () => evaluateExpression('2 ^ 1000'),
    (error) => error instanceof CalculatorError && error.code === 'exponent_too_large',
  );
});
