"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DebouncedFieldOptions = {
  delayMs?: number;
  canCommit?: (value: string) => boolean;
};

export function useDebouncedField(
  externalValue: string,
  onCommit: (value: string) => void,
  options: DebouncedFieldOptions = {},
) {
  const delayMs = options.delayMs ?? 800;
  const [value, setValueState] = useState(externalValue);
  const valueRef = useRef(externalValue);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(onCommit);
  const canCommitRef = useRef(options.canCommit ?? (() => true));

  useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    canCommitRef.current = options.canCommit ?? (() => true);
  }, [options.canCommit]);

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const flush = useCallback(() => {
    clearTimer();
    if (!dirtyRef.current || !canCommitRef.current(valueRef.current)) return;
    dirtyRef.current = false;
    commitRef.current(valueRef.current);
  }, [clearTimer]);

  const setValue = useCallback((next: string) => {
    setValueState(next);
    valueRef.current = next;
    dirtyRef.current = true;
    clearTimer();
    if (!canCommitRef.current(next)) return;
    timerRef.current = setTimeout(flush, delayMs);
  }, [clearTimer, delayMs, flush]);

  useEffect(() => {
    if (dirtyRef.current) return;
    valueRef.current = externalValue;
    setValueState(externalValue);
  }, [externalValue]);

  useEffect(() => clearTimer, [clearTimer]);

  return { value, setValue, flush };
}
