from pathlib import Path

def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'missing pattern in {path}: {old[:80]!r}')
    p.write_text(s.replace(old, new, 1))

replace_once('board-pages.js',
'''    book = selectPage(book, id);\n    expandedId = id;\n    setState(clone(activePage(book).state));''',
'''    book = selectPage(book, id);\n    expandedId = null;\n    setState(clone(activePage(book).state));''')

replace_once('ai-board.js',
'''    elements = [],\n    history = [],\n    pendingStart = 0,''',
'''    elements = [],\n    history = [],\n    redoHistory = [],\n    pendingStart = 0,''')
replace_once('ai-board.js',
'''  function clearTimers() {''',
'''  function pushHistory(snapshot) {\n    history.push(snapshot);\n    redoHistory = [];\n  }\n  function clearTimers() {''')
s = Path('ai-board.js').read_text().replace('history.push({', 'pushHistory({').replace('history.push(snapshot);', 'pushHistory(snapshot);')
Path('ai-board.js').write_text(s)
replace_once('ai-board.js',
'''  function undoSemantic() {\n    if (!history.length) return false;\n    invalidateAsync();\n    const h = history.pop();\n    elements = h.elements;\n    pendingStart = h.pendingStart;\n    setStrokes(h.strokes);\n    render();\n    return true;\n  }''',
'''  function undoSemantic() {\n    if (!history.length) return false;\n    invalidateAsync();\n    redoHistory.push({\n      strokes: clone(getStrokes()),\n      elements: clone(elements),\n      pendingStart,\n    });\n    const h = history.pop();\n    elements = h.elements;\n    pendingStart = h.pendingStart;\n    setStrokes(h.strokes);\n    render();\n    return true;\n  }\n  function redoSemantic() {\n    if (!redoHistory.length) return false;\n    invalidateAsync();\n    history.push({\n      strokes: clone(getStrokes()),\n      elements: clone(elements),\n      pendingStart,\n    });\n    const h = redoHistory.pop();\n    elements = h.elements;\n    pendingStart = h.pendingStart;\n    setStrokes(h.strokes);\n    render();\n    return true;\n  }\n  const canUndoSemantic = () => history.length > 0;\n  const canRedoSemantic = () => redoHistory.length > 0;''')
replace_once('ai-board.js',
'''    history = [];\n    pendingStart = 0;''',
'''    history = [];\n    redoHistory = [];\n    pendingStart = 0;''')
replace_once('ai-board.js',
'''      history: clone(history),\n      pendingStart,''',
'''      history: clone(history),\n      redoHistory: clone(redoHistory),\n      pendingStart,''')
replace_once('ai-board.js',
'''    history = clone(state?.history || []);\n    pendingStart = Math.max(0, Number(state?.pendingStart) || 0);''',
'''    history = clone(state?.history || []);\n    redoHistory = clone(state?.redoHistory || []);\n    pendingStart = Math.max(0, Number(state?.pendingStart) || 0);''')
replace_once('ai-board.js',
'''    undoSemantic,\n    exportState,''',
'''    undoSemantic,\n    redoSemantic,\n    canUndoSemantic,\n    canRedoSemantic,\n    exportState,''')

replace_once('index.html',
'''        </button>\n        <button\n          id="clear"''',
'''        </button>\n        <button id="redo" class="icon-btn" title="Redo" aria-label="Redo" disabled>\n          <svg viewBox="0 0 24 24" aria-hidden="true">\n            <path d="m15 7 5 5-5 5M19 12h-8a6 6 0 0 0-6 6" />\n          </svg>\n        </button>\n        <button\n          id="clear"''')

replace_once('app.js',
'''  strokes = [],\n  current = null,''',
'''  strokes = [],\n  redoStrokes = [],\n  current = null,''')
replace_once('app.js',
'''  getState: () => ({\n    strokes: structuredClone(strokes),\n    aiState: ai.exportState(),\n  }),''',
'''  getState: () => ({\n    strokes: structuredClone(strokes),\n    redoStrokes: structuredClone(redoStrokes),\n    aiState: ai.exportState(),\n  }),''')
replace_once('app.js',
'''    strokes = structuredClone(state?.strokes || []);\n    current = null;''',
'''    strokes = structuredClone(state?.strokes || []);\n    redoStrokes = structuredClone(state?.redoStrokes || []);\n    current = null;''')
replace_once('app.js',
'''    redraw();\n  },\n  capturePreview:''',
'''    redraw();\n    refreshHistoryControls();\n  },\n  capturePreview:''')
replace_once('app.js',
'''document.querySelector("#clear").onclick = () => {\n  strokes = [];\n  current = null;\n  ai.clear();\n  redraw();\n};\ndocument.querySelector("#undo").onclick = () => {\n  ai.cancelPending();\n  if (strokes.length) {\n    strokes.pop();\n    redraw();\n  } else if (!ai.undoSemantic()) redraw();\n};''',
'''const undoButton = document.querySelector("#undo"),\n  redoButton = document.querySelector("#redo");\nfunction refreshHistoryControls() {\n  redoButton.disabled = !redoStrokes.length && !ai.canRedoSemantic();\n}\ndocument.querySelector("#clear").onclick = () => {\n  strokes = [];\n  redoStrokes = [];\n  current = null;\n  ai.clear();\n  redraw();\n  refreshHistoryControls();\n};\nundoButton.onclick = () => {\n  ai.cancelPending();\n  if (strokes.length) {\n    redoStrokes.push(strokes.pop());\n    redraw();\n  } else if (!ai.undoSemantic()) redraw();\n  refreshHistoryControls();\n};\nredoButton.onclick = () => {\n  ai.cancelPending();\n  if (redoStrokes.length) {\n    strokes.push(redoStrokes.pop());\n    redraw();\n  } else if (!ai.redoSemantic()) redraw();\n  refreshHistoryControls();\n};\nrefreshHistoryControls();''')
replace_once('app.js',
'''  if (current?.points.length > 1) {\n    strokes.push(current);''',
'''  if (current?.points.length > 1) {\n    redoStrokes = [];\n    strokes.push(current);''')

replace_once('styles.css',
'''.icon-btn.active {\n  background: #fff;\n  color: #0b0c0f;\n}''',
'''.icon-btn.active {\n  background: #fff;\n  color: #0b0c0f;\n}\n.icon-btn:disabled {\n  opacity: 0.25;\n  cursor: default;\n  pointer-events: none;\n}''')
replace_once('sw.js', 'const CACHE = "airboard-v29";', 'const CACHE = "airboard-v30";')

Path('tests/board-pages-redo.test.js').write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\n\ntest("selecting another page does not immediately open its menu", async () => {\n  const source = await readFile(new URL("../board-pages.js", import.meta.url), "utf8");\n  assert.match(source, /book = selectPage\\(book, id\\);\\s*expandedId = null;/);\n  assert.match(source, /if \\(id === book\\.activeId\\)[\\s\\S]*expandedId = expandedId === id \\? null : id/);\n});\n\ntest("redo is page-local and available only after undo", async () => {\n  const [app, ai, html] = await Promise.all([\n    readFile(new URL("../app.js", import.meta.url), "utf8"),\n    readFile(new URL("../ai-board.js", import.meta.url), "utf8"),\n    readFile(new URL("../index.html", import.meta.url), "utf8"),\n  ]);\n  assert.match(html, /id="redo"[\\s\\S]*disabled/);\n  assert.match(app, /redoStrokes: structuredClone\\(redoStrokes\\)/);\n  assert.match(app, /redoStrokes = structuredClone\\(state\\?\\.redoStrokes \\|\\| \\[\\]\\)/);\n  assert.match(app, /redoButton\\.disabled = !redoStrokes\\.length && !ai\\.canRedoSemantic\\(\\)/);\n  assert.match(ai, /redoHistory: clone\\(redoHistory\\)/);\n  assert.match(ai, /function redoSemantic\\(\\)/);\n});\n''')
