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
  addProjectAction as addProjectActionToItem,
  completeProjectAction as completeProjectActionInItem,
  createId,
  createItem,
  emptyReview,
  isCompletedThisWeek,
  toggleItemCompleted,
  transitionItemStatus,
  updateItemFields,
  updateProjectAction as updateProjectActionInItem,
  type ActionCompletionResolution,
  type Item,
  type ItemStatus,
  type ProjectAction,
  type ReviewDraft,
  type ReviewEntry,
} from "@/domain/personal-data";
import { loadPersonalData, saveItems, saveReviews } from "@/lib/personal-storage";

const SAVE_DELAY_MS = 400;

type ItemUpdates = Partial<Omit<Item, "id" | "createdAt">>;
type AddItemOptions = Partial<Pick<Item, "description" | "kind" | "status" | "area">>;
type ProjectActionUpdates = Pick<ProjectAction, "title" | "targetDate">;

type PersonalDataContextValue = {
  items: Item[];
  loaded: boolean;
  openItems: Item[];
  closedThisWeek: Item[];
  addItem: (title: string, options?: AddItemOptions) => Item | null;
  updateItem: (id: string, updates: ItemUpdates) => void;
  setItemStatus: (id: string, status: ItemStatus) => void;
  toggleCompleted: (id: string) => void;
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
};

const PersonalDataContext = createContext<PersonalDataContextValue | null>(null);

export function PersonalDataProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<ReviewDraft>({ ...emptyReview });
  const [history, setHistory] = useState<ReviewEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const itemsRef = useRef(items);
  const draftRef = useRef(draft);
  const historyRef = useRef(history);
  const itemSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    draftRef.current = draft;
    historyRef.current = history;
  }, [draft, history]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      const stored = loadPersonalData(window.localStorage);
      setItems(stored.items);
      setDraft(stored.draft);
      setHistory(stored.history);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const flushItems = useCallback(() => {
    if (itemSaveTimerRef.current) {
      clearTimeout(itemSaveTimerRef.current);
      itemSaveTimerRef.current = null;
    }
    saveItems(window.localStorage, itemsRef.current);
  }, []);

  const flushReviews = useCallback(() => {
    if (reviewSaveTimerRef.current) {
      clearTimeout(reviewSaveTimerRef.current);
      reviewSaveTimerRef.current = null;
    }
    saveReviews(window.localStorage, draftRef.current, historyRef.current);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (itemSaveTimerRef.current) clearTimeout(itemSaveTimerRef.current);
    itemSaveTimerRef.current = setTimeout(flushItems, SAVE_DELAY_MS);

    return () => {
      if (itemSaveTimerRef.current) clearTimeout(itemSaveTimerRef.current);
    };
  }, [items, loaded, flushItems]);

  useEffect(() => {
    if (!loaded) return;
    if (reviewSaveTimerRef.current) clearTimeout(reviewSaveTimerRef.current);
    reviewSaveTimerRef.current = setTimeout(flushReviews, SAVE_DELAY_MS);

    return () => {
      if (reviewSaveTimerRef.current) clearTimeout(reviewSaveTimerRef.current);
    };
  }, [draft, history, loaded, flushReviews]);

  useEffect(() => {
    if (!loaded) return;

    const flushAll = () => {
      flushItems();
      flushReviews();
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushAll();
    };

    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushAll);

    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, [loaded, flushItems, flushReviews]);

  const openItems = useMemo(
    () => items.filter((item) => !["completed", "archived"].includes(item.status)),
    [items],
  );
  const closedThisWeek = useMemo(() => items.filter((item) => isCompletedThisWeek(item)), [items]);

  const addItem = useCallback((title: string, options?: AddItemOptions) => {
    const item = createItem(title, options);
    if (!item) return null;
    setItems((current) => [item, ...current]);
    return item;
  }, []);

  const updateItem = useCallback((id: string, updates: ItemUpdates) => {
    setItems((current) => current.map((item) => (
      item.id === id ? updateItemFields(item, updates) : item
    )));
  }, []);

  const setItemStatus = useCallback((id: string, status: ItemStatus) => {
    setItems((current) => current.map((item) => (
      item.id === id ? transitionItemStatus(item, status) : item
    )));
  }, []);

  const toggleCompleted = useCallback((id: string) => {
    setItems((current) => current.map((item) => (
      item.id === id ? toggleItemCompleted(item) : item
    )));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const addProjectAction = useCallback((projectId: string, title: string, targetDate: string) => {
    setItems((current) => current.map((item) => (
      item.id === projectId ? addProjectActionToItem(item, title, targetDate) : item
    )));
  }, []);

  const updateProjectAction = useCallback((projectId: string, actionId: string, updates: ProjectActionUpdates) => {
    setItems((current) => current.map((item) => (
      item.id === projectId ? updateProjectActionInItem(item, actionId, updates) : item
    )));
  }, []);

  const completeProjectAction = useCallback((
    projectId: string,
    actionId: string,
    completionNote: string,
    resolution: ActionCompletionResolution,
    nextActionTitle = "",
    nextTargetDate = "",
  ) => {
    setItems((current) => current.map((item) => (
      item.id === projectId
        ? completeProjectActionInItem(
          item,
          actionId,
          completionNote,
          resolution,
          nextActionTitle,
          nextTargetDate,
        )
        : item
    )));
  }, []);

  const updateDraft = useCallback((field: keyof ReviewDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const completeReview = useCallback(() => {
    const entry: ReviewEntry = {
      ...draft,
      id: createId(),
      completedAt: new Date().toISOString(),
    };
    setHistory((current) => [entry, ...current]);
    setDraft({ ...emptyReview });
    return entry;
  }, [draft]);

  const value = useMemo<PersonalDataContextValue>(() => ({
    items,
    loaded,
    openItems,
    closedThisWeek,
    addItem,
    updateItem,
    setItemStatus,
    toggleCompleted,
    deleteItem,
    addProjectAction,
    updateProjectAction,
    completeProjectAction,
    draft,
    history,
    updateDraft,
    completeReview,
  }), [
    items,
    loaded,
    openItems,
    closedThisWeek,
    addItem,
    updateItem,
    setItemStatus,
    toggleCompleted,
    deleteItem,
    addProjectAction,
    updateProjectAction,
    completeProjectAction,
    draft,
    history,
    updateDraft,
    completeReview,
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
