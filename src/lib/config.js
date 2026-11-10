const DEFAULT_PRESENCE_TEXT = 'use /help!';

function presenceText() {
  return process.env.PRESENCE_TEXT?.trim().slice(0, 128) || DEFAULT_PRESENCE_TEXT;
}

module.exports = {
  DEFAULT_PRESENCE_TEXT,
  presenceText,
};
