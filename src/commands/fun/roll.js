const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_DICE, MAX_SIDES, MIN_SIDES, parseDice, rollDice } = require('../../lib/dice');

function rollsText(dice, rolls) {
  const modifier = dice.modifier === 0
    ? ''
    : `  ${dice.modifier > 0 ? '+' : '−'} ${Math.abs(dice.modifier)}`;

  return `${rolls.map((roll) => `\`${roll}\``).join('  +  ')}${modifier}`;
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice using compact notation like 2d6 or 1d20')
    .addStringOption((option) =>
      option
        .setName('dice')
        .setDescription('Dice to roll, for example 1d6, 2d20 or 4d6+2 (default: 1d6)')
        .setMaxLength(20),
    ),

  async execute(interaction) {
    const input = interaction.options.getString('dice')?.trim() || '1d6';
    const dice = parseDice(input);

    if (!dice) {
      await interaction.reply({
        content: [
          `Use dice notation such as \`1d6\`, \`2d20\` or \`4d6+2\`.`,
          `-# ${MIN_SIDES}–${MAX_SIDES} sides, up to ${MAX_DICE} dice, modifier up to ±100`,
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { rolls, total } = rollDice(dice);

    const embed = createEmbed(interaction.client, {
      section: 'Dice',
      title: 'Dice Roll',
      description: `Result for **\`${dice.notation}\`**.`,
      color: COLORS.game,
      fields: [
        { name: '🎲 Dice', value: `\`${dice.notation}\``, inline: true },
        { name: '📊 Total', value: `**${total}**`, inline: true },
        { name: '🎯 Rolls', value: rollsText(dice, rolls), inline: false },
      ],
      footer: `Rolled by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
