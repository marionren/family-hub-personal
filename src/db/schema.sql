PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
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

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id     INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  description   TEXT,
  event_date    TEXT,
  deadline_date TEXT,
  url           TEXT,
  tags          TEXT,   -- JSON array stored as text
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_id, title, event_date)
);

CREATE TABLE IF NOT EXISTS birthdays (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  child_name           TEXT    NOT NULL,
  child_age            INTEGER NOT NULL,
  party_date           TEXT    NOT NULL,
  invite_received_date TEXT,
  notes                TEXT,
  created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gift_suggestions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  birthday_id     INTEGER NOT NULL REFERENCES birthdays(id) ON DELETE CASCADE,
  suggestion_text TEXT    NOT NULL,
  source          TEXT    NOT NULL CHECK (source IN ('amazon','other')),
  url             TEXT,
  price_range     TEXT,
  generated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scrape_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id  INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status     TEXT    NOT NULL CHECK (status IN ('success','error')),
  message    TEXT,
  scraped_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
