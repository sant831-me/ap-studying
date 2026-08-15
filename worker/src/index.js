// Cloudflare Worker: proxies Spark.E chat/image requests to the Anthropic API.
// The API key lives only in this Worker (as a secret) — it is never sent to or
// visible from the browser. The client (index.html) calls this Worker instead
// of calling any LLM API directly.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1024;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function dataUrlToAnthropicImage(url) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(url || '');
  if (!match) return null;
  return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } };
}

// Client sends OpenAI-shaped content (string, or array of {type:'text'|'image_url'}).
// Convert it to Anthropic's content shape.
function toAnthropicContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const blocks = [];
  for (const part of content) {
    if (part.type === 'text') {
      blocks.push({ type: 'text', text: part.text });
    } else if (part.type === 'image_url' && part.image_url?.url) {
      const img = dataUrlToAnthropicImage(part.image_url.url);
      if (img) blocks.push(img);
    }
  }
  return blocks;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: 'Server is not configured with an API key' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const incoming = Array.isArray(body.messages) ? body.messages : [];
    if (incoming.length === 0) {
      return jsonResponse({ error: 'messages array required' }, 400);
    }

    // Anthropic takes the system prompt as a separate top-level field, not as
    // a message in the array — pull it out of whatever the client sent.
    let system = '';
    const messages = [];
    for (const m of incoming) {
      if (m.role === 'system') {
        if (typeof m.content === 'string') system = m.content;
        continue;
      }
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      messages.push({ role, content: toAnthropicContent(m.content) });
    }
    if (messages.length === 0) {
      return jsonResponse({ error: 'No user messages to send' }, 400);
    }

    let anthropicResponse;
    try {
      anthropicResponse = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: system || undefined,
          messages,
        }),
      });
    } catch (err) {
      return jsonResponse({ error: `Could not reach Anthropic API: ${err.message}` }, 502);
    }

    let data;
    try {
      data = await anthropicResponse.json();
    } catch {
      return jsonResponse({ error: 'Anthropic API returned an unreadable response' }, 502);
    }

    if (!anthropicResponse.ok) {
      const msg = data?.error?.message || `Anthropic API returned status ${anthropicResponse.status}`;
      return jsonResponse({ error: msg }, anthropicResponse.status);
    }

    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!text) {
      return jsonResponse({ error: 'Model returned an empty response' }, 502);
    }

    return jsonResponse({ content: text });
  },
};
