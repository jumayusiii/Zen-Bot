const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { isDeveloper } = require('../../lib/developers');
const {
  DEFAULT_DELAY_SECONDS,
  MAX_DELAY_SECONDS,
  isSupervised,
  parseDelay,
  scheduleRestart,
} = require('../../lib/restart');

const DENIED = 'This command is restricted to the bot developer.';

module.exports = {
  developerOnly: true,

  data: new SlashCommandBuilder()
    .setName('devrestart')
    .setDescription('Developer: restart the bot process from Discord')
    .addIntegerOption((option) =>
      option
        .setName('delay')
        .setDescription(`Seconds to wait before restarting (default: ${DEFAULT_DELAY_SECONDS})`)
        .setMinValue(0)
        .setMaxValue(MAX_DELAY_SECONDS),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Optional reason, written to the bot log')
        .setMaxLength(200),
    ),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: DENIED, flags: MessageFlags.Ephemeral });
      return;
    }

    const delay = parseDelay(interaction.options.getInteger('delay'));
    const reason = (interaction.options.getString('reason') ?? '').replace(/\s+/g, ' ').trim();
    const supervised = isSupervised();

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        createEmbed(interaction.client, {
          section: 'Developers',
          title: 'Restart scheduled',
          description: supervised
            ? `The bot exits in **${delay}s** and PM2 starts it again automatically.`
            : `The bot exits in **${delay}s**. No PM2 supervisor was detected, so it will stay offline until it is started again.`,
          color: supervised ? COLORS.danger : COLORS.warning,
          fields: [
            { name: '⏱️ Delay', value: `${delay}s`, inline: true },
            { name: '🧭 Supervisor', value: supervised ? 'PM2 detected' : 'None detected', inline: true },
            { name: '📝 Reason', value: reason || '—', inline: false },
          ],
          footer: `Requested by ${interaction.user.username}`,
        }),
      ],
    });

    scheduleRestart({
      delaySeconds: delay,
      logger: {
        log: (message) => console.log(reason ? `${message} Reason: ${reason}` : message),
      },
    });
  },
};
