import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("AI Board exposes state import/export for page isolation", async () => {
  const source = await readFile(new URL("../ai-board.js", import.meta.url), "utf8");
  assert.match(source, /function exportState\(/);
  assert.match(source, /function importState\(/);
  assert.match(source, /exportState,/);
  assert.match(source, /importState,/);
});
