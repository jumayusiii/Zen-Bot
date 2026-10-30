const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  formatDuration,
  matchesPhrase,
  randomPhrase,
  rateTyping,
  typingSpeed,
} = require('../../lib/typerace');
const { recordRace } = require('../../lib/typeraceLeaderboard');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function buildReadyPayload(client, game, username) {
  const embed = createEmbed(client, {
    section: 'Minigames',
    title: 'Type Race',
    description: [
      'Press **Start typing** when you are ready.',
      'A short phrase will appear in the typing box. Type it exactly, then submit.',
    ].join('\n'),
    color: COLORS.game,
    fields: [
      { name: '🎯 Goal', value: 'Match the phrase', inline: true },
      { name: '⏱️ Timer', value: 'Starts with the box', inline: true },
      { name: '🙋 Player', value: username, inline: true },
    ],
    footer: 'Speed is measured from opening the box to submitting  ·  /typeraceleaderboard',
  });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`typerace:start:${game.id}`)
          .setLabel('Start typing')
          .setEmoji('⌨️')
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}

function buildResultPayload(client, game, username) {
  const { correct, wpm, elapsedMs } = game.result;
  const rating = rateTyping(wpm);
  const lines = correct
    ? [`⚡ **${wpm} WPM**`, `-# ${rating.emoji} ${rating.label}`]
    : [`The phrase was **${game.phrase.text}**.`, '-# Type it exactly to score next time.'];

  if (correct && game.record) {
    lines.push(
      '',
      game.record.improved
        ? `🏅 **New personal best: ${formatDuration(game.record.entry.bestMs)}**`
        : `🏅 Personal best: **${formatDuration(game.record.entry.bestMs)}**`,
    );
  }

  const embed = createEmbed(client, {
    section: 'Minigames',
    title: correct ? 'Type Race · finished' : 'Type Race · not quite',
    description: lines.join('\n'),
    color: correct ? COLORS.success : COLORS.warning,
    fields: [
      { name: '⚡ Speed', value: correct ? `**${wpm} WPM**` : 'Unranked', inline: true },
      { name: '⏱️ Time', value: formatDuration(elapsedMs), inline: true },
      { name: '🎯 Match', value: correct ? 'Exact' : 'Missed', inline: true },
    ],
    footer: `Attempt by ${username}  ·  /typeraceleaderboard`,
  });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`typerace:again:${game.id}`)
          .setLabel('Race again')
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}

async function openTypingModal(interaction, game) {
  const modal = new ModalBuilder()
    .setCustomId(`typerace:submit:${game.id}`)
    .setTitle('Type Race');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('phrase')
        .setLabel(`Type: ${game.phrase.text}`)
        .setPlaceholder('Type the phrase exactly as shown')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(100)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This typing race has expired. Run `/typerace` to start a new one.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('typerace')
    .setDescription('Race the clock by typing a short phrase exactly'),

  async execute(interaction) {
    pruneExpired();

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      phrase: randomPhrase(),
      startedAt: null,
      result: null,
      record: null,
      updatedAt: Date.now(),
    };

    games.set(game.id, game);
    await interaction.reply(
      buildReadyPayload(interaction.client, game, interaction.user.username),
    );
  },

  async handleComponent(interaction) {
    const [, action, gameId] = interaction.customId.split(':');
    if (!gameId) return;

    pruneExpired();

    const game = games.get(gameId);
    if (!game) {
      await replyExpired(interaction);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'This typing race belongs to someone else. Run `/typerace` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action !== 'start' && action !== 'again') return;

    if (action === 'again') {
      game.phrase = randomPhrase(Math.random, game.phrase.index);
      game.result = null;
      game.record = null;
    }

    game.startedAt = Date.now();
    game.updatedAt = Date.now();

    await openTypingModal(interaction, game);
  },

  async handleModalSubmit(interaction) {
    const [, action, gameId] = interaction.customId.split(':');
    if (action !== 'submit' || !gameId) return;

    pruneExpired();

    const game = games.get(gameId);
    if (!game) {
      await replyExpired(interaction);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'This typing race belongs to someone else. Run `/typerace` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!game.startedAt) {
      await interaction.reply({
        content: 'The timer is not running. Press **Start typing** on the race message.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const typed = interaction.fields.getTextInputValue('phrase') ?? '';
    const elapsedMs = Math.max(1, Date.now() - game.startedAt);
    const correct = matchesPhrase(typed, game.phrase.text);
    const wpm = typingSpeed(game.phrase.text, elapsedMs);

    game.result = { correct, wpm, elapsedMs };
    game.startedAt = null;
    game.updatedAt = Date.now();

    if (correct && interaction.guildId) {
      try {
        game.record = await recordRace({
          guildId: interaction.guildId,
          userId: interaction.user.id,
          username: interaction.member?.displayName ?? interaction.user.username,
          elapsedMs,
          wpm,
          phrase: game.phrase.text,
          achievedAt: Date.now(),
        });
      } catch (error) {
        console.warn(`[typerace] Could not save a personal best: ${error.message}`);
      }
    }

    await interaction.reply(
      buildResultPayload(interaction.client, game, interaction.user.username),
    );
  },
};
