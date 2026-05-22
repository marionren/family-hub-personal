require('dotenv').config({ override: true });
const express = require('express');
const path = require('path');

const dashboardRoutes   = require('./src/routes/dashboard');
const sourcesRoutes     = require('./src/routes/sources');
const eventsRoutes      = require('./src/routes/events');
const birthdaysRoutes   = require('./src/routes/birthdays');
const calendarFeedRoutes = require('./src/routes/calendarFeed');
const settingsRoutes    = require('./src/routes/settings');
const { startScrapeScheduler } = require('./src/jobs/scrapeScheduler');
const { startBirthdayChecker } = require('./src/jobs/birthdayChecker');

const app  = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets
app.use(express.static(path.join(__dirname, 'src/public')));

// Routes — dashboard is the home page
app.use('/', dashboardRoutes);
app.use('/sources', sourcesRoutes);
app.use('/events', eventsRoutes);
app.use('/birthdays', birthdaysRoutes);
app.use('/calendar', calendarFeedRoutes);
app.use('/settings', settingsRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found.' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('[ERROR]', req.method, req.path, err.stack || err.message || err);
  res.status(500).render('error', { message: 'Internal server error.' });
});

// Start background jobs
startScrapeScheduler();
startBirthdayChecker();

app.listen(PORT, () => {
  console.log(`Family Intelligence Hub running at http://localhost:${PORT}`);
});

module.exports = app;
