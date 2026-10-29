const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, createEmbed } = require('./embeds');

const CATEGORY_META = Object.freeze({
  fun: {
    id: 'fun',
    label: 'Fun',
    title: 'Fun commands',
    emoji: '🎉',
    description: 'Quick commands for a laugh and a short break.',
    color: COLORS.fun,
    order: 10,
  },
  moderation: {
    id: 'moderation',
    label: 'Moderation',
    title: 'Moderation',
    emoji: '🛡️',
    description: 'Permission-aware tools for mutes, kicks, bans and reversals.',
    color: COLORS.danger,
    order: 15,
  },
  minigames: {
    id: 'minigames',
    label: 'Minigames',
    title: 'Minigames',
    emoji: '🎮',
    description: 'Playable rounds against the bot, with live buttons.',
    color: COLORS.game,
    order: 20,
  },
  levels: {
    id: 'levels',
    label: 'Levels',
    title: 'Levels & rank',
    emoji: '📈',
    description: 'Chat XP, rank cards and the server leaderboard.',
    color: COLORS.success,
    order: 25,
  },
  social: {
    id: 'social',
    label: 'Social',
    title: 'Social & media',
    emoji: '📱',
    description: 'Shareable media, starting with TikTok previews that play in Discord.',
    color: COLORS.fun,
    order: 28,
  },
  utility: {
    id: 'utility',
    label: 'Utilities',
    title: 'Utilities',
    emoji: '🧰',
    description: 'Server tools, image grabbers, reminders, monitoring and diagnostics.',
    color: COLORS.info,
    order: 30,
  },
  other: {
    id: 'other',
    label: 'Other',
    title: 'Other commands',
    emoji: '📦',
    description: 'Commands that do not belong to a named category yet.',
    color: COLORS.neutral,
    order: 99,
  },
});

const OVERVIEW_META = Object.freeze({
  id: 'overview',
  label: 'Overview',
  emoji: '🧭',
});

function metaFor(command) {
  return CATEGORY_META[command.category] ?? CATEGORY_META.other;
}

/** Returns `[{ meta, commands }]` sorted in a stable, intentional order. */
function groupCommands(registry) {
  const groups = new Map();

  for (const command of registry.values()) {
    const meta = metaFor(command);
    if (!groups.has(meta.id)) groups.set(meta.id, { meta, commands: [] });
    groups.get(meta.id).commands.push(command);
  }

  return [...groups.values()]
    .sort((a, b) => a.meta.order - b.meta.order)
    .map((group) => ({
      meta: group.meta,
      commands: group.commands.sort((a, b) => a.data.name.localeCompare(b.data.name)),
    }));
}

function signature(command) {
  const data = command.data.toJSON();
  const options = (data.options || []).map(
    (option) => `${option.required ? '<' : '['}${option.name}${option.required ? '>' : ']'}`,
  );

  return `/${data.name}${options.length > 0 ? ` ${options.join(' ')}` : ''}`;
}

function overviewEmbed(client, groups, requestedBy) {
  const total = groups.reduce((count, group) => count + group.commands.length, 0);
  const beta = groups.reduce(
    (count, group) => count + group.commands.filter((command) => command.beta).length,
    0,
  );

  const fields = groups.map((group) => ({
    name: `${group.meta.emoji} ${group.meta.label}  ·  ${group.commands.length}`,
    value: group.commands.map((command) => `\`/${command.data.name}\``).join('  ·  '),
    inline: false,
  }));

  return createEmbed(client, {
    section: 'Command Directory',
    title: 'Everything the bot can do',
    description: [
      `**${total} commands**, grouped into tabs. Pick a category below.`,
      `-# ${beta} beta command${beta === 1 ? '' : 's'}  ·  /changelog for release notes  ·  🧪 marks beta`,
    ].join('\n'),
    color: COLORS.brand,
    thumbnail: client?.user?.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
    fields,
    footer: `Requested by ${requestedBy}`,
  });
}

function categoryEmbed(client, group, requestedBy) {
  const beta = group.commands.filter((command) => command.beta).length;
  const shown = group.commands.slice(0, 25);

  const fields = shown.map((command) => ({
    name: `**${signature(command)}**${command.beta ? '  ·  🧪' : ''}`,
    value: command.data.description || 'No description.',
    inline: false,
  }));

  const hidden = group.commands.length - shown.length;
  if (hidden > 0) {
    fields.push({
      name: '…and more',
      value: `**${hidden}** more command${hidden === 1 ? '' : 's'} are available in this category.`,
      inline: false,
    });
  }

  return createEmbed(client, {
    section: 'Command Directory',
    title: group.meta.title,
    description: [
      group.meta.description,
      `-# ${group.commands.length} command${group.commands.length === 1 ? '' : 's'}  ·  ${beta} in beta`,
    ].join('\n'),
    color: group.meta.color,
    fields,
    footer: `Requested by ${requestedBy}`,
  });
}

function tabButtons(activeId, groups) {
  const tabs = [OVERVIEW_META, ...groups.map((group) => group.meta)];
  const rows = [];

  // Discord allows five buttons per row, so more than five tabs need a second row.
  for (let index = 0; index < tabs.length; index += 5) {
    rows.push(
      new ActionRowBuilder().addComponents(
        tabs.slice(index, index + 5).map((tab) =>
          new ButtonBuilder()
            .setCustomId(`helplist:view:${tab.id}`)
            .setLabel(tab.label)
            .setEmoji(tab.emoji)
            .setStyle(tab.id === activeId ? ButtonStyle.Primary : ButtonStyle.Secondary),
        ),
      ),
    );
  }

  return rows;
}

/**
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Collection<string, object>} registry
 * @param {string} view `overview` or a category id
 * @param {string} requestedBy
 */
function buildHelpPayload(client, registry, view, requestedBy) {
  const groups = groupCommands(registry);
  const activeGroup = groups.find((group) => group.meta.id === view);
  const activeId = activeGroup ? activeGroup.meta.id : OVERVIEW_META.id;

  const embed = activeGroup
    ? categoryEmbed(client, activeGroup, requestedBy)
    : overviewEmbed(client, groups, requestedBy);

  const payload = { embeds: [embed], components: [] };

  if (registry.size > 0) {
    payload.components = tabButtons(activeId, groups);
  }

  return payload;
}

module.exports = {
  CATEGORY_META,
  OVERVIEW_META,
  buildHelpPayload,
  groupCommands,
  signature,
};
