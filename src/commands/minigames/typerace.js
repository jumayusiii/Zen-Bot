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
const { getInteractionLanguage, t } = require('../../lib/i18n');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function buildReadyPayload(client, game, username) {
  const language = game.language;
  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.typerace.title'),
    description: t(language, 'minigames.typerace.ready'),
    color: COLORS.game,
    fields: [
      { name: t(language, 'minigames.typerace.goal'), value: t(language, 'minigames.typerace.goalValue'), inline: true },
      { name: t(language, 'minigames.typerace.timer'), value: t(language, 'minigames.typerace.timerValue'), inline: true },
      { name: t(language, 'minigames.typerace.player'), value: username, inline: true },
    ],
    footer: t(language, 'minigames.typerace.footer'),
  });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`typerace:start:${game.id}`)
          .setLabel(t(language, 'minigames.typerace.start'))
          .setEmoji('⌨️')
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}

function buildResultPayload(client, game, username) {
  const language = game.language;
  const { correct, wpm, elapsedMs } = game.result;
  const rating = rateTyping(wpm, language);
  const lines = correct
    ? [t(language, 'minigames.typerace.wpm', { wpm }), `-# ${rating.emoji} ${rating.label}`]
    : [
        t(language, 'minigames.typerace.phraseWas', { phrase: game.phrase.text }),
        t(language, 'minigames.typerace.tryExact'),
      ];

  if (correct && game.record) {
    lines.push(
      '',
      t(
        language,
        game.record.improved ? 'minigames.typerace.newBest' : 'minigames.typerace.best',
        { time: formatDuration(game.record.entry.bestMs) },
      ),
    );
  }

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(
      language,
      correct ? 'minigames.typerace.finishedTitle' : 'minigames.typerace.missedTitle',
    ),
    description: lines.join('\n'),
    color: correct ? COLORS.success : COLORS.warning,
    fields: [
      {
        name: t(language, 'minigames.typerace.speed'),
        value: correct ? `**${wpm} WPM**` : t(language, 'minigames.typerace.unranked'),
        inline: true,
      },
      { name: t(language, 'minigames.typerace.time'), value: formatDuration(elapsedMs), inline: true },
      {
        name: t(language, 'minigames.typerace.match'),
        value: t(language, correct ? 'minigames.typerace.exact' : 'minigames.typerace.missed'),
        inline: true,
      },
    ],
    footer: t(language, 'minigames.typerace.footerAttempt', { user: username }),
  });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`typerace:again:${game.id}`)
          .setLabel(t(language, 'minigames.typerace.again'))
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}

async function openTypingModal(interaction, game) {
  const language = game.language;
  const modal = new ModalBuilder()
    .setCustomId(`typerace:submit:${game.id}`)
    .setTitle(t(language, 'minigames.typerace.modalTitle'));

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('phrase')
        .setLabel(t(language, 'minigames.typerace.modalLabel', { phrase: game.phrase.text }))
        .setPlaceholder(t(language, 'minigames.typerace.placeholder'))
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(100)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function replyExpired(interaction, language) {
  await interaction.reply({
    content: t(language, 'minigames.typerace.expired'),
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
    const language = await getInteractionLanguage(interaction);

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      language,
      phrase: randomPhrase(Math.random, null, language),
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
      await replyExpired(interaction, await getInteractionLanguage(interaction));
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(game.language, 'minigames.typerace.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action !== 'start' && action !== 'again') return;

    if (action === 'again') {
      game.phrase = randomPhrase(Math.random, game.phrase.index, game.language);
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
      await replyExpired(interaction, await getInteractionLanguage(interaction));
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(game.language, 'minigames.typerace.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!game.startedAt) {
      await interaction.reply({
        content: t(game.language, 'minigames.typerace.noTimer'),
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
