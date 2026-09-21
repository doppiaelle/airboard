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

function installCompactModeSwitch() {
  const utility = document.querySelector(".utility-switch"),
    source = document.querySelector(".tool-dock");
  if (!utility || !source || utility.querySelector("#modeCycle")) return;

  const buttons = [...source.querySelectorAll(".mode-btn")],
    order = ["free", "pointer", "pen", "eraser"];
  if (!buttons.length) return;

  source.classList.add("mode-dock-source");
  utility.classList.add("mode-switch-installed");

  const cycle = document.createElement("button");
  cycle.type = "button";
  cycle.id = "modeCycle";
  cycle.className = "icon-btn mode-cycle";
  cycle.setAttribute("aria-live", "polite");
  const mark = document.createElement("span");
  mark.className = "mode-cycle-mark";
  mark.setAttribute("aria-hidden", "true");
  cycle.append(mark);

  const divider = document.createElement("span");
  divider.className = "divider mode-cycle-divider";
  divider.setAttribute("aria-hidden", "true");
  utility.prepend(divider);
  utility.prepend(cycle);

  function modeLabel(mode) {
    const it = document.documentElement.lang === "it";
    const labels = it
      ? { free: "Libero", pointer: "Puntatore", pen: "Penna", eraser: "Gomma" }
      : { free: "Free", pointer: "Pointer", pen: "Pen", eraser: "Eraser" };
    return labels[mode] || labels.pointer;
  }

  function sync() {
    const active = buttons.find((button) => button.classList.contains("active")) ||
      buttons.find((button) => button.dataset.mode === "pointer") ||
      buttons[0];
    const mode = active?.dataset.mode || "pointer";
    cycle.dataset.mode = mode;
    const label = modeLabel(mode),
      hint = document.documentElement.lang === "it" ? "Tocca per cambiare modalità" : "Tap to switch mode";
    cycle.title = `${label} · ${hint}`;
    cycle.ariaLabel = `${label}. ${hint}`;
  }

  cycle.onclick = () => {
    const current = cycle.dataset.mode || "pointer",
      next = order[(order.indexOf(current) + 1) % order.length],
      target = buttons.find((button) => button.dataset.mode === next);
    target?.click();
    queueMicrotask(sync);
  };

  const observer = new MutationObserver(sync);
  buttons.forEach((button) =>
    observer.observe(button, { attributes: true, attributeFilter: ["class"] }),
  );
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  sync();
}

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
  installCompactModeSwitch();

  const text = {
    pages: labels.pages || "Pages",
    add: labels.add || "New page",
    rename: labels.rename || "Rename",
    duplicate: labels.duplicate || "Duplicate",
    delete: labels.delete || "Delete",
    namePrompt: labels.namePrompt || "Page name",
    ...labels,
  };
  let book = createBoardBook(getState()),
    previewTimer = null,
    expandedId = null;

  const dock = document.createElement("section");
  dock.className = "board-pages board-pages-edge glass";
  dock.setAttribute("aria-label", text.pages);

  const count = document.createElement("span");
  count.className = "board-pages-count";

  const strip = document.createElement("div");
  strip.className = "board-pages-strip";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "board-page-add";
  addButton.textContent = "+";
  addButton.title = addButton.ariaLabel = text.add;

  const flyout = document.createElement("div");
  flyout.className = "board-page-flyout";
  flyout.hidden = true;

  dock.append(count, strip, addButton, flyout);
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
    if (id === book.activeId) {
      expandedId = expandedId === id ? null : id;
      render(false);
      return;
    }
    beforePageChange();
    snapshotCurrent();
    book = selectPage(book, id);
    expandedId = null;
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

  function verticalMoveLabel(direction) {
    const it = document.documentElement.lang === "it";
    return direction < 0
      ? it
        ? "Sposta pagina su"
        : "Move page up"
      : it
        ? "Sposta pagina giù"
        : "Move page down";
  }

  function actionButton(label, glyph, handler, disabled = false, danger = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = danger ? "danger" : "";
    button.disabled = disabled;
    button.title = button.ariaLabel = label;
    const icon = document.createElement("span");
    icon.className = "board-page-action-icon";
    icon.textContent = glyph;
    const caption = document.createElement("span");
    caption.textContent = label;
    button.append(icon, caption);
    button.onclick = (event) => {
      event.stopPropagation();
      handler();
    };
    return button;
  }

  function renderFlyout() {
    flyout.replaceChildren();
    const page = book.pages.find((item) => item.id === expandedId);
    if (!page) {
      flyout.hidden = true;
      return;
    }
    const index = book.pages.findIndex((item) => item.id === page.id);
    const head = document.createElement("div");
    head.className = "board-page-flyout-head";
    const title = document.createElement("strong");
    title.textContent = page.title;
    const position = document.createElement("span");
    position.textContent = `${index + 1}/${book.pages.length}`;
    head.append(title, position);

    const actions = document.createElement("div");
    actions.className = "board-page-actions";
    actions.append(
      actionButton(text.rename, "✎", () => {
        const next = prompt(text.namePrompt, page.title);
        if (next == null) return;
        book = renamePage(book, page.id, next);
        render(false);
      }),
      actionButton(text.duplicate, "⧉", () => {
        beforePageChange();
        snapshotCurrent();
        const before = book.activeId;
        book = duplicatePage(book, page.id);
        if (book.activeId !== before) {
          expandedId = book.activeId;
          setState(clone(activePage(book).state));
        }
        render();
      }, book.pages.length >= MAX_BOARD_PAGES),
      actionButton(verticalMoveLabel(-1), "↑", () => {
        snapshotCurrent();
        book = movePage(book, page.id, -1);
        render();
      }, index === 0),
      actionButton(verticalMoveLabel(1), "↓", () => {
        snapshotCurrent();
        book = movePage(book, page.id, 1);
        render();
      }, index === book.pages.length - 1),
      actionButton(text.delete, "×", () => {
        if (book.pages.length <= 1) return;
        beforePageChange();
        snapshotCurrent();
        const wasActive = page.id === book.activeId;
        book = removePage(book, page.id);
        if (wasActive) setState(clone(activePage(book).state));
        expandedId = wasActive ? book.activeId : null;
        render();
      }, book.pages.length <= 1, true),
    );
    flyout.append(head, actions);
    flyout.hidden = false;
  }

  function render(ensureVisible = true) {
    const activeIndex = book.pages.findIndex((page) => page.id === book.activeId);
    count.textContent = `${activeIndex + 1}/${book.pages.length}`;
    addButton.disabled = book.pages.length >= MAX_BOARD_PAGES;
    strip.replaceChildren();

    book.pages.forEach((page, index) => {
      const item = document.createElement("article");
      item.className = "board-page-thumb";
      item.classList.toggle("active", page.id === book.activeId);
      item.classList.toggle("expanded", page.id === expandedId);
      item.dataset.pageId = page.id;

      const select = document.createElement("button");
      select.type = "button";
      select.className = "board-page-select";
      select.setAttribute("aria-current", page.id === book.activeId ? "page" : "false");
      select.setAttribute("aria-expanded", String(page.id === expandedId));
      select.ariaLabel = `${page.title} · ${index + 1}/${book.pages.length}`;
      select.onclick = () => switchTo(page.id);

      const visual = document.createElement("span");
      visual.className = "board-page-preview";
      if (page.preview) visual.style.backgroundImage = `url(${page.preview})`;
      const number = document.createElement("span");
      number.className = "board-page-number";
      number.textContent = String(index + 1);
      const label = document.createElement("span");
      label.className = "board-page-title";
      label.textContent = page.title;
      select.append(visual, number, label);
      item.append(select);
      strip.append(item);
    });

    renderFlyout();

    if (ensureVisible)
      strip.querySelector(".board-page-thumb.active")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
  }

  addButton.onclick = () => {
    if (book.pages.length >= MAX_BOARD_PAGES) return;
    beforePageChange();
    snapshotCurrent();
    book = addPage(book, { strokes: [], aiState: null });
    expandedId = book.activeId;
    setState(clone(activePage(book).state));
    render();
  };

  document.addEventListener("pointerdown", (event) => {
    if (!expandedId || dock.contains(event.target)) return;
    expandedId = null;
    render(false);
  });

  render();

  return {
    setLabels(next = {}) {
      Object.assign(text, next);
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
