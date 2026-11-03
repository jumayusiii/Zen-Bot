const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { rateThing, rateVerdict } = require('../../lib/fun');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const BAR_WIDTH = 16;

function ratingBar(score) {
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
    .setName('rate')
    .setDescription('Give something a playful, repeatable rating')
    .addStringOption((option) =>
      option
        .setName('thing')
        .setDescription('What should be rated?')
        .setRequired(true)
        .setMaxLength(100),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const thing = interaction.options.getString('thing', true).replace(/\s+/g, ' ').trim();
    const score = rateThing(thing);
    const verdict = rateVerdict(score, language);

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.fun'),
      title: t(language, 'fun.rate.title', { thing }),
      description: [
        `**${score}/100**`,
        `\`${ratingBar(score)}\``,
        `-# ${verdict.emoji} ${verdict.label}`,
      ].join('\n'),
      color: colorFor(score),
      footer: t(language, 'fun.rate.footer'),
    });

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
