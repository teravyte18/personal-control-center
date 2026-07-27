import {
  normalizePersonalDataMutation,
  type PersonalDataMutation,
} from "@/domain/personal-data-snapshot";

export const OFFLINE_CAPTURE_STORAGE_VERSION = 1;
export const OFFLINE_CAPTURE_STORAGE_PREFIX = "pcc-offline-captures-v1";

export type OfflineCaptureMutation = Extract<PersonalDataMutation, { type: "add-item" }>;

export type OfflineCaptureRecord = {
  id: string;
  mutation: OfflineCaptureMutation;
  queuedAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
};

type QueueEnvelope = {
  version: typeof OFFLINE_CAPTURE_STORAGE_VERSION;
  records: OfflineCaptureRecord[];
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "getItem" | "setItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeRecord(value: unknown): OfflineCaptureRecord | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !isDateTime(value.queuedAt)
    || typeof value.attemptCount !== "number"
    || !Number.isInteger(value.attemptCount)
    || value.attemptCount < 0) return null;

  const mutation = normalizePersonalDataMutation(value.mutation);
  if (!mutation || mutation.type !== "add-item" || mutation.item.id !== value.id) return null;

  const lastAttemptAt = value.lastAttemptAt === undefined
    ? undefined
    : isDateTime(value.lastAttemptAt) ? value.lastAttemptAt : null;
  if (lastAttemptAt === null) return null;

  const lastError = value.lastError === undefined
    ? undefined
    : typeof value.lastError === "string" ? value.lastError : null;
  if (lastError === null) return null;

  return {
    id: value.id,
    mutation,
    queuedAt: value.queuedAt,
    attemptCount: value.attemptCount,
    lastAttemptAt,
    lastError,
  };
}

export function offlineCaptureStorageKey(userId: string) {
  return `${OFFLINE_CAPTURE_STORAGE_PREFIX}:${userId}`;
}

export function loadOfflineCaptures(storage: StorageReader, userId: string): OfflineCaptureRecord[] {
  try {
    const raw = storage.getItem(offlineCaptureStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)
      || parsed.version !== OFFLINE_CAPTURE_STORAGE_VERSION
      || !Array.isArray(parsed.records)) return [];

    return parsed.records
      .map(normalizeRecord)
      .filter((record): record is OfflineCaptureRecord => Boolean(record))
      .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
  } catch {
    return [];
  }
}

export function saveOfflineCaptures(storage: StorageWriter, userId: string, records: OfflineCaptureRecord[]) {
  const envelope: QueueEnvelope = {
    version: OFFLINE_CAPTURE_STORAGE_VERSION,
    records: records
      .map(normalizeRecord)
      .filter((record): record is OfflineCaptureRecord => Boolean(record))
      .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt)),
  };
  storage.setItem(offlineCaptureStorageKey(userId), JSON.stringify(envelope));
  return envelope.records;
}

export function enqueueOfflineCapture(
  storage: StorageWriter,
  userId: string,
  mutation: OfflineCaptureMutation,
  now = new Date(),
) {
  const records = loadOfflineCaptures(storage, userId);
  if (records.some((record) => record.id === mutation.item.id)) return records;

  return saveOfflineCaptures(storage, userId, [
    ...records,
    {
      id: mutation.item.id,
      mutation,
      queuedAt: now.toISOString(),
      attemptCount: 0,
    },
  ]);
}

export function markOfflineCaptureAttempt(
  storage: StorageWriter,
  userId: string,
  id: string,
  error: string,
  now = new Date(),
) {
  const records = loadOfflineCaptures(storage, userId).map((record) => record.id === id
    ? {
        ...record,
        attemptCount: record.attemptCount + 1,
        lastAttemptAt: now.toISOString(),
        lastError: error.slice(0, 1000),
      }
    : record);
  return saveOfflineCaptures(storage, userId, records);
}

export function removeOfflineCapture(storage: StorageWriter, userId: string, id: string) {
  return saveOfflineCaptures(
    storage,
    userId,
    loadOfflineCaptures(storage, userId).filter((record) => record.id !== id),
  );
}
