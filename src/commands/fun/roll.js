const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_DICE, MAX_SIDES, MIN_SIDES, parseDice, rollDice } = require('../../lib/dice');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
    const language = await getInteractionLanguage(interaction);
    const input = interaction.options.getString('dice')?.trim() || '1d6';
    const dice = parseDice(input);

    if (!dice) {
      await interaction.reply({
        content: [
          t(language, 'fun.roll.invalid'),
          t(language, 'fun.roll.invalidHint', {
            min: MIN_SIDES,
            max: MAX_SIDES,
            dice: MAX_DICE,
          }),
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { rolls, total } = rollDice(dice);

    const embed = createEmbed(interaction.client, {
      section: t(language, 'fun.roll.section'),
      title: t(language, 'fun.roll.title'),
      description: t(language, 'fun.roll.description', { notation: dice.notation }),
      color: COLORS.game,
      fields: [
        { name: t(language, 'fun.roll.dice'), value: `\`${dice.notation}\``, inline: true },
        { name: t(language, 'fun.roll.total'), value: `**${total}**`, inline: true },
        { name: t(language, 'fun.roll.rolls'), value: rollsText(dice, rolls), inline: false },
      ],
      footer: t(language, 'fun.roll.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
