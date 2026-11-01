const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { CARD_THEMES } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getAccount } = require('../../lib/economy');

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse rank card themes you can buy with coins'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'The shop uses per-server coins. Run `/shop` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const account = await getAccount(interaction.guild.id, interaction.user.id);
      const fields = CARD_THEMES.map((theme) => {
        const owned = account.owned.includes(theme.id);
        const price = theme.price === 0 ? 'Free' : `${coins(theme.price)} coins`;
        const current = account.theme === theme.id ? '  ·  ⭐ Equipped' : '';
        return {
          name: `${theme.name}  ·  ${price}${owned ? '  ·  ✅ Owned' : ''}${current}`,
          value: theme.description,
          inline: false,
        };
      });

      const embed = createEmbed(interaction.client, {
        section: 'Economy',
        title: 'Rank card shop',
        description: `Your balance: **${coins(account.balance)} coins**\nBuy a theme with \`/buy theme:<name>\`, then equip it with \`/rankcard theme:<name>\`.`,
        color: COLORS.game,
        fields,
        footer: 'One wallet per server  ·  /daily to earn more',
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[economy] /shop failed:', error);
      await interaction.reply({
        content: 'Could not open the shop right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
