const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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

const ANSWERS_DE = {
  positive: [
    'Ganz sicher.',
    'Ohne Zweifel.',
    'Ja — definitiv.',
    'Darauf kannst du zählen.',
    'Die Zeichen stehen auf Ja.',
    'Absolut.',
  ],
  neutral: [
    'Die Antwort ist verschwommen, frag nochmal.',
    'Frag später noch einmal.',
    'Das kann ich gerade nicht vorhersagen.',
    'Konzentriere dich und frag erneut.',
    'Die Antwort ist unklar.',
    'Vielleicht — versuch es nochmal.',
  ],
  negative: [
    'Verlass dich nicht darauf.',
    'Meine Antwort ist nein.',
    'Die Chancen stehen dagegen.',
    'Ich würde nicht darauf wetten.',
    'Sehr zweifelhaft.',
    'Nein — diesmal nicht.',
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
    const language = await getInteractionLanguage(interaction);
    const answers = language === 'de' ? ANSWERS_DE : ANSWERS;
    const question = interaction.options.getString('question', true).replace(/\s+/g, ' ').trim();
    const type = pick(Object.keys(answers));
    const answer = pick(answers[type]);

    const embed = createEmbed(interaction.client, {
      section: t(language, 'fun.eightball.section'),
      title: t(language, 'fun.eightball.title'),
      description: `> ${question}\n\n**${answer}**`,
      color: ANSWER_COLORS[type],
      footer: t(language, 'fun.eightball.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
