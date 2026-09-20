// Cloudflare Worker for AirBoard. Required secret: OPENROUTER_API_KEY.
// Optional variables: AIRBOARD_ALLOWED_ORIGINS, OPENROUTER_MODEL,
// AIRBOARD_MAX_REQUEST_BYTES and AIRBOARD_RATE_LIMIT_PER_MINUTE.

const CONTRACT_VERSION = 3;
const DEFAULT_ORIGINS = [
  "https://doppiaelle.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];
const rateBuckets = new Map();

function allowedOrigins(env = {}) {
  const configured = String(env.AIRBOARD_ALLOWED_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ORIGINS);
}

export function isAllowedOrigin(origin, env = {}) {
  return Boolean(origin && allowedOrigins(env).has(origin));
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
  if (isAllowedOrigin(origin, env))
    headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, env, body, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request, env) });
}

function extractObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (Array.isArray(value)) {
    for (const part of value) {
      const hit = extractObject(
        part?.json ?? part?.text ?? part?.content ?? part,
      );
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value !== "string") return null;
  const s = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(s);
  } catch {}
  const a = s.indexOf("{"),
    b = s.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(s.slice(a, b + 1));
    } catch {}
  }
  return null;
}

export function normalizeUnitsResponse(value, requestedUnits = []) {
  const object = extractObject(value),
    requested = new Set(
      requestedUnits.map((unit) => String(unit?.id || "")).filter(Boolean),
    );
  if (!object || !Array.isArray(object.units)) return null;
  const seen = new Set(),
    units = [];
  for (const unit of object.units) {
    const id = String(unit?.id || "").trim(),
      content = String(unit?.content ?? unit?.text ?? unit?.value ?? "").trim();
    if (!id || !content || !requested.has(id) || seen.has(id)) continue;
    seen.add(id);
    const raw = Number(unit.confidence),
      confidence = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.75;
    units.push({ id, content, confidence });
  }
  return units.length ? { version: CONTRACT_VERSION, units } : null;
}

function validatePayload(payload, maxBytes) {
  if (!payload || typeof payload !== "object") return "JSON object required";
  if (payload.version !== CONTRACT_VERSION)
    return `contract version ${CONTRACT_VERSION} required`;
  if (payload.mode !== "segmented-ink-refine") return "unsupported mode";
  if (!["math", "letters"].includes(payload.domain))
    return "unsupported domain";
  if (
    typeof payload.image !== "string" ||
    !payload.image.startsWith("data:image/png;base64,")
  )
    return "PNG data URL required";
  if (payload.image.length > maxBytes) return "image too large";
  if (
    !Array.isArray(payload.units) ||
    payload.units.length < 1 ||
    payload.units.length > 24
  )
    return "units must contain 1-24 items";
  if (
    payload.context !== undefined &&
    (!Array.isArray(payload.context) || payload.context.length > 48)
  )
    return "context is invalid";
  let points = 0;
  for (const unit of payload.units) {
    if (!unit || typeof unit.id !== "string" || !unit.id.trim())
      return "every unit requires an id";
    if (!Array.isArray(unit.strokes) || unit.strokes.length > 24)
      return "unit strokes are invalid";
    for (const stroke of unit.strokes) {
      if (!Array.isArray(stroke?.points) || stroke.points.length > 1200)
        return "stroke points are invalid";
      points += stroke.points.length;
      if (points > 5000) return "too many points";
    }
  }
  return null;
}

function rateLimited(request, env) {
  const limit = Math.max(
    1,
    Math.min(120, Number(env.AIRBOARD_RATE_LIMIT_PER_MINUTE) || 20),
  );
  const ip = request.headers.get("cf-connecting-ip") || "unknown",
    now = Date.now(),
    bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start >= 60000) {
    rateBuckets.set(ip, { start: now, count: 1 });
    return false;
  }
  bucket.count++;
  if (rateBuckets.size > 2000) {
    for (const [key, value] of rateBuckets) {
      if (now - value.start >= 60000) rateBuckets.delete(key);
    }
  }
  return bucket.count > limit;
}

function buildPrompt(payload) {
  const units = payload.units.map((unit) => ({
    id: unit.id,
    current: unit.current,
    alternatives: (unit.alternatives || []).slice(0, 7),
    strokeCount: unit.strokeCount,
    bounds: unit.bounds,
  }));
  const context = (payload.context || [])
    .slice(-36)
    .map((unit) => ({
      id: unit.id,
      content: unit.content,
      domain: unit.domain,
      confidence: unit.confidence,
    }));
  return `You are AirBoard's handwriting refinement engine. The image and unit metadata contain the same recent handwriting. Correct only ambiguous units and preserve every supplied id. Domain: ${payload.domain}. Locale: ${String(payload.locale || "en").slice(0, 12)}. Return JSON only, never markdown or explanations, using exactly this schema: {"version":3,"units":[{"id":"supplied id","content":"one corrected character or symbol","confidence":0.0}]}. Include each supplied unit at most once. Do not invent ids. Units: ${JSON.stringify(units)}. Prior board context: ${JSON.stringify(context)}`;
}

async function handlePost(request, env) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, env))
    return json(request, env, { error: "origin not allowed" }, 403);
  if (rateLimited(request, env))
    return json(request, env, { error: "rate limit exceeded" }, 429);
  if (
    !String(request.headers.get("content-type") || "")
      .toLowerCase()
      .includes("application/json")
  )
    return json(request, env, { error: "application/json required" }, 415);
  if (!env.OPENROUTER_API_KEY)
    return json(request, env, { error: "AI service is not configured" }, 503);
  const maxBytes = Math.max(
    100000,
    Math.min(4000000, Number(env.AIRBOARD_MAX_REQUEST_BYTES) || 1800000),
  );
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes)
    return json(request, env, { error: "request too large" }, 413);
  const raw = await request.text();
  if (raw.length > maxBytes)
    return json(request, env, { error: "request too large" }, 413);
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(request, env, { error: "invalid JSON" }, 400);
  }
  const validationError = validatePayload(payload, maxBytes);
  if (validationError)
    return json(request, env, { error: validationError }, 400);

  const body = {
    model: env.OPENROUTER_MODEL || "openrouter/free",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildPrompt(payload) },
          { type: "image_url", image_url: { url: payload.image } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 500,
    response_format: { type: "json_object" },
  };
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://doppiaelle.github.io/airboard/",
        "X-Title": "AirBoard",
      },
      body: JSON.stringify(body),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok)
    return json(
      request,
      env,
      { error: "upstream AI request failed", status: response.status },
      response.status === 429 ? 429 : 502,
    );
  const message = data?.choices?.[0]?.message,
    normalized = normalizeUnitsResponse(
      extractObject(message?.content) ||
        extractObject(message?.reasoning) ||
        extractObject(data),
      payload.units,
    );
  if (!normalized)
    return json(request, env, { error: "invalid AI response" }, 502);
  return json(request, env, normalized);
}

export default {
  async fetch(request, env) {
    if (request.method === "GET")
      return json(request, env, {
        ok: true,
        service: "AirBoard AI",
        version: CONTRACT_VERSION,
      });
    if (request.method === "OPTIONS")
      return isAllowedOrigin(request.headers.get("origin"), env)
        ? new Response(null, {
            status: 204,
            headers: corsHeaders(request, env),
          })
        : json(request, env, { error: "origin not allowed" }, 403);
    if (request.method !== "POST")
      return json(request, env, { error: "method not allowed" }, 405);
    try {
      return await handlePost(request, env);
    } catch (error) {
      console.error("AirBoard Worker error", error);
      return json(request, env, { error: "temporary worker failure" }, 500);
    }
  },
};
