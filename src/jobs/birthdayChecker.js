const cron = require('node-cron');
const { getDb } = require('../db');
const { suggestGifts } = require('../ai/giftSuggester');

// Run at 8 AM daily — after the scrape job (6 AM), before the family wakes up
const BIRTHDAY_CHECK_CRON = process.env.BIRTHDAY_CHECK_CRON || '0 8 * * *';

/**
 * Find all birthdays whose party is within the next 0–7 days
 * that don't yet have gift suggestions, and generate them.
 *
 * Uses 'localtime' so date comparisons match the user's wall-clock date,
 * not SQLite's UTC default (which causes off-by-one errors for UTC-offset timezones).
 * The job is idempotent: it checks for existing suggestions before calling Claude.
 */
async function runBirthdayCheck() {
  const db = getDb();

  const upcoming = db.prepare(`
    SELECT b.*
    FROM birthdays b
    WHERE b.party_date >= date('now', 'localtime')
      AND b.party_date <= date('now', 'localtime', '+7 days')
      AND NOT EXISTS (
        SELECT 1 FROM gift_suggestions g WHERE g.birthday_id = b.id
      )
  `).all();

  if (upcoming.length === 0) {
    console.log('[birthdayChecker] No birthdays need suggestions today');
    return;
  }

  console.log(`[birthdayChecker] ${upcoming.length} birthday(s) need gift suggestions`);

  const insert = db.prepare(`
    INSERT INTO gift_suggestions (birthday_id, suggestion_text, source, url, price_range)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const birthday of upcoming) {
    console.log(`[birthdayChecker] Generating suggestions for ${birthday.child_name} (age ${birthday.child_age})`);
    try {
      const suggestions = await suggestGifts(birthday);

      if (suggestions.length === 0) {
        console.warn(`[birthdayChecker] No suggestions returned for ${birthday.child_name}`);
        continue;
      }

      const insertAll = db.transaction((rows) => {
        for (const s of rows) {
          insert.run(birthday.id, s.suggestion_text, s.source, s.url, s.price_range);
        }
      });
      insertAll(suggestions);

      console.log(`[birthdayChecker] ✓ ${suggestions.length} suggestions saved for ${birthday.child_name}`);
    } catch (err) {
      console.error(`[birthdayChecker] Failed for ${birthday.child_name}:`, err.message);
    }
  }
}

/**
 * Generate (or regenerate) gift suggestions for a single birthday on demand.
 * Clears existing suggestions first so the user always gets a fresh set.
 */
async function generateForBirthday(birthdayId) {
  const db = getDb();
  const birthday = db.prepare('SELECT * FROM birthdays WHERE id = ?').get(birthdayId);
  if (!birthday) throw new Error(`Birthday ${birthdayId} not found`);

  // Clear stale suggestions
  db.prepare('DELETE FROM gift_suggestions WHERE birthday_id = ?').run(birthdayId);

  const suggestions = await suggestGifts(birthday);
  if (suggestions.length === 0) return 0;

  const insert = db.prepare(`
    INSERT INTO gift_suggestions (birthday_id, suggestion_text, source, url, price_range)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertAll = db.transaction((rows) => {
    for (const s of rows) {
      insert.run(birthdayId, s.suggestion_text, s.source, s.url, s.price_range);
    }
  });
  insertAll(suggestions);

  return suggestions.length;
}

function startBirthdayChecker() {
  cron.schedule(BIRTHDAY_CHECK_CRON, () => {
    console.log('[birthdayChecker] Running scheduled check...');
    runBirthdayCheck().catch(err =>
      console.error('[birthdayChecker] Scheduled run failed:', err.message)
    );
  });
  console.log(`[birthdayChecker] Scheduled: "${BIRTHDAY_CHECK_CRON}"`);

  // Also run once at startup so existing near-term birthdays get suggestions immediately
  runBirthdayCheck().catch(err =>
    console.error('[birthdayChecker] Startup check failed:', err.message)
  );
}

module.exports = { startBirthdayChecker, generateForBirthday };
