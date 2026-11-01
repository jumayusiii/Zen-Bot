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
    .setName('inventory')
    .setDescription('See the rank card themes you own'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Your inventory is per server. Run `/inventory` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const account = await getAccount(interaction.guild.id, interaction.user.id);
      const current = getCardTheme(account.theme);
      const owned = account.owned
        .map((id) => getCardTheme(id).name)
        .join('  ·  ');

      const embed = createEmbed(interaction.client, {
        section: 'Economy',
        title: 'Your inventory',
        description: `You own **${account.owned.length}** rank card theme${account.owned.length === 1 ? '' : 's'}.`,
        color: COLORS.game,
        fields: [
          { name: '🎨 Equipped', value: current.name, inline: true },
          { name: '💰 Balance', value: `${coins(account.balance)} coins`, inline: true },
          { name: '🖼️ Owned themes', value: owned, inline: false },
        ],
        footer: 'Change your card with /rankcard  ·  Find more in /shop',
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[economy] /inventory failed:', error);
      await interaction.reply({
        content: 'Could not read your inventory right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
