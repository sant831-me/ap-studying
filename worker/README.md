# Spark.E Worker

Proxies Spark.E chat/image requests from `index.html` to the Anthropic API,
keeping the API key server-side instead of in the browser.

## Deploy

1. Get an Anthropic API key from https://console.anthropic.com (requires a
   billing method — this is a paid API, unlike the old free approach).
2. Install wrangler if you don't have it: `npm install -g wrangler`
3. From this `worker/` directory:
   ```
   wrangler login
   wrangler secret put ANTHROPIC_API_KEY
   ```
   (paste your key when prompted)
4. Deploy:
   ```
   wrangler deploy
   ```
5. Wrangler prints the Worker's URL, something like:
   `https://physicsos-sparke.<your-subdomain>.workers.dev`
6. Open `index.html`, find `SPARKE_API_URL` near the Spark.E section, and
   replace the placeholder with that URL.

## Updating

Any time you edit `src/index.js`, run `wrangler deploy` again from this
directory to push the change live. The URL stays the same.

## Cost

Anthropic bills per token. Claude Sonnet is a mid-tier model — cheap enough
for tutoring-scale usage, but not free. Check usage/billing at
console.anthropic.com if you want to keep an eye on it. The Worker itself is
free on Cloudflare's free plan at this traffic level.
