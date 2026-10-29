const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { dmContextNote, guildFailureMessage, resolveGuild } = require('../../lib/guilds');

const BANNER_SIZE = 1024;

function bannerUrl(guild) {
  return guild.bannerURL({ extension: 'png', size: BANNER_SIZE, forceStatic: true });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverbanner')
    .setDescription('Grab this server banner and download it'),

  async execute(interaction) {
    const resolution = await resolveGuild(interaction);

    if (!resolution.guild) {
      await interaction.reply({
        content: guildFailureMessage(resolution.source),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = resolution.guild;

    if (!guild.banner) {
      await interaction.reply({
        content: 'This server does not have a banner set.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const url = bannerUrl(guild);
    const contextNote = dmContextNote(resolution.source, guild);

    const embed = createEmbed(interaction.client, {
      section: 'Server Branding',
      title: `${guild.name} — banner`,
      url,
      image: url,
      color: guild.members?.me?.displayColor || COLORS.brand,
      description: [
        `Server banner · **PNG** · ${BANNER_SIZE} px wide`,
        contextNote,
      ].filter(Boolean).join('\n\n'),
      fields: [
        { name: '🖼️ Format', value: 'PNG', inline: true },
        { name: '📐 Width', value: `${BANNER_SIZE} px`, inline: true },
        { name: '🆔 Server', value: `\`${guild.id}\``, inline: true },
      ],
      footer: `Requested by ${interaction.user.username}`,
    });

    const download = new ButtonBuilder()
      .setLabel('Download')
      .setEmoji('📥')
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(download)],
    });
  },
};
