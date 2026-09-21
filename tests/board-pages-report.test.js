import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("session reports include the Board Pages deck", async () => {
  const source = await readFile(new URL("../session-mode.js", import.meta.url), "utf8");
  assert.match(source, /boardPages/);
  assert.match(source, /Board pages/);
  assert.match(source, /Pagine lavagna/);
});
