const MAX_EXPRESSION_LENGTH = 200;
const MAX_EXPONENT = 512;

class CalculatorError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CalculatorError';
    this.code = code;
  }
}

/** Accepts the symbols people type on phones and keyboards alike. */
function normalizeExpression(input) {
  return String(input ?? '')
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(source) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (character === ' ') {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(character)) {
      const start = index;
      let dots = 0;

      while (index < source.length && /[0-9.]/.test(source[index])) {
        if (source[index] === '.') dots += 1;
        index += 1;
      }

      const raw = source.slice(start, index);
      if (dots > 1 || raw === '.') {
        throw new CalculatorError('invalid_number', `“${raw}” is not a valid number.`);
      }

      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new CalculatorError('invalid_number', `“${raw}” is too large to calculate.`);
      }

      tokens.push({ type: 'number', value });
      continue;
    }

    if ('+-*/%^()'.includes(character)) {
      tokens.push({ type: character });
      index += 1;
      continue;
    }

    throw new CalculatorError(
      'invalid_character',
      `“${character}” is not something I can calculate. Use numbers, + - * / % ^ and parentheses.`,
    );
  }

  return tokens;
}

function createParser(tokens) {
  let index = 0;

  const peek = (type) => tokens[index]?.type === type;

  function consume(type) {
    index += 1;
    return type;
  }

  function parsePrimary() {
    const token = tokens[index];
    if (!token) {
      throw new CalculatorError('unexpected_end', 'The expression ends before a number or parenthesis.');
    }

    if (token.type === 'number') {
      consume('number');
      return token.value;
    }

    if (token.type === '(') {
      consume('(');
      const value = parseExpression();
      if (!peek(')')) {
        throw new CalculatorError('missing_parenthesis', 'A closing parenthesis is missing.');
      }
      consume(')');
      return value;
    }

    throw new CalculatorError('unexpected_token', `“${token.type}” is not a valid start for a value.`);
  }

  function parsePower() {
    const base = parsePrimary();
    if (!peek('^')) return base;

    consume('^');
    const exponent = parseUnary();

    if (Math.abs(exponent) > MAX_EXPONENT) {
      throw new CalculatorError('exponent_too_large', `Keep exponents between -${MAX_EXPONENT} and ${MAX_EXPONENT}.`);
    }

    const value = base ** exponent;
    if (!Number.isFinite(value)) {
      throw new CalculatorError('result_too_large', 'That result is too large to calculate.');
    }

    return value;
  }

  function parseUnary() {
    if (peek('+')) {
      consume('+');
      return parseUnary();
    }

    if (peek('-')) {
      consume('-');
      return -parseUnary();
    }

    return parsePower();
  }

  function parseTerm() {
    let value = parseUnary();

    while (peek('*') || peek('/') || peek('%')) {
      const operator = tokens[index].type;
      consume(operator);
      const right = parseUnary();

      if ((operator === '/' || operator === '%') && right === 0) {
        throw new CalculatorError(
          'divide_by_zero',
          operator === '/' ? 'Cannot divide by zero.' : 'Cannot take a remainder by zero.',
        );
      }

      if (operator === '*') value *= right;
      else if (operator === '/') value /= right;
      else value %= right;
    }

    return value;
  }

  function parseExpression() {
    let value = parseTerm();

    while (peek('+') || peek('-')) {
      const operator = tokens[index].type;
      consume(operator);
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }

    return value;
  }

  return {
    parse() {
      if (tokens.length === 0) {
        throw new CalculatorError('empty', 'Write an expression to calculate, for example `12 * (3 + 4)`.');
      }

      const value = parseExpression();

      if (index !== tokens.length) {
        throw new CalculatorError('unexpected_token', `“${tokens[index].type}” is not expected here.`);
      }

      if (!Number.isFinite(value)) {
        throw new CalculatorError('result_too_large', 'That result is too large to calculate.');
      }

      return value;
    },
  };
}

/**
 * Evaluates a basic arithmetic expression without `eval`.
 *
 * @param {string} input
 * @returns {number}
 */
function evaluateExpression(input) {
  const source = normalizeExpression(input);

  if (!source) {
    throw new CalculatorError('empty', 'Write an expression to calculate, for example `12 * (3 + 4)`.');
  }
  if (source.length > MAX_EXPRESSION_LENGTH) {
    throw new CalculatorError('too_long', `Keep expressions under ${MAX_EXPRESSION_LENGTH} characters.`);
  }

  return createParser(tokenize(source)).parse();
}

/** Renders a result without floating-point noise such as 0.30000000000000004. */
function formatNumber(value) {
  if (!Number.isFinite(value)) {
    throw new CalculatorError('result_too_large', 'That result is too large to calculate.');
  }

  const rounded = Number(value.toPrecision(12));
  if (rounded === 0) return '0';

  if (Math.abs(rounded) >= 1e15 || Math.abs(rounded) < 1e-9) {
    return rounded.toExponential(6).replace(/\.?0+e/, 'e');
  }

  return rounded.toFixed(10).replace(/\.?0+$/, '');
}

module.exports = {
  CalculatorError,
  MAX_EXPRESSION_LENGTH,
  evaluateExpression,
  formatNumber,
  normalizeExpression,
};
