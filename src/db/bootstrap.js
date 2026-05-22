#!/usr/bin/env node
// Run once to initialise the database and seed sources:
//   node src/db/bootstrap.js

require('dotenv').config();
const crypto = require('crypto');
const { getDb } = require('./index');
const { seedSources } = require('./seed');

const db = getDb();

// Generate calendar token if one doesn't exist yet
const existing = db.prepare("SELECT value FROM config WHERE key = 'calendar_token'").get();
if (!existing) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare("INSERT INTO config (key, value) VALUES ('calendar_token', ?)").run(token);
  console.log(`✓ Calendar token generated`);
} else {
  console.log(`✓ Calendar token already exists`);
}

// Seed sources (skips any URL already in the database)
const { inserted, skipped } = seedSources(db);
console.log(`✓ Sources: ${inserted} added, ${skipped} already existed`);

const config = db.prepare("SELECT value FROM config WHERE key = 'calendar_token'").get();
const base   = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
console.log(`\nCalendar subscribe URL:`);
console.log(`  webcal://${base.replace(/^https?:\/\//, '')}/calendar/feed/${config.value}.ics`);
console.log('\nRun: npm start\n');
process.exit(0);
