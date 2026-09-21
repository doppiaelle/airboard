import test from "node:test";
import assert from "node:assert/strict";
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
