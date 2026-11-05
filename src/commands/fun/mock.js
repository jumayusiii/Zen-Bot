const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder, EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { MAX_MOCK_CHARS, buildMockLine } = require('../../lib/funAdditions');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const IMAGE_NAME = 'spongebob.png';
const IMAGE_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'mock', IMAGE_NAME);
const MOCK_YELLOW = 0xfee75c;

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('mock')
    .setDescription('Mock a message or a user with a SpongeBob embed')
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription(`Message to mock (up to ${MAX_MOCK_CHARS} characters)`)
        .setMaxLength(MAX_MOCK_CHARS),
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('User to mock, or the author of the message'),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const message = interaction.options.getString('message') ?? '';
    const user = interaction.options.getUser('user');
    const line = buildMockLine({ message, user: user?.id ?? '', language });

    if (!line) {
      await interaction.reply({
        content: t(language, 'fun.mock.needTarget'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Deliberately plain: no title, author, footer or timestamp, just the
    // yellow sidebar, the generated line and the mocking image.
    const embed = new EmbedBuilder().setColor(MOCK_YELLOW).setDescription(line);
    const files = [];

    if (fs.existsSync(IMAGE_PATH)) {
      embed.setImage(`attachment://${IMAGE_NAME}`);
      files.push(new AttachmentBuilder(IMAGE_PATH, { name: IMAGE_NAME }));
    }

    await interaction.reply({ embeds: [embed], files });
  },
};
