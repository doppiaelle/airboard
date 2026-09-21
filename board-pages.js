if (typeof document !== "undefined" && !document.querySelector('link[data-airboard-pages]')) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "./board-pages.css";
  stylesheet.dataset.airboardPages = "";
  document.head.append(stylesheet);
}

export const MAX_BOARD_PAGES = 12;

const clone = (value) => structuredClone(value);
const cleanTitle = (value, fallback) => String(value ?? "").trim().slice(0, 48) || fallback;

export function createBoardBook(initialState = {}) {
  return {
    activeId: "page-1",
    pages: [
      { id: "page-1", title: "Page 1", state: clone(initialState), preview: null },
    ],
  };
}

export function snapshotPage(book, id, state, preview = null) {
  return {
    ...book,
    pages: book.pages.map((page) =>
      page.id === id
        ? { ...page, state: clone(state), preview: preview || page.preview }
        : page,
    ),
  };
}

export function addPage(book, state = {}, { afterId = book.activeId } = {}) {
  if (book.pages.length >= MAX_BOARD_PAGES) return book;
  const index = Math.max(0, book.pages.findIndex((page) => page.id === afterId));
  const nextNumber =
    book.pages.reduce((max, page) => {
      const match = /page-(\d+)/.exec(page.id);
      return Math.max(max, Number(match?.[1]) || 0);
    }, 0) + 1;
  const page = {
    id: `page-${nextNumber}`,
    title: `Page ${book.pages.length + 1}`,
    state: clone(state),
    preview: null,
  };
  const pages = [...book.pages];
  pages.splice(index + 1, 0, page);
  return { activeId: page.id, pages };
}

export function duplicatePage(book, id = book.activeId) {
  const source = book.pages.find((page) => page.id === id);
  if (!source || book.pages.length >= MAX_BOARD_PAGES) return book;
  const next = addPage(book, source.state, { afterId: id });
  return {
    ...next,
    pages: next.pages.map((page) =>
      page.id === next.activeId
        ? { ...page, title: `${source.title} copy`.slice(0, 48), preview: source.preview }
        : page,
    ),
  };
}

export function removePage(book, id = book.activeId) {
  if (book.pages.length <= 1) return book;
  const index = book.pages.findIndex((page) => page.id === id);
  if (index < 0) return book;
  const pages = book.pages.filter((page) => page.id !== id);
  const activeId =
    id === book.activeId
      ? pages[Math.min(index, pages.length - 1)].id
      : book.activeId;
  return { activeId, pages };
}

export function renamePage(book, id, title) {
  const index = book.pages.findIndex((page) => page.id === id);
  if (index < 0) return book;
  return {
    ...book,
    pages: book.pages.map((page, pageIndex) =>
      page.id === id
        ? { ...page, title: cleanTitle(title, `Page ${pageIndex + 1}`) }
        : page,
    ),
  };
}

export function movePage(book, id, direction) {
  const index = book.pages.findIndex((page) => page.id === id);
  const target = index + (direction < 0 ? -1 : 1);
  if (index < 0 || target < 0 || target >= book.pages.length) return book;
  const pages = [...book.pages];
  [pages[index], pages[target]] = [pages[target], pages[index]];
  return { ...book, pages };
}

export function selectPage(book, id) {
  return book.pages.some((page) => page.id === id)
    ? { ...book, activeId: id }
    : book;
}

export function activePage(book) {
  return book.pages.find((page) => page.id === book.activeId) || book.pages[0];
}

export function exportBoardPages(book) {
  return book.pages.map(({ id, title, preview }) => ({
    id,
    title,
    image: preview || null,
  }));
}

export function createBoardPagesController({
  getState,
  setState,
  capturePreview,
  beforePageChange = () => {},
  labels = {},
}) {
  const text = {
    pages: labels.pages || "Pages",
    add: labels.add || "New page",
    rename: labels.rename || "Rename",
    duplicate: labels.duplicate || "Duplicate",
    delete: labels.delete || "Delete",
    moveLeft: labels.moveLeft || "Move left",
    moveRight: labels.moveRight || "Move right",
    namePrompt: labels.namePrompt || "Page name",
    ...labels,
  };
  let book = createBoardBook(getState()),
    previewTimer = null;

  const dock = document.createElement("section");
  dock.className = "board-pages glass";
  dock.setAttribute("aria-label", text.pages);
  const head = document.createElement("div");
  head.className = "board-pages-head";
  const title = document.createElement("strong");
  title.textContent = text.pages;
  const count = document.createElement("span");
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "board-page-add";
  addButton.textContent = "+";
  addButton.title = addButton.ariaLabel = text.add;
  head.append(title, count, addButton);
  const strip = document.createElement("div");
  strip.className = "board-pages-strip";
  dock.append(head, strip);
  document.querySelector("#stage").append(dock);

  function snapshotCurrent() {
    book = snapshotPage(
      book,
      book.activeId,
      getState(),
      capturePreview?.() || null,
    );
  }

  function switchTo(id) {
    if (id === book.activeId) return;
    beforePageChange();
    snapshotCurrent();
    book = selectPage(book, id);
    setState(clone(activePage(book).state));
    render();
  }

  function scheduleCurrentSnapshot() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      snapshotCurrent();
      render(false);
    }, 420);
  }

  function actionButton(label, glyph, handler, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = glyph;
    button.title = button.ariaLabel = label;
    button.disabled = disabled;
    button.onclick = (event) => {
      event.stopPropagation();
      handler();
    };
    return button;
  }

  function render(ensureVisible = true) {
    count.textContent = `${book.pages.findIndex((p) => p.id === book.activeId) + 1}/${book.pages.length}`;
    addButton.disabled = book.pages.length >= MAX_BOARD_PAGES;
    strip.replaceChildren();
    book.pages.forEach((page, index) => {
      const item = document.createElement("article");
      item.className = "board-page-thumb";
      item.classList.toggle("active", page.id === book.activeId);
      item.dataset.pageId = page.id;
      const select = document.createElement("button");
      select.type = "button";
      select.className = "board-page-select";
      select.setAttribute("aria-current", page.id === book.activeId ? "page" : "false");
      select.onclick = () => switchTo(page.id);
      const visual = document.createElement("span");
      visual.className = "board-page-preview";
      if (page.preview) visual.style.backgroundImage = `url(${page.preview})`;
      const label = document.createElement("span");
      label.className = "board-page-title";
      label.textContent = page.title;
      select.append(visual, label);
      const actions = document.createElement("div");
      actions.className = "board-page-actions";
      actions.append(
        actionButton(text.moveLeft, "←", () => {
          snapshotCurrent();
          book = movePage(book, page.id, -1);
          render();
        }, index === 0),
        actionButton(text.moveRight, "→", () => {
          snapshotCurrent();
          book = movePage(book, page.id, 1);
          render();
        }, index === book.pages.length - 1),
        actionButton(text.rename, "✎", () => {
          const next = prompt(text.namePrompt, page.title);
          if (next == null) return;
          book = renamePage(book, page.id, next);
          render();
        }),
        actionButton(text.duplicate, "⧉", () => {
          beforePageChange();
          snapshotCurrent();
          const before = book.activeId;
          book = duplicatePage(book, page.id);
          if (book.activeId !== before) setState(clone(activePage(book).state));
          render();
        }, book.pages.length >= MAX_BOARD_PAGES),
        actionButton(text.delete, "×", () => {
          if (book.pages.length <= 1) return;
          beforePageChange();
          snapshotCurrent();
          const wasActive = page.id === book.activeId;
          book = removePage(book, page.id);
          if (wasActive) setState(clone(activePage(book).state));
          render();
        }, book.pages.length <= 1),
      );
      item.append(select, actions);
      strip.append(item);
    });
    if (ensureVisible)
      strip.querySelector(".board-page-thumb.active")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
  }

  addButton.onclick = () => {
    if (book.pages.length >= MAX_BOARD_PAGES) return;
    beforePageChange();
    snapshotCurrent();
    book = addPage(book, { strokes: [], aiState: null });
    setState(clone(activePage(book).state));
    render();
  };

  render();

  return {
    setLabels(next = {}) {
      Object.assign(text, next);
      title.textContent = text.pages;
      dock.setAttribute("aria-label", text.pages);
      addButton.title = addButton.ariaLabel = text.add;
      render(false);
    },
    scheduleCurrentSnapshot,
    snapshotCurrent,
    getBook: () => clone(book),
    exportPages() {
      snapshotCurrent();
      return exportBoardPages(book);
    },
  };
}
