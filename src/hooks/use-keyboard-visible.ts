"use client";

import { useEffect, useState } from "react";
import { measureKeyboard } from "@/lib/keyboard-viewport";

// Compare against the largest viewport at this width: some mobile browsers
// resize innerHeight with the keyboard, others only resize visualViewport.
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let baseline = { width: viewport.width, height: viewport.height };
    let frame = 0;

    function update() {
      if (!viewport) return;
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && active.matches(
        'textarea, [contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]):not([type="file"]):not([type="color"])',
      );
      const measurement = measureKeyboard(baseline, viewport, editing);
      baseline = measurement.baseline;
      const keyboardOpen = measurement.visible;
      setVisible(keyboardOpen);
      // Wait for viewport layout before keeping the editing control reachable.
      cancelAnimationFrame(frame);
      if (keyboardOpen) frame = requestAnimationFrame(() => active?.scrollIntoView({ block: "nearest" }));
    }

    viewport.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  return visible;
}
