import test from "node:test";
import assert from "node:assert/strict";
import { createSession, finishSession, sessionReportHtml } from "../session-mode.js";

const image = "data:image/jpeg;base64,ZmFrZQ==";

test("finished sessions keep sanitized board pages", () => {
  const session = createSession({ id: "s", title: "Demo" });
  const finished = finishSession(session, {
    boardPages: [
      { id: "p1", title: "Intro <script>", image },
      { id: "p2", title: "Second", image: "javascript:bad" },
    ],
  });
  assert.equal(finished.boardPages.length, 2);
  assert.equal(finished.boardPages[0].image, image);
  assert.equal(finished.boardPages[1].image, null);
  const html = sessionReportHtml(finished, "en");
  assert.match(html, /Board pages/);
  assert.match(html, /Intro &lt;script&gt;/);
  assert.doesNotMatch(html, /javascript:bad/);
});
