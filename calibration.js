export const CALIBRATION_VERSION = 1;

export const DEFAULT_CALIBRATION = Object.freeze({
  version: CALIBRATION_VERSION,
  pinchDown: 0.43,
  pinchRelease: 0.54,
  handScale: 0.18,
  jitter: 3,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function percentile(values, ratio) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * ratio;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

export function createCalibrationProfile({
  openRatios = [],
  pinchRatios = [],
  handScales = [],
  jitterSamples = [],
  createdAt = new Date().toISOString(),
} = {}) {
  const open = percentile(openRatios, 0.15);
  const pinch = percentile(pinchRatios, 0.85);
  const hasReliablePinch =
    openRatios.length >= 12 &&
    pinchRatios.length >= 12 &&
    open !== null &&
    pinch !== null &&
    open - pinch >= 0.12;

  let pinchDown = DEFAULT_CALIBRATION.pinchDown;
  let pinchRelease = DEFAULT_CALIBRATION.pinchRelease;
  if (hasReliablePinch) {
    const gap = open - pinch;
    pinchDown = clamp(pinch + gap * 0.22, 0.25, 0.52);
    pinchRelease = clamp(open - gap * 0.24, pinchDown + 0.08, 0.82);
  }

  return {
    version: CALIBRATION_VERSION,
    pinchDown: Number(pinchDown.toFixed(3)),
    pinchRelease: Number(pinchRelease.toFixed(3)),
    handScale: Number(
      (percentile(handScales, 0.5) || DEFAULT_CALIBRATION.handScale).toFixed(3),
    ),
    jitter: Number(
      clamp(
        percentile(jitterSamples, 0.75) || DEFAULT_CALIBRATION.jitter,
        0.5,
        18,
      ).toFixed(2),
    ),
    createdAt,
  };
}

export function isCalibrationProfile(value) {
  return Boolean(
    value &&
      value.version === CALIBRATION_VERSION &&
      Number.isFinite(value.pinchDown) &&
      Number.isFinite(value.pinchRelease) &&
      value.pinchRelease > value.pinchDown &&
      Number.isFinite(value.handScale),
  );
}

export function trackingQuality(visible, handScale, profile) {
  if (!visible) return "missing";
  const baseline = profile?.handScale || DEFAULT_CALIBRATION.handScale;
  const ratio = handScale / Math.max(baseline, 0.04);
  if (ratio < 0.58) return "far";
  if (ratio > 1.7) return "near";
  return "good";
}
