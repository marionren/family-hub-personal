const cheerio = require('cheerio');
const { hostnameFromUrl } = require('./urlUtils');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'nav', 'header', 'footer',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '.nav', '.navbar', '.footer', '.header', '.sidebar',
  '.cookie-banner', '.cookie-notice', '.advertisement', '.ad',
  '.social-share', '.breadcrumb', '#cookie', '#nav', '#footer', '#header',
];

async function scrapeStatic(url) {
  // Control 4: 15s hard timeout
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);

  // Control 6: abort if redirected to a different domain
  const finalHostname = hostnameFromUrl(res.url);
  const origHostname = hostnameFromUrl(url);
  if (finalHostname !== origHostname) {
    throw new Error(
      `SECURITY_REDIRECT: ${url} redirected to different domain (${finalHostname})`
    );
  }

  const html = await res.text();
  return extractContent(html, url);
}

function extractContent(html, url) {
  const $ = cheerio.load(html);
  $(NOISE_SELECTORS.join(', ')).remove();

  const text = $('body')
    .text()
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const links = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const linkText = $(el).text().trim();
    if (!linkText || linkText.length < 3) return;
    const abs = toAbsolute(href, url);
    if (abs) links.push({ text: linkText, href: abs });
  });

  return { text, links: links.slice(0, 80), url };
}

function toAbsolute(href, base) {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

module.exports = { scrapeStatic, extractContent };
