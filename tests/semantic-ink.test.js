import test from "node:test";
import assert from "node:assert/strict";
import {
  correctSemanticElement,
  deleteSemanticElement,
  semanticChoices,
} from "../semantic-ink.js";

const glyph = {
  id: "g1",
  type: "glyph",
  content: "1",
  confidence: 0.55,
  alternatives: [
    { char: "1", confidence: 0.55 },
    { char: "7", confidence: 0.4 },
  ],
  confirmed: true,
};

test("semantic choices are de-duplicated and keep the current value first", () => {
  assert.deepEqual(
    semanticChoices(glyph).map((choice) => choice.char),
    ["1", "7"],
  );
});

test("manual correction is authoritative without mutating the source", () => {
  const source = [glyph];
  const corrected = correctSemanticElement(source, "g1", "7");
  assert.equal(source[0].content, "1");
  assert.equal(corrected[0].content, "7");
  assert.equal(corrected[0].confidence, 1);
  assert.equal(corrected[0].manual, true);
});

test("semantic deletion returns null for an unknown id", () => {
  assert.deepEqual(deleteSemanticElement([glyph], "g1"), []);
  assert.equal(deleteSemanticElement([glyph], "missing"), null);
});
