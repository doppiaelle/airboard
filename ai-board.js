import { loadLocalRecognizer, recognizeLocal } from "./local-recognizer-v2.js";
import {
  AIRBOARD_AI_CONTRACT_VERSION as CONTRACT_VERSION,
  normalizeCloudRefinement,
} from "./ai-contract.js";
import {
  correctSemanticElement,
  deleteSemanticElement,
  semanticChoices,
} from "./semantic-ink.js";

const QUICK_CLOSE = 480,
  JOIN_CLOSE = 950,
  MATH_IDLE_CONFIRM = 3800,
  TEXT_IDLE_CONFIRM = 2600,
  DRAW_IDLE_CONFIRM = 1150,
  CONTEXT_DELAY = 4400,
  SOLID = 0.72;

export function createAIBoard({
  ink,
  semantic,
  getStrokes,
  setStrokes,
  onState,
  onElementsChange = () => {},
  requestCloudConsent = async () => true,
}) {
  let enabled = false,
    domain = "math",
    glyphTimer,
    contextTimer,
    confirmTimer,
    drawTimer,
    elements = [],
    history = [],
    pendingStart = 0,
    cloudBusy = false,
    cloudCooldown = 0,
    loading = false,
    seq = 0,
    generation = 0,
    cloudController = null;
  const ctx = semantic.getContext("2d"),
    clone = (x) => structuredClone(x),
    endpoint = () =>
      window.AIRBOARD_AI_ENDPOINT ||
      localStorage.getItem("airboard-ai-endpoint") ||
      "https://airboard-ai.doppiaelletech.workers.dev/";

  function clearTimers() {
    clearTimeout(glyphTimer);
    clearTimeout(contextTimer);
    clearTimeout(confirmTimer);
    clearTimeout(drawTimer);
  }
  function invalidateAsync() {
    generation++;
    cloudController?.abort();
    cloudController = null;
    cloudBusy = false;
    return generation;
  }
  function idleWindow(d = domain) {
    return d === "math" ? MATH_IDLE_CONFIRM : TEXT_IDLE_CONFIRM;
  }
  function toggle() {
    enabled = !enabled;
    clearTimers();
    const token = invalidateAsync();
    if (enabled) {
      pendingStart = getStrokes().length;
      if (domain === "draw") {
        onState("ready");
        return enabled;
      }
      onState("local-loading");
      loading = true;
      loadLocalRecognizer()
        .then(() => {
          if (token !== generation || !enabled) return;
          loading = false;
          onState("ready");
        })
        .catch(() => {
          if (token !== generation || !enabled) return;
          loading = false;
          onState("degraded");
        });
    } else onState("off");
    return enabled;
  }
  const isEnabled = () => enabled;
  async function setDomain(next) {
    if (next === "numbers") next = "math";
    if (!["math", "letters", "draw"].includes(next) || next === domain) return;
    clearTimers();
    const token = invalidateAsync();
    if (domain === "draw") flushDrawing(true, token);
    else await flushGlyph(true, token);
    if (token !== generation) return;
    domain = next;
    pendingStart = getStrokes().length;
    if (enabled) onState("ready");
  }
  const getDomain = () => domain;

  function bounds(ss) {
    const p = ss.flatMap((s) => s.points || []);
    if (!p.length) return null;
    const xs = p.map((q) => q.x),
      ys = p.map((q) => q.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(2, Math.max(...xs) - Math.min(...xs)),
      h: Math.max(2, Math.max(...ys) - Math.min(...ys)),
    };
  }
  function overlap(a, b) {
    if (!a || !b) return 0;
    const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)),
      iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return (ix * iy) / Math.max(1, Math.min(a.w * a.h, b.w * b.h));
  }
  function gaps(a, b) {
    return {
      gx: Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)),
      gy: Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)),
    };
  }
  function sameGlyph(a, b) {
    if (!a || !b) return false;
    const { gx, gy } = gaps(a, b),
      h = Math.max(18, Math.min(100, Math.max(a.h, b.h))),
      cxA = a.x + a.w / 2,
      cxB = b.x + b.w / 2,
      cyA = a.y + a.h / 2,
      cyB = b.y + b.h / 2,
      cx = Math.abs(cxA - cxB),
      cy = Math.abs(cyA - cyB);
    if (overlap(a, b) > 0.008) return true;
    if (gx === 0 && cy < h * 0.72) return true;
    if (gy === 0 && cx < h * 0.62) return true;
    return gx < h * 0.22 && gy < h * 0.3 && cx < h * 0.62;
  }
  function shouldJoin(ss) {
    return (
      ss.length > 1 && sameGlyph(bounds(ss.slice(0, -1)), bounds([ss.at(-1)]))
    );
  }
  function splitGroups(ss) {
    const groups = [];
    for (const s of ss) {
      const b = bounds([s]);
      let best = -1,
        bestD = Infinity;
      for (let i = 0; i < groups.length; i++) {
        const gb = bounds(groups[i]);
        if (!sameGlyph(gb, b)) continue;
        const d = Math.hypot(
          gb.x + gb.w / 2 - (b.x + b.w / 2),
          gb.y + gb.h / 2 - (b.y + b.h / 2),
        );
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) groups.push([s]);
      else groups[best].push(s);
    }
    return groups.sort((a, b) => {
      const A = bounds(a),
        B = bounds(b);
      return Math.abs(A.y - B.y) > Math.max(A.h, B.h) * 0.65
        ? A.y - B.y
        : A.x - B.x;
    });
  }
  function layout() {
    const W = semantic.clientWidth,
      H = semantic.clientHeight,
      left = Math.max(30, W * 0.055),
      right = Math.max(30, W * 0.055),
      top = Math.max(48, H * 0.1),
      font = Math.max(34, Math.min(54, W / 18)),
      line = Math.round(font * 1.5),
      gap = Math.round(font * 0.76),
      space = Math.round(font * 0.62);
    let x = left,
      y = top;
    for (const e of elements) {
      if (!e.confirmed) continue;
      if (e.type === "space") {
        x += space;
        if (x > W - right) {
          x = left;
          y += line;
        }
        continue;
      }
      const cell =
        e.type === "drawing"
          ? Math.max(gap, Math.min(font * 1.45, e.aspect * font))
          : gap;
      if (x + cell > W - right) {
        x = left;
        y += line;
      }
      e.layout = { x, y, w: cell, h: line };
      x += cell;
    }
    return { x, y, font, line, gap, space };
  }
  function scheduleConfirm() {
    clearTimeout(confirmTimer);
    const open = elements.filter((e) => e.type === "glyph" && !e.confirmed);
    if (!open.length) return;
    const wait = Math.max(
      50,
      Math.min(
        ...open.map(
          (e) =>
            (e.lastStrokeAt || 0) + idleWindow(e.domain) - performance.now(),
        ),
      ),
    );
    confirmTimer = setTimeout(confirmReady, wait);
  }
  function confirmReady() {
    const n = performance.now();
    let changed = false;
    for (const e of elements) {
      if (
        e.type === "glyph" &&
        !e.confirmed &&
        n - (e.lastStrokeAt || n) >= idleWindow(e.domain)
      ) {
        e.confirmed = true;
        e.provisional = false;
        e.layout = null;
        changed = true;
      }
    }
    if (changed) {
      render();
      onState("ready");
    }
    scheduleConfirm();
  }
  function schedule() {
    if (!enabled) return;
    if (domain === "draw") {
      scheduleDrawing();
      return;
    }
    clearTimeout(glyphTimer);
    clearTimeout(contextTimer);
    const ss = getStrokes().slice(pendingStart),
      token = generation;
    onState(loading ? "local-loading" : "local-pending");
    glyphTimer = setTimeout(
      () => flushGlyph(false, token),
      shouldJoin(ss) ? JOIN_CLOSE : QUICK_CLOSE,
    );
    contextTimer = setTimeout(() => refineContext(token), CONTEXT_DELAY);
  }
  function scheduleDrawing() {
    clearTimeout(drawTimer);
    const ss = getStrokes().slice(pendingStart),
      token = generation;
    if (!ss.length) return;
    onState("collecting");
    drawTimer = setTimeout(() => flushDrawing(false, token), DRAW_IDLE_CONFIRM);
  }
  function flushDrawing(force = false, token = generation) {
    clearTimeout(drawTimer);
    if (token !== generation || (!enabled && !force)) return;
    const all = getStrokes(),
      ss = all.slice(pendingStart);
    if (!ss.length) return;
    const groups = splitGroups(ss);
    history.push({
      strokes: clone(all),
      elements: clone(elements),
      pendingStart,
    });
    for (const group of groups) {
      const b = bounds(group);
      if (!b) continue;
      elements.push({
        id: `d${Date.now()}-${seq++}`,
        type: "drawing",
        confirmed: true,
        domain: "draw",
        sourceStrokes: clone(group),
        bounds: b,
        aspect: Math.max(0.22, Math.min(2.2, b.w / Math.max(b.h, 2))),
        layout: null,
      });
    }
    setStrokes(all.slice(0, pendingStart));
    pendingStart = getStrokes().length;
    render();
    onState("ready");
  }
  async function ingest(group, n, token, expectedDomain) {
    const b = bounds(group);
    let merge = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const e = elements[i];
      if (e.type !== "glyph" || e.domain !== expectedDomain) continue;
      if (
        !e.confirmed &&
        n - (e.lastStrokeAt || 0) < idleWindow(e.domain) &&
        sameGlyph(e.bounds, b)
      ) {
        merge = e;
        break;
      }
      if (e.confirmed && e.layout && overlap(e.layout, b) > 0.08) {
        merge = e;
        break;
      }
    }
    const combined = merge ? [...(merge.sourceStrokes || []), ...group] : group,
      r = await recognizeLocal(combined, expectedDomain);
    if (token !== generation || domain !== expectedDomain) return false;
    const best = r?.alternatives?.[0] || r;
    if (merge) {
      merge.manual = false;
      merge.confirmed = false;
      merge.content = best?.char || merge.content;
      merge.confidence = best?.confidence || merge.confidence;
      merge.alternatives = r?.alternatives || merge.alternatives;
      merge.bounds = r?.bounds || bounds(combined);
      merge.provisional = true;
      merge.sourceStrokes = clone(combined);
      merge.strokeCount = combined.length;
      merge.revision = (merge.revision || 0) + 1;
      merge.lastStrokeAt = n;
      merge.layout = null;
    } else
      elements.push({
        id: `g${Date.now()}-${seq++}`,
        type: "glyph",
        content: best?.char || "",
        confidence: best?.confidence || 0,
        alternatives: r?.alternatives || [],
        bounds: r?.bounds || b,
        provisional: true,
        confirmed: false,
        domain: expectedDomain,
        sourceStrokes: clone(group),
        strokeCount: group.length,
        revision: 0,
        lastStrokeAt: n,
        layout: null,
      });
    return true;
  }
  async function flushGlyph(force = false, token = generation) {
    clearTimeout(glyphTimer);
    if (token !== generation || (!enabled && !force)) return false;
    const all = getStrokes(),
      ss = all.slice(pendingStart),
      expectedDomain = domain;
    if (!ss.length) return true;
    if (expectedDomain === "draw") {
      flushDrawing(true, token);
      return true;
    }
    const n = performance.now();
    try {
      const groups = splitGroups(ss),
        snapshot = {
          strokes: clone(all),
          elements: clone(elements),
          pendingStart,
        };
      for (const g of groups) {
        if (!(await ingest(g, n, token, expectedDomain))) return false;
      }
      if (token !== generation) return false;
      history.push(snapshot);
      setStrokes(all.slice(0, pendingStart));
      pendingStart = getStrokes().length;
      render();
      onState("collecting");
      scheduleConfirm();
      clearTimeout(contextTimer);
      contextTimer = setTimeout(() => refineContext(token), CONTEXT_DELAY);
      return true;
    } catch (e) {
      if (token === generation) {
        console.warn(e);
        onState("degraded");
      }
      return false;
    }
  }
  function addSpace() {
    if (!enabled) return false;
    confirmReady();
    history.push({
      strokes: clone(getStrokes()),
      elements: clone(elements),
      pendingStart,
    });
    elements.push({
      id: `s${Date.now()}-${seq++}`,
      type: "space",
      confirmed: true,
      content: " ",
    });
    render();
    onState("ready");
    return true;
  }
  function cropUnits(units) {
    const ss = units.flatMap((e) => e.sourceStrokes || []),
      b = bounds(ss);
    if (!b) return null;
    const p = 34,
      sc = 2,
      c = document.createElement("canvas");
    c.width = Math.max(100, Math.ceil((b.w + p * 2) * sc));
    c.height = Math.max(100, Math.ceil((b.h + p * 2) * sc));
    const x = c.getContext("2d");
    x.fillStyle = "#08090c";
    x.fillRect(0, 0, c.width, c.height);
    x.scale(sc, sc);
    x.translate(-b.x + p, -b.y + p);
    x.strokeStyle = "#fff";
    x.lineWidth = 6;
    x.lineCap = x.lineJoin = "round";
    for (const s of ss) {
      x.beginPath();
      s.points.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y)));
      x.stroke();
    }
    return { image: c.toDataURL("image/png"), bounds: b };
  }
  function context() {
    return elements
      .filter((e) => e.type === "glyph")
      .slice(-36)
      .map((e) => ({
        id: e.id,
        content: e.content,
        confidence: e.confidence,
        alternatives: e.alternatives.slice(0, 7),
        provisional: e.provisional,
        confirmed: e.confirmed,
        domain: e.domain,
        bounds: e.bounds,
        strokeCount: e.strokeCount,
        revision: e.revision,
        manual: Boolean(e.manual),
      }));
  }
  async function refineContext(token = generation) {
    if (
      token !== generation ||
      domain === "draw" ||
      !enabled ||
      cloudBusy ||
      Date.now() < cloudCooldown
    )
      return;
    await flushGlyph(false, token);
    if (token !== generation) return;
    confirmReady();
    const uncertain = elements
      .filter(
        (e) =>
          e.type === "glyph" &&
          e.confirmed &&
          !e.manual &&
          e.confidence < SOLID,
      )
      .slice(-10);
    if (!uncertain.length) {
      onState("ready");
      return;
    }
    const allowed = await requestCloudConsent();
    if (token !== generation) return;
    if (!allowed) {
      onState("local-only");
      return;
    }
    const glyphs = elements.filter((e) => e.type === "glyph"),
      first = glyphs.indexOf(uncertain[0]),
      windowUnits = glyphs.slice(
        Math.max(0, first - 3),
        Math.min(glyphs.length, first + uncertain.length + 3),
      ),
      crop = cropUnits(windowUnits);
    if (!crop) return;
    cloudBusy = true;
    cloudController = new AbortController();
    const controller = cloudController;
    onState("refining");
    try {
      const r = await fetch(endpoint(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          version: CONTRACT_VERSION,
          image: crop.image,
          context: context(),
          locale: document.documentElement.lang,
          bounds: crop.bounds,
          mode: "segmented-ink-refine",
          domain,
          units: windowUnits.map((e) => ({
            id: e.id,
            current: e.content,
            confidence: e.confidence,
            alternatives: e.alternatives.slice(0, 7),
            bounds: e.bounds,
            strokeCount: e.strokeCount,
            revision: e.revision,
            strokes: e.sourceStrokes.map((s) => ({
              points: s.points.map((p) => ({ x: p.x, y: p.y, t: p.t })),
            })),
          })),
        }),
      });
      if (token !== generation) return;
      if (r.status === 429) {
        cloudCooldown = Date.now() + 45000;
        onState("rate-limited");
        return;
      }
      if (!r.ok) {
        onState("degraded");
        return;
      }
      const out = normalizeCloudRefinement(await r.json());
      if (token !== generation) return;
      if (!out) {
        onState("contract-error");
        return;
      }
      for (const u of out.units) {
        const e = elements.find((x) => x.id === u.id);
        if (!e || !e.confirmed || e.manual) continue;
        e.content = u.content;
        e.confidence = u.confidence;
      }
      render();
      onState("ready");
    } catch (e) {
      if (e?.name !== "AbortError" && token === generation) {
        console.warn(e);
        onState("degraded");
      }
    } finally {
      if (token === generation && cloudController === controller) {
        cloudBusy = false;
        cloudController = null;
      }
    }
  }
  function drawRaw(e) {
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#eefcff";
    for (const s of e.sourceStrokes || []) {
      ctx.lineWidth = s.width || 6;
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.beginPath();
      s.points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.stroke();
    }
  }
  function drawPlacedStroke(e, L) {
    const b = e.bounds,
      l = e.layout;
    if (!b || !l) return;
    const targetH = L.font,
      scale = Math.min(targetH / Math.max(b.h, 2), l.w / Math.max(b.w, 2)),
      w = b.w * scale,
      h = b.h * scale,
      ox = l.x + (l.w - w) / 2,
      oy = l.y + (l.h - h) / 2;
    ctx.save();
    ctx.translate(ox - b.x * scale, oy - b.y * scale);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#eefcff";
    for (const s of e.sourceStrokes || []) {
      ctx.lineWidth = Math.max(2, (s.width || 6) / Math.max(scale, 0.01));
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.beginPath();
      s.points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  function render() {
    ctx.clearRect(0, 0, semantic.clientWidth, semantic.clientHeight);
    const L = layout();
    ctx.save();
    ctx.fillStyle = "#eefcff";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${L.font}px Inter,system-ui,sans-serif`;
    for (const e of elements) {
      if (e.type === "space") continue;
      if (e.type === "drawing" && e.confirmed && e.layout) {
        drawPlacedStroke(e, L);
        continue;
      }
      if (e.confirmed && e.layout) {
        ctx.globalAlpha = 1;
        ctx.font = `600 ${L.font}px Inter,system-ui,sans-serif`;
        ctx.fillText(e.content || "?", e.layout.x, e.layout.y + e.layout.h / 2);
        continue;
      }
      drawRaw(e);
    }
    ctx.restore();
    onElementsChange(
      elements
        .filter((e) => e.confirmed && e.type !== "space" && e.layout)
        .map((e) => ({
          id: e.id,
          type: e.type,
          content: e.content || "",
          confidence: e.confidence ?? 1,
          manual: Boolean(e.manual),
          layout: { ...e.layout },
          choices: e.type === "glyph" ? semanticChoices(e) : [],
        })),
    );
  }
  function correctElement(id, content) {
    const next = correctSemanticElement(elements, id, content);
    if (!next) return false;
    history.push({
      strokes: clone(getStrokes()),
      elements: clone(elements),
      pendingStart,
    });
    elements = next;
    render();
    onState("ready");
    return true;
  }
  function deleteElement(id) {
    const next = deleteSemanticElement(elements, id);
    if (!next) return false;
    history.push({
      strokes: clone(getStrokes()),
      elements: clone(elements),
      pendingStart,
    });
    elements = next;
    render();
    onState("ready");
    return true;
  }
  function undoSemantic() {
    if (!history.length) return false;
    invalidateAsync();
    const h = history.pop();
    elements = h.elements;
    pendingStart = h.pendingStart;
    setStrokes(h.strokes);
    render();
    return true;
  }
  function cancelPending() {
    clearTimers();
    invalidateAsync();
    pendingStart = Math.min(pendingStart, getStrokes().length);
    if (enabled) onState("ready");
  }
  function clear() {
    clearTimers();
    invalidateAsync();
    elements = [];
    history = [];
    pendingStart = 0;
    render();
  }
  function getSessionSummary() {
    const confirmed = elements.filter((element) => element.confirmed);
    return {
      semanticCount: confirmed.filter((element) => element.type !== "space")
        .length,
      drawingCount: confirmed.filter((element) => element.type === "drawing")
        .length,
      recognizedText: confirmed
        .filter(
          (element) => element.type === "glyph" || element.type === "space",
        )
        .map((element) =>
          element.type === "space" ? " " : element.content || "",
        )
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
    };
  }
  return {
    toggle,
    isEnabled,
    setDomain,
    getDomain,
    schedule,
    addSpace,
    correctElement,
    deleteElement,
    cancelPending,
    undoSemantic,
    getSessionSummary,
    clear,
    resize: render,
    render,
  };
}
