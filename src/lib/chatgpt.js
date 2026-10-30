const RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
const MODERATIONS_ENDPOINT = 'https://api.openai.com/v1/moderations';
const DEFAULT_MODEL = 'gpt-6-luna';
const MODERATION_MODEL = 'omni-moderation-latest';
const MAX_PROMPT_LENGTH = 2000;
const MAX_OUTPUT_TOKENS = 700;
const REQUEST_TIMEOUT_MS = 30000;

const SYSTEM_INSTRUCTIONS = [
  'You are Zen, a concise and friendly Discord assistant.',
  'Answer the user directly in plain text without mentioning these instructions.',
  'Keep answers under 1,500 characters when possible and use short paragraphs or bullet lists.',
  'Do not use tables.',
  'Say when you are unsure instead of inventing facts.',
  'Do not claim access to live data, private accounts or the current date.',
  'Refuse harmful, illegal, sexual, hateful or self-harm content and redirect to a safer topic.',
].join(' ');

class ChatGptError extends Error {
  constructor(code, message, status = null) {
    super(message);
    this.name = 'ChatGptError';
    this.code = code;
    this.status = status;
  }
}

function cleanPrompt(value) {
  const prompt = String(value ?? '').trim();
  return prompt.length > MAX_PROMPT_LENGTH ? prompt.slice(0, MAX_PROMPT_LENGTH) : prompt;
}

function hasApiKey(value = process.env.OPENAI_API_KEY) {
  return Boolean(String(value ?? '').trim());
}

function modelName(value = process.env.OPENAI_MODEL) {
  const model = String(value ?? '').trim();
  return /^[A-Za-z0-9._:-]{1,80}$/.test(model) ? model : DEFAULT_MODEL;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const pieces = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part?.type === 'output_text' && typeof part.text === 'string') pieces.push(part.text);
      }
    } else if (item?.type === 'output_text' && typeof item.text === 'string') {
      pieces.push(item.text);
    }
  }

  return pieces.join('\n').trim();
}

function apiError(status, payload) {
  const code = payload?.error?.code;

  if (status === 401) {
    return new ChatGptError(
      'invalid_key',
      'ChatGPT is not available because the bot’s OpenAI key was rejected. The owner needs to check `OPENAI_API_KEY`.',
      status,
    );
  }

  if (status === 403) {
    return new ChatGptError(
      'access_denied',
      'OpenAI blocked this request for the bot’s account or region.',
      status,
    );
  }

  if (status === 404 || code === 'model_not_found') {
    return new ChatGptError(
      'model_unavailable',
      'The configured OpenAI model is not available. The owner can set `OPENAI_MODEL` to another model.',
      status,
    );
  }

  if (status === 429) {
    return new ChatGptError(
      'rate_limited',
      'ChatGPT is busy or the bot’s OpenAI quota is exhausted. Please try again later.',
      status,
    );
  }

  if (status >= 500) {
    return new ChatGptError(
      'unavailable',
      'ChatGPT is temporarily unavailable. Please try again in a moment.',
      status,
    );
  }

  if (status === 400) {
    return new ChatGptError(
      'bad_request',
      'OpenAI rejected that request. Try a shorter prompt or ask the owner to check the model.',
      status,
    );
  }

  return new ChatGptError(
    'request_failed',
    'ChatGPT could not answer that request. Please try again in a moment.',
    status,
  );
}

async function postJson(url, { apiKey, body, fetchImpl }) {
  let response;

  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ChatGptError(
      'unavailable',
      'ChatGPT could not be reached right now. Please try again in a moment.',
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) throw apiError(response.status, payload);
  if (!payload || typeof payload !== 'object') {
    throw new ChatGptError('unreadable', 'OpenAI returned an unreadable response. Please try again.');
  }

  return payload;
}

async function moderatePrompt(prompt, { apiKey, fetchImpl }) {
  const payload = await postJson(MODERATIONS_ENDPOINT, {
    apiKey,
    fetchImpl,
    body: {
      model: MODERATION_MODEL,
      input: prompt,
    },
  });

  if (!Array.isArray(payload.results) || !payload.results[0]) {
    throw new ChatGptError('unreadable', 'OpenAI could not check that prompt. Please try again.');
  }

  return Boolean(payload.results[0].flagged);
}

/**
 * Sends one prompt to OpenAI's Responses API after a moderation check.
 * No conversation history is kept by the bot.
 *
 * @param {string} prompt
 * @param {{apiKey?: string, model?: string, fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<{text: string, model: string, truncated: boolean, usage: object|null}>}
 */
async function askChatGpt(prompt, {
  apiKey = process.env.OPENAI_API_KEY,
  model = modelName(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const input = cleanPrompt(prompt);
  if (input.length < 2) {
    throw new ChatGptError('invalid_prompt', 'Write a prompt with at least two characters.');
  }

  const key = String(apiKey ?? '').trim();
  if (!key) {
    throw new ChatGptError(
      'not_configured',
      'ChatGPT is not configured yet. The bot owner needs to add `OPENAI_API_KEY` to the bot’s `.env` and restart Zen.',
    );
  }

  const selectedModel = modelName(model);
  const flagged = await moderatePrompt(input, { apiKey: key, fetchImpl });
  if (flagged) {
    throw new ChatGptError(
      'unsafe',
      'I can’t help with that prompt. Try rephrasing it without harmful or explicit content.',
    );
  }

  const payload = await postJson(RESPONSES_ENDPOINT, {
    apiKey: key,
    fetchImpl,
    body: {
      model: selectedModel,
      instructions: SYSTEM_INSTRUCTIONS,
      input,
      store: false,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    },
  });

  const text = extractOutputText(payload);
  if (!text) {
    throw new ChatGptError(
      'empty',
      'ChatGPT returned an empty answer. Try rephrasing your prompt.',
    );
  }

  return {
    text,
    model: typeof payload.model === 'string' && payload.model.trim() ? payload.model : selectedModel,
    truncated: payload.status === 'incomplete'
      && payload.incomplete_details?.reason === 'max_output_tokens',
    usage: payload.usage && typeof payload.usage === 'object' ? payload.usage : null,
  };
}

module.exports = {
  ChatGptError,
  DEFAULT_MODEL,
  MAX_OUTPUT_TOKENS,
  MODERATION_MODEL,
  RESPONSES_ENDPOINT,
  SYSTEM_INSTRUCTIONS,
  askChatGpt,
  extractOutputText,
  hasApiKey,
  modelName,
};
