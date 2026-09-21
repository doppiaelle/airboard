import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MAX_BOARD_PAGES,
  activePage,
  addPage,
  createBoardBook,
  duplicatePage,
  movePage,
  removePage,
  renamePage,
  selectPage,
  snapshotPage,
} from "../board-pages.js";

test("board pages preserve independent page state", () => {
  let book = createBoardBook({ strokes: [{ id: 1 }], aiState: { elements: ["a"] } });
  book = snapshotPage(book, "page-1", { strokes: [{ id: 2 }], aiState: { elements: ["b"] } });
  book = addPage(book, { strokes: [], aiState: null });
  assert.equal(book.pages.length, 2);
  assert.equal(activePage(book).id, "page-2");
  book = selectPage(book, "page-1");
  assert.deepEqual(activePage(book).state.strokes, [{ id: 2 }]);
});

test("pages can be renamed, duplicated, reordered and removed", () => {
  let book = createBoardBook({ strokes: [1] });
  book = renamePage(book, "page-1", "Intro");
  book = duplicatePage(book, "page-1");
  assert.equal(book.pages[1].title, "Intro copy");
  const duplicateId = book.pages[1].id;
  book = movePage(book, duplicateId, -1);
  assert.equal(book.pages[0].id, duplicateId);
  book = removePage(book, "page-1");
  assert.equal(book.pages.length, 1);
  assert.equal(book.activeId, duplicateId);
});

test("board page count is capped", () => {
  let book = createBoardBook({});
  for (let i = 1; i < MAX_BOARD_PAGES + 4; i++) book = addPage(book, {});
  assert.equal(book.pages.length, MAX_BOARD_PAGES);
});

test("Board Pages UI is a vertical edge dock with an inward action flyout", async () => {
  const [script, styles] = await Promise.all([
    readFile(new URL("../board-pages.js", import.meta.url), "utf8"),
    readFile(new URL("../board-pages.css", import.meta.url), "utf8"),
  ]);
  assert.match(script, /board-pages-edge/);
  assert.match(script, /board-page-flyout/);
  assert.match(script, /block:\s*"center"/);
  assert.match(styles, /right:\s*max\(0px,\s*env\(safe-area-inset-right\)\)/);
  assert.match(styles, /flex-direction:\s*column/);
  assert.match(styles, /overflow-y:\s*auto/);
  assert.match(styles, /right:\s*calc\(100% \+ 10px\)/);
});
