const express = require('express');
const rateLimit = require('express-rate-limit');
const ical = require('ical-generator');
const { getDb } = require('../db');

const router = express.Router();

// ── Calendar view ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();

  const monthParam = req.query.month;
  const now   = new Date();
  let year  = now.getFullYear();
  let month = now.getMonth() + 1;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split('-').map(Number);
  }

  const firstDay = new Date(year, month - 1, 1);
  const lastDay  = new Date(year, month, 0);
  const firstStr = firstDay.toISOString().slice(0, 10);
  const lastStr  = lastDay.toISOString().slice(0, 10);

  const monthEvents = db.prepare(`
    SELECT e.*, s.name AS source_name, s.url AS source_url, s.category
    FROM events e
    JOIN sources s ON e.source_id = s.id
    WHERE s.active = 1
      AND (
        (e.event_date    >= ? AND e.event_date    <= ?) OR
        (e.deadline_date >= ? AND e.deadline_date <= ?)
      )
    ORDER BY COALESCE(e.deadline_date, e.event_date) ASC
  `).all(firstStr, lastStr, firstStr, lastStr);

  const monthBirthdays = db.prepare(`
    SELECT * FROM birthdays WHERE party_date >= ? AND party_date <= ? ORDER BY party_date ASC
  `).all(firstStr, lastStr);

  const byDate = {};
  function addToDate(dateStr, entry) {
    if (!dateStr) return;
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push(entry);
  }
  for (const ev of monthEvents) {
    if (ev.deadline_date) addToDate(ev.deadline_date, { type: 'deadline', ev });
    else                  addToDate(ev.event_date,    { type: 'event',    ev });
  }
  for (const b of monthBirthdays) {
    addToDate(b.party_date, { type: 'birthday', b });
    const rd = new Date(b.party_date + 'T12:00:00');
    rd.setDate(rd.getDate() - 7);
    const rdStr = rd.toISOString().slice(0, 10);
    if (rdStr >= firstStr && rdStr <= lastStr) {
      addToDate(rdStr, { type: 'gift_reminder', b });
    }
  }

  const prevDate  = new Date(year, month - 2, 1);
  const nextDate  = new Date(year, month, 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);
  const nextMonth = nextDate.toISOString().slice(0, 7);
  const todayStr  = now.toISOString().slice(0, 10);

  const config  = db.prepare("SELECT value FROM config WHERE key = 'calendar_token'").get();
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const webcalUrl = config
    ? `webcal://${baseUrl.replace(/^https?:\/\//, '')}/calendar/feed/${config.value}.ics`
    : null;

  res.render('calendar/index', {
    year, month, firstDay, lastDay, byDate,
    prevMonth, nextMonth, todayStr,
    monthLabel: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    webcalUrl,
  });
});

const feedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(404).end(),  // 404 not 429
});

// webcal:// subscribe feed — token validated against config table
router.get('/feed/:token.ics', feedLimiter, (req, res) => {
  const db     = getDb();
  const config = db.prepare("SELECT value FROM config WHERE key = 'calendar_token'").get();

  if (!config || config.value !== req.params.token) return res.status(404).end();

  const calendar = buildCalendar(db);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="family-calendar.ics"');
  res.send(calendar.toString());
});

// One-click .ics download
router.get('/export', (req, res) => {
  const db       = getDb();
  const calendar = buildCalendar(db);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="family-calendar.ics"');
  res.send(calendar.toString());
});

function buildCalendar(db) {
  const calendar = ical.default({ name: 'Family Intelligence Hub' });

  const events = db.prepare(`
    SELECT e.*, s.category, s.url AS source_url FROM events e
    JOIN sources s ON e.source_id = s.id
    WHERE s.active = 1
      AND (e.event_date >= date('now') OR e.deadline_date >= date('now'))
  `).all();

  for (const ev of events) {
    const date = ev.deadline_date || ev.event_date;
    if (!date) continue;
    calendar.createEvent({
      start:       new Date(date),
      allDay:      true,
      summary:     ev.title,
      description: ev.description || '',
      url:         ev.url || ev.source_url || undefined,
    });
  }

  const birthdays = db.prepare(`SELECT * FROM birthdays WHERE party_date >= date('now')`).all();

  for (const b of birthdays) {
    const partyDate    = new Date(b.party_date);
    const reminderDate = new Date(partyDate);
    reminderDate.setDate(reminderDate.getDate() - 7);

    calendar.createEvent({
      start:       reminderDate,
      allDay:      true,
      summary:     `🎁 Gift reminder (age ${b.child_age})`,
      description: b.notes || '',
    });
    calendar.createEvent({
      start:   partyDate,
      allDay:  true,
      summary: `🎂 Birthday party`,
    });
  }

  return calendar;
}

module.exports = router;
