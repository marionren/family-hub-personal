const cron = require('node-cron');
const { scrapeAllSources } = require('../scrapers/engine');

const DEFAULT_CRON = '0 6 * * *';  // daily at 6am

function startScrapeScheduler() {
  const schedule = process.env.SCRAPE_INTERVAL_CRON || DEFAULT_CRON;

  if (!cron.validate(schedule)) {
    console.error(`[scheduler] Invalid cron expression: "${schedule}" — using default (${DEFAULT_CRON})`);
  }

  const expression = cron.validate(schedule) ? schedule : DEFAULT_CRON;
  console.log(`[scheduler] Scrape job scheduled: "${expression}"`);

  cron.schedule(expression, async () => {
    console.log(`[scheduler] Scrape run triggered at ${new Date().toISOString()}`);
    try {
      await scrapeAllSources();
    } catch (err) {
      console.error('[scheduler] Scrape run failed:', err.message);
    }
  });
}

module.exports = { startScrapeScheduler };
