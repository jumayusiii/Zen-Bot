const { SlashCommandBuilder } = require('discord.js');
const { BOT_VERSION, COLORS, createEmbed } = require('../../lib/embeds');

const CATEGORY_META = {
  fun: { label: '🎉 Fun', order: 0 },
  minigames: { label: '🎮 Minigames', order: 1 },
  utility: { label: '🧰 Utilities', order: 2 },
};

const OTHER_META = { label: '📦 Other', order: 99 };

function signature(command) {
  const data = command.data.toJSON();
  const options = (data.options || []).map(
    (option) => `${option.required ? '<' : '['}${option.name}${option.required ? '>' : ']'}`,
  );

  return `/${data.name}${options.length > 0 ? ` ${options.join(' ')}` : ''}`;
}

function packEntries(entries, maxLength = 1000) {
  const chunks = [];
  let current = '';

  for (const entry of entries) {
    const next = current ? `${current}\n\n${entry}` : entry;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = entry;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('helplist')
    .setDescription('List every command and what it does'),

  async execute(interaction) {
    const groups = new Map();

    for (const command of interaction.client.commands.values()) {
      const category = command.category && CATEGORY_META[command.category] ? command.category : 'other';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(command);
    }

    const fields = [];
    const sortedCategories = [...groups.keys()].sort(
      (a, b) => (CATEGORY_META[a]?.order ?? OTHER_META.order) - (CATEGORY_META[b]?.order ?? OTHER_META.order),
    );

    for (const category of sortedCategories) {
      const commands = groups.get(category).sort((a, b) => a.data.name.localeCompare(b.data.name));
      const entries = commands.map((command) => {
        const beta = command.beta ? ' · 🧪 beta' : '';
        return `**${signature(command)}**${beta}\n${command.data.description || 'No description.'}`;
      });
      const chunks = packEntries(entries);
      const label = CATEGORY_META[category]?.label ?? OTHER_META.label;

      chunks.forEach((value, index) => {
        fields.push({
          name: index === 0 ? `${label} (${commands.length})` : `${label} (cont.)`,
          value,
          inline: false,
        });
      });
    }

    const embed = createEmbed(interaction.client, {
      section: 'Command Directory',
      title: '📖 Helplist',
      description: `All **${interaction.client.commands.size} commands** in one place.\nUse Discord's slash menu to run them. 🧪 marks beta commands.\n\n\`v${BOT_VERSION}\` · see \`/changelog\` for release notes.`,
      color: COLORS.brand,
      thumbnail: interaction.client.user.displayAvatarURL({
        extension: 'png',
        size: 256,
        forceStatic: true,
      }),
      fields,
      footer: `Requested by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
