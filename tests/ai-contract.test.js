import test from "node:test";
import assert from "node:assert/strict";
import {
  AIRBOARD_AI_CONTRACT_VERSION,
  normalizeCloudRefinement,
} from "../ai-contract.js";
import worker, {
  isAllowedOrigin,
  normalizeUnitsResponse,
} from "../api/openrouter-worker.js";

test("browser accepts only a versioned units response", () => {
  assert.equal(normalizeCloudRefinement({ units: [] }), null);
  assert.deepEqual(
    normalizeCloudRefinement({
      version: AIRBOARD_AI_CONTRACT_VERSION,
      units: [
        { id: "g1", content: " 7 ", confidence: 2 },
        { id: "", content: "x" },
      ],
    }),
    {
      version: AIRBOARD_AI_CONTRACT_VERSION,
      units: [{ id: "g1", content: "7", confidence: 1 }],
    },
  );
});

test("worker keeps only requested ids and clamps confidence", () => {
  const output = normalizeUnitsResponse(
    {
      units: [
        { id: "g1", content: "8", confidence: -1 },
        { id: "invented", content: "9", confidence: 0.8 },
        { id: "g1", content: "3", confidence: 0.9 },
      ],
    },
    [{ id: "g1" }],
  );
  assert.deepEqual(output, {
    version: AIRBOARD_AI_CONTRACT_VERSION,
    units: [{ id: "g1", content: "8", confidence: 0 }],
  });
});

test("origin allowlist is explicit and configurable", () => {
  assert.equal(isAllowedOrigin("https://doppiaelle.github.io"), true);
  assert.equal(isAllowedOrigin("https://example.com"), false);
  assert.equal(
    isAllowedOrigin("https://example.com", {
      AIRBOARD_ALLOWED_ORIGINS: "https://example.com",
    }),
    true,
  );
});

test("worker rejects untrusted origins before using the AI secret", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: "{}",
    }),
    {},
  );
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "origin not allowed" });
});

test("worker exposes the active contract version", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example", {
      headers: { origin: "https://doppiaelle.github.io" },
    }),
    {},
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "AirBoard AI",
    version: AIRBOARD_AI_CONTRACT_VERSION,
  });
});
