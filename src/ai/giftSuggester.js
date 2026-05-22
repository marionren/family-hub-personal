const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-haiku-4-5-20251001';

let client;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Generate gift suggestions for a child's birthday party.
 *
 * @param {object} birthday  Row from the birthdays table
 *   { child_name, child_age, notes }
 * @returns {Array<{suggestion_text, url, price_range, source}>}
 */
async function suggestGifts(birthday) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[giftSuggester] No ANTHROPIC_API_KEY — skipping');
    return [];
  }

  const { child_age, notes } = birthday;

  const prompt = `You are helping a parent find birthday gift ideas for a child's party.

Child turning ${child_age} years old
${notes ? `Parent's notes: ${notes}` : ''}

Generate exactly 5 specific, age-appropriate gift suggestions. For each suggestion:
- Suggest a real, buyable product (brand + model or specific item name when possible)
- Give a realistic price range for that item in 2026
- Prefer gifts in the $20–$60 range unless the age strongly suggests otherwise
- Vary the types: mix creative, educational, outdoor/active, and toy/play ideas
- For each suggestion, provide an Amazon search URL in this exact format:
  https://www.amazon.com/s?k=SEARCH+TERMS+HERE
  (replace spaces with + in the search terms, keep it specific to the product)

Return ONLY a JSON array, no explanation, no markdown fences. Each element:
{
  "suggestion_text": "Specific product name with brief description of why it suits this child",
  "price_range": "$XX–$XX",
  "url": "https://www.amazon.com/s?k=...",
  "source": "amazon"
}`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0]?.text?.trim() ?? '';
  return parseJsonSafely(raw);
}

function parseJsonSafely(raw) {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      console.warn(`[giftSuggester] Expected array, got ${typeof parsed}`);
      return [];
    }
    // Validate and coerce each suggestion
    return parsed
      .filter(s => s && typeof s.suggestion_text === 'string' && s.suggestion_text.trim())
      .map(s => ({
        suggestion_text: s.suggestion_text.trim(),
        price_range:     s.price_range   || null,
        url:             s.url           || null,
        // Schema enforces 'amazon' or 'other'
        source:          s.source === 'amazon' ? 'amazon' : 'other',
      }));
  } catch (err) {
    console.warn(`[giftSuggester] JSON parse failed: ${err.message}`);
    console.warn('[giftSuggester] Raw:', raw.slice(0, 300));
    return [];
  }
}

module.exports = { suggestGifts };
