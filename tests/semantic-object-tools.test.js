import test from "node:test";
import assert from "node:assert/strict";
import { normalizeManualLayout, recognizeBasicShape } from "../semantic-object-tools.js";

const stroke = (points) => ({ points: points.map(([x, y]) => ({ x, y })) });

test("recognizes straight lines and rectangles locally", () => {
  assert.equal(recognizeBasicShape([stroke([[0, 10], [40, 11], [90, 10]])])?.kind, "line");
  const rectangle = stroke([[0,0],[50,0],[100,0],[100,50],[100,100],[50,100],[0,100],[0,50],[0,0]]);
  assert.equal(recognizeBasicShape([rectangle])?.kind, "rectangle");
});

test("recognizes a three-stroke arrow", () => {
  const arrow = [
    stroke([[0,50],[50,50],[100,50]]),
    stroke([[100,50],[80,35]]),
    stroke([[100,50],[80,65]]),
  ];
  assert.equal(recognizeBasicShape(arrow)?.kind, "arrow");
});

test("manual layouts stay inside the visible board", () => {
  assert.deepEqual(normalizeManualLayout({ x: 190, y: -20, w: 80, h: 10 }, 240, 160), {
    x: 160, y: 0, w: 80, h: 28,
  });
});
