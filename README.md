# Family Hub — Personal Edition

A local-first web app that automatically gathers family-relevant information daily and surfaces registration deadlines, camp windows, activity schedules, and birthday reminders in one place. Runs on your machine. Your data stays local.

This is a working prototype I built to solve my own problem as a working mom in Seattle. It's not polished software — it's a real tool I use daily. I'm sharing it so others can run it locally for their own family.

Bring your own [Anthropic API key](https://console.anthropic.com) and unlock two AI-powered features: intelligent parsing of registration deadlines and events from websites, and automatic gift suggestions for your kids' birthday party invitations — generated one week before each party so you're never scrambling at the last minute.

**A more fully-featured version** — with multi-user support, an admin panel, curated source management, and additional features — is in active development separately.

If you use this and have thoughts, open an issue. If you want to follow what's being built next, watch this repo.

---

## What it does

**Family Intelligence Dashboard**
Add the websites you want to monitor — your school district, local camps, after-school programs, community centers. The app checks them daily, extracts upcoming deadlines and registration windows using AI, and surfaces everything in one unified calendar. No more tab switching.

**Birthday Radar**
Log a birthday party invitation when it arrives. One week before the party, the app automatically generates age-appropriate gift ideas with Amazon search links. Birthdays appear on your master calendar with a 🎁 reminder so nothing falls through the cracks.

**Google Calendar Sync**
Export your calendar as a `.ics` file or subscribe via a personal `webcal://` URL. New events appear on your phone automatically as websites are refreshed — no manual syncing.

---

## Features

- Daily automated website monitoring with AI-powered event extraction
- Unified dashboard showing upcoming deadlines and registration windows
- Monthly calendar view with event details
- Birthday tracker with automatic gift suggestion generation
- Google Calendar export — one-click `.ics` download or live `webcal://` subscribe URL
- Curated seed list of Seattle-area family resources (school districts, camps, after-school programs, activities) — add your own, remove what doesn't apply
- Security controls on the monitoring engine — domain allowlist, private IP blocking, sandboxed browser, redirect detection
- No login required — runs locally, your data never leaves your machine

---

## Tech stack

- **Backend:** Node.js + Express
- **Database:** SQLite (local, never leaves your machine)
- **Website monitoring:** Cheerio (static sites) + Playwright (JS-rendered sites)
- **AI:** Claude API (Haiku) — event extraction and gift suggestions
- **Calendar export:** ical-generator
- **Scheduling:** node-cron
- **Frontend:** EJS + TailwindCSS

---

## Prerequisites

- Node.js 20+
- An Anthropic API key ([get one here](https://console.anthropic.com))

---

## Getting started

**1. Clone the repo**
```bash
git clone https://github.com/marionren/family-hub-personal.git
cd family-hub-personal
```

**2. Install dependencies**
```bash
npm install
```

**3. Install Playwright browser**
```bash
npx playwright install chromium --with-deps
```

**4. Set up environment variables**
```bash
cp .env.example .env
nano .env
```

Add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3000
SCRAPE_INTERVAL_CRON=0 6 * * *
BASE_URL=http://localhost:3000
```

**5. Set up the database and seed sources**
```bash
node src/db/bootstrap.js
```
This creates your local database and loads the curated Seattle-area source list.

**6. Start the app**
```bash
npm start
```

Open `http://localhost:3000` in your browser. That's it.

---

## Environment variables

See `.env.example` for the full list.

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key — required for AI features |
| `PORT` | Port to run the app on (default: 3000) |
| `SCRAPE_INTERVAL_CRON` | Cron schedule for daily refresh (default: 6am daily) |
| `BASE_URL` | Base URL for webcal:// feed generation |

---

## Curated seed sources

The app ships with ~50 pre-loaded Seattle-area sources across 8 categories:

| Category | Examples |
|---|---|
| School districts | Seattle Public Schools, Bellevue School District |
| Summer camps | Woodland Park Zoo, YMCA, Seattle Parks & Rec, iD Tech, Camp Galileo |
| After school | YMCA BASE, Boys & Girls Clubs |
| Activities | Pedalheads, Seattle Gymnastics Academy, swim lessons |
| Enrichment | Code Ninjas, Pacific Science Center, Seattle Children's Theatre |
| Tutoring | Kumon, Mathnasium, Russian School of Mathematics |
| Community | Seattle Parks & Rec, Bellevue Parks |
| Preschools | Selected Seattle and Bellevue providers |

Add your own sources from the Websites page. Toggle off anything that doesn't apply to your family.

---

## Privacy

- All data is stored locally in SQLite on your machine
- No user data is sent to external services except:
  - Scraped page text → Claude API for event extraction (no personal information)
  - Child age + optional notes → Claude API for gift suggestions (no names)
- Your calendar feed URL uses a cryptographic token — not guessable
- `.env` and `database.sqlite` are gitignored — no secrets or personal data ever touch GitHub

---

## Security

The monitoring engine includes several controls to protect your machine:

- **Domain allowlist** — only fetches URLs you explicitly added
- **Private IP blocking** — prevents requests to local network addresses (SSRF protection)
- **Sandboxed browser** — third-party scripts, images, and fonts blocked during page rendering
- **15-second timeout** — aborts unresponsive pages
- **Redirect detection** — aborts if a page redirects to a different domain

---

## Project structure

```
src/
  ai/          → Claude API integrations (event parser, gift suggester)
  db/          → SQLite schema, seed data, bootstrap CLI
  jobs/        → cron jobs (daily refresh, birthday checker)
  routes/      → Express routes (dashboard, websites, events, birthdays, calendar)
  scrapers/    → monitoring engine, Cheerio + Playwright adapters, security controls
  views/       → EJS templates
app.js         → Express entry point
```

---

*Built as part of a personal AI portfolio exploring how AI can reduce cognitive load for working parents — not replace human judgment, but make better use of it.*
