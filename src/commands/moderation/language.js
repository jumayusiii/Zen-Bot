const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  LANGUAGES,
  getGuildLanguage,
  languageName,
  setGuildLanguage,
  t,
} = require('../../lib/i18n');

function canManage(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) === true;
}

function buildPayload(client, language, username) {
  const embed = createEmbed(client, {
    section: t(language, 'language.section'),
    title: t(language, 'language.title'),
    description: t(language, 'language.description'),
    color: COLORS.brand,
    fields: [
      {
        name: `🌐 ${t(language, 'language.current')}`,
        value: `**${languageName(language)}**`,
        inline: true,
      },
      {
        name: `🧩 ${t(language, 'language.coverage')}`,
        value: t(language, 'language.coverageValue'),
        inline: false,
      },
    ],
    footer: t(language, 'language.footer', { user: username }),
  });

  const row = new ActionRowBuilder().addComponents(
    LANGUAGES.map((entry) => new ButtonBuilder()
      .setCustomId(`language:set:${entry.id}`)
      .setLabel(entry.native)
      .setEmoji(entry.flag)
      .setStyle(entry.id === language ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(entry.id === language)),
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('Change the language Zen uses in this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'language.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getGuildLanguage(interaction.guild.id);

    if (!canManage(interaction)) {
      await interaction.reply({
        content: t(language, 'language.permission'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      ...buildPayload(interaction.client, language, interaction.user.username),
      flags: MessageFlags.Ephemeral,
    });
  },

  async handleComponent(interaction) {
    const [, action, requested] = interaction.customId.split(':');
    if (action !== 'set') return;

    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'language.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const current = await getGuildLanguage(interaction.guild.id);

    if (!canManage(interaction)) {
      await interaction.reply({
        content: t(current, 'language.permission'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await setGuildLanguage(interaction.guild.id, requested, {
      updatedBy: interaction.user.id,
    });

    await interaction.update(
      buildPayload(interaction.client, language.language, interaction.user.username),
    );
  },
};
