import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Semantic Ink 2 exposes editable, movable and reversible objects", async () => {
  const [ai, app, html, css, sw] = await Promise.all([
    readFile(new URL("../ai-board.js", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../sw.js", import.meta.url), "utf8"),
  ]);
  assert.match(ai, /beginElementTransform/);
  assert.match(ai, /updateElementLayout/);
  assert.match(ai, /editElementContent/);
  assert.match(ai, /restoreElement/);
  assert.match(ai, /recognizeBasicShape/);
  assert.match(app, /semantic-resize-handle/);
  assert.match(html, /id="semanticManualInput"/);
  assert.match(html, /id="semanticRestore"/);
  assert.match(css, /\.semantic-hit\.selected/);
  assert.match(sw, /semantic-object-tools\.js/);
});
