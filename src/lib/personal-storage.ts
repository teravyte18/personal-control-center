import {
  emptyReview,
  normalizeItems,
  normalizeReviewDraft,
  normalizeReviewHistory,
  type Item,
  type ReviewDraft,
  type ReviewEntry,
} from "@/domain/personal-data";

const ITEMS_KEY = "pcc-items-v2";
const LEGACY_ITEMS_KEY = "pcc-items-v1";
const REVIEW_DRAFT_KEY = "pcc-review-draft-v2";
const LEGACY_REVIEW_KEY = "pcc-review-v1";
const REVIEW_HISTORY_KEY = "pcc-review-history-v1";
export const activeBrowserUserStorageKey = "pcc-active-browser-user-v1";

export type BrowserUserIdentity = {
  id: string;
  role: "owner" | "member";
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "getItem" | "setItem">;

export type StoredPersonalData = {
  items: Item[];
  draft: ReviewDraft;
  history: ReviewEntry[];
};

export function loadActiveBrowserUser(storage: StorageReader): BrowserUserIdentity | null {
  try {
    const value = storage.getItem(activeBrowserUserStorageKey);
    if (!value) return null;
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.id !== "string" || !["owner", "member"].includes(String(record.role))) return null;
    return { id: record.id, role: record.role as BrowserUserIdentity["role"] };
  } catch {
    return null;
  }
}

function scopedKey(userId: string, key: string) {
  return `pcc-user:${userId}:${key}`;
}

function readForActiveUser(storage: StorageReader, key: string, legacyKey?: string) {
  const identity = loadActiveBrowserUser(storage);
  if (!identity) return storage.getItem(key) ?? (legacyKey ? storage.getItem(legacyKey) : null);

  const scoped = storage.getItem(scopedKey(identity.id, key));
  if (scoped !== null) return scoped;

  // Only the owner may claim data from the pre-authentication browser prototype.
  if (identity.role === "owner") {
    return storage.getItem(key) ?? (legacyKey ? storage.getItem(legacyKey) : null);
  }

  return null;
}

function writeForActiveUser(storage: StorageWriter, key: string, value: string) {
  const identity = loadActiveBrowserUser(storage);
  storage.setItem(identity ? scopedKey(identity.id, key) : key, value);
}

export function loadPersonalData(storage: StorageReader): StoredPersonalData {
  try {
    const storedItems = readForActiveUser(storage, ITEMS_KEY, LEGACY_ITEMS_KEY);
    const storedDraft = readForActiveUser(storage, REVIEW_DRAFT_KEY, LEGACY_REVIEW_KEY);
    const storedHistory = readForActiveUser(storage, REVIEW_HISTORY_KEY);

    return {
      items: storedItems ? normalizeItems(JSON.parse(storedItems)) : [],
      draft: storedDraft ? normalizeReviewDraft(JSON.parse(storedDraft)) : { ...emptyReview },
      history: storedHistory ? normalizeReviewHistory(JSON.parse(storedHistory)) : [],
    };
  } catch (error) {
    console.warn("Could not load locally saved personal data.", error);
    return {
      items: [],
      draft: { ...emptyReview },
      history: [],
    };
  }
}

export function saveItems(storage: StorageWriter, items: Item[]) {
  try {
    writeForActiveUser(storage, ITEMS_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("Could not save items locally.", error);
  }
}

export function saveReviews(storage: StorageWriter, draft: ReviewDraft, history: ReviewEntry[]) {
  try {
    writeForActiveUser(storage, REVIEW_DRAFT_KEY, JSON.stringify(draft));
    writeForActiveUser(storage, REVIEW_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn("Could not save reviews locally.", error);
  }
}

export const personalStorageKeys = {
  items: ITEMS_KEY,
  legacyItems: LEGACY_ITEMS_KEY,
  reviewDraft: REVIEW_DRAFT_KEY,
  legacyReviewDraft: LEGACY_REVIEW_KEY,
  reviewHistory: REVIEW_HISTORY_KEY,
  activeBrowserUser: activeBrowserUserStorageKey,
} as const;
