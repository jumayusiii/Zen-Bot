const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');

const PRIMARY_API = 'https://meme-api.com/gimme';
const FALLBACK_API = 'https://api.imgflip.com/get_memes';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${new URL(url).host} responded with HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchFromMemeApi() {
  const meme = await fetchJson(PRIMARY_API);
  if (!meme?.url) throw new Error('meme-api returned no image URL');

  return {
    title: meme.title || 'Random meme',
    image: meme.url,
    link: meme.postLink,
    source: meme.subreddit ? `r/${meme.subreddit}` : 'meme-api.com',
    ups: Number(meme.ups) || 0,
    nsfw: Boolean(meme.nsfw),
  };
}

async function fetchFromImgflip() {
  const payload = await fetchJson(FALLBACK_API);
  const memes = payload?.data?.memes;

  if (!payload?.success || !Array.isArray(memes) || memes.length === 0) {
    throw new Error('Imgflip returned no memes');
  }

  const meme = memes[Math.floor(Math.random() * memes.length)];
  return {
    title: meme.name || 'Random meme',
    image: meme.url,
    link: meme.url,
    source: 'Imgflip',
    ups: 0,
    nsfw: false,
  };
}

/** Fetches a meme, retrying until it gets one suitable for the channel. */
async function fetchMeme(nsfwAllowed) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let meme;

    try {
      meme = await fetchFromMemeApi();
    } catch (error) {
      console.warn(`[meme] Primary API failed (${error.message}); trying Imgflip fallback.`);
      meme = await fetchFromImgflip();
    }

    if (nsfwAllowed || !meme.nsfw) return meme;
  }

  throw new Error('Only NSFW memes were returned for a non-NSFW channel');
}

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from the internet'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const meme = await fetchMeme(Boolean(interaction.channel?.nsfw));
      const details = [
        meme.source,
        meme.ups > 0 ? `⬆ ${meme.ups.toLocaleString('en-US')}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const embed = createEmbed(interaction.client, {
        section: 'Meme Machine',
        title: truncate(meme.title, 256),
        url: meme.link,
        image: meme.image,
        color: COLORS.fun,
        description: `Fresh from **${details}**`,
        footer: `Requested by ${interaction.user.username}`,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[meme] Could not fetch a meme:', error);
      await interaction.editReply({
        content: 'Could not fetch a meme right now. Please try again in a moment.',
      });
    }
  },
};
