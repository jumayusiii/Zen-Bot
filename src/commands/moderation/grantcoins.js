const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_GRANT, grantCoins } = require('../../lib/economy');
const { sendModerationLog } = require('../../lib/moderationLogs');

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('grantcoins')
    .setDescription('Grant coins to a member from the server economy (admins only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member who should receive the coins')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription(`How many coins to grant (1–${MAX_GRANT})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_GRANT),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the coins are being granted')
        .setMaxLength(400),
    ),

  async execute(interaction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/grantcoins` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const isOwner = interaction.user.id === guild.ownerId;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isOwner && !isAdmin) {
      await interaction.reply({
        content: 'You need the **Administrator** permission or server ownership to use `/grantcoins`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    if (user.bot) {
      await interaction.reply({
        content: 'Bots do not have wallets. Choose a member instead.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';

    try {
      const result = await grantCoins({
        guildId: guild.id,
        userId: user.id,
        amount,
      });
      const targetName = user.globalName ?? user.username;

      if (result.amount === 0) {
        await interaction.reply({
          content: `**${targetName}** already has the maximum wallet balance of **${coins(result.balance)} coins**.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await sendModerationLog(interaction.client, guild.id, {
        action: 'grantcoins',
        targetId: user.id,
        targetName: user.username,
        moderatorId: interaction.user.id,
        reason,
        extra: `Granted ${coins(result.amount)} coins. New balance: ${coins(result.balance)}.`,
      });

      const embed = createEmbed(interaction.client, {
        section: 'Economy',
        title: 'Coins granted',
        description: result.capped
          ? `Added **${coins(result.amount)}** of the requested **${coins(result.requested)}** coins. The wallet is now at the maximum balance.`
          : `**${targetName}** received **${coins(result.amount)} coins**.`,
        color: COLORS.game,
        thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
        fields: [
          { name: '🎯 Member', value: `${targetName}\n\`${user.id}\``, inline: true },
          { name: '🪙 Granted', value: `**${coins(result.amount)}** coins`, inline: true },
          { name: '💰 Balance', value: `**${coins(result.balance)}** coins`, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
        ],
        footer: `Granted by ${interaction.user.username}`,
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[economy] /grantcoins failed:', error);
      await interaction.reply({
        content: error.message || 'Could not grant those coins right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
