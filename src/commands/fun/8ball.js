const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');

const ANSWERS = {
  positive: [
    'It is certain.',
    'Without a doubt.',
    'Yes — definitely.',
    'You can count on it.',
    'The signs point to yes.',
    'Absolutely.',
  ],
  neutral: [
    'Reply hazy, try again.',
    'Ask again later.',
    'I cannot predict that right now.',
    'Concentrate and ask again.',
    'The answer is unclear.',
    'Maybe — give it another try.',
  ],
  negative: [
    'Do not count on it.',
    'My reply is no.',
    'The odds are against it.',
    'I would not bet on it.',
    'Very doubtful.',
    'No — not this time.',
  ],
};

const ANSWER_COLORS = {
  positive: COLORS.success,
  neutral: COLORS.warning,
  negative: COLORS.danger,
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the Magic 8-Ball a question')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('What do you want to ask?')
        .setRequired(true)
        .setMaxLength(200),
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question', true).replace(/\s+/g, ' ').trim();
    const type = pick(Object.keys(ANSWERS));
    const answer = pick(ANSWERS[type]);

    const embed = createEmbed(interaction.client, {
      section: 'Magic 8-Ball',
      title: '🎱 The 8-Ball has spoken',
      description: `> ${question}\n\n**${answer}**`,
      color: ANSWER_COLORS[type],
      footer: `Asked by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
