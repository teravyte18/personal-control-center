"use client";

import { useEffect, useRef } from "react";

/** Keep keyboard focus inside an active editor and return it to its launcher. */
export function useDialogFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    if (!root) return;
    const inertSiblings: Array<{ element: HTMLElement; inert: boolean }> = [];
    let branch: HTMLElement = root;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          inertSiblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    const first = controls()[0];
    if (!root.contains(document.activeElement)) (first ?? root).focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = controls();
      const target = event.shiftKey ? elements.at(-1) : elements[0];
      if (!target) { event.preventDefault(); root.focus(); return; }
      if (!root.contains(document.activeElement) || (!event.shiftKey && document.activeElement === elements.at(-1)) || (event.shiftKey && document.activeElement === elements[0])) {
        event.preventDefault(); target.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      for (const { element, inert } of inertSiblings) element.inert = inert;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return ref;
}
