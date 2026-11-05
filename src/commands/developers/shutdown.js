const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { isDeveloper } = require('../../lib/developers');
const { DEFAULT_DELAY_SECONDS, isPm2, scheduleShutdown } = require('../../lib/shutdown');

const DENIED = 'This command is restricted to the bot developer.';

module.exports = {
  developerOnly: true,

  data: new SlashCommandBuilder()
    .setName('shutdown')
    .setDescription('Developer: shut the bot down and keep it offline'),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: DENIED, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        createEmbed(interaction.client, {
          section: 'Developers',
          title: 'Shutting down',
          description: isPm2()
            ? `The bot stops in **${DEFAULT_DELAY_SECONDS}s** and PM2 keeps it stopped. Start it again with \`pm2 start zen-bot\`.`
            : `The bot stops in **${DEFAULT_DELAY_SECONDS}s**. No PM2 supervisor was detected.`,
          color: COLORS.danger,
          footer: `Requested by ${interaction.user.username}`,
        }),
      ],
    });

    scheduleShutdown({
      delaySeconds: DEFAULT_DELAY_SECONDS,
      logger: console,
    });
  },
};
