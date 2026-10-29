export type KeyboardViewport = { width: number; height: number; scale: number };
export type KeyboardBaseline = { width: number; height: number };

/** Pure geometry policy, independent of browser-specific layout-viewport resizing. */
export function measureKeyboard(baseline: KeyboardBaseline, viewport: KeyboardViewport, editing: boolean) {
  // Pinch zoom changes visual dimensions but must never change our baseline.
  if (viewport.scale !== 1) return { baseline, visible: false };
  const nextBaseline = Math.abs(viewport.width - baseline.width) > 80
    ? { width: viewport.width, height: viewport.height }
    : { width: viewport.width, height: Math.max(baseline.height, viewport.height) };
  return {
    baseline: nextBaseline,
    visible: editing && viewport.width < 768 && nextBaseline.height - viewport.height > 140,
  };
}
