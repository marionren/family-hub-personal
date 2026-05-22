const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const db    = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const events = db.prepare(`
    SELECT e.*, s.name AS source_name, s.url AS source_url, s.category
    FROM events e
    JOIN sources s ON e.source_id = s.id
    WHERE s.active = 1
      AND (
        (e.event_date    >= date('now','localtime') AND e.event_date    <= date('now','localtime','+14 days'))
        OR
        (e.deadline_date >= date('now','localtime') AND e.deadline_date <= date('now','localtime','+14 days'))
      )
    ORDER BY COALESCE(e.deadline_date, e.event_date) ASC
    LIMIT 60
  `).all();

  const birthdays = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM gift_suggestions g WHERE g.birthday_id = b.id) AS gift_count
    FROM birthdays b
    WHERE party_date >= date('now','localtime')
      AND party_date <= date('now','localtime','+21 days')
    ORDER BY party_date ASC
    LIMIT 20
  `).all();

  // Merge events + birthday reminders into one unified timeline
  const items = [];

  for (const ev of events) {
    items.push({
      kind:     ev.deadline_date ? 'deadline' : 'event',
      sortDate: ev.deadline_date || ev.event_date,
      ev,
    });
  }

  for (const b of birthdays) {
    const partyDate    = new Date(b.party_date + 'T12:00:00');
    const reminderDate = new Date(partyDate);
    reminderDate.setDate(reminderDate.getDate() - 7);
    const reminderDateStr = reminderDate.toISOString().slice(0, 10);

    if (reminderDateStr >= today) {
      items.push({ kind: 'birthday_reminder', sortDate: reminderDateStr, b });
    }
    items.push({ kind: 'birthday_party', sortDate: b.party_date, b });
  }

  items.sort((a, z) => a.sortDate.localeCompare(z.sortDate));

  res.render('dashboard/index', { items, today });
});

module.exports = router;
