const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require('discord.js');
const { BOT_VERSION, COLORS, createEmbed } = require('../../lib/embeds');
const pkg = require('../../../package.json');

// View Channels, Send Messages, Embed Links, Attach Files and Read Message History.
const PERMISSIONS = 117760;

function sourceUrl() {
  const raw = pkg.repository?.url ?? pkg.homepage ?? '';
  return raw.replace(/^git\+/, '').replace(/\.git$/, '').replace(/#.*$/, '');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the link to add the bot to another server'),

  async execute(interaction) {
    const client = interaction.client;
    const clientId = client.application?.id ?? client.user.id;
    const invite = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${PERMISSIONS}&scope=bot%20applications.commands`;
    const source = sourceUrl();

    const embed = createEmbed(client, {
      section: 'Public Beta',
      title: 'Add the bot to your server',
      description: [
        `**${client.user.username}** is in open beta. Use the button below to install it with the permissions it needs.`,
        `-# Slash commands are registered globally and can take a moment to appear.`,
      ].join('\n'),
      color: COLORS.brand,
      thumbnail: client.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields: [
        { name: '🌐 Servers', value: client.guilds.cache.size.toLocaleString('en-US'), inline: true },
        { name: '⌨️ Commands', value: client.commands.size.toLocaleString('en-US'), inline: true },
        { name: '📦 Version', value: `\`v${BOT_VERSION}\``, inline: true },
        {
          name: '🛡️ Permissions',
          value: 'View Channels · Send Messages · Embed Links · Attach Files · Read Message History',
          inline: false,
        },
      ],
      footer: `Requested by ${interaction.user.username}`,
    });

    const buttons = [
      new ButtonBuilder()
        .setLabel('Add to server')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Link)
        .setURL(invite),
    ];

    if (source) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Source code')
          .setEmoji('💻')
          .setStyle(ButtonStyle.Link)
          .setURL(source),
      );
    }

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(buttons)],
    });
  },
};
