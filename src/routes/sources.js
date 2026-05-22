const express = require('express');
const { getDb } = require('../db');
const { scrapeSource, scrapeAllSources } = require('../scrapers/engine');

const router = express.Router();

const VALID_CATEGORIES = new Set([
  'school','district','camp','preschool','afterschool',
  'activity','community','other','tutoring','enrichment',
]);

function validateSource({ name, url, category }) {
  if (!name || !name.trim()) return 'Name is required.';
  if (!url  || !url.trim())  return 'URL is required.';
  if (!/^https?:\/\//i.test(url.trim())) return 'URL must start with http:// or https://';
  if (!category || !VALID_CATEGORIES.has(category)) return 'Please select a valid category.';
  return null;
}

router.get('/', (req, res) => {
  const db = getDb();

  const sources = db.prepare(`
    SELECT s.*,
      l.status     AS last_scrape_status,
      l.message    AS last_scrape_message,
      l.scraped_at AS last_scrape_logged_at,
      (SELECT COUNT(*) FROM events e WHERE e.source_id = s.id) AS event_count
    FROM sources s
    LEFT JOIN scrape_logs l ON l.id = (
      SELECT id FROM scrape_logs WHERE source_id = s.id ORDER BY id DESC LIMIT 1
    )
    ORDER BY s.category, s.name
  `).all();

  res.render('sources/index', { sources, scraping: req.query.scraping === '1' });
});

router.get('/new', (req, res) => {
  res.render('sources/form', { source: null, error: null });
});

router.post('/', (req, res) => {
  const { name, url, category } = req.body;
  const error = validateSource({ name, url, category });
  if (error) {
    return res.render('sources/form', { source: { name, url, category }, error });
  }
  const db = getDb();
  db.prepare('INSERT INTO sources (name, url, category) VALUES (?, ?, ?)').run(name.trim(), url.trim(), category);
  res.redirect('/sources');
});

router.get('/:id/edit', (req, res) => {
  const db     = getDb();
  const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id);
  if (!source) return res.status(404).render('error', { message: 'Source not found.' });
  res.render('sources/form', { source, error: null });
});

// Scrape a single source now
router.post('/:id/scrape', async (req, res) => {
  const db     = getDb();
  const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id);
  if (!source) return res.status(404).json({ error: 'Not found' });
  const result = await scrapeSource(source, { force: true });
  res.json(result);
});

// Scrape all sources
router.post('/scrape-all', async (req, res) => {
  scrapeAllSources().catch(err => console.error('[routes/sources] scrape-all error:', err));
  res.redirect('/sources?scraping=1');
});

router.post('/:id', (req, res) => {
  const { name, url, category, active, _method } = req.body;
  const db     = getDb();
  const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id);
  if (!source) return res.status(404).render('error', { message: 'Source not found.' });

  if (_method === 'DELETE') {
    db.prepare('DELETE FROM sources WHERE id = ?').run(req.params.id);
    return res.redirect('/sources');
  }

  const error = validateSource({ name, url, category });
  if (error) {
    return res.render('sources/form', { source: { ...source, name, url, category }, error });
  }

  db.prepare('UPDATE sources SET name=?, url=?, category=?, active=? WHERE id=?')
    .run(name.trim(), url.trim(), category, active === 'on' ? 1 : 0, req.params.id);
  res.redirect('/sources');
});

module.exports = router;
