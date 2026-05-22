const express = require('express');
const crypto  = require('crypto');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const db      = getDb();
  const config  = db.prepare("SELECT value FROM config WHERE key = 'calendar_token'").get();
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const webcalUrl = config
    ? `webcal://${baseUrl.replace(/^https?:\/\//, '')}/calendar/feed/${config.value}.ics`
    : null;

  res.render('settings/index', {
    webcalUrl,
    flash: req.query.flash || null,
  });
});

router.post('/regenerate-calendar-token', (req, res) => {
  const db       = getDb();
  const newToken = crypto.randomBytes(32).toString('hex');
  db.prepare(`
    INSERT INTO config (key, value) VALUES ('calendar_token', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(newToken);
  res.redirect('/settings?flash=token_regenerated');
});

module.exports = router;
