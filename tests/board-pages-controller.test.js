import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("app wires Board Pages to raw strokes, Semantic Ink and session export", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /createBoardPagesController/);
  assert.match(source, /ai\.exportState\(\)/);
  assert.match(source, /ai\.importState/);
  assert.match(source, /boardPagesController\?\.exportPages\(\)/);
});
