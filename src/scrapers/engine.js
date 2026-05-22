const { scrapeStatic } = require('./cheerioAdapter');
const { scrapeDynamic } = require('./playwrightAdapter');
const { parseContent } = require('../ai/contentParser');
const { getDb } = require('../db');
const { hostnameFromUrl } = require('./urlUtils');

// Text length below which we retry with Playwright (page is likely JS-rendered)
const STATIC_MIN_CHARS = 400;

// Delay between consecutive source scrapes to be a polite bot
const BETWEEN_SCRAPES_MS = 3000;

// ─── Control 1: Domain allowlist + private IP block ─────────────────────────

// Reject private/loopback/link-local addresses regardless of the allowlist.
function assertNotPrivateAddress(hostname) {
  if (hostname === 'localhost') {
    throw new Error(`SECURITY_PRIVATE_IP_BLOCK: "localhost" is a loopback address`);
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b, c, d] = ipv4.slice(1).map(Number);
    if ([a, b, c, d].some(n => n > 255)) return;
    if (
      a === 0                                   ||
      a === 10                                  ||
      a === 127                                 ||
      (a === 100 && b >= 64  && b <= 127)       ||
      (a === 169 && b === 254)                  ||
      (a === 172 && b >= 16  && b <= 31)        ||
      (a === 192 && b === 168)
    ) {
      throw new Error(`SECURITY_PRIVATE_IP_BLOCK: "${hostname}" is a private/reserved address`);
    }
  }

  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    h === '::1'                ||
    h === '0:0:0:0:0:0:0:1'  ||
    h.startsWith('fc')        ||
    h.startsWith('fd')        ||
    h.startsWith('fe80:')     ||
    h.startsWith('::ffff:')
  ) {
    throw new Error(`SECURITY_PRIVATE_IP_BLOCK: "${hostname}" is a private/reserved IPv6 address`);
  }
}

function getAllowedHostnames() {
  const db   = getDb();
  const rows = db.prepare('SELECT url FROM sources').all();
  const set  = new Set();
  for (const { url } of rows) {
    try { set.add(hostnameFromUrl(url)); } catch { /* skip malformed */ }
  }
  return set;
}

function assertDomainAllowed(url) {
  let hostname;
  try {
    hostname = hostnameFromUrl(url);
  } catch {
    throw new Error(`SECURITY_DOMAIN_BLOCK: unparseable URL "${url}"`);
  }

  assertNotPrivateAddress(hostname);

  const allowed = getAllowedHostnames();
  if (!allowed.has(hostname)) {
    throw new Error(
      `SECURITY_DOMAIN_BLOCK: "${hostname}" is not in the registered sources`
    );
  }
}
// ────────────────────────────────────────────────────────────────────────────

const SCRAPE_COOLDOWN_HOURS = 24;

async function scrapeSource(source, { force = false } = {}) {
  const db = getDb();
  let result;

  if (!force && source.last_scraped_at) {
    const ageMs = Date.now() - new Date(source.last_scraped_at).getTime();
    if (ageMs < SCRAPE_COOLDOWN_HOURS * 60 * 60 * 1000) {
      const ageHours = (ageMs / 3600000).toFixed(1);
      console.log(`[scraper] ${source.name}: skipped (scraped ${ageHours}h ago, cooldown ${SCRAPE_COOLDOWN_HOURS}h)`);
      return { ok: true, skipped: true, eventsAdded: 0 };
    }
  }

  try {
    result = await fetchContent(source);
  } catch (err) {
    const label = err.message.startsWith('SECURITY_') ? 'Security violation' : 'Fetch failed';
    logScrape(db, source.id, 'error', `${label}: ${err.message}`);
    console.warn(`[scraper] ${source.name}: ${err.message}`);
    return { ok: false, error: err.message, eventsAdded: 0 };
  }

  let events = [];
  try {
    events = await parseContent({
      text:       result.text,
      url:        source.url,
      category:   source.category,
      sourceName: source.name,
    });
  } catch (err) {
    logScrape(db, source.id, 'error', `AI parse failed: ${err.message}`);
    return { ok: false, error: err.message, eventsAdded: 0 };
  }

  const eventsAdded = writeEvents(db, source, events);

  db.prepare(`UPDATE sources SET last_scraped_at = datetime('now') WHERE id = ?`).run(source.id);
  logScrape(db, source.id, 'success', `${eventsAdded} events added (${events.length} found by AI)`);

  return { ok: true, eventsAdded, eventsFound: events.length };
}

async function fetchContent(source) {
  assertDomainAllowed(source.url);

  try {
    const result = await scrapeStatic(source.url);
    if (result.text.length >= STATIC_MIN_CHARS) {
      return { ...result, adapter: 'cheerio' };
    }
    console.log(`[scraper] ${source.name}: thin static content (${result.text.length} chars), trying Playwright`);
  } catch (err) {
    console.log(`[scraper] ${source.name}: cheerio failed (${err.message}), trying Playwright`);
  }

  const result = await scrapeDynamic(source.url);
  return { ...result, adapter: 'playwright' };
}

function writeEvents(db, source, aiEvents) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO events
      (source_id, title, description, event_date, deadline_date, url, tags, updated_at)
    VALUES
      (@sourceId, @title, @description, @eventDate, @deadlineDate, @url, @tags, datetime('now'))
  `);

  const insertMany = db.transaction((rows) => {
    let added = 0;
    for (const row of rows) {
      const info = insert.run(row);
      if (info.changes > 0) added++;
    }
    return added;
  });

  const rows = aiEvents.map(ev => ({
    sourceId:     source.id,
    title:        String(ev.title).slice(0, 300),
    description:  ev.description ? String(ev.description).slice(0, 1000) : null,
    eventDate:    normalizeDate(ev.event_date),
    deadlineDate: normalizeDate(ev.deadline_date),
    url:          ev.url ? String(ev.url).slice(0, 500) : null,
    tags:         Array.isArray(ev.tags) ? JSON.stringify(ev.tags) : null,
  }));

  return insertMany(rows);
}

function normalizeDate(val) {
  if (!val || typeof val !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
  return null;
}

function logScrape(db, sourceId, status, message) {
  try {
    db.prepare(`INSERT INTO scrape_logs (source_id, status, message) VALUES (?, ?, ?)`).run(sourceId, status, message);
  } catch (err) {
    console.error('[scraper] Failed to write scrape log:', err.message);
  }
}

async function scrapeAllSources() {
  const db      = getDb();
  const sources = db.prepare('SELECT * FROM sources WHERE active = 1 ORDER BY id').all();

  console.log(`[scraper] Starting run: ${sources.length} active source(s)`);
  const results = [];

  for (const source of sources) {
    console.log(`[scraper] Scraping: ${source.name} (${source.url})`);
    const r = await scrapeSource(source);
    results.push({ source: source.name, ...r });
    console.log(`[scraper] ${source.name}: ${r.ok ? `+${r.eventsAdded} events` : `ERROR: ${r.error}`}`);
    if (sources.indexOf(source) < sources.length - 1) {
      await sleep(BETWEEN_SCRAPES_MS);
    }
  }

  const added = results.reduce((s, r) => s + (r.eventsAdded || 0), 0);
  console.log(`[scraper] Run complete. Total events added: ${added}`);
  return results;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { scrapeSource, scrapeAllSources };
