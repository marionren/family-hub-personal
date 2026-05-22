/**
 * Run idempotent schema migrations on startup.
 * Handles upgrading an existing multi-user DB to the single-user schema.
 */
function runMigrations(db) {
  // Ensure config table exists (needed before anything else)
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const sourceCols = db.prepare('PRAGMA table_info(sources)').all().map(c => c.name);
  const eventCols  = db.prepare('PRAGMA table_info(events)').all().map(c => c.name);
  const bCols      = db.prepare('PRAGMA table_info(birthdays)').all().map(c => c.name);

  const needsSrcMig = sourceCols.includes('user_id');
  const needsEvtMig = eventCols.includes('user_id');
  const needsBdMig  = bCols.includes('user_id');

  // Also expand category CHECK on existing DBs that predate tutoring/enrichment
  const srcSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sources'").get();
  const needsCatExpand = !needsSrcMig && srcSql && !srcSql.sql.includes("'tutoring'");

  if (needsSrcMig || needsCatExpand) {
    db.exec(`
      PRAGMA foreign_keys = OFF;

      CREATE TABLE sources_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT    NOT NULL,
        url             TEXT    NOT NULL,
        category        TEXT    NOT NULL CHECK (category IN (
                          'school','district','camp','preschool',
                          'afterschool','activity','community','other',
                          'tutoring','enrichment'
                        )),
        last_scraped_at TEXT,
        active          INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO sources_new (id, name, url, category, last_scraped_at, active, created_at)
      SELECT id, name, url, category, last_scraped_at, active, created_at FROM sources;

      DROP TABLE sources;
      ALTER TABLE sources_new RENAME TO sources;

      PRAGMA foreign_keys = ON;
    `);
    console.log('[migrations] sources: removed auth columns / expanded category CHECK');
  }

  if (needsEvtMig) {
    db.exec(`
      PRAGMA foreign_keys = OFF;

      CREATE TABLE events_new (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id     INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        title         TEXT    NOT NULL,
        description   TEXT,
        event_date    TEXT,
        deadline_date TEXT,
        url           TEXT,
        tags          TEXT,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (source_id, title, event_date)
      );

      INSERT OR IGNORE INTO events_new
        (id, source_id, title, description, event_date, deadline_date, url, tags, created_at, updated_at)
      SELECT id, source_id, title, description, event_date, deadline_date, url, tags, created_at, updated_at
      FROM events;

      DROP TABLE events;
      ALTER TABLE events_new RENAME TO events;

      PRAGMA foreign_keys = ON;
    `);
    console.log('[migrations] events: removed user_id');
  }

  if (needsBdMig) {
    db.exec(`
      PRAGMA foreign_keys = OFF;

      CREATE TABLE birthdays_new (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        child_name           TEXT    NOT NULL,
        child_age            INTEGER NOT NULL,
        party_date           TEXT    NOT NULL,
        invite_received_date TEXT,
        notes                TEXT,
        created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO birthdays_new (id, child_name, child_age, party_date, invite_received_date, notes, created_at)
      SELECT id, child_name, child_age, party_date, invite_received_date, notes, created_at FROM birthdays;

      DROP TABLE birthdays;
      ALTER TABLE birthdays_new RENAME TO birthdays;

      PRAGMA foreign_keys = ON;
    `);
    console.log('[migrations] birthdays: removed user_id');
  }
}

module.exports = { runMigrations };
