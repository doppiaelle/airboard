export const SESSION_VERSION = 1;
export const MAX_CHECKPOINTS = 12;

const clean = (value, max) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

export function createSession({
  id,
  type = "lesson",
  title,
  goal = "",
  startedAt = new Date().toISOString(),
}) {
  const safeType = ["lesson", "meeting", "brainstorm"].includes(type)
    ? type
    : "lesson";
  return {
    version: SESSION_VERSION,
    id: clean(id || startedAt, 100),
    type: safeType,
    title: clean(title, 100) || "AirBoard session",
    goal: clean(goal, 400),
    startedAt,
    endedAt: null,
    checkpoints: [],
    finalBoard: null,
    boardSummary: null,
    boardPages: [],
  };
}

export function addCheckpoint(
  session,
  { id, label, at = new Date().toISOString(), image, boardSummary },
) {
  if (
    !session ||
    session.endedAt ||
    session.checkpoints.length >= MAX_CHECKPOINTS
  )
    return null;
  return {
    ...session,
    checkpoints: [
      ...session.checkpoints,
      {
        id: clean(id || at, 100),
        label:
          clean(label, 100) || `Checkpoint ${session.checkpoints.length + 1}`,
        at,
        image: validImage(image) ? image : null,
        boardSummary: normalizeBoardSummary(boardSummary),
      },
    ],
  };
}

export function finishSession(
  session,
  { endedAt = new Date().toISOString(), finalBoard, boardSummary, boardPages = [] } = {},
) {
  if (!session || session.endedAt) return null;
  return {
    ...session,
    endedAt,
    finalBoard: validImage(finalBoard) ? finalBoard : null,
    boardSummary: normalizeBoardSummary(boardSummary),
    boardPages: normalizeBoardPages(boardPages),
  };
}

export function sessionDuration(session, now = Date.now()) {
  if (!session?.startedAt) return 0;
  const start = Date.parse(session.startedAt);
  const end = session.endedAt ? Date.parse(session.endedAt) : now;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

export function formatDuration(milliseconds) {
  const total = Math.floor(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function sessionReportHtml(session, locale = "en") {
  const it = locale === "it";
  const labels = it
    ? {
        report: "Report sessione AirBoard",
        goal: "Obiettivo",
        duration: "Durata",
        checkpoints: "Checkpoint",
        final: "Lavagna finale",
        pages: "Pagine lavagna",
        recognized: "Testo riconosciuto",
        empty: "Nessun checkpoint registrato.",
      }
    : {
        report: "AirBoard session report",
        goal: "Goal",
        duration: "Duration",
        checkpoints: "Checkpoints",
        final: "Final board",
        pages: "Board pages",
        recognized: "Recognized text",
        empty: "No checkpoints recorded.",
      };
  const checkpointHtml = session.checkpoints.length
    ? session.checkpoints
        .map(
          (checkpoint) => `<article>
            <div><strong>${escapeHtml(checkpoint.label)}</strong><time>${escapeHtml(formatClock(checkpoint.at, locale))}</time></div>
            ${validImage(checkpoint.image) ? `<img src="${checkpoint.image}" alt="${escapeHtml(checkpoint.label)}">` : ""}
          </article>`,
        )
        .join("")
    : `<p>${labels.empty}</p>`;
  const recognized = clean(session.boardSummary?.recognizedText, 500);
  const pageHtml = (session.boardPages || []).length
    ? `<section><h2>${labels.pages}</h2>${session.boardPages
        .map(
          (page, index) => `<article><div><strong>${escapeHtml(page.title || `Page ${index + 1}`)}</strong></div>${validImage(page.image) ? `<img src="${page.image}" alt="${escapeHtml(page.title || `Page ${index + 1}`)}">` : ""}</article>`,
        )
        .join("")}</section>`
    : "";
  return `<!doctype html>
<html lang="${it ? "it" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(session.title)} · AirBoard</title><style>
body{margin:0;background:#0b0c0f;color:#f5f7fa;font:16px/1.55 system-ui,sans-serif}main{max-width:920px;margin:auto;padding:48px 24px 80px}header{border-bottom:1px solid #ffffff20;padding-bottom:28px;margin-bottom:32px}.eyebrow{color:#8edff7;font-size:12px;letter-spacing:.16em;text-transform:uppercase}h1{font-size:clamp(34px,7vw,64px);line-height:1;margin:10px 0 18px}dl{display:flex;gap:30px;flex-wrap:wrap}dt{color:#ffffff80;font-size:12px}dd{margin:2px 0 0}section{margin-top:38px}h2{font-size:20px}article{margin:18px 0 28px}article div{display:flex;justify-content:space-between;gap:12px;margin-bottom:9px}time{color:#ffffff80}img{display:block;width:100%;border:1px solid #ffffff20;border-radius:16px;background:#08090c}.text{padding:18px;border-radius:14px;background:#ffffff0a;white-space:pre-wrap}@media print{body{background:#fff;color:#111}main{padding:20px}article{break-inside:avoid}}
</style></head><body><main><header><div class="eyebrow">${labels.report}</div><h1>${escapeHtml(session.title)}</h1><dl><div><dt>${labels.duration}</dt><dd>${formatDuration(sessionDuration(session))}</dd></div><div><dt>${labels.goal}</dt><dd>${escapeHtml(session.goal || "—")}</dd></div></dl></header>
<section><h2>${labels.checkpoints}</h2>${checkpointHtml}</section>
${pageHtml}
${recognized ? `<section><h2>${labels.recognized}</h2><div class="text">${escapeHtml(recognized)}</div></section>` : ""}
${validImage(session.finalBoard) ? `<section><h2>${labels.final}</h2><img src="${session.finalBoard}" alt="${labels.final}"></section>` : ""}
</main></body></html>`;
}

function normalizeBoardPages(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((page, index) => ({
    id: clean(page?.id || `page-${index + 1}`, 100),
    title: clean(page?.title, 48) || `Page ${index + 1}`,
    image: validImage(page?.image) ? page.image : null,
  }));
}

function normalizeBoardSummary(value) {
  return {
    strokeCount: Math.max(0, Number(value?.strokeCount) || 0),
    semanticCount: Math.max(0, Number(value?.semanticCount) || 0),
    recognizedText: clean(value?.recognizedText, 500),
  };
}

function validImage(value) {
  return (
    typeof value === "string" && /^data:image\/(?:png|jpeg);base64,/.test(value)
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatClock(value, locale) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
