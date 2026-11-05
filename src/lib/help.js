const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, createEmbed } = require('./embeds');
const { isDeveloper } = require('./developers');
const { t } = require('./i18n');

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
  images: {
    id: 'images',
    label: 'Images',
    title: 'Images',
    emoji: '🖼️',
    description: 'Animal memes, xkcd comics, editable captions and Reddit thread cards, with fonts, colours and themes.',
    color: COLORS.game,
    order: 12,
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
    description: 'Chat XP, customizable rank cards and the server leaderboard.',
    color: COLORS.success,
    order: 25,
  },
  economy: {
    id: 'economy',
    label: 'Economy',
    title: 'Economy & shop',
    emoji: '💰',
    description: 'Daily, work and heist coins, coin wagers, blackjack bets, the rich list, rank card themes and your inventory.',
    color: COLORS.game,
    order: 26,
  },
  social: {
    id: 'social',
    label: 'Social',
    title: 'Social & media',
    emoji: '📱',
    description: 'Hugs, head pats, high fives and live Bluesky, Reddit, TikTok and YouTube lookups.',
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
  developers: {
    id: 'developers',
    label: 'Developers',
    title: 'Developer controls',
    emoji: '🛠️',
    description: 'Owner-only controls for the bot’s presence, custom status, avatar, banner, bio, restart and shutdown. Hidden from everyone else.',
    color: COLORS.danger,
    order: 90,
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

function metaFor(command, language = 'en') {
  const base = CATEGORY_META[command.category] ?? CATEGORY_META.other;

  return {
    ...base,
    label: t(language, `help.tabs.${base.id}`, {}, base.label),
    title: t(language, `help.categories.${base.id}.title`, {}, base.title),
    description: t(language, `help.categories.${base.id}.description`, {}, base.description),
  };
}

/**
 * Returns `[{ meta, commands }]` sorted in a stable, intentional order.
 * Commands flagged `developerOnly` are only listed for the developer account.
 */
function groupCommands(registry, language = 'en', { viewerId = null } = {}) {
  const groups = new Map();

  for (const command of registry.values()) {
    if (command.developerOnly && !isDeveloper(viewerId)) continue;

    const meta = metaFor(command, language);
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

function overviewEmbed(client, groups, requestedBy, language) {
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
    section: t(language, 'help.section', {}, 'Command Directory'),
    title: t(language, 'help.overviewTitle', {}, 'Everything the bot can do'),
    description: [
      t(language, 'help.overviewSummary', { total }, `**${total} commands**, grouped into tabs. Pick a category below.`),
      `-# ${t(language, 'help.overviewNote', { beta }, `${beta} beta commands · /changelog for release notes · 🧪 marks beta`)}`,
    ].join('\n'),
    color: COLORS.brand,
    thumbnail: client?.user?.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
    fields,
    footer: t(language, 'help.footer', { user: requestedBy }, `Requested by ${requestedBy}`),
  });
}

function categoryEmbed(client, group, requestedBy, language) {
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
      name: t(language, 'help.more', {}, '…and more'),
      value: t(
        language,
        'help.moreValue',
        { count: hidden },
        `**${hidden}** more commands are available in this category.`,
      ),
      inline: false,
    });
  }

  return createEmbed(client, {
    section: t(language, 'help.section', {}, 'Command Directory'),
    title: group.meta.title,
    description: [
      group.meta.description,
      `-# ${t(
        language,
        'help.categoryCount',
        { count: group.commands.length, beta },
        `${group.commands.length} commands · ${beta} in beta`,
      )}`,
    ].join('\n'),
    color: group.meta.color,
    fields,
    footer: t(language, 'help.footer', { user: requestedBy }, `Requested by ${requestedBy}`),
  });
}

function tabButtons(activeId, groups, language) {
  const overview = {
    ...OVERVIEW_META,
    label: t(language, 'help.tabs.overview', {}, OVERVIEW_META.label),
  };
  const tabs = [overview, ...groups.map((group) => group.meta)];
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
 * @param {string} [language]
 */
function buildHelpPayload(client, registry, view, requestedBy, language = 'en', viewerId = null) {
  const groups = groupCommands(registry, language, { viewerId });
  const activeGroup = groups.find((group) => group.meta.id === view);
  const activeId = activeGroup ? activeGroup.meta.id : OVERVIEW_META.id;

  const embed = activeGroup
    ? categoryEmbed(client, activeGroup, requestedBy, language)
    : overviewEmbed(client, groups, requestedBy, language);

  const payload = { embeds: [embed], components: [] };

  if (registry.size > 0) {
    payload.components = tabButtons(activeId, groups, language);
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
