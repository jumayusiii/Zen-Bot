const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getCardTheme } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getAccount } = require('../../lib/economy');

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription("Check a member's coin balance and daily streak")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to check (defaults to you)'),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/balance` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const target = interaction.options.getUser('user') ?? interaction.user;

    try {
      const account = await getAccount(interaction.guild.id, target.id);
      const theme = getCardTheme(account.theme);
      const embed = createEmbed(interaction.client, {
        section: 'Economy',
        title: `${target.username}'s wallet`,
        description: account.balance > 0
          ? `**${target.username}** has **${coins(account.balance)}** coins ready to spend.`
          : `**${target.username}** has no coins yet. Claim the first daily reward with \`/daily\`.`,
        color: COLORS.game,
        thumbnail: target.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true }),
        fields: [
          { name: '💰 Balance', value: `**${coins(account.balance)}** coins`, inline: true },
          { name: '🔥 Daily streak', value: `**${account.dailyStreak}** day${account.dailyStreak === 1 ? '' : 's'}`, inline: true },
          { name: '🎨 Card theme', value: theme.name, inline: true },
        ],
        footer: 'Per-server wallet  ·  /daily to earn  ·  /shop to spend',
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[economy] /balance failed:', error);
      await interaction.reply({
        content: 'Could not read that wallet right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
