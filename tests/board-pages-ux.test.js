import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Board Pages includes the requested mobile and menu UX fixes", async () => {
  const [css, ai] = await Promise.all([
    readFile(new URL("../board-pages.css", import.meta.url), "utf8"),
    readFile(new URL("../ai-board.js", import.meta.url), "utf8"),
  ]);
  assert.match(css, /\.menu-logo::before/);
  assert.match(css, /linear-gradient\(currentColor, currentColor\)/);
  assert.match(ai, /max-width:\s*720px/);
  assert.match(ai, /Math\.max\(136, H \* 0\.18\)/);
});
