import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("selecting another page does not immediately open its menu", async () => {
  const source = await readFile(new URL("../board-pages.js", import.meta.url), "utf8");
  assert.match(source, /book = selectPage\(book, id\);\s*expandedId = null;/);
  assert.match(source, /if \(id === book\.activeId\)[\s\S]*expandedId = expandedId === id \? null : id/);
});

test("redo is page-local and available only after undo", async () => {
  const [app, ai, html] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../ai-board.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="redo"[\s\S]*disabled/);
  assert.match(app, /redoStrokes: structuredClone\(redoStrokes\)/);
  assert.match(app, /redoStrokes = structuredClone\(state\?\.redoStrokes \|\| \[\]\)/);
  assert.match(app, /redoButton\.disabled = !redoStrokes\.length && !ai\.canRedoSemantic\(\)/);
  assert.match(ai, /redoHistory: clone\(redoHistory\)/);
  assert.match(ai, /function redoSemantic\(\)/);
});
