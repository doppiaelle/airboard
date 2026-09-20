import test from "node:test";
import assert from "node:assert/strict";
import {
  createCalibrationProfile,
  DEFAULT_CALIBRATION,
  isCalibrationProfile,
  trackingQuality,
} from "../calibration.js";

test("calibration derives separated pinch and release thresholds", () => {
  const profile = createCalibrationProfile({
    openRatios: Array(24).fill(0.82),
    pinchRatios: Array(24).fill(0.24),
    handScales: [0.17, 0.18, 0.19],
    jitterSamples: [1, 2, 3],
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(profile.version, 1);
  assert.ok(profile.pinchDown > 0.24);
  assert.ok(profile.pinchRelease < 0.82);
  assert.ok(profile.pinchRelease - profile.pinchDown >= 0.08);
  assert.equal(profile.handScale, 0.18);
  assert.ok(isCalibrationProfile(profile));
});

test("calibration falls back safely when samples overlap", () => {
  const profile = createCalibrationProfile({
    openRatios: Array(24).fill(0.4),
    pinchRatios: Array(24).fill(0.36),
  });
  assert.equal(profile.pinchDown, DEFAULT_CALIBRATION.pinchDown);
  assert.equal(profile.pinchRelease, DEFAULT_CALIBRATION.pinchRelease);
});

test("tracking quality reports framing relative to the learned hand size", () => {
  const profile = { ...DEFAULT_CALIBRATION, handScale: 0.2 };
  assert.equal(trackingQuality(false, 0, profile), "missing");
  assert.equal(trackingQuality(true, 0.08, profile), "far");
  assert.equal(trackingQuality(true, 0.2, profile), "good");
  assert.equal(trackingQuality(true, 0.36, profile), "near");
});
