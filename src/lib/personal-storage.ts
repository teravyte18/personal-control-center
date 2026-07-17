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

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

export type StoredPersonalData = {
  items: Item[];
  draft: ReviewDraft;
  history: ReviewEntry[];
};

export function loadPersonalData(storage: StorageReader): StoredPersonalData {
  try {
    const storedItems = storage.getItem(ITEMS_KEY) ?? storage.getItem(LEGACY_ITEMS_KEY);
    const storedDraft = storage.getItem(REVIEW_DRAFT_KEY) ?? storage.getItem(LEGACY_REVIEW_KEY);
    const storedHistory = storage.getItem(REVIEW_HISTORY_KEY);

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
    storage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("Could not save items locally.", error);
  }
}

export function saveReviews(storage: StorageWriter, draft: ReviewDraft, history: ReviewEntry[]) {
  try {
    storage.setItem(REVIEW_DRAFT_KEY, JSON.stringify(draft));
    storage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(history));
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
} as const;
