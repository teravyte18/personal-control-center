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
import {
  createId,
  createItem,
  createProjectAction,
  isCompletedThisWeek,
  type ActionCompletionResolution,
  type Item,
  type ItemStatus,
  type ProjectAction,
  type ReviewDraft,
  type ReviewEntry,
} from "@/domain/personal-data";
import {
  applyPersonalDataMutation,
  createPersonalDataExport,
  emptyPersonalDataSnapshot,
  hasPersonalData,
  normalizePersonalDataSnapshot,
  type PersonalDataMutation,
  type PersonalDataSnapshot,
} from "@/domain/personal-data-snapshot";
import { loadPersonalData, saveItems, saveReviews } from "@/lib/personal-storage";

const LOCAL_SAVE_DELAY_MS = 400;
const SERVER_REFRESH_INTERVAL_MS = 5_000;
const MIGRATION_BACKUP_KEY = "pcc-browser-migration-backup-v1";

type ItemUpdates = Partial<Omit<Item, "id" | "createdAt">>;
type AddItemOptions = Partial<Pick<Item, "description" | "kind" | "status" | "area">>;
type ProjectActionUpdates = Pick<ProjectAction, "title" | "targetDate">;
type DataMode = "loading" | "server" | "local-migration" | "local-fallback";

type ServerStatePayload = {
  revision: number;
  snapshot: PersonalDataSnapshot;
  updatedAt: string;
  isEmpty: boolean;
};

type PersonalDataContextValue = {
  items: Item[];
  loaded: boolean;
  openItems: Item[];
  closedThisWeek: Item[];
  addItem: (title: string, options?: AddItemOptions) => Item | null;
  updateItem: (id: string, updates: ItemUpdates) => void;
  setItemStatus: (id: string, status: ItemStatus) => void;
  toggleCompleted: (id: string) => void;
  archiveItem: (id: string) => void;
  restoreArchivedItem: (id: string) => void;
  deleteItem: (id: string) => void;
  addProjectAction: (projectId: string, title: string, targetDate: string) => void;
  updateProjectAction: (projectId: string, actionId: string, updates: ProjectActionUpdates) => void;
  completeProjectAction: (
    projectId: string,
    actionId: string,
    completionNote: string,
    resolution: ActionCompletionResolution,
    nextActionTitle?: string,
    nextTargetDate?: string,
  ) => void;
  draft: ReviewDraft;
  history: ReviewEntry[];
  updateDraft: (field: keyof ReviewDraft, value: string) => void;
  completeReview: () => ReviewEntry;
  dataMode: DataMode;
  syncing: boolean;
  syncError: string;
  migrationRequired: boolean;
  downloadLocalBackup: () => void;
  importLocalData: () => Promise<boolean>;
  refreshServerData: () => Promise<void>;
};

const PersonalDataContext = createContext<PersonalDataContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseServerState(value: unknown): ServerStatePayload | null {
  if (!isRecord(value)
    || typeof value.revision !== "number"
    || typeof value.updatedAt !== "string"
    || typeof value.isEmpty !== "boolean") return null;

  return {
    revision: value.revision,
    snapshot: normalizePersonalDataSnapshot(value.snapshot),
    updatedAt: value.updatedAt,
    isEmpty: value.isEmpty,
  };
}

function browserSnapshot() {
  const stored = loadPersonalData(window.localStorage);
  return normalizePersonalDataSnapshot(stored);
}

function downloadExport(dataExport: ReturnType<typeof createPersonalDataExport>) {
  const blob = new Blob([`${JSON.stringify(dataExport, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `personal-control-center-browser-${dataExport.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PersonalDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<PersonalDataSnapshot>(emptyPersonalDataSnapshot);
  const [loaded, setLoaded] = useState(false);
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [revision, setRevision] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const snapshotRef = useRef(snapshot);
  const modeRef = useRef<DataMode>(dataMode);
  const revisionRef = useRef(revision);
  const pendingMutationsRef = useRef(0);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replaceSnapshot = useCallback((next: PersonalDataSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const replaceMode = useCallback((next: DataMode) => {
    modeRef.current = next;
    setDataMode(next);
  }, []);

  const replaceRevision = useCallback((next: number) => {
    revisionRef.current = next;
    setRevision(next);
  }, []);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    modeRef.current = dataMode;
  }, [dataMode]);

  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      const local = browserSnapshot();

      try {
        const response = await fetch("/api/personal-data", { cache: "no-store" });
        if (!response.ok) throw new Error("Server persistence is unavailable.");
        const server = parseServerState(await response.json());
        if (!server) throw new Error("Server persistence returned an invalid response.");
        if (cancelled) return;

        replaceRevision(server.revision);
        if (server.isEmpty && hasPersonalData(local)) {
          replaceSnapshot(local);
          replaceMode("local-migration");
        } else {
          replaceSnapshot(server.snapshot);
          replaceMode("server");
        }
      } catch (error) {
        if (cancelled) return;
        replaceSnapshot(local);
        replaceMode("local-fallback");
        setSyncError(error instanceof Error ? error.message : "Server persistence is unavailable.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [replaceMode, replaceRevision, replaceSnapshot]);

  const flushLocalSnapshot = useCallback(() => {
    if (localSaveTimerRef.current) {
      clearTimeout(localSaveTimerRef.current);
      localSaveTimerRef.current = null;
    }
    const current = snapshotRef.current;
    saveItems(window.localStorage, current.items);
    saveReviews(window.localStorage, current.draft, current.history);
  }, []);

  useEffect(() => {
    if (!loaded || !["local-migration", "local-fallback"].includes(dataMode)) return;
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(flushLocalSnapshot, LOCAL_SAVE_DELAY_MS);

    return () => {
      if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    };
  }, [snapshot, dataMode, loaded, flushLocalSnapshot]);

  useEffect(() => {
    if (!loaded || !["local-migration", "local-fallback"].includes(dataMode)) return;
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushLocalSnapshot();
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushLocalSnapshot);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushLocalSnapshot);
    };
  }, [dataMode, loaded, flushLocalSnapshot]);

  const refreshServerData = useCallback(async () => {
    if (modeRef.current !== "server" || pendingMutationsRef.current > 0) return;

    const response = await fetch("/api/personal-data", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not refresh server data.");
    const server = parseServerState(await response.json());
    if (!server) throw new Error("Server persistence returned an invalid response.");

    if (server.revision > revisionRef.current) {
      replaceSnapshot(server.snapshot);
      replaceRevision(server.revision);
    }
    setSyncError("");
  }, [replaceRevision, replaceSnapshot]);

  useEffect(() => {
    if (dataMode !== "server") return;

    const refresh = () => {
      void refreshServerData().catch((error) => {
        setSyncError(error instanceof Error ? error.message : "Could not refresh server data.");
      });
    };
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const interval = window.setInterval(refresh, SERVER_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [dataMode, refreshServerData]);

  const commitMutation = useCallback((mutation: PersonalDataMutation) => {
    setSnapshot((current) => {
      const next = applyPersonalDataMutation(current, mutation);
      snapshotRef.current = next;
      return next;
    });

    if (modeRef.current !== "server") return;

    pendingMutationsRef.current += 1;
    setSyncing(true);
    mutationQueueRef.current = mutationQueueRef.current
      .then(async () => {
        if (modeRef.current !== "server") return;
        const response = await fetch("/api/personal-data/mutations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation),
        });
        if (!response.ok) throw new Error("A change could not be saved to the server.");
        const server = parseServerState(await response.json());
        if (!server) throw new Error("Server persistence returned an invalid response.");
        replaceSnapshot(server.snapshot);
        replaceRevision(server.revision);
        setSyncError("");
      })
      .catch((error) => {
        replaceMode("local-fallback");
        setSyncError(error instanceof Error ? error.message : "A change could not be saved to the server.");
        flushLocalSnapshot();
      })
      .finally(() => {
        pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
        setSyncing(pendingMutationsRef.current > 0);
      });
  }, [flushLocalSnapshot, replaceMode, replaceRevision, replaceSnapshot]);

  const downloadLocalBackup = useCallback(() => {
    const dataExport = createPersonalDataExport(snapshotRef.current);
    window.localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(dataExport));
    downloadExport(dataExport);
  }, []);

  const importLocalData = useCallback(async () => {
    if (modeRef.current !== "local-migration") return false;

    const dataExport = createPersonalDataExport(snapshotRef.current);
    window.localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(dataExport));
    downloadExport(dataExport);
    setSyncing(true);
    setSyncError("");

    try {
      const response = await fetch("/api/personal-data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataExport),
      });
      const body = await response.json() as unknown;
      if (!response.ok) {
        const message = isRecord(body) && typeof body.error === "string"
          ? body.error
          : "Browser data could not be imported.";
        throw new Error(message);
      }
      const server = parseServerState(body);
      if (!server) throw new Error("Server persistence returned an invalid response.");

      replaceSnapshot(server.snapshot);
      replaceRevision(server.revision);
      replaceMode("server");
      return true;
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Browser data could not be imported.");
      return false;
    } finally {
      setSyncing(false);
    }
  }, [replaceMode, replaceRevision, replaceSnapshot]);

  const items = snapshot.items;
  const draft = snapshot.draft;
  const history = snapshot.history;
  const openItems = useMemo(
    () => items.filter((item) => !["completed", "archived"].includes(item.status)),
    [items],
  );
  const closedThisWeek = useMemo(() => items.filter((item) => isCompletedThisWeek(item)), [items]);

  const addItem = useCallback((title: string, options?: AddItemOptions) => {
    const item = createItem(title, options);
    if (!item) return null;
    commitMutation({ type: "add-item", item });
    return item;
  }, [commitMutation]);

  const updateItem = useCallback((id: string, updates: ItemUpdates) => {
    commitMutation({ type: "update-item", id, updates, occurredAt: new Date().toISOString() });
  }, [commitMutation]);

  const setItemStatus = useCallback((id: string, status: ItemStatus) => {
    commitMutation({ type: "set-item-status", id, status, occurredAt: new Date().toISOString() });
  }, [commitMutation]);

  const toggleCompleted = useCallback((id: string) => {
    commitMutation({ type: "toggle-completed", id, occurredAt: new Date().toISOString() });
  }, [commitMutation]);

  const archiveItem = useCallback((id: string) => {
    commitMutation({ type: "archive-item", id, occurredAt: new Date().toISOString() });
  }, [commitMutation]);

  const restoreArchivedItem = useCallback((id: string) => {
    commitMutation({ type: "restore-archived-item", id, occurredAt: new Date().toISOString() });
  }, [commitMutation]);

  const deleteItem = useCallback((id: string) => {
    commitMutation({ type: "delete-item", id });
  }, [commitMutation]);

  const addProjectAction = useCallback((projectId: string, title: string, targetDate: string) => {
    const action = createProjectAction(title, targetDate);
    if (!action) return;
    commitMutation({ type: "add-project-action", projectId, action });
  }, [commitMutation]);

  const updateProjectAction = useCallback((projectId: string, actionId: string, updates: ProjectActionUpdates) => {
    commitMutation({
      type: "update-project-action",
      projectId,
      actionId,
      updates,
      occurredAt: new Date().toISOString(),
    });
  }, [commitMutation]);

  const completeProjectAction = useCallback((
    projectId: string,
    actionId: string,
    completionNote: string,
    resolution: ActionCompletionResolution,
    nextActionTitle = "",
    nextTargetDate = "",
  ) => {
    const now = new Date();
    const nextAction = resolution === "next-action"
      ? createProjectAction(nextActionTitle, nextTargetDate, now) ?? undefined
      : undefined;
    if (resolution === "next-action" && !nextAction) return;

    commitMutation({
      type: "complete-project-action",
      projectId,
      actionId,
      completionNote,
      resolution,
      occurredAt: now.toISOString(),
      nextAction,
    });
  }, [commitMutation]);

  const updateDraft = useCallback((field: keyof ReviewDraft, value: string) => {
    commitMutation({ type: "update-review-draft", field, value });
  }, [commitMutation]);

  const completeReview = useCallback(() => {
    const entry: ReviewEntry = {
      ...snapshotRef.current.draft,
      id: createId(),
      completedAt: new Date().toISOString(),
    };
    commitMutation({ type: "complete-review", entry });
    return entry;
  }, [commitMutation]);

  const value = useMemo<PersonalDataContextValue>(() => ({
    items,
    loaded,
    openItems,
    closedThisWeek,
    addItem,
    updateItem,
    setItemStatus,
    toggleCompleted,
    archiveItem,
    restoreArchivedItem,
    deleteItem,
    addProjectAction,
    updateProjectAction,
    completeProjectAction,
    draft,
    history,
    updateDraft,
    completeReview,
    dataMode,
    syncing,
    syncError,
    migrationRequired: dataMode === "local-migration",
    downloadLocalBackup,
    importLocalData,
    refreshServerData,
  }), [
    items,
    loaded,
    openItems,
    closedThisWeek,
    addItem,
    updateItem,
    setItemStatus,
    toggleCompleted,
    archiveItem,
    restoreArchivedItem,
    deleteItem,
    addProjectAction,
    updateProjectAction,
    completeProjectAction,
    draft,
    history,
    updateDraft,
    completeReview,
    dataMode,
    syncing,
    syncError,
    downloadLocalBackup,
    importLocalData,
    refreshServerData,
  ]);

  return <PersonalDataContext.Provider value={value}>{children}</PersonalDataContext.Provider>;
}

function usePersonalDataContext() {
  const context = useContext(PersonalDataContext);
  if (!context) throw new Error("Personal data hooks must be used inside PersonalDataProvider.");
  return context;
}

export function usePersonalData() {
  const {
    items,
    loaded,
    openItems,
    closedThisWeek,
    addItem,
    updateItem,
    setItemStatus,
    toggleCompleted,
    archiveItem,
    restoreArchivedItem,
    deleteItem,
    addProjectAction,
    updateProjectAction,
    completeProjectAction,
  } = usePersonalDataContext();

  return {
    items,
    loaded,
    openItems,
    closedThisWeek,
    addItem,
    updateItem,
    setItemStatus,
    toggleCompleted,
    archiveItem,
    restoreArchivedItem,
    deleteItem,
    addProjectAction,
    updateProjectAction,
    completeProjectAction,
  };
}

export function useReviewData() {
  const { draft, history, loaded, updateDraft, completeReview } = usePersonalDataContext();
  return { draft, history, loaded, updateDraft, completeReview };
}

export function useDataConnection() {
  const {
    dataMode,
    syncing,
    syncError,
    migrationRequired,
    downloadLocalBackup,
    importLocalData,
    refreshServerData,
  } = usePersonalDataContext();
  return {
    dataMode,
    syncing,
    syncError,
    migrationRequired,
    downloadLocalBackup,
    importLocalData,
    refreshServerData,
  };
}
