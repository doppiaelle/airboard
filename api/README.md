# AirBoard AI Worker

Deploy `openrouter-worker.js` as a Cloudflare module Worker.

## Required secret

- `OPENROUTER_API_KEY`

## Recommended variables

- `OPENROUTER_MODEL`: a vision-capable OpenRouter model selected for production.
- `AIRBOARD_ALLOWED_ORIGINS`: comma-separated exact origins. It defaults to the AirBoard GitHub Pages origin and the two documented localhost origins.
- `AIRBOARD_MAX_REQUEST_BYTES`: request limit, default `1800000`.
- `AIRBOARD_RATE_LIMIT_PER_MINUTE`: best-effort per-isolate limit, default `20`.

The in-memory limit reduces accidental bursts but is not a distributed security boundary. Configure a Cloudflare Rate Limiting rule for the Worker route before public production use.

The browser and Worker use contract version 3. Requests and responses contain segmented ink units; the Worker may only return ids supplied by the request.
