const { SlashCommandBuilder } = require('discord.js');
const { BOT_VERSION, RELEASES, getLatestRelease, releaseDate, releaseTimestamp } = require('../../lib/changelog');
const { COLORS, createEmbed } = require('../../lib/embeds');

function bullets(lines) {
  return lines.map((line) => `› ${line}`).join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription("See what's new in the latest bot update"),

  async execute(interaction) {
    const release = getLatestRelease();
    const previous = RELEASES.find((entry) => entry.version !== release.version);

    const fields = [
      {
        name: '✨ Added',
        value: bullets(release.added),
        inline: false,
      },
    ];

    if (release.improved.length > 0) {
      fields.push({
        name: '🛠️ Improved',
        value: bullets(release.improved),
        inline: false,
      });
    }

    if (release.fixed.length > 0) {
      fields.push({
        name: '🐛 Fixed',
        value: bullets(release.fixed),
        inline: false,
      });
    }

    fields.push(
      { name: '📦 Bot Version', value: `\`v${release.version}\``, inline: true },
      { name: '📅 Update Date', value: releaseDate(release), inline: true },
      {
        name: '🧾 Previous',
        value: previous ? `\`v${previous.version}\`` : 'None',
        inline: true,
      },
    );

    const embed = createEmbed(interaction.client, {
      section: 'Release Notes',
      title: `What's new in v${BOT_VERSION}`,
      description: `> ${release.summary}\n\n**${release.title}**  ·  ${releaseDate(release)}`,
      color: COLORS.brand,
      thumbnail: interaction.client.user.displayAvatarURL({
        extension: 'png',
        size: 256,
        forceStatic: true,
      }),
      fields,
      footer: `Requested by ${interaction.user.username}`,
      timestamp: releaseTimestamp(release),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
