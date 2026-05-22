const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TEXT_CHARS = 12000;

let client;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You are a family calendar assistant. Your job is to extract upcoming events, registration deadlines, and enrollment windows from web page text scraped from Seattle-area school, camp, and activity provider websites.

Focus on:
- Registration open/close dates
- Enrollment deadlines
- Camp session dates
- School year milestones (first day, last day, breaks, early releases, conferences)
- Activity program start dates
- Signup windows

Return ONLY a JSON array — no explanation, no markdown fences, no extra text. Each element must have exactly these fields:
{
  "title": "Short, clear event name (required)",
  "description": "One sentence context (optional, null if none)",
  "event_date": "YYYY-MM-DD if this is an event start date, else null",
  "deadline_date": "YYYY-MM-DD if this is a registration/enrollment deadline, else null",
  "url": "Most specific actionable URL for this event (see URL rules below)",
  "tags": ["array", "of", "relevant", "tags"]
}

URL rules — follow these strictly:
- PREFER the most specific URL you can find: a direct registration page, a program detail page, a signup form link, or a specific event page URL
- If the text contains a URL that looks like a registration or detail page (contains words like register, enroll, signup, camps, programs, events, schedule, calendar, session followed by an ID), use that URL
- If multiple URLs appear, pick the one closest to this specific event in the text — not the site homepage
- Use the homepage URL ONLY as a last resort when no more specific URL appears anywhere near this event in the text
- Set to null if the source URL already captures the only available link (the system will fall back to the source homepage automatically — do not repeat it)
- Never invent or construct URLs that do not appear verbatim in the scraped text

Rules:
- Skip events with no identifiable date
- Skip events that have already passed (before today's date)
- Normalize all dates to YYYY-MM-DD — interpret month names, partial dates, and relative references using today's date
- If only a month/year is given, use the 1st of that month
- A single item can have both event_date AND deadline_date if the text gives both
- Return [] if no events are found — never invent events not in the text
- Maximum 20 events per page`;

async function parseContent({ text, url, category, sourceName }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[contentParser] No ANTHROPIC_API_KEY set — skipping AI parse');
    return [];
  }

  const truncated = text.slice(0, MAX_TEXT_CHARS);
  const today = new Date().toISOString().slice(0, 10);

  const userMessage = `Today's date: ${today}
Source: ${sourceName} (${url})
Category: ${category}

--- PAGE TEXT START ---
${truncated}
--- PAGE TEXT END ---

Extract all upcoming events, registration deadlines, and enrollment windows. Return JSON array only.`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = response.content[0]?.text?.trim() ?? '';
  return parseJsonSafely(raw, url);
}

function parseJsonSafely(raw, url) {
  // Strip markdown fences if Claude wrapped the output anyway
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      console.warn(`[contentParser] Expected array from ${url}, got ${typeof parsed}`);
      return [];
    }
    return parsed.filter(ev => ev && typeof ev.title === 'string' && ev.title.trim());
  } catch (err) {
    console.warn(`[contentParser] JSON parse failed for ${url}: ${err.message}`);
    console.warn('[contentParser] Raw response:', raw.slice(0, 300));
    return [];
  }
}

module.exports = { parseContent };
