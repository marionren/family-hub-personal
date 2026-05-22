#!/usr/bin/env node
// Run after setting ANTHROPIC_API_KEY in .env:
//   node test-scrape.js

require('dotenv').config();
const { scrapeStatic } = require('./src/scrapers/cheerioAdapter');
const { scrapeDynamic } = require('./src/scrapers/playwrightAdapter');
const { parseContent } = require('./src/ai/contentParser');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set in .env — add it and rerun');
  process.exit(1);
}

const TESTS = [
  {
    label: 'STATIC — SPS School Calendar',
    name: 'Seattle Public Schools — School Year Dates',
    url: 'https://www.seattleschools.org/news/school-calendar/',
    category: 'district',
    adapter: 'cheerio',
  },
  {
    label: 'DYNAMIC — Woodland Park Zoo Camps',
    name: 'Woodland Park Zoo — Summer Camps',
    url: 'https://zoo.org/camps/',
    category: 'camp',
    adapter: 'playwright',
  },
];

(async () => {
  for (const t of TESTS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${t.label}`);
    console.log(`URL:  ${t.url}`);
    console.log('='.repeat(60));

    try {
      const { text, links } = t.adapter === 'playwright'
        ? await scrapeDynamic(t.url)
        : await scrapeStatic(t.url);

      console.log(`[fetch] ${t.adapter} | text: ${text.length} chars | links: ${links.length}`);
      console.log('[fetch] Text preview:', text.slice(0, 300).replace(/\n/g, ' '));

      console.log('\n[claude] Parsing...');
      const events = await parseContent({ text, url: t.url, category: t.category, sourceName: t.name });
      console.log(`[claude] Found ${events.length} event(s)`);

      events.forEach((ev, i) => {
        console.log(`\n  [${i + 1}] ${ev.title}`);
        if (ev.event_date) console.log(`       event_date:    ${ev.event_date}`);
        if (ev.deadline_date) console.log(`       deadline_date: ${ev.deadline_date}`);
        if (ev.description) console.log(`       desc:          ${ev.description}`);
        if (ev.tags?.length) console.log(`       tags:          ${ev.tags.join(', ')}`);
      });
    } catch (err) {
      console.error(`[ERROR] ${err.message}`);
    }
  }
  console.log('\nDone.');
  process.exit(0);
})();
