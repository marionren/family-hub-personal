const express = require('express');
const { getDb } = require('../db');
const { generateForBirthday } = require('../jobs/birthdayChecker');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const birthdays = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM gift_suggestions g WHERE g.birthday_id = b.id) AS gift_count
    FROM birthdays b
    ORDER BY b.party_date ASC
  `).all();
  res.render('birthdays/index', { birthdays });
});

router.get('/new', (req, res) => {
  res.render('birthdays/form', { birthday: null, error: null });
});

router.post('/', (req, res) => {
  const { child_name, child_age, party_date, invite_received_date, notes } = req.body;
  if (!child_name || !child_age || !party_date) {
    return res.render('birthdays/form', { birthday: null, error: 'Name, age, and party date are required.' });
  }
  const db     = getDb();
  const result = db.prepare(`
    INSERT INTO birthdays (child_name, child_age, party_date, invite_received_date, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(child_name, parseInt(child_age), party_date, invite_received_date || null, notes || null);
  res.redirect(`/birthdays/${result.lastInsertRowid}`);
});

router.get('/:id', (req, res) => {
  const db       = getDb();
  const birthday = db.prepare('SELECT * FROM birthdays WHERE id = ?').get(req.params.id);
  if (!birthday) return res.status(404).render('error', { message: 'Birthday not found.' });
  const gifts    = db.prepare('SELECT * FROM gift_suggestions WHERE birthday_id = ? ORDER BY generated_at DESC').all(birthday.id);
  res.render('birthdays/detail', {
    birthday,
    gifts,
    flash:        req.query.flash || null,
    suggestCount: req.query.count || null,
  });
});

router.get('/:id/edit', (req, res) => {
  const db       = getDb();
  const birthday = db.prepare('SELECT * FROM birthdays WHERE id = ?').get(req.params.id);
  if (!birthday) return res.status(404).render('error', { message: 'Birthday not found.' });
  res.render('birthdays/form', { birthday, error: null });
});

router.post('/:id', (req, res) => {
  const { _method, child_name, child_age, party_date, invite_received_date, notes } = req.body;
  const db       = getDb();
  const birthday = db.prepare('SELECT * FROM birthdays WHERE id = ?').get(req.params.id);
  if (!birthday) return res.status(404).render('error', { message: 'Birthday not found.' });

  if (_method === 'DELETE') {
    db.prepare('DELETE FROM birthdays WHERE id = ?').run(req.params.id);
    return res.redirect('/birthdays');
  }

  if (_method === 'PUT') {
    if (!child_name || !child_age || !party_date) {
      return res.render('birthdays/form', { birthday, error: 'Name, age, and party date are required.' });
    }
    db.prepare(`
      UPDATE birthdays
      SET child_name = ?, child_age = ?, party_date = ?, invite_received_date = ?, notes = ?
      WHERE id = ?
    `).run(child_name, parseInt(child_age), party_date, invite_received_date || null, notes || null, req.params.id);
    return res.redirect(`/birthdays/${req.params.id}`);
  }

  res.redirect(`/birthdays/${req.params.id}`);
});

// POST /birthdays/:id/suggest — manual gift generation
router.post('/:id/suggest', async (req, res) => {
  const db       = getDb();
  const birthday = db.prepare('SELECT * FROM birthdays WHERE id = ?').get(req.params.id);
  if (!birthday) return res.status(404).render('error', { message: 'Birthday not found.' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.redirect(`/birthdays/${req.params.id}?flash=no_api_key`);
  }

  try {
    const count = await generateForBirthday(birthday.id);
    res.redirect(`/birthdays/${req.params.id}?flash=suggestions_generated&count=${count}`);
  } catch (err) {
    console.error('[birthdays] Gift generation failed:', err.message);
    res.redirect(`/birthdays/${req.params.id}?flash=suggest_error`);
  }
});

module.exports = router;
