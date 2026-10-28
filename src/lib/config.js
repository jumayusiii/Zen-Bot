const DEFAULT_SITE_URL = 'https://habbo.gd';
const DEFAULT_SITE_LOGO_URL = 'https://cdn.habbo.gd/cms/habbo/logo.png';
const DEFAULT_PRESENCE_TEXT = 'I am Legend.';

function httpUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function siteUrl() {
  return httpUrl(process.env.SITE_URL?.trim()) ?? DEFAULT_SITE_URL;
}

function siteHost() {
  return new URL(siteUrl()).hostname;
}

function siteName() {
  const configured = process.env.SITE_NAME?.trim();
  if (configured) return configured.slice(0, 80);

  return siteHost().replace(/^www\./i, '');
}

function siteLogoUrl() {
  if (Object.prototype.hasOwnProperty.call(process.env, 'SITE_LOGO_URL')) {
    return httpUrl(process.env.SITE_LOGO_URL?.trim());
  }

  // Keep the existing habbo.gd branding unless another site is configured.
  return siteHost() === 'habbo.gd' ? DEFAULT_SITE_LOGO_URL : null;
}

function siteLogoFilename() {
  const logo = siteLogoUrl();
  if (!logo) return null;

  try {
    const name = new URL(logo).pathname.split('/').pop() || '';
    return /^[\w.-]+\.(png|jpe?g|webp|gif)$/i.test(name) ? name : 'site-logo.png';
  } catch {
    return 'site-logo.png';
  }
}

function presenceText() {
  return process.env.PRESENCE_TEXT?.trim().slice(0, 128) || DEFAULT_PRESENCE_TEXT;
}

module.exports = {
  DEFAULT_PRESENCE_TEXT,
  DEFAULT_SITE_LOGO_URL,
  DEFAULT_SITE_URL,
  presenceText,
  siteHost,
  siteLogoFilename,
  siteLogoUrl,
  siteName,
  siteUrl,
};
