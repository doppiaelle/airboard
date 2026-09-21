from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    source = p.read_text()
    if old not in source:
        raise SystemExit(f"missing pattern in {path}: {old[:120]!r}")
    p.write_text(source.replace(old, new, 1))

# AI object model: manual layouts, shape recognition, edit/restore and transform history.
replace_once(
    "ai-board.js",
    'import {\n  correctSemanticElement,\n  deleteSemanticElement,\n  semanticChoices,\n} from "./semantic-ink.js";\n',
    'import {\n  correctSemanticElement,\n  deleteSemanticElement,\n  semanticChoices,\n} from "./semantic-ink.js";\nimport { normalizeManualLayout, recognizeBasicShape } from "./semantic-object-tools.js";\n',
)
replace_once(
    "ai-board.js",
    '    for (const e of elements) {\n      if (!e.confirmed) continue;\n      if (e.type === "space") {',
    '    for (const e of elements) {\n      if (!e.confirmed) continue;\n      if (e.manualLayout) {\n        e.layout = normalizeManualLayout(e.manualLayout, W, H);\n        continue;\n      }\n      if (e.type === "space") {',
)
replace_once(
    "ai-board.js",
    '        e.type === "drawing"\n          ? Math.max(gap, Math.min(font * 1.45, e.aspect * font))\n          : gap;',
    '        e.type === "drawing" || e.type === "shape"\n          ? Math.max(gap, Math.min(font * 1.75, e.aspect * font))\n          : gap;',
)
replace_once(
    "ai-board.js",
    '''      elements.push({\n        id: `d${Date.now()}-${seq++}`,\n        type: "drawing",\n        confirmed: true,\n        domain: "draw",\n        sourceStrokes: clone(group),\n        bounds: b,\n        aspect: Math.max(0.22, Math.min(2.2, b.w / Math.max(b.h, 2))),\n        layout: null,\n      });''',
    '''      const shape = recognizeBasicShape(group);\n      elements.push({\n        id: `d${Date.now()}-${seq++}`,\n        type: shape ? "shape" : "drawing",\n        shapeKind: shape?.kind || null,\n        shapeGeometry: shape?.geometry || null,\n        confirmed: true,\n        domain: "draw",\n        sourceStrokes: clone(group),\n        bounds: b,\n        aspect: Math.max(0.22, Math.min(2.2, b.w / Math.max(b.h, 2))),\n        layout: null,\n      });''',
)
replace_once(
    "ai-board.js",
    '''  function drawPlacedStroke(e, L) {''',
    '''  function drawShape(e) {\n    const l = e.layout;\n    if (!l) return;\n    const geometry = e.shapeGeometry || {\n      start: { x: 0.08, y: 0.5 },\n      end: { x: 0.92, y: 0.5 },\n    };\n    const point = (p) => ({ x: l.x + p.x * l.w, y: l.y + p.y * l.h });\n    ctx.save();\n    ctx.globalAlpha = 1;\n    ctx.strokeStyle = "#eefcff";\n    ctx.lineWidth = Math.max(2.5, Math.min(5, Math.min(l.w, l.h) * 0.08));\n    ctx.lineCap = ctx.lineJoin = "round";\n    if (e.shapeKind === "rectangle") {\n      ctx.strokeRect(l.x + 4, l.y + 4, Math.max(2, l.w - 8), Math.max(2, l.h - 8));\n    } else {\n      const start = point(geometry.start), end = point(geometry.end);\n      ctx.beginPath();\n      ctx.moveTo(start.x, start.y);\n      ctx.lineTo(end.x, end.y);\n      ctx.stroke();\n      if (e.shapeKind === "arrow") {\n        const angle = Math.atan2(end.y - start.y, end.x - start.x);\n        const size = Math.max(10, Math.min(22, Math.min(l.w, l.h) * 0.35));\n        ctx.beginPath();\n        ctx.moveTo(end.x, end.y);\n        ctx.lineTo(end.x - Math.cos(angle - 0.55) * size, end.y - Math.sin(angle - 0.55) * size);\n        ctx.moveTo(end.x, end.y);\n        ctx.lineTo(end.x - Math.cos(angle + 0.55) * size, end.y - Math.sin(angle + 0.55) * size);\n        ctx.stroke();\n      }\n    }\n    ctx.restore();\n  }\n  function drawPlacedStroke(e, L) {''',
)
replace_once(
    "ai-board.js",
    '''      if (e.type === "drawing" && e.confirmed && e.layout) {\n        drawPlacedStroke(e, L);\n        continue;\n      }''',
    '''      if (e.type === "shape" && e.confirmed && e.layout) {\n        drawShape(e);\n        continue;\n      }\n      if (e.type === "drawing" && e.confirmed && e.layout) {\n        drawPlacedStroke(e, L);\n        continue;\n      }''',
)
replace_once(
    "ai-board.js",
    '''          content: e.content || "",\n          confidence: e.confidence ?? 1,\n          manual: Boolean(e.manual),\n          layout: { ...e.layout },''',
    '''          content: e.content || "",\n          confidence: e.confidence ?? 1,\n          manual: Boolean(e.manual),\n          shapeKind: e.shapeKind || null,\n          layout: { ...e.layout },''',
)
replace_once(
    "ai-board.js",
    '''  function deleteElement(id) {''',
    '''  function beginElementTransform(id) {\n    const element = elements.find((item) => item.id === id);\n    if (!element?.layout) return false;\n    pushHistory({\n      strokes: clone(getStrokes()),\n      elements: clone(elements),\n      pendingStart,\n    });\n    return true;\n  }\n  function updateElementLayout(id, nextLayout) {\n    const element = elements.find((item) => item.id === id);\n    if (!element) return false;\n    element.manualLayout = normalizeManualLayout(\n      nextLayout,\n      semantic.clientWidth,\n      semantic.clientHeight,\n    );\n    element.layout = { ...element.manualLayout };\n    render();\n    return true;\n  }\n  function editElementContent(id, content) {\n    const element = elements.find((item) => item.id === id);\n    const next = String(content ?? "").trim().slice(0, 24);\n    if (!element || element.type !== "glyph" || !next) return false;\n    pushHistory({\n      strokes: clone(getStrokes()),\n      elements: clone(elements),\n      pendingStart,\n    });\n    element.content = next;\n    element.manual = true;\n    element.confirmed = true;\n    render();\n    onState("ready");\n    return true;\n  }\n  function restoreElement(id) {\n    const index = elements.findIndex((item) => item.id === id);\n    if (index < 0) return false;\n    const element = elements[index];\n    const source = clone(element.sourceStrokes || []);\n    pushHistory({\n      strokes: clone(getStrokes()),\n      elements: clone(elements),\n      pendingStart,\n    });\n    elements.splice(index, 1);\n    if (source.length) setStrokes([...getStrokes(), ...source]);\n    pendingStart = getStrokes().length;\n    render();\n    onState("ready");\n    return true;\n  }\n  function deleteElement(id) {''',
)
replace_once(
    "ai-board.js",
    '''    deleteElement,\n    cancelPending,''',
    '''    deleteElement,\n    beginElementTransform,\n    updateElementLayout,\n    editElementContent,\n    restoreElement,\n    cancelPending,''',
)

# Editor UI.
replace_once(
    "index.html",
    '''        <div id="semanticChoices" class="semantic-choices"></div>\n        <button\n          id="semanticDelete"''',
    '''        <div id="semanticChoices" class="semantic-choices"></div>\n        <div id="semanticManualEdit" class="semantic-manual-edit">\n          <input id="semanticManualInput" maxlength="24" autocomplete="off" aria-label="Edit recognized content" />\n          <button id="semanticApply" type="button" data-i18n="applyEdit">Apply</button>\n        </div>\n        <button id="semanticRestore" class="semantic-restore" type="button" data-i18n="restoreInk">Restore original ink</button>\n        <button\n          id="semanticDelete"''',
)

# App interaction: edit, restore, drag and resize.
replace_once(
    "app.js",
    '''    deleteInk: "Delete element",''',
    '''    deleteInk: "Delete element",\n    applyEdit: "Apply",\n    restoreInk: "Restore original ink",''',
)
replace_once(
    "app.js",
    '''    deleteInk: "Elimina elemento",''',
    '''    deleteInk: "Elimina elemento",\n    applyEdit: "Applica",\n    restoreInk: "Ripristina tratto originale",''',
)
replace_once(
    "app.js",
    '''  semanticChoices = document.querySelector("#semanticChoices"),\n  modeButtons =''',
    '''  semanticChoices = document.querySelector("#semanticChoices"),\n  semanticManualEdit = document.querySelector("#semanticManualEdit"),\n  semanticManualInput = document.querySelector("#semanticManualInput"),\n  modeButtons =''',
)
replace_once(
    "app.js",
    '''function closeSemanticEditor() {\n  selectedSemanticId = null;\n  semanticEditor.hidden = true;\n}''',
    '''function closeSemanticEditor() {\n  selectedSemanticId = null;\n  semanticEditor.hidden = true;\n  semanticControls.querySelectorAll(".semantic-hit.selected").forEach((node) =>\n    node.classList.remove("selected"),\n  );\n}''',
)
replace_once(
    "app.js",
    '''  selectedSemanticId = element.id;\n  semanticChoices.replaceChildren();''',
    '''  selectedSemanticId = element.id;\n  semanticControls.querySelectorAll(".semantic-hit").forEach((node) =>\n    node.classList.toggle("selected", node.dataset.elementId === element.id),\n  );\n  semanticManualEdit.hidden = element.type !== "glyph";\n  semanticManualInput.value = element.content || "";\n  semanticChoices.replaceChildren();''',
)
replace_once(
    "app.js",
    '''    button.className = "semantic-hit";\n    button.style.left = `${element.layout.x}px`;''',
    '''    button.className = "semantic-hit";\n    button.dataset.elementId = element.id;\n    button.classList.toggle("selected", selectedSemanticId === element.id);\n    button.style.left = `${element.layout.x}px`;''',
)
replace_once(
    "app.js",
    '''    button.onclick = () => openSemanticEditor(element);\n    semanticControls.append(button);''',
    '''    const resizeHandle = document.createElement("span");\n    resizeHandle.className = "semantic-resize-handle";\n    resizeHandle.setAttribute("aria-hidden", "true");\n    button.append(resizeHandle);\n\n    let transform = null;\n    button.onpointerdown = (event) => {\n      if (event.button !== 0) return;\n      transform = {\n        pointerId: event.pointerId,\n        x: event.clientX,\n        y: event.clientY,\n        layout: { ...element.layout },\n        resize: event.target === resizeHandle,\n        started: false,\n      };\n      button.setPointerCapture?.(event.pointerId);\n    };\n    button.onpointermove = (event) => {\n      if (!transform || event.pointerId !== transform.pointerId) return;\n      const dx = event.clientX - transform.x, dy = event.clientY - transform.y;\n      if (!transform.started && Math.hypot(dx, dy) < 4) return;\n      if (!transform.started) {\n        transform.started = ai.beginElementTransform(element.id);\n        if (!transform.started) return;\n        selectedSemanticId = element.id;\n      }\n      const next = transform.resize\n        ? { ...transform.layout, w: transform.layout.w + dx, h: transform.layout.h + dy }\n        : { ...transform.layout, x: transform.layout.x + dx, y: transform.layout.y + dy };\n      ai.updateElementLayout(element.id, next);\n      refreshHistoryControls();\n    };\n    button.onpointerup = (event) => {\n      if (!transform || event.pointerId !== transform.pointerId) return;\n      const moved = transform.started;\n      transform = null;\n      if (!moved) openSemanticEditor(element);\n      else boardPagesController?.scheduleCurrentSnapshot();\n    };\n    button.onpointercancel = () => (transform = null);\n    semanticControls.append(button);''',
)
replace_once(
    "app.js",
    '''document.querySelector("#semanticDelete").onclick = () => {''',
    '''document.querySelector("#semanticApply").onclick = () => {\n  if (selectedSemanticId && ai.editElementContent(selectedSemanticId, semanticManualInput.value)) {\n    refreshHistoryControls();\n    boardPagesController?.scheduleCurrentSnapshot();\n  }\n  closeSemanticEditor();\n};\nsemanticManualInput.addEventListener("keydown", (event) => {\n  if (event.key === "Enter") {\n    event.preventDefault();\n    document.querySelector("#semanticApply").click();\n  }\n});\ndocument.querySelector("#semanticRestore").onclick = () => {\n  if (selectedSemanticId && ai.restoreElement(selectedSemanticId)) {\n    refreshHistoryControls();\n    boardPagesController?.scheduleCurrentSnapshot();\n  }\n  closeSemanticEditor();\n};\ndocument.querySelector("#semanticDelete").onclick = () => {''',
)

# Styles for explicit selection, transform handle and keyboard editing.
replace_once(
    "styles.css",
    '''.semantic-hit {\n  position: absolute;\n  pointer-events: auto;''',
    '''.semantic-hit {\n  position: absolute;\n  pointer-events: auto;\n  touch-action: none;''',
)
replace_once(
    "styles.css",
    '''.semantic-hit[data-confidence="low"]::after {''',
    '''.semantic-hit.selected {\n  border-color: #9be7ff;\n  background: #9be7ff12;\n  box-shadow: 0 0 0 1px #9be7ff33, 0 8px 28px #0004;\n}\n.semantic-resize-handle {\n  position: absolute;\n  right: -5px;\n  bottom: -5px;\n  display: none;\n  width: 12px;\n  height: 12px;\n  border: 2px solid #071116;\n  border-radius: 50%;\n  background: #9be7ff;\n}\n.semantic-hit.selected .semantic-resize-handle { display: block; }\n.semantic-hit[data-confidence="low"]::after {''',
)
replace_once(
    "styles.css",
    '''.semantic-delete {''',
    '''.semantic-manual-edit {\n  display: flex;\n  gap: 6px;\n  margin: 10px 0 8px;\n}\n.semantic-manual-edit[hidden] { display: none; }\n.semantic-manual-edit input {\n  min-width: 0;\n  height: 38px;\n  flex: 1;\n  padding: 0 9px;\n  border: 1px solid #ffffff1c;\n  border-radius: 9px;\n  outline: 0;\n  background: #08090c99;\n  color: #fff;\n}\n.semantic-manual-edit button,\n.semantic-restore {\n  min-height: 36px;\n  border: 1px solid #ffffff18;\n  border-radius: 9px;\n  background: #ffffff09;\n  color: #fff;\n  font-size: 11px;\n}\n.semantic-manual-edit button { padding: 0 10px; }\n.semantic-restore {\n  width: 100%;\n  margin-bottom: 7px;\n}\n.semantic-delete {''',
)

# Cache and checks.
replace_once("sw.js", 'const CACHE = "airboard-v30";', 'const CACHE = "airboard-v31";')
replace_once("sw.js", '  "./semantic-ink.js",\n', '  "./semantic-ink.js",\n  "./semantic-object-tools.js",\n')
cache_test = Path("tests/board-pages-cache.test.js")
if cache_test.exists():
    source = cache_test.read_text().replace("/airboard-v30/", "/airboard-v31/")
    cache_test.write_text(source)

package = Path("package.json")
source = package.read_text()
if "semantic-object-tools.js" not in source and "node --check semantic-ink.js" in source:
    source = source.replace("node --check semantic-ink.js", "node --check semantic-ink.js && node --check semantic-object-tools.js")
    package.write_text(source)

Path("tests/semantic-object-tools.test.js").write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { normalizeManualLayout, recognizeBasicShape } from "../semantic-object-tools.js";\n\nconst stroke = (points) => ({ points: points.map(([x, y]) => ({ x, y })) });\n\ntest("recognizes straight lines and rectangles locally", () => {\n  assert.equal(recognizeBasicShape([stroke([[0, 10], [40, 11], [90, 10]])])?.kind, "line");\n  const rectangle = stroke([[0,0],[50,0],[100,0],[100,50],[100,100],[50,100],[0,100],[0,50],[0,0]]);\n  assert.equal(recognizeBasicShape([rectangle])?.kind, "rectangle");\n});\n\ntest("recognizes a three-stroke arrow", () => {\n  const arrow = [\n    stroke([[0,50],[50,50],[100,50]]),\n    stroke([[100,50],[80,35]]),\n    stroke([[100,50],[80,65]]),\n  ];\n  assert.equal(recognizeBasicShape(arrow)?.kind, "arrow");\n});\n\ntest("manual layouts stay inside the visible board", () => {\n  assert.deepEqual(normalizeManualLayout({ x: 190, y: -20, w: 80, h: 10 }, 240, 160), {\n    x: 160, y: 0, w: 80, h: 28,\n  });\n});\n''')

Path("tests/semantic-ink2-integration.test.js").write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\n\ntest("Semantic Ink 2 exposes editable, movable and reversible objects", async () => {\n  const [ai, app, html, css, sw] = await Promise.all([\n    readFile(new URL("../ai-board.js", import.meta.url), "utf8"),\n    readFile(new URL("../app.js", import.meta.url), "utf8"),\n    readFile(new URL("../index.html", import.meta.url), "utf8"),\n    readFile(new URL("../styles.css", import.meta.url), "utf8"),\n    readFile(new URL("../sw.js", import.meta.url), "utf8"),\n  ]);\n  assert.match(ai, /beginElementTransform/);\n  assert.match(ai, /updateElementLayout/);\n  assert.match(ai, /editElementContent/);\n  assert.match(ai, /restoreElement/);\n  assert.match(ai, /recognizeBasicShape/);\n  assert.match(app, /semantic-resize-handle/);\n  assert.match(html, /id="semanticManualInput"/);\n  assert.match(html, /id="semanticRestore"/);\n  assert.match(css, /\.semantic-hit\.selected/);\n  assert.match(sw, /semantic-object-tools\.js/);\n});\n''')
