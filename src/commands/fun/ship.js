const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { shipScore, shipVerdict } = require('../../lib/fun');

const BAR_WIDTH = 18;

function compatibilityBar(score) {
  const filled = Math.round((score / 100) * BAR_WIDTH);
  return `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)}`;
}

function colorFor(score) {
  if (score >= 75) return COLORS.success;
  if (score >= 40) return COLORS.fun;
  return COLORS.neutral;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calculate a playful compatibility score')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The first member')
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName('second')
        .setDescription('The second member (defaults to you)'),
    ),

  async execute(interaction) {
    const first = interaction.options.getMember('user') ?? interaction.options.getUser('user');
    const second =
      interaction.options.getMember('second') ??
      interaction.options.getUser('second') ??
      interaction.member ??
      interaction.user;
    const score = shipScore(first.id, second.id);
    const verdict = shipVerdict(score);

    const embed = createEmbed(interaction.client, {
      section: 'Fun',
      title: 'Ship meter',
      description: [
        `**${first.displayName}**  +  **${second.displayName}**`,
        '',
        `**${score}%** compatibility`,
        `\`${compatibilityBar(score)}\``,
        `-# ${verdict.emoji} ${verdict.label}`,
      ].join('\n'),
      color: colorFor(score),
      thumbnail: first.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      footer: `Playful result  ·  requested by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
