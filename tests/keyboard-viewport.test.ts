import assert from "node:assert/strict";
import test from "node:test";
import { measureKeyboard } from "../src/lib/keyboard-viewport.ts";

test("phone keyboard hides navigation only while editing and restores it after dismissal", () => {
  const baseline = { width: 390, height: 844 };
  const keyboard = { width: 390, height: 480, scale: 1 };
  assert.equal(measureKeyboard(baseline, keyboard, true).visible, true);
  assert.equal(measureKeyboard(baseline, keyboard, false).visible, false);
  assert.equal(measureKeyboard(baseline, { ...keyboard, height: 844 }, true).visible, false);
  assert.equal(measureKeyboard(baseline, { ...keyboard, height: 760 }, true).visible, false, "browser toolbar changes leave the dock available");
});

test("pinch zoom does not poison the keyboard baseline and rotation resets it", () => {
  const baseline = { width: 390, height: 844 };
  const zoomed = measureKeyboard(baseline, { width: 195, height: 422, scale: 2 }, true);
  assert.equal(zoomed.visible, false);
  assert.deepEqual(zoomed.baseline, baseline);
  const rotated = measureKeyboard(baseline, { width: 700, height: 390, scale: 1 }, true);
  assert.equal(rotated.visible, false);
  assert.deepEqual(rotated.baseline, { width: 700, height: 390 });
  assert.equal(measureKeyboard(rotated.baseline, { width: 700, height: 210, scale: 1 }, true).visible, true);
});
