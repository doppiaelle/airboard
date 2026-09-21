const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function strokeBounds(strokes = []) {
  const points = strokes.flatMap((stroke) => stroke.points || []);
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(2, Math.max(...xs) - Math.min(...xs)),
    h: Math.max(2, Math.max(...ys) - Math.min(...ys)),
  };
}

function pathLength(points = []) {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }
  return length;
}

function normalizedPoint(point, bounds) {
  return {
    x: clamp((point.x - bounds.x) / Math.max(bounds.w, 1), 0, 1),
    y: clamp((point.y - bounds.y) / Math.max(bounds.h, 1), 0, 1),
  };
}

function lineCandidate(stroke, bounds) {
  const points = stroke?.points || [];
  if (points.length < 2) return null;
  const first = points[0];
  const last = points.at(-1);
  const direct = Math.hypot(last.x - first.x, last.y - first.y);
  const travelled = pathLength(points);
  const diagonal = Math.hypot(bounds.w, bounds.h);
  if (diagonal < 20 || travelled <= 0 || direct / travelled < 0.9) return null;
  return {
    kind: "line",
    confidence: direct / travelled,
    geometry: {
      start: normalizedPoint(first, bounds),
      end: normalizedPoint(last, bounds),
    },
  };
}

function rectangleCandidate(stroke, bounds) {
  const points = stroke?.points || [];
  if (points.length < 8 || bounds.w < 28 || bounds.h < 28) return null;
  const first = points[0];
  const last = points.at(-1);
  const diagonal = Math.hypot(bounds.w, bounds.h);
  if (Math.hypot(last.x - first.x, last.y - first.y) > diagonal * 0.22) return null;
  let edgeScore = 0;
  for (const point of points) {
    const edgeDistance = Math.min(
      Math.abs(point.x - bounds.x),
      Math.abs(point.x - (bounds.x + bounds.w)),
      Math.abs(point.y - bounds.y),
      Math.abs(point.y - (bounds.y + bounds.h)),
    );
    edgeScore += edgeDistance / Math.max(1, Math.min(bounds.w, bounds.h));
  }
  edgeScore /= points.length;
  if (edgeScore > 0.14) return null;
  return { kind: "rectangle", confidence: clamp(1 - edgeScore * 3, 0, 1) };
}

function arrowCandidate(strokes, bounds) {
  if (strokes.length < 3) return null;
  const sorted = strokes
    .map((stroke) => ({ stroke, length: pathLength(stroke.points || []) }))
    .sort((a, b) => b.length - a.length);
  const shaft = sorted[0];
  if (!shaft || shaft.length < 34) return null;
  const points = shaft.stroke.points || [];
  const start = points[0];
  const end = points.at(-1);
  const head = sorted.slice(1, 3);
  if (head.some((item) => item.length > shaft.length * 0.7)) return null;
  const nearEndpoint = (stroke, endpoint) => {
    const ps = stroke.points || [];
    if (!ps.length) return Infinity;
    return Math.min(
      Math.hypot(ps[0].x - endpoint.x, ps[0].y - endpoint.y),
      Math.hypot(ps.at(-1).x - endpoint.x, ps.at(-1).y - endpoint.y),
    );
  };
  const endScore = head.reduce((sum, item) => sum + nearEndpoint(item.stroke, end), 0);
  const startScore = head.reduce((sum, item) => sum + nearEndpoint(item.stroke, start), 0);
  const endpoint = endScore <= startScore ? end : start;
  const tail = endpoint === end ? start : end;
  const score = Math.min(endScore, startScore) / 2;
  if (score > Math.max(24, Math.hypot(bounds.w, bounds.h) * 0.22)) return null;
  return {
    kind: "arrow",
    confidence: clamp(1 - score / Math.max(30, shaft.length * 0.45), 0, 1),
    geometry: {
      start: normalizedPoint(tail, bounds),
      end: normalizedPoint(endpoint, bounds),
    },
  };
}

export function recognizeBasicShape(strokes = []) {
  const bounds = strokeBounds(strokes);
  if (!bounds) return null;
  const arrow = arrowCandidate(strokes, bounds);
  if (arrow) return { ...arrow, bounds };
  if (strokes.length === 1) {
    const rectangle = rectangleCandidate(strokes[0], bounds);
    if (rectangle) return { ...rectangle, bounds };
    const line = lineCandidate(strokes[0], bounds);
    if (line) return { ...line, bounds };
  }
  return null;
}

export function normalizeManualLayout(layout, width, height, minSize = 28) {
  const w = clamp(Number(layout?.w) || minSize, minSize, Math.max(minSize, width));
  const h = clamp(Number(layout?.h) || minSize, minSize, Math.max(minSize, height));
  return {
    x: clamp(Number(layout?.x) || 0, 0, Math.max(0, width - w)),
    y: clamp(Number(layout?.y) || 0, 0, Math.max(0, height - h)),
    w,
    h,
  };
}

export function moveManualLayout(layout, dx, dy, width, height) {
  return normalizeManualLayout(
    { ...layout, x: layout.x + dx, y: layout.y + dy },
    width,
    height,
  );
}

export function resizeManualLayout(layout, dx, dy, width, height) {
  return normalizeManualLayout(
    { ...layout, w: layout.w + dx, h: layout.h + dy },
    width,
    height,
  );
}
