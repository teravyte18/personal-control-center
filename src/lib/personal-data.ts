"use client";

import { useEffect, useMemo, useState } from "react";

export type ItemStatus = "inbox" | "active" | "in-progress" | "waiting" | "incubating" | "completed" | "archived";
export type ItemKind = "unclassified" | "project" | "task" | "thought" | "note";
export type AreaId = "work" | "education" | "personal" | "uncategorized";

export type Item = {
  id: string;
  title: string;
  description: string;
  kind: ItemKind;
  status: ItemStatus;
  area: AreaId;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type ReviewDraft = {
  location: string;
  photoName: string;
  happened: string;
  wentWell: string;
  difficult: string;
  learned: string;
  nextWeek: string;
};

export type ReviewEntry = ReviewDraft & {
  id: string;
  completedAt: string;
};

const ITEMS_KEY = "pcc-items-v2";
const LEGACY_ITEMS_KEY = "pcc-items-v1";
const REVIEW_DRAFT_KEY = "pcc-review-draft-v2";
const LEGACY_REVIEW_KEY = "pcc-review-v1";
const REVIEW_HISTORY_KEY = "pcc-review-history-v1";

const now = new Date().toISOString();
const starterItems: Item[] = [
  {
    id: "thesis",
    title: "Define the next concrete thesis milestone",
    description: "",
    kind: "project",
    status: "active",
    area: "education",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "licence",
    title: "Choose the next driving licence action",
    description: "",
    kind: "unclassified",
    status: "inbox",
    area: "personal",
    createdAt: now,
    updatedAt: now,
  },
];

export const emptyReview: ReviewDraft = {
  location: "",
  photoName: "",
  happened: "",
  wentWell: "",
  difficult: "",
  learned: "",
  nextWeek: "",
};

function normalizeItem(value: Partial<Item> & { id: string; title: string }): Item {
  const createdAt = value.createdAt ?? new Date().toISOString();
  return {
    id: value.id,
    title: value.title,
    description: value.description ?? "",
    kind: value.kind ?? "unclassified",
    status: value.status ?? "inbox",
    area: value.area ?? "uncategorized",
    createdAt,
    updatedAt: value.updatedAt ?? createdAt,
    completedAt: value.completedAt,
  };
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function usePersonalData() {
  const [items, setItems] = useState<Item[]>(starterItems);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = localStorage.getItem(ITEMS_KEY) ?? localStorage.getItem(LEGACY_ITEMS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Array<Partial<Item> & { id: string; title: string }>;
          setItems(parsed.map(normalizeItem));
        }
      } catch (error) {
        console.warn("Could not load locally saved items.", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn("Could not save items locally.", error);
    }
  }, [items, loaded]);

  const openItems = useMemo(() => items.filter((item) => !["completed", "archived"].includes(item.status)), [items]);
  const closedThisWeek = useMemo(() => items.filter(isCompletedThisWeek), [items]);

  function addItem(title: string, options?: Partial<Pick<Item, "description" | "kind" | "status" | "area">>) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;
    const timestamp = new Date().toISOString();
    const item: Item = {
      id: createId(),
      title: trimmedTitle,
      description: options?.description ?? "",
      kind: options?.kind ?? "unclassified",
      status: options?.status ?? "inbox",
      area: options?.area ?? "uncategorized",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setItems((current) => [item, ...current]);
    return item;
  }

  function updateItem(id: string, updates: Partial<Omit<Item, "id" | "createdAt">>) {
    setItems((current) => current.map((item) => item.id === id
      ? { ...item, ...updates, updatedAt: new Date().toISOString() }
      : item));
  }

  function toggleCompleted(id: string) {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const completed = item.status === "completed";
      return {
        ...item,
        status: completed ? "active" : "completed",
        completedAt: completed ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }));
  }

  function deleteItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return { items, loaded, openItems, closedThisWeek, addItem, updateItem, toggleCompleted, deleteItem };
}

export function useReviewData() {
  const [draft, setDraft] = useState<ReviewDraft>(emptyReview);
  const [history, setHistory] = useState<ReviewEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const storedDraft = localStorage.getItem(REVIEW_DRAFT_KEY) ?? localStorage.getItem(LEGACY_REVIEW_KEY);
        const storedHistory = localStorage.getItem(REVIEW_HISTORY_KEY);
        if (storedDraft) setDraft({ ...emptyReview, ...(JSON.parse(storedDraft) as Partial<ReviewDraft>) });
        if (storedHistory) setHistory(JSON.parse(storedHistory) as ReviewEntry[]);
      } catch (error) {
        console.warn("Could not load locally saved reviews.", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify(draft));
      localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn("Could not save reviews locally.", error);
    }
  }, [draft, history, loaded]);

  function updateDraft(field: keyof ReviewDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function completeReview() {
    const entry: ReviewEntry = {
      ...draft,
      id: createId(),
      completedAt: new Date().toISOString(),
    };
    setHistory((current) => [entry, ...current]);
    setDraft(emptyReview);
    return entry;
  }

  return { draft, history, loaded, updateDraft, completeReview };
}

export function isCompletedThisWeek(item: Item) {
  if (!item.completedAt) return false;
  const start = new Date();
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return new Date(item.completedAt) >= start;
}

export const areaLabels: Record<AreaId, string> = {
  work: "Work",
  education: "Education",
  personal: "Personal",
  uncategorized: "Uncategorised",
};

export const kindLabels: Record<ItemKind, string> = {
  unclassified: "Unclassified",
  project: "Project",
  task: "Task",
  thought: "Thought",
  note: "Note",
};
