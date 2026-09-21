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

test("edge dock highlights only the explicitly expanded page without shifting it", async () => {
  const css = await readFile(
    new URL("../board-pages.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.board-page-thumb\.expanded \.board-page-select/);
  assert.match(css, /\.board-page-thumb\.expanded \.board-page-number/);
  assert.doesNotMatch(css, /\.board-page-thumb\.active \.board-page-select/);
  assert.doesNotMatch(css, /\.board-page-thumb\.expanded \.board-page-select\s*\{[^}]*transform:/s);
  assert.doesNotMatch(css, /\.board-pages::before/);
  assert.doesNotMatch(css, /\.board-pages::after/);
});
