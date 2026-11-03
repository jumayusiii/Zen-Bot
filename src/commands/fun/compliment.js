const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { randomCompliment } = require('../../lib/fun');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Send someone a random compliment')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to compliment (defaults to you)'),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const targetMember = interaction.options.getMember('user') ?? interaction.member;
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const displayName = targetMember?.displayName ?? targetUser.displayName ?? targetUser.username;
    const compliment = randomCompliment(Math.random, null, language);

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.fun'),
      title: t(language, 'fun.compliment.title', { user: displayName }),
      description: compliment.text,
      color: COLORS.fun,
      thumbnail: (targetMember ?? targetUser).displayAvatarURL({
        extension: 'png',
        size: 256,
        forceStatic: true,
      }),
      footer: t(language, 'fun.compliment.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
