import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";
import { createAIBoard } from "./ai-board.js";
import {
  createCalibrationProfile,
  DEFAULT_CALIBRATION,
  isCalibrationProfile,
  trackingQuality,
} from "./calibration.js";
const video = document.querySelector("#camera"),
  ink = document.querySelector("#ink"),
  semantic = document.querySelector("#semantic"),
  hud = document.querySelector("#hud"),
  ictx = ink.getContext("2d"),
  hctx = hud.getContext("2d"),
  status = document.querySelector("#status"),
  welcome = document.querySelector("#welcome"),
  widthInput = document.querySelector("#width"),
  gestureHint = document.querySelector("#gestureHint"),
  trackingQualityChip = document.querySelector("#trackingQuality"),
  semanticControls = document.querySelector("#semanticControls"),
  semanticEditor = document.querySelector("#semanticEditor"),
  semanticChoices = document.querySelector("#semanticChoices"),
  modeButtons = [...document.querySelectorAll(".mode-btn")];
let landmarker,
  running = false,
  mirror = true,
  lastVideoTime = -1,
  strokes = [],
  current = null,
  smooth = null,
  lastPoint = null,
  controlMode = "fixed",
  tool = "pointer",
  penDown = false,
  gestureCandidate = null,
  gestureSince = 0,
  pinchCloseFrames = 0,
  pinchHistory = [],
  lang = localStorage.getItem("airboard-lang") || "en",
  boardActive = false,
  boardCandidate = false,
  boardSince = 0,
  lastHandAt = 0,
  releaseSince = 0,
  penStartedAt = 0,
  penOrigin = null,
  spaceArmed = false,
  spaceCooldown = 0,
  eraserCandidateSince = 0,
  eraserCandidateOrigin = null,
  selectedSemanticId = null;
const CALIBRATION_KEY = "airboard-calibration-v1",
  CALIBRATION_SKIP_KEY = "airboard-calibration-skipped-v1";
let calibrationProfile = loadCalibrationProfile(),
  calibrationSession = null;
const HOLD_MS = 330,
  ERASER_HOLD_MS = 1400,
  ERASER_HOLD_MOVE = 22,
  ERASER_RADIUS = 32,
  PINCH_RELEASE_HOLD_MS = 85,
  TAIL_ROLLBACK_MS = 75,
  BOARD_ENTER_MS = 115,
  BOARD_EXIT_MS = 180,
  HAND_DROPOUT_GRACE_MS = 220,
  INDEX_STRAIGHT = 0.78,
  POINTER_STRAIGHT = 0.86,
  SPACE_OPEN = 0.98,
  SPACE_MAX_MS = 900,
  SPACE_MAX_MOVE = 24;
const I = {
  en: {
    heroTitle: "Write in the air.",
    heroText:
      "Use <b>Free</b> mode for gesture-controlled tools, or lock a tool to stay focused on your lesson.",
    start: "Start AirBoard",
    privacy:
      "Camera frames stay on this device. Cloud AI receives cropped ink only after your consent.",
    pointer: "Pointer",
    pen: "Pen",
    eraser: "Eraser",
    locked: "Fixed mode · gesture switching disabled",
    gestures: "Gestures active: pointer · pinch pen · hold open hand to erase",
    showHand: "Show your hand",
    cloudTitle: "Improve uncertain writing?",
    cloudText:
      "Only cropped ink and nearby recognized characters will be sent to our AI service. Camera frames and audio are not uploaded.",
    cloudDeny: "Keep it local",
    cloudAllow: "Allow cloud AI",
    recalibrate: "Recalibrate gestures",
    calibrationEyebrow: "QUICK SETUP",
    calibrationSkip: "Skip",
    correctInk: "Correct ink",
    deleteInk: "Delete element",
    calibrationFrameTitle: "Show your hand",
    calibrationFrameText:
      "Keep your hand comfortably inside the frame and hold it steady.",
    calibrationOpenTitle: "Open thumb and index",
    calibrationOpenText:
      "Hold them apart naturally. This sets your release gesture.",
    calibrationPinchTitle: "Pinch to write",
    calibrationPinchText: "Touch thumb and index as you would while writing.",
    calibrationReady: "Great — continue when ready.",
    calibrationCollecting: "Hold that position…",
    calibrationDone: "Calibration saved",
    calibrationContinue: "Continue",
    qualityGood: "Tracking good",
    qualityFar: "Move closer",
    qualityNear: "Move back",
    qualityMissing: "Show your hand",
  },
  it: {
    heroTitle: "Scrivi nello spazio.",
    heroText:
      "Usa la modalità <b>Libera</b> per controllare gli strumenti con i gesti, oppure blocca uno strumento.",
    start: "Avvia AirBoard",
    privacy:
      "I fotogrammi restano sul dispositivo. L’AI cloud riceve solo la scrittura ritagliata dopo il tuo consenso.",
    pointer: "Punta",
    pen: "Penna",
    eraser: "Gomma",
    locked: "Modalità fissa · cambio tramite gesti disattivato",
    gestures:
      "Gesti attivi: punta · pinch penna · tieni la mano aperta per cancellare",
    showHand: "Mostra la mano",
    cloudTitle: "Migliorare la scrittura incerta?",
    cloudText:
      "Verranno inviati al servizio AI solo la scrittura ritagliata e i caratteri vicini già riconosciuti. Fotogrammi e audio non vengono caricati.",
    cloudDeny: "Mantieni locale",
    cloudAllow: "Consenti AI cloud",
    recalibrate: "Ricalibra i gesti",
    calibrationEyebrow: "CONFIGURAZIONE RAPIDA",
    calibrationSkip: "Salta",
    correctInk: "Correggi segno",
    deleteInk: "Elimina elemento",
    calibrationFrameTitle: "Mostra la mano",
    calibrationFrameText:
      "Tieni la mano comodamente nell’inquadratura e resta fermo.",
    calibrationOpenTitle: "Apri pollice e indice",
    calibrationOpenText:
      "Tienili separati in modo naturale. Imposta il gesto di rilascio.",
    calibrationPinchTitle: "Pizzica per scrivere",
    calibrationPinchText: "Unisci pollice e indice come faresti mentre scrivi.",
    calibrationReady: "Ottimo — continua quando vuoi.",
    calibrationCollecting: "Mantieni la posizione…",
    calibrationDone: "Calibrazione salvata",
    calibrationContinue: "Continua",
    qualityGood: "Tracciamento stabile",
    qualityFar: "Avvicinati",
    qualityNear: "Allontanati",
    qualityMissing: "Mostra la mano",
  },
};
const t = (k) => I[lang][k] || k,
  aiState = document.querySelector("#aiState"),
  cloudConsent = document.querySelector("#cloudConsent"),
  stateLabels = {
    off: "AI Board",
    ready: "AI Board · Ready",
    "local-loading": "AI Board · Loading…",
    "local-pending": "AI Board · Reading…",
    "local-ready": "AI Board · Live",
    provisional: "AI Board · Live · checking",
    collecting: "AI Board · Keep writing",
    refining: "AI Board · Refining…",
    degraded: "AI Board · Local mode",
    "local-only": "AI Board · Local only",
    "rate-limited": "AI Board · Local mode · cloud busy",
    "contract-error": "AI Board · Cloud response rejected",
  };
let cloudConsentPromise = null;
function requestCloudConsent() {
  if (localStorage.getItem("airboard-cloud-consent") === "v1")
    return Promise.resolve(true);
  if (cloudConsentPromise) return cloudConsentPromise;
  if (typeof cloudConsent.showModal !== "function") {
    const allowed = confirm(t("cloudText"));
    if (allowed) localStorage.setItem("airboard-cloud-consent", "v1");
    return Promise.resolve(allowed);
  }
  cloudConsentPromise = new Promise((resolve) => {
    cloudConsent.returnValue = "deny";
    cloudConsent.addEventListener(
      "close",
      () => {
        const allowed = cloudConsent.returnValue === "allow";
        if (allowed) localStorage.setItem("airboard-cloud-consent", "v1");
        cloudConsentPromise = null;
        resolve(allowed);
      },
      { once: true },
    );
    cloudConsent.showModal();
  });
  return cloudConsentPromise;
}
const ai = createAIBoard({
  ink,
  semantic,
  getStrokes: () => strokes,
  setStrokes: (v) => {
    strokes = v;
    redraw();
  },
  requestCloudConsent,
  onElementsChange: syncSemanticControls,
  onState: (s) => {
    aiState.dataset.state = s;
    aiState.textContent = stateLabels[s] || "AI Board";
  },
});
const domainBtn = document.querySelector("#recognitionDomain"),
  domains = ["math", "letters", "draw"],
  domainUI = {
    math: { glyph: "123", title: "Recognition: math" },
    letters: { glyph: "Aa", title: "Recognition: text" },
    draw: { glyph: "✏️", title: "Drawing mode" },
  };
let recognitionDomain = "draw";
function syncDomainAvailability() {
  const on = ai.isEnabled();
  domainBtn.disabled = !on;
  domainBtn.classList.toggle("active", on);
  domainBtn.setAttribute("aria-disabled", String(!on));
}
function renderDomain() {
  const u = domainUI[recognitionDomain];
  domainBtn.dataset.domain = recognitionDomain;
  domainBtn.querySelector(".domain-glyph").textContent = u.glyph;
  domainBtn.title = domainBtn.ariaLabel = u.title;
  ai.setDomain(recognitionDomain);
  syncDomainAvailability();
}
document.querySelector("#aiBoard").onclick = (e) => {
  const wasOn = ai.isEnabled(),
    on = ai.toggle();
  if (on && !wasOn) {
    recognitionDomain = "draw";
    renderDomain();
  }
  e.currentTarget.classList.toggle("active", on);
  e.currentTarget.setAttribute("aria-pressed", String(on));
  aiState.classList.toggle("show", on);
  semanticControls.hidden = !on;
  if (!on) closeSemanticEditor();
  syncDomainAvailability();
};
renderDomain();
domainBtn.onclick = () => {
  if (!ai.isEnabled()) return;
  domainBtn.classList.remove("active");
  setTimeout(() => {
    recognitionDomain =
      domains[(domains.indexOf(recognitionDomain) + 1) % domains.length];
    renderDomain();
  }, 105);
};
function applyLanguage() {
  document.documentElement.lang = lang;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((e) => (e.textContent = t(e.dataset.i18n)));
  document
    .querySelectorAll("[data-i18n-html]")
    .forEach((e) => (e.innerHTML = t(e.dataset.i18nHtml)));
  document
    .querySelectorAll(".lang-en")
    .forEach((e) => e.classList.toggle("active", lang === "en"));
  document
    .querySelectorAll(".lang-it")
    .forEach((e) => e.classList.toggle("active", lang === "it"));
  renderCalibrationStep();
  refreshUI();
}
document.querySelector("#language").onclick = () => {
  lang = lang === "en" ? "it" : "en";
  localStorage.setItem("airboard-lang", lang);
  applyLanguage();
};
const sidebar = document.querySelector("#sidebar"),
  backdrop = document.querySelector("#sidebarBackdrop");
const setSidebar = (o) => {
  sidebar.classList.toggle("open", o);
  backdrop.classList.toggle("open", o);
  sidebar.setAttribute("aria-hidden", String(!o));
};
document.querySelector("#menuToggle").onclick = () => setSidebar(true);
document.querySelector("#menuClose").onclick = () => setSidebar(false);
backdrop.onclick = () => setSidebar(false);

function loadCalibrationProfile() {
  try {
    const value = JSON.parse(localStorage.getItem(CALIBRATION_KEY));
    return isCalibrationProfile(value) ? value : DEFAULT_CALIBRATION;
  } catch {
    return DEFAULT_CALIBRATION;
  }
}

function closeSemanticEditor() {
  selectedSemanticId = null;
  semanticEditor.hidden = true;
}

function openSemanticEditor(element) {
  selectedSemanticId = element.id;
  semanticChoices.replaceChildren();
  for (const choice of element.choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.char;
    button.classList.toggle("selected", choice.char === element.content);
    button.setAttribute("aria-label", `Use ${choice.char}`);
    button.onclick = () => {
      ai.correctElement(element.id, choice.char);
      closeSemanticEditor();
    };
    semanticChoices.append(button);
  }
  const left = Math.min(
    innerWidth - 230,
    Math.max(12, element.layout.x + element.layout.w / 2 - 105),
  );
  const top = Math.min(
    innerHeight - 150,
    Math.max(70, element.layout.y + element.layout.h + 8),
  );
  semanticEditor.style.left = `${left}px`;
  semanticEditor.style.top = `${top}px`;
  semanticEditor.hidden = false;
  (
    semanticChoices.querySelector("button") ||
    document.querySelector("#semanticDelete")
  ).focus();
}

function syncSemanticControls(elements) {
  semanticControls.replaceChildren();
  for (const element of elements) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "semantic-hit";
    button.style.left = `${element.layout.x}px`;
    button.style.top = `${element.layout.y}px`;
    button.style.width = `${Math.max(32, element.layout.w)}px`;
    button.style.height = `${element.layout.h}px`;
    button.dataset.confidence =
      element.confidence < 0.72 && !element.manual ? "low" : "solid";
    button.setAttribute(
      "aria-label",
      element.type === "glyph"
        ? `${t("correctInk")}: ${element.content || "?"}`
        : t("deleteInk"),
    );
    button.onclick = () => openSemanticEditor(element);
    semanticControls.append(button);
  }
  if (
    selectedSemanticId &&
    !elements.some((element) => element.id === selectedSemanticId)
  )
    closeSemanticEditor();
}

document.querySelector("#semanticEditorClose").onclick = closeSemanticEditor;
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !semanticEditor.hidden) closeSemanticEditor();
});
document.querySelector("#semanticDelete").onclick = () => {
  if (selectedSemanticId) ai.deleteElement(selectedSemanticId);
  closeSemanticEditor();
};

const calibrationCoach = document.querySelector("#calibrationCoach"),
  calibrationTitle = document.querySelector("#calibrationTitle"),
  calibrationText = document.querySelector("#calibrationText"),
  calibrationFeedback = document.querySelector("#calibrationFeedback"),
  calibrationNext = document.querySelector("#calibrationNext"),
  calibrationMeter = document.querySelector(".calibration-meter span"),
  calibrationDots = [...document.querySelectorAll(".calibration-progress i")],
  calibrationSteps = [
    ["calibrationFrameTitle", "calibrationFrameText"],
    ["calibrationOpenTitle", "calibrationOpenText"],
    ["calibrationPinchTitle", "calibrationPinchText"],
  ];

function renderCalibrationStep() {
  if (!calibrationSession) return;
  const step = calibrationSession.step;
  calibrationTitle.textContent = t(calibrationSteps[step][0]);
  calibrationText.textContent = t(calibrationSteps[step][1]);
  calibrationFeedback.textContent = t("calibrationCollecting");
  calibrationNext.textContent =
    step === 2 ? t("calibrationDone") : t("calibrationContinue");
  calibrationNext.disabled = true;
  calibrationMeter.style.width = "0%";
  calibrationDots.forEach((dot, index) =>
    dot.classList.toggle("active", index <= step),
  );
}

function startCalibration(force = false) {
  if (!running || calibrationSession) return;
  if (!force && localStorage.getItem(CALIBRATION_SKIP_KEY)) return;
  if (!force) {
    try {
      if (
        isCalibrationProfile(JSON.parse(localStorage.getItem(CALIBRATION_KEY)))
      )
        return;
    } catch {
      localStorage.removeItem(CALIBRATION_KEY);
    }
  }
  calibrationSession = {
    step: 0,
    openRatios: [],
    pinchRatios: [],
    handScales: [],
    jitterSamples: [],
    lastPoint: null,
  };
  renderCalibrationStep();
  if (!calibrationCoach.open) calibrationCoach.showModal();
}

function finishCalibration() {
  calibrationProfile = createCalibrationProfile(calibrationSession);
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibrationProfile));
  localStorage.removeItem(CALIBRATION_SKIP_KEY);
  calibrationSession = null;
  calibrationCoach.close();
  refreshUI();
}

function observeCalibration(lm, point) {
  const scale = distance(lm[0], lm[9]);
  updateTrackingQuality(true, scale);
  if (!calibrationSession) return false;
  const session = calibrationSession,
    ratio = pinchRatio(lm),
    target = 24;
  if (session.step === 0 && scale > 0.075 && scale < 0.38) {
    session.handScales.push(scale);
    if (session.lastPoint)
      session.jitterSamples.push(distance(session.lastPoint, point));
    session.lastPoint = point;
  } else if (session.step === 1 && ratio > 0.48) {
    session.openRatios.push(ratio);
  } else if (session.step === 2 && ratio < 0.58) {
    session.pinchRatios.push(ratio);
  }
  const count =
    session.step === 0
      ? session.handScales.length
      : session.step === 1
        ? session.openRatios.length
        : session.pinchRatios.length;
  calibrationMeter.style.width = `${Math.min(100, (count / target) * 100)}%`;
  const ready = count >= target;
  calibrationNext.disabled = !ready;
  calibrationFeedback.textContent = t(
    ready ? "calibrationReady" : "calibrationCollecting",
  );
  return true;
}

function updateTrackingQuality(visible, scale = 0) {
  if (!running) return;
  const quality = trackingQuality(visible, scale, calibrationProfile);
  trackingQualityChip.hidden = false;
  trackingQualityChip.dataset.quality = quality;
  trackingQualityChip.textContent = t(
    quality === "good"
      ? "qualityGood"
      : quality === "far"
        ? "qualityFar"
        : quality === "near"
          ? "qualityNear"
          : "qualityMissing",
  );
}

calibrationNext.onclick = () => {
  if (!calibrationSession || calibrationNext.disabled) return;
  if (calibrationSession.step === 2) finishCalibration();
  else {
    calibrationSession.step += 1;
    calibrationSession.lastPoint = null;
    renderCalibrationStep();
  }
};
document.querySelector("#calibrationSkip").onclick = () => {
  localStorage.setItem(CALIBRATION_SKIP_KEY, "v1");
  calibrationSession = null;
  calibrationCoach.close();
};
calibrationCoach.addEventListener("cancel", (event) => {
  event.preventDefault();
  document.querySelector("#calibrationSkip").click();
});
document.querySelector("#recalibrate").onclick = () => {
  setSidebar(false);
  localStorage.removeItem(CALIBRATION_SKIP_KEY);
  startCalibration(true);
};

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2),
    r = ink.getBoundingClientRect();
  for (const c of [ink, semantic, hud]) {
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  redraw();
  ai.render();
}
addEventListener("resize", resize);
async function initAI() {
  status.textContent = "Loading hand tracking…";
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  );
  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.42,
    minTrackingConfidence: 0.42,
  });
}
async function start() {
  const btn = document.querySelector("#start");
  btn.disabled = true;
  try {
    status.textContent = "Requesting camera…";
    const cameraPromise = navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    const modelPromise = initAI();
    const stream = await cameraPromise;
    video.srcObject = stream;
    await video.play();
    welcome.hidden = true;
    resize();
    status.textContent = "Loading hand tracking…";
    await modelPromise;
    running = true;
    refreshUI();
    requestAnimationFrame(loop);
    setTimeout(() => startCalibration(), 350);
  } catch (e) {
    status.textContent = "Camera error";
    btn.disabled = false;
    alert(e.message);
  }
}
document.querySelector("#start").onclick = start;
document.querySelector("#clear").onclick = () => {
  strokes = [];
  current = null;
  ai.clear();
  redraw();
};
document.querySelector("#undo").onclick = () => {
  ai.cancelPending();
  if (strokes.length) {
    strokes.pop();
    redraw();
  } else if (!ai.undoSemantic()) redraw();
};
document.querySelector("#mirror").onclick = () => {
  mirror = !mirror;
  video.style.transform = mirror ? "scaleX(-1)" : "none";
};
document.querySelector("#download").onclick = async () => {
  const out = document.createElement("canvas");
  out.width = semantic.width;
  out.height = semantic.height;
  const c = out.getContext("2d");
  c.fillStyle = "#08090c";
  c.fillRect(0, 0, out.width, out.height);
  c.drawImage(semantic, 0, 0);
  c.drawImage(ink, 0, 0);
  const blob = await new Promise((resolve) => out.toBlob(resolve, "image/png"));
  if (!blob) return;
  const name = `airboard-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "AirBoard" });
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
};
modeButtons.forEach((b) => (b.onclick = () => selectControl(b.dataset.mode)));
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function mapPoint(p) {
  return {
    x: (mirror ? 1 - p.x : p.x) * ink.clientWidth,
    y: p.y * ink.clientHeight,
  };
}
function indexStraightness(lm) {
  const a = distance(lm[5], lm[8]),
    b =
      distance(lm[5], lm[6]) + distance(lm[6], lm[7]) + distance(lm[7], lm[8]);
  return a / Math.max(b, 0.001);
}
function indexPointing(lm, strict = false) {
  const straight = indexStraightness(lm),
    extended = distance(lm[8], lm[0]) > distance(lm[6], lm[0]) * 1.07;
  return straight > (strict ? POINTER_STRAIGHT : INDEX_STRAIGHT) && extended;
}
function fingertip(lm) {
  const tip = mapPoint(lm[8]),
    dip = mapPoint(lm[7]),
    dx = tip.x - dip.x,
    dy = tip.y - dip.y,
    len = Math.hypot(dx, dy) || 1;
  return { x: tip.x + (dx / len) * 2.5, y: tip.y + (dy / len) * 2.5 };
}
function ema(p) {
  if (!smooth) smooth = p;
  const jump = distance(smooth, p),
    noiseFactor = Math.max(
      0.72,
      Math.min(1, 4 / Math.max(calibrationProfile.jitter || 3, 1)),
    ),
    a =
      jump > 18
        ? Math.max(0.56, 0.68 * noiseFactor)
        : (jump > 7 ? 0.52 : 0.34) * noiseFactor;
  return (smooth = {
    x: smooth.x + (p.x - smooth.x) * a,
    y: smooth.y + (p.y - smooth.y) * a,
  });
}
function boardIntent(lm) {
  return indexPointing(lm, false) || pinchRatio(lm) < 0.62;
}
function updateBoardGate(lm, n) {
  const wanted = boardIntent(lm) || penDown;
  if (wanted !== boardCandidate) {
    boardCandidate = wanted;
    boardSince = n;
  }
  const delay = wanted ? BOARD_ENTER_MS : BOARD_EXIT_MS;
  if (wanted !== boardActive && n - boardSince >= delay) {
    boardActive = wanted;
    if (!boardActive && penDown) {
      penDown = false;
      releaseSince = 0;
      pinchCloseFrames = 0;
      commitStroke();
    }
    if (!boardActive) {
      smooth = null;
      hctx.clearRect(0, 0, hud.clientWidth, hud.clientHeight);
    }
  }
  return boardActive;
}
function drawStroke(c, s) {
  if (!s?.points?.length) return;
  c.save();
  c.strokeStyle = "#eafcff";
  c.lineWidth = s.width || 6;
  c.lineCap = c.lineJoin = "round";
  c.beginPath();
  s.points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.stroke();
  c.restore();
}
function redraw() {
  ictx.clearRect(0, 0, ink.clientWidth, ink.clientHeight);
  strokes.forEach((s) => drawStroke(ictx, s));
  if (current) drawStroke(ictx, current);
}
function commitStroke() {
  if (current?.points.length > 1) {
    strokes.push(current);
    if (ai.isEnabled()) ai.schedule();
  }
  current = null;
  lastPoint = null;
  redraw();
}
function selectControl(m) {
  commitStroke();
  penDown = false;
  releaseSince = 0;
  controlMode = m === "free" ? "free" : "fixed";
  tool = m === "free" ? "pointer" : m;
  refreshUI();
}
function refreshUI() {
  modeButtons.forEach((b) => {
    const active =
      controlMode === "free"
        ? b.dataset.mode === "free"
        : b.dataset.mode === tool;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  status.textContent =
    tool === "pointer" ? t("pointer") : tool === "pen" ? t("pen") : t("eraser");
  gestureHint.textContent =
    controlMode === "free" ? t("gestures") : t("locked");
}
function fingerUp(lm, a, b) {
  return lm[a].y < lm[b].y - 0.018;
}
function pinchRatio(lm) {
  return distance(lm[8], lm[4]) / Math.max(distance(lm[0], lm[9]), 0.04);
}
function classify(lm) {
  const r = pinchRatio(lm),
    fs = [
      fingerUp(lm, 8, 6),
      fingerUp(lm, 12, 10),
      fingerUp(lm, 16, 14),
      fingerUp(lm, 20, 18),
    ],
    n = fs.filter(Boolean).length;
  if (r < calibrationProfile.pinchDown) return "pen";
  if (n >= 3) return "eraser";
  if (indexPointing(lm, true) && n <= 2) return "pointer";
}
function freeGesture(g, n, p) {
  if (controlMode !== "free" || !g || g === tool) {
    if (g !== "eraser") {
      eraserCandidateSince = 0;
      eraserCandidateOrigin = null;
    }
    return;
  }
  if (penDown) return;
  if (g === "eraser") {
    if (!eraserCandidateSince) {
      eraserCandidateSince = n;
      eraserCandidateOrigin = { ...p };
      gestureCandidate = null;
      return;
    }
    if (distance(eraserCandidateOrigin, p) > ERASER_HOLD_MOVE) {
      eraserCandidateSince = n;
      eraserCandidateOrigin = { ...p };
      return;
    }
    if (n - eraserCandidateSince >= ERASER_HOLD_MS) {
      commitStroke();
      tool = "eraser";
      eraserCandidateSince = 0;
      eraserCandidateOrigin = null;
      gestureCandidate = null;
      refreshUI();
    }
    return;
  }
  eraserCandidateSince = 0;
  eraserCandidateOrigin = null;
  if (g !== gestureCandidate) {
    gestureCandidate = g;
    gestureSince = n;
    return;
  }
  if (n - gestureSince > HOLD_MS) {
    commitStroke();
    tool = g;
    gestureCandidate = null;
    refreshUI();
  }
}
function updatePen(lm, n, p) {
  const r = pinchRatio(lm);
  pinchHistory.push({ t: n, r });
  while (pinchHistory.length && n - pinchHistory[0].t > 1000)
    pinchHistory.shift();
  if (!penDown) {
    releaseSince = 0;
    pinchCloseFrames =
      r < calibrationProfile.pinchDown ? pinchCloseFrames + 1 : 0;
    if (pinchCloseFrames >= 2) {
      penDown = true;
      current = { points: [], width: +widthInput.value };
      lastPoint = null;
      penStartedAt = n;
      penOrigin = p;
      spaceArmed = ai.isEnabled() && n > spaceCooldown;
    }
  } else {
    const moved = penOrigin ? distance(penOrigin, p) : 999;
    if (
      spaceArmed &&
      n - penStartedAt < SPACE_MAX_MS &&
      moved < SPACE_MAX_MOVE &&
      r >= SPACE_OPEN
    ) {
      current = null;
      lastPoint = null;
      penDown = false;
      releaseSince = 0;
      pinchCloseFrames = 0;
      spaceArmed = false;
      spaceCooldown = n + 700;
      ai.addSpace();
      redraw();
      return;
    }
    if (moved >= SPACE_MAX_MOVE || n - penStartedAt >= SPACE_MAX_MS)
      spaceArmed = false;
    if (r >= calibrationProfile.pinchRelease) {
      if (!releaseSince) releaseSince = n;
      if (n - releaseSince >= PINCH_RELEASE_HOLD_MS) {
        const cutoff = releaseSince - TAIL_ROLLBACK_MS;
        while (current?.points.length > 2 && current.points.at(-1).t >= cutoff)
          current.points.pop();
        penDown = false;
        releaseSince = 0;
        pinchCloseFrames = 0;
        spaceArmed = false;
        commitStroke();
      }
    } else releaseSince = 0;
  }
}
function eraseAt(p) {
  strokes = strokes
    .map((s) => {
      let parts = [],
        q = [];
      for (const x of s.points) {
        if (distance(x, p) <= ERASER_RADIUS) {
          if (q.length > 1) parts.push({ ...s, points: q });
          q = [];
        } else q.push(x);
      }
      if (q.length > 1) parts.push({ ...s, points: q });
      return parts;
    })
    .flat();
  redraw();
}
function updateHand(lm) {
  const n = performance.now();
  lastHandAt = n;
  const rawPoint = fingertip(lm);
  if (observeCalibration(lm, rawPoint)) {
    hctx.clearRect(0, 0, hud.clientWidth, hud.clientHeight);
    hctx.beginPath();
    hctx.arc(rawPoint.x, rawPoint.y, 6, 0, Math.PI * 2);
    hctx.fillStyle = "#9be7ff";
    hctx.fill();
    return;
  }
  const active = updateBoardGate(lm, n);
  if (!active) return;
  const pointing = indexPointing(lm, tool === "pointer"),
    p = ema(rawPoint);
  if (controlMode === "free") freeGesture(classify(lm), n, p);
  if (tool === "pen") {
    updatePen(lm, n, p);
    if (penDown && current && (!lastPoint || distance(p, lastPoint) > 1.15)) {
      current.points.push({ ...p, t: n });
      lastPoint = p;
      redraw();
    }
  } else if (tool === "eraser") eraseAt(p);
  hctx.clearRect(0, 0, hud.clientWidth, hud.clientHeight);
  if (tool !== "pointer" || pointing) {
    hctx.beginPath();
    hctx.arc(p.x, p.y, tool === "eraser" ? ERASER_RADIUS : 5.5, 0, Math.PI * 2);
    hctx.fillStyle = "#fff";
    hctx.fill();
  }
}
function noHand() {
  const n = performance.now();
  hctx.clearRect(0, 0, hud.clientWidth, hud.clientHeight);
  updateTrackingQuality(false);
  if (lastHandAt && n - lastHandAt < HAND_DROPOUT_GRACE_MS) return;
  smooth = null;
  boardActive = boardCandidate = false;
  eraserCandidateSince = 0;
  eraserCandidateOrigin = null;
  if (penDown) {
    penDown = false;
    releaseSince = 0;
    spaceArmed = false;
    commitStroke();
  }
  status.textContent = t("showHand");
}
async function loop() {
  if (!running) return;
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const r = landmarker.detectForVideo(video, performance.now());
    r.landmarks?.length ? updateHand(r.landmarks[0]) : noHand();
  }
  requestAnimationFrame(loop);
}
applyLanguage();
syncDomainAvailability();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
