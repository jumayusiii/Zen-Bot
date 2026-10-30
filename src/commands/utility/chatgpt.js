const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  ChatGptError,
  askChatGpt,
  hasApiKey,
} = require('../../lib/chatgpt');

const QUOTA_LIMIT = 8;
const QUOTA_WINDOW_MS = 10 * 60 * 1000;
const quota = new Map();

function pruneQuota(now) {
  if (quota.size < 1000) return;
  for (const [userId, record] of quota) {
    if (record.resetAt <= now) quota.delete(userId);
  }
}

function consumeQuota(userId, now = Date.now()) {
  pruneQuota(now);

  const current = quota.get(userId);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + QUOTA_WINDOW_MS };
    quota.set(userId, fresh);
    return { allowed: true, remaining: QUOTA_LIMIT - 1, resetAt: fresh.resetAt };
  }

  if (current.count >= QUOTA_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: QUOTA_LIMIT - current.count, resetAt: current.resetAt };
}

function buildEmbed(client, result, interaction, remaining) {
  const description = result.truncated
    ? `${result.text}\n\n-# The answer was cut off at the output limit.`
    : result.text;

  return createEmbed(client, {
    section: 'AI',
    title: 'ChatGPT · beta',
    description,
    color: COLORS.info,
    fields: [
      { name: '🤖 Model', value: `\`${result.model}\``, inline: true },
      { name: '🙋 Asked by', value: interaction.user.username, inline: true },
      {
        name: '🎟️ Requests left',
        value: `**${remaining}** / ${QUOTA_LIMIT}`,
        inline: true,
      },
    ],
    footer: 'AI can make mistakes  ·  prompts are sent to OpenAI and not stored by Zen',
  });
}

function errorMessage(error) {
  if (error instanceof ChatGptError) return error.message;
  return 'ChatGPT could not answer right now. Please try again in a moment.';
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('chatgpt')
    .setDescription('Ask OpenAI’s ChatGPT a question')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('What do you want to ask? Up to 2,000 characters')
        .setRequired(true)
        .setMaxLength(2000),
    )
    .addBooleanOption((option) =>
      option
        .setName('private')
        .setDescription('Only show the answer to you'),
    ),

  async execute(interaction) {
    const prompt = interaction.options.getString('prompt', true).trim();
    const privateMode = interaction.options.getBoolean('private') === true;

    if (prompt.length < 2) {
      await interaction.reply({
        content: 'Write a prompt with at least two characters.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!hasApiKey()) {
      await interaction.reply({
        content: 'ChatGPT is not configured yet. The bot owner needs to add `OPENAI_API_KEY` to the bot’s `.env` and restart Zen.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const request = consumeQuota(interaction.user.id);
    if (!request.allowed) {
      await interaction.reply({
        content: `You have reached the limit of **${QUOTA_LIMIT}** ChatGPT requests per 10 minutes. Try again <t:${Math.ceil(request.resetAt / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply(privateMode ? { flags: MessageFlags.Ephemeral } : {});

    try {
      const result = await askChatGpt(prompt);
      await interaction.editReply({
        embeds: [buildEmbed(interaction.client, result, interaction, request.remaining)],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.warn(`[chatgpt] ${error.code ?? 'error'}: ${error.message}`);
      await interaction.editReply({ content: errorMessage(error) });
    }
  },
};
