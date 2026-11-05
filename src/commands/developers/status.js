const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { isDeveloper } = require('../../lib/developers');
const {
  applyPresence,
  clearCustomStatus,
  customStatusState,
  setCustomStatus,
} = require('../../lib/presence');

const DENIED = 'This command is restricted to the bot developer.';

module.exports = {
  developerOnly: true,

  data: new SlashCommandBuilder()
    .setName('devstatus')
    .setDescription('Developer: set the bot’s custom status beside the rich presence')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('Status text, up to 128 characters')
        .setMaxLength(128),
    )
    .addStringOption((option) =>
      option
        .setName('emoji')
        .setDescription('Optional emoji shown before the status text')
        .setMaxLength(32),
    )
    .addBooleanOption((option) =>
      option.setName('reset').setDescription('Remove the custom status'),
    ),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: DENIED, flags: MessageFlags.Ephemeral });
      return;
    }

    const text = interaction.options.getString('text');
    const emoji = interaction.options.getString('emoji') ?? '';
    const reset = interaction.options.getBoolean('reset') === true;

    if (!reset && (text === null || text.trim() === '')) {
      await interaction.reply({
        content: 'Give me a status text, or set `reset` to remove the custom status.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (reset) await clearCustomStatus();
      else await setCustomStatus({ text, emoji, userId: interaction.user.id });

      applyPresence(interaction.client);
      const state = customStatusState();

      await interaction.editReply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Developers',
            title: reset ? 'Custom status removed' : 'Custom status updated',
            description: reset
              ? 'The bot no longer shows a custom status. The rich presence is unchanged.'
              : 'Discord now shows this custom status in the member list, while the rich presence keeps running.',
            color: COLORS.danger,
            fields: state
              ? [
                  { name: '💬 Status', value: state.text, inline: false },
                  { name: '😀 Emoji', value: state.emoji || '—', inline: true },
                  { name: '🎭 Rich presence', value: 'Unchanged', inline: true },
                ]
              : [],
            footer: `Requested by ${interaction.user.username}`,
          }),
        ],
      });
    } catch (error) {
      await interaction.editReply({ content: `Could not update the status: ${error.message}` });
    }
  },
};
