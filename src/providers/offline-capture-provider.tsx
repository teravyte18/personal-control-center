"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createItem, type Item } from "@/domain/personal-data";
import type { PersonalDataMutation } from "@/domain/personal-data-snapshot";
import {
  enqueueOfflineCapture,
  loadOfflineCaptures,
  markOfflineCaptureAttempt,
  offlineCaptureStorageKey,
  removeOfflineCapture,
  type OfflineCaptureRecord,
} from "@/lib/offline-capture";
import { loadActiveBrowserUser } from "@/lib/personal-storage";
import { useDataConnection, usePersonalData } from "@/providers/personal-data-provider";

const RETRY_INTERVAL_MS = 15_000;
const LOCAL_DEVELOPMENT = process.env.NEXT_PUBLIC_PCC_LOCAL_DEV_MODE === "1";

type CaptureResult = {
  item: Item;
  queued: boolean;
};

type OfflineCaptureContextValue = {
  online: boolean;
  pending: OfflineCaptureRecord[];
  syncing: boolean;
  lastError: string;
  capture: (title: string) => Promise<CaptureResult | null>;
  retry: () => Promise<void>;
};

const OfflineCaptureContext = createContext<OfflineCaptureContextValue | null>(null);

function errorMessage(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}

async function sendCapture(mutation: PersonalDataMutation) {
  const response = await fetch("/api/personal-data/mutations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mutation),
  });
  const body = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw new Error(errorMessage(body, response.status === 401
      ? "Sign in again before pending captures can be synchronised."
      : "The capture could not be saved to the server."));
  }
}

export function OfflineCaptureProvider({ children }: { children: ReactNode }) {
  const { addItem } = usePersonalData();
  const { dataMode, refreshServerData } = useDataConnection();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<OfflineCaptureRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState("");
  const userIdRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const reloadPending = useCallback(() => {
    const userId = userIdRef.current;
    if (!userId) return [];
    const records = loadOfflineCaptures(window.localStorage, userId);
    setPending(records);
    return records;
  }, []);

  useEffect(() => {
    const identity = loadActiveBrowserUser(window.localStorage);
    userIdRef.current = identity?.id ?? (LOCAL_DEVELOPMENT ? "local-development" : null);
    setOnline(navigator.onLine);
    reloadPending();
  }, [reloadPending]);

  useEffect(() => {
    const userId = userIdRef.current;
    if (!userId) return;
    const key = offlineCaptureStorageKey(userId);
    const refresh = (event: StorageEvent) => {
      if (event.key === key) reloadPending();
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [reloadPending]);

  const retry = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId || syncingRef.current || !navigator.onLine || LOCAL_DEVELOPMENT) return;

    syncingRef.current = true;
    setSyncing(true);
    setLastError("");

    try {
      let records = loadOfflineCaptures(window.localStorage, userId);
      for (const record of records) {
        try {
          await sendCapture(record.mutation);
          records = removeOfflineCapture(window.localStorage, userId, record.id);
          setPending(records);
        } catch (error) {
          const message = error instanceof Error ? error.message : "The capture could not be synchronised.";
          records = markOfflineCaptureAttempt(window.localStorage, userId, record.id, message);
          setPending(records);
          setLastError(message);
          break;
        }
      }

      if (records.length === 0) {
        await refreshServerData();
        setLastError("");
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshServerData]);

  useEffect(() => {
    const becameOnline = () => {
      setOnline(true);
      void retry();
    };
    const becameOffline = () => setOnline(false);
    const retryWhenVisible = () => {
      setOnline(navigator.onLine);
      if (document.visibilityState === "visible" && navigator.onLine) void retry();
    };

    const interval = window.setInterval(() => {
      if (navigator.onLine && (pending.length > 0 || dataMode === "local-fallback")) void retry();
    }, RETRY_INTERVAL_MS);

    window.addEventListener("online", becameOnline);
    window.addEventListener("offline", becameOffline);
    window.addEventListener("focus", retryWhenVisible);
    document.addEventListener("visibilitychange", retryWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", becameOnline);
      window.removeEventListener("offline", becameOffline);
      window.removeEventListener("focus", retryWhenVisible);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, [dataMode, pending.length, retry]);

  useEffect(() => {
    if (online && (pending.length > 0 || dataMode === "local-fallback")) void retry();
  }, [dataMode, online, pending.length, retry]);

  const capture = useCallback(async (title: string): Promise<CaptureResult | null> => {
    if (LOCAL_DEVELOPMENT) {
      const item = addItem(title);
      return item ? { item, queued: false } : null;
    }

    const item = createItem(title);
    if (!item) return null;
    const mutation = { type: "add-item", item } as const;
    const userId = userIdRef.current;
    if (!userId) throw new Error("Open the app online and sign in once before using offline capture.");

    if (!navigator.onLine || dataMode !== "server") {
      const records = enqueueOfflineCapture(window.localStorage, userId, mutation);
      setPending(records);
      setOnline(navigator.onLine);
      setLastError("");
      return { item, queued: true };
    }

    setSyncing(true);
    try {
      await sendCapture(mutation);
      await refreshServerData();
      setLastError("");
      return { item, queued: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "The capture could not be saved to the server.";
      const records = enqueueOfflineCapture(window.localStorage, userId, mutation);
      setPending(records);
      setLastError(message);
      return { item, queued: true };
    } finally {
      setSyncing(false);
    }
  }, [addItem, dataMode, refreshServerData]);

  const value = useMemo<OfflineCaptureContextValue>(() => ({
    online,
    pending,
    syncing,
    lastError,
    capture,
    retry,
  }), [capture, lastError, online, pending, retry, syncing]);

  return <OfflineCaptureContext.Provider value={value}>{children}</OfflineCaptureContext.Provider>;
}

export function useOfflineCapture() {
  const context = useContext(OfflineCaptureContext);
  if (!context) throw new Error("Offline capture hooks must be used inside OfflineCaptureProvider.");
  return context;
}
