const { chromium } = require('playwright');
const { hostnameFromUrl } = require('./urlUtils');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Control 4: hard page load timeout (ms)
const PAGE_TIMEOUT_MS = 15000;

// Control 2: resource types always blocked — no content value, only attack surface
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'font', 'stylesheet', 'media']);

// Control 5: extra Chromium hardening flags
const LAUNCH_ARGS = [
  '--disable-extensions',
  '--disable-plugins',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-translate',
  '--no-first-run',
];

const NOISE_SELECTORS = 'script, style, noscript, nav, header, footer, [role="navigation"], [role="banner"], .cookie-banner, .cookie-notice, #cookie';

async function scrapeDynamic(url) {
  // Control 5: sandbox launch flags
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });

  try {
    const context = await browser.newContext({
      userAgent: UA,
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });

    // Control 3: limit page-initiated JS execution.
    //
    // Completely freezing window.eval is not possible here — Playwright's own
    // UtilityScript serializer calls window.eval internally, so overriding it
    // would break all page.evaluate() calls. Control 2 (blocking third-party
    // scripts via page.route) is the practical substitute: it prevents external
    // attack scripts from loading at all. What we CAN safely suppress are
    // browser APIs that pages commonly abuse to escape the sandbox:
    await context.addInitScript(() => {
      // Block new popup windows
      window.open = () => null;
      // Suppress dialog boxes (alert/confirm/prompt can be used for timing attacks)
      window.alert = () => undefined;
      window.confirm = () => false;
      window.prompt = () => null;
    });

    const page = await context.newPage();
    const origHostname = hostnameFromUrl(url);

    // Control 2: block unnecessary resource types + third-party scripts
    await page.route('**/*', (route) => {
      const req = route.request();
      const type = req.resourceType();
      const reqUrl = req.url();

      if (BLOCKED_RESOURCE_TYPES.has(type)) {
        return route.abort();
      }

      // Block scripts from a different domain (third-party scripts)
      if (type === 'script') {
        try {
          const reqHostname = hostnameFromUrl(reqUrl);
          if (reqHostname !== origHostname) {
            return route.abort();
          }
        } catch {
          return route.abort();  // Can't parse URL — abort to be safe
        }
      }

      return route.continue();
    });

    // Control 4: 15s hard limit on page load
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: PAGE_TIMEOUT_MS,
    });

    // Control 6: abort if the final URL after redirects is on a different domain
    if (response) {
      const finalUrl = response.url();
      const finalHostname = hostnameFromUrl(finalUrl);
      if (finalHostname !== origHostname) {
        throw new Error(
          `SECURITY_REDIRECT: ${url} redirected to different domain (${finalHostname})`
        );
      }
    }

    // Allow a short beat for late JS rendering after networkidle
    await page.waitForTimeout(800);

    await page.evaluate((selectors) => {
      document.querySelectorAll(selectors).forEach(el => el.remove());
    }, NOISE_SELECTORS);

    const text = await page.evaluate(() =>
      (document.body?.innerText || '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .filter(a => a.href && !a.href.startsWith('javascript:') && a.textContent.trim().length >= 3)
        .slice(0, 80)
        .map(a => ({ text: a.textContent.trim(), href: a.href }))
    );

    return { text, links, url };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeDynamic };
