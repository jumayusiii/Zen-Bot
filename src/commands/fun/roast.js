const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { randomRoast } = require('../../lib/fun');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Serve a playful, harmless roast')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to roast (defaults to you)'),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const targetMember = interaction.options.getMember('user') ?? interaction.member;
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const displayName = targetMember?.displayName ?? targetUser.displayName ?? targetUser.username;
    const roast = randomRoast(Math.random, null, language);

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.fun'),
      title: t(language, 'fun.roast.title'),
      description: [`**${displayName}**`, '', roast.text].join('\n'),
      color: COLORS.fun,
      thumbnail: (targetMember ?? targetUser).displayAvatarURL({
        extension: 'png',
        size: 256,
        forceStatic: true,
      }),
      fields: [
        { name: t(language, 'fun.roast.target'), value: displayName, inline: true },
        { name: t(language, 'fun.roast.heat'), value: t(language, 'fun.roast.heatValue'), inline: true },
        { name: t(language, 'fun.roast.served'), value: interaction.user.username, inline: true },
      ],
      footer: t(language, 'fun.roast.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
