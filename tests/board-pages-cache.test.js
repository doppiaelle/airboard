import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Board Pages assets are included in the offline cache", async () => {
  const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(source, /board-pages\.css/);
  assert.match(source, /board-pages\.js/);
  assert.match(source, /airboard-v30/);
});
