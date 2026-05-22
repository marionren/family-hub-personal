# Family Intelligence Hub

A personal web app that aggregates publicly available family-relevant information from across the web — school calendars, camp registration windows, activity deadlines, community events — and organizes it into one unified dashboard and calendar. Built for working moms who are drowning not in a lack of information, but in the cognitive load of tracking it all.

---

## What it does

**Family Intelligence Dashboard**
Monitors a curated list of Seattle-area sources (schools, districts, camps, after-school programs, community orgs) on a daily schedule. AI extracts registration deadlines and key dates from raw web pages and surfaces them in a unified calendar with clickable Register links — no more tab switching.

**Birthday Radar**
Log a birthday party invitation and the app automatically generates age-appropriate Amazon gift suggestions one week before the party. Birthdays appear on the master calendar with a 🎁 reminder so nothing falls through the cracks.

**Google Calendar Sync**
Export your calendar as a `.ics` file or subscribe via a personal `webcal://` URL — new events appear on your phone automatically as sources are scraped.

**Multi-user with Admin Controls**
Invite-only access. Super admin can manage users, reset passwords, and curate the global source list. Each user can toggle sources on or off based on what's relevant to their family.

---

## Tech stack

- **Backend:** Node.js + Express
- **Database:** SQLite (local, never leaves your machine)
- **Scraping:** Cheerio (static sites) + Playwright (JS-rendered sites)
- **AI:** Claude API — Sonnet for content parsing, Haiku for gift suggestions
- **Auth:** bcrypt + express-session
- **Calendar export:** ical-generator
- **Scheduling:** node-cron
- **Frontend:** EJS + TailwindCSS

---

## Security

- Domain allowlist — scraper only fetches URLs explicitly added by users
- Private IP blocking — prevents SSRF attacks against local network devices
- Sandboxed Chromium — third-party scripts, images, fonts blocked during scraping
- 15-second hard timeout per scrape
- Cross-domain redirect detection — aborts if a page redirects to a different domain
- Calendar feed URLs use 64-character cryptographic tokens — not guessable
- `.env` and `database.sqlite` are gitignored — no secrets or personal data ever touch GitHub

---

## Privacy

All user data is stored locally in SQLite on the host machine. The only data sent to external services:
- Scraped page text → Claude API (content parsing, no PII)
- Child age + optional notes → Claude API (gift suggestions, no names)

No analytics, no tracking, no third-party data sharing.

---

## Running locally

**Prerequisites:** Node.js 20+

**1. Clone and install**
```bash
git clone https://github.com/marionrenoux/family-intelligence-hub.git
cd family-intelligence-hub
npm install
```

**2. Set up environment variables**
```bash
cp .env.example .env
nano .env
```
Fill in your values (see `.env.example` for required variables).

**3. Create admin account and seed sources**
```bash
node src/db/bootstrap.js
```
This creates your admin account and loads 13 curated Seattle-area sources.

**4. Start the app**
```bash
npm start
```
Open `http://localhost:3000` in your browser.

---

## Environment variables

See `.env.example` for the full list. Required:

```
ANTHROPIC_API_KEY=       # from console.anthropic.com
SESSION_SECRET=          # random 64-char hex string
PORT=3000
SCRAPE_INTERVAL_CRON=0 6 * * *
BASE_URL=http://localhost:3000
```

Never commit your `.env` file.

---

## Curated seed sources (Seattle)

The app ships with 13 pre-loaded Seattle-area sources across schools, camps, after-school programs, and community organizations — including Seattle Public Schools, YMCA Seattle, Woodland Park Zoo camps, Seattle Parks & Recreation, and Pedalheads. Users can add their own sources and toggle any source on or off.

---

## Project structure

```
src/
  ai/          → Claude API integrations (content parser, gift suggester)
  db/          → SQLite schema, migrations, seed data, bootstrap CLI
  jobs/        → cron jobs (scrape scheduler, birthday checker)
  routes/      → Express routes (dashboard, sources, events, birthdays, admin, settings)
  scrapers/    → scraping engine, Cheerio + Playwright adapters, security controls
  views/       → EJS templates
app.js         → Express entry point
```

---

*Built as part of a personal AI portfolio project exploring how AI can reduce cognitive load for working parents — not replace human judgment, but make better use of it.*
