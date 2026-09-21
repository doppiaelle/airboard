from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Expected block not found in {path}: {old[:80]!r}')
    p.write_text(text.replace(old, new, 1))

# app.js integrations
replace_once('app.js',
'import { listSessions, saveSession } from "./session-store.js";\n',
'import { listSessions, saveSession } from "./session-store.js";\nimport { createBoardPagesController } from "./board-pages.js";\n')
replace_once('app.js',
'  recapSession = null,\n  sessionTimerHandle = null;\n',
'  recapSession = null,\n  sessionTimerHandle = null,\n  boardPagesController = null;\n')
replace_once('app.js',
'    sessionSaved: "Session saved locally",\n  },\n  it: {',
'    sessionSaved: "Session saved locally",\n    pages: "Pages",\n    newPage: "New page",\n    renamePage: "Rename page",\n    duplicatePage: "Duplicate page",\n    deletePage: "Delete page",\n    movePageLeft: "Move page left",\n    movePageRight: "Move page right",\n    pageNamePrompt: "Page name",\n  },\n  it: {')
replace_once('app.js',
'    sessionSaved: "Sessione salvata localmente",\n  },\n};',
'    sessionSaved: "Sessione salvata localmente",\n    pages: "Pagine",\n    newPage: "Nuova pagina",\n    renamePage: "Rinomina pagina",\n    duplicatePage: "Duplica pagina",\n    deletePage: "Elimina pagina",\n    movePageLeft: "Sposta pagina a sinistra",\n    movePageRight: "Sposta pagina a destra",\n    pageNamePrompt: "Nome pagina",\n  },\n};')

controller = '''\nfunction boardPageLabels() {\n  return {\n    pages: t("pages"),\n    add: t("newPage"),\n    rename: t("renamePage"),\n    duplicate: t("duplicatePage"),\n    delete: t("deletePage"),\n    moveLeft: t("movePageLeft"),\n    moveRight: t("movePageRight"),\n    namePrompt: t("pageNamePrompt"),\n  };\n}\n\nboardPagesController = createBoardPagesController({\n  getState: () => ({\n    strokes: structuredClone(strokes),\n    aiState: ai.exportState(),\n  }),\n  setState: (state) => {\n    settleCurrentStroke();\n    ai.cancelPending();\n    strokes = structuredClone(state?.strokes || []);\n    current = null;\n    penDown = false;\n    closeSemanticEditor();\n    ai.importState(state?.aiState);\n    recognitionDomain = ai.getDomain();\n    renderDomain();\n    redraw();\n  },\n  capturePreview: () => captureBoard("image/jpeg", 0.68, 360),\n  beforePageChange: settleCurrentStroke,\n  labels: boardPageLabels(),\n});\n\n'''
replace_once('app.js', 'domainBtn.onclick = () => {\n', controller + 'domainBtn.onclick = () => {\n')
replace_once('app.js',
'  refreshUI();\n  refreshRecentSessions();\n}\n',
'  refreshUI();\n  refreshRecentSessions();\n  boardPagesController?.setLabels(boardPageLabels());\n}\n')
replace_once('app.js',
'''function currentBoardSummary() {\n  const semanticSummary = ai.getSessionSummary();\n  return {\n    strokeCount: strokes.length + (current?.points?.length > 1 ? 1 : 0),\n    semanticCount: semanticSummary.semanticCount,\n    recognizedText: semanticSummary.recognizedText,\n  };\n}\n''',
'''function currentBoardSummary() {\n  const semanticSummary = ai.getSessionSummary(),\n    pages = boardPagesController?.getBook().pages || [];\n  return {\n    strokeCount: strokes.length + (current?.points?.length > 1 ? 1 : 0),\n    semanticCount: semanticSummary.semanticCount,\n    recognizedText: semanticSummary.recognizedText,\n    pageCount: pages.length || 1,\n  };\n}\n''')
replace_once('app.js',
'    boardSummary: currentBoardSummary(),\n  });\n  clearInterval(sessionTimerHandle);',
'    boardSummary: currentBoardSummary(),\n    boardPages: boardPagesController?.exportPages() || [],\n  });\n  clearInterval(sessionTimerHandle);')
replace_once('app.js',
'''  strokes.forEach((s) => drawStroke(ictx, s));\n  if (current) drawStroke(ictx, current);\n}\nfunction commitStroke() {''',
'''  strokes.forEach((s) => drawStroke(ictx, s));\n  if (current) drawStroke(ictx, current);\n  boardPagesController?.scheduleCurrentSnapshot();\n}\nfunction commitStroke() {''')

# ai-board.js: mobile offset plus serializable semantic state
replace_once('ai-board.js',
'''      left = Math.max(30, W * 0.055),\n      right = Math.max(30, W * 0.055),\n      top = Math.max(48, H * 0.1),\n      font = Math.max(34, Math.min(54, W / 18)),''',
'''      left = Math.max(30, W * 0.055),\n      right = Math.max(30, W * 0.055),\n      compact = window.matchMedia?.("(max-width: 720px)")?.matches ?? W <= 720,\n      top = compact ? Math.max(136, H * 0.18) : Math.max(64, H * 0.11),\n      font = Math.max(34, Math.min(54, W / 18)),''')
state_methods = '''  function exportState() {\n    return {\n      elements: clone(elements),\n      history: clone(history),\n      pendingStart,\n      domain,\n    };\n  }\n  function importState(state) {\n    clearTimers();\n    invalidateAsync();\n    elements = clone(state?.elements || []);\n    history = clone(state?.history || []);\n    pendingStart = Math.max(0, Number(state?.pendingStart) || 0);\n    if (["math", "letters", "draw"].includes(state?.domain)) domain = state.domain;\n    pendingStart = Math.min(pendingStart, getStrokes().length);\n    render();\n    if (enabled) onState("ready");\n  }\n'''
replace_once('ai-board.js', '  function getSessionSummary() {\n', state_methods + '  function getSessionSummary() {\n')
replace_once('ai-board.js',
'    undoSemantic,\n    getSessionSummary,\n',
'    undoSemantic,\n    exportState,\n    importState,\n    getSessionSummary,\n')

# service worker
replace_once('sw.js', 'const CACHE = "airboard-v28";', 'const CACHE = "airboard-v29";')
replace_once('sw.js', '  "./accessibility.css",\n', '  "./accessibility.css",\n  "./board-pages.css",\n')
replace_once('sw.js', '  "./ai-contract.js",\n', '  "./ai-contract.js",\n  "./board-pages.js",\n')
