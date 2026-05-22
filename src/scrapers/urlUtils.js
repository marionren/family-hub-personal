function normalizeHostname(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

function hostnameFromUrl(url) {
  return normalizeHostname(new URL(url).hostname);
}

module.exports = { normalizeHostname, hostnameFromUrl };
