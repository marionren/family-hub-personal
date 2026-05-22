const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { category, q, website } = req.query;

  let query = `
    SELECT e.*, s.name AS source_name, s.url AS source_url, s.category
    FROM events e
    JOIN sources s ON e.source_id = s.id
    WHERE s.active = 1
  `;
  const params = [];

  if (category) { query += ' AND s.category = ?'; params.push(category); }
  if (website)  { query += ' AND s.id = ?'; params.push(website); }
  if (q)        { query += ' AND (e.title LIKE ? OR e.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  query += ' ORDER BY COALESCE(e.deadline_date, e.event_date) ASC';

  const events = db.prepare(query).all(...params);

  const sources = db.prepare(`
    SELECT DISTINCT s.id, s.name
    FROM sources s
    WHERE s.active = 1
    ORDER BY s.name
  `).all();

  res.render('events/index', {
    events,
    sources,
    category: category || '',
    q:        q        || '',
    website:  website  || '',
  });
});

module.exports = router;
