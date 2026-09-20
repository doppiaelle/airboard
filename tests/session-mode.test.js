import test from "node:test";
import assert from "node:assert/strict";
import {
  addCheckpoint,
  createSession,
  finishSession,
  formatDuration,
  MAX_CHECKPOINTS,
  sessionDuration,
  sessionReportHtml,
} from "../session-mode.js";

const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ";

test("a session records bounded board checkpoints and finishes immutably", () => {
  const original = createSession({
    id: "s1",
    type: "meeting",
    title: "Weekly review",
    startedAt: "2026-01-01T10:00:00.000Z",
  });
  const withCheckpoint = addCheckpoint(original, {
    id: "c1",
    label: "Decision",
    at: "2026-01-01T10:05:00.000Z",
    image: pixel,
    boardSummary: { strokeCount: 3, semanticCount: 2, recognizedText: "42" },
  });
  assert.equal(original.checkpoints.length, 0);
  assert.equal(withCheckpoint.checkpoints.length, 1);
  assert.equal(withCheckpoint.checkpoints[0].image, pixel);

  const finished = finishSession(withCheckpoint, {
    endedAt: "2026-01-01T10:30:00.000Z",
    finalBoard: pixel,
    boardSummary: { strokeCount: 4, semanticCount: 2 },
  });
  assert.equal(sessionDuration(finished), 30 * 60 * 1000);
  assert.equal(formatDuration(sessionDuration(finished)), "30:00");
  assert.equal(addCheckpoint(finished, { label: "too late" }), null);
});

test("checkpoint count is capped to control local storage growth", () => {
  let session = createSession({ id: "s2", title: "Class" });
  for (let index = 0; index < MAX_CHECKPOINTS; index++)
    session = addCheckpoint(session, { id: String(index), label: "Moment" });
  assert.equal(session.checkpoints.length, MAX_CHECKPOINTS);
  assert.equal(addCheckpoint(session, { id: "extra", label: "Extra" }), null);
});

test("standalone reports escape user content and keep safe board images", () => {
  const session = finishSession(
    addCheckpoint(
      createSession({
        id: "s3",
        title: "<script>alert(1)</script>",
        goal: "Decide & document",
      }),
      { label: "A < B", image: pixel },
    ),
    { finalBoard: "javascript:alert(1)" },
  );
  const report = sessionReportHtml(session, "en");
  assert.doesNotMatch(report, /<script>alert/);
  assert.match(report, /&lt;script&gt;alert/);
  assert.match(report, /Decide &amp; document/);
  assert.match(report, /data:image\/png;base64/);
  assert.doesNotMatch(report, /javascript:alert/);
});
