const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  CalculatorError,
  MAX_EXPRESSION_LENGTH,
  evaluateExpression,
  formatNumber,
  normalizeExpression,
} = require('../../lib/calculator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calculate')
    .setDescription('Calculate a maths expression with + - * / % ^ and parentheses')
    .addStringOption((option) =>
      option
        .setName('expression')
        .setDescription('For example 12 * (3 + 4) or 2 ^ 10')
        .setRequired(true)
        .setMaxLength(MAX_EXPRESSION_LENGTH),
    ),

  async execute(interaction) {
    const source = normalizeExpression(interaction.options.getString('expression', true));

    try {
      const value = evaluateExpression(source);

      await interaction.reply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Utilities',
            title: 'Calculation',
            description: `\`${source}\`\n## = ${formatNumber(value)}`,
            color: COLORS.success,
            fields: [
              { name: '📥 Expression', value: `\`${source}\``, inline: false },
              { name: '🧮 Result', value: `**${formatNumber(value)}**`, inline: true },
              { name: '🙋 Requested by', value: interaction.user.username, inline: true },
            ],
            footer: '+  −  ×  ÷  %  ^  parentheses',
          }),
        ],
      });
    } catch (error) {
      if (error instanceof CalculatorError) {
        await interaction.reply({
          content: `🧮 ${error.message}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      console.error('[utility] /calculate failed:', error);
      await interaction.reply({
        content: 'Could not calculate that right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
