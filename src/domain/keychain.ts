export const KEYCHAIN_ENVELOPE_VERSION = 1 as const;
export const KEYCHAIN_KDF_ALGORITHM = "argon2id13" as const;
export const KEYCHAIN_KDF_DEFAULT_OPSLIMIT = 3;
export const KEYCHAIN_KDF_DEFAULT_MEMLIMIT = 64 * 1024 * 1024;
export const KEYCHAIN_KDF_MIN_OPSLIMIT = 2;
export const KEYCHAIN_KDF_MIN_MEMLIMIT = 19 * 1024 * 1024;
export const KEYCHAIN_KDF_MAX_OPSLIMIT = 10;
export const KEYCHAIN_KDF_MAX_MEMLIMIT = 512 * 1024 * 1024;

const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type KeychainKdfParameters = {
  algorithm: typeof KEYCHAIN_KDF_ALGORITHM;
  salt: string;
  opslimit: number;
  memlimit: number;
};

export type KeychainWrappedKey = {
  nonce: string;
  ciphertext: string;
};

export type KeychainVaultEnvelope = {
  version: typeof KEYCHAIN_ENVELOPE_VERSION;
  kdf: KeychainKdfParameters;
  masterWrap: KeychainWrappedKey;
  recoveryWrap: KeychainWrappedKey;
};

export type StoredKeychainVault = KeychainVaultEnvelope & {
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type KeychainRecordEnvelope = {
  id: string;
  version: typeof KEYCHAIN_ENVELOPE_VERSION;
  revision: number;
  nonce: string;
  ciphertext: string;
};

export type StoredKeychainRecord = KeychainRecordEnvelope & {
  createdAt: string;
  updatedAt: string;
};

export type KeychainPlainRecord = {
  label: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

function isIntegerWithin(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isEncodedBytes(value: unknown, minLength: number, maxLength: number): value is string {
  return typeof value === "string"
    && value.length >= minLength
    && value.length <= maxLength
    && base64UrlPattern.test(value);
}

function isWrappedKey(value: unknown): value is KeychainWrappedKey {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return isEncodedBytes(candidate.nonce, 30, 40)
    && isEncodedBytes(candidate.ciphertext, 60, 80);
}

export function normalizeKeychainVaultEnvelope(value: unknown): KeychainVaultEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const kdf = candidate.kdf;
  if (!kdf || typeof kdf !== "object") return null;
  const parameters = kdf as Record<string, unknown>;

  if (candidate.version !== KEYCHAIN_ENVELOPE_VERSION
    || parameters.algorithm !== KEYCHAIN_KDF_ALGORITHM
    || !isEncodedBytes(parameters.salt, 20, 32)
    || !isIntegerWithin(parameters.opslimit, KEYCHAIN_KDF_MIN_OPSLIMIT, KEYCHAIN_KDF_MAX_OPSLIMIT)
    || !isIntegerWithin(parameters.memlimit, KEYCHAIN_KDF_MIN_MEMLIMIT, KEYCHAIN_KDF_MAX_MEMLIMIT)
    || !isWrappedKey(candidate.masterWrap)
    || !isWrappedKey(candidate.recoveryWrap)) {
    return null;
  }

  return {
    version: KEYCHAIN_ENVELOPE_VERSION,
    kdf: {
      algorithm: KEYCHAIN_KDF_ALGORITHM,
      salt: parameters.salt as string,
      opslimit: parameters.opslimit as number,
      memlimit: parameters.memlimit as number,
    },
    masterWrap: candidate.masterWrap as KeychainWrappedKey,
    recoveryWrap: candidate.recoveryWrap as KeychainWrappedKey,
  };
}

export function normalizeKeychainRecordEnvelope(value: unknown): KeychainRecordEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string"
    || !uuidPattern.test(candidate.id)
    || candidate.version !== KEYCHAIN_ENVELOPE_VERSION
    || !isIntegerWithin(candidate.revision, 1, 2_147_483_647)
    || !isEncodedBytes(candidate.nonce, 30, 40)
    || !isEncodedBytes(candidate.ciphertext, 20, 131_072)) {
    return null;
  }

  return {
    id: candidate.id.toLowerCase(),
    version: KEYCHAIN_ENVELOPE_VERSION,
    revision: candidate.revision as number,
    nonce: candidate.nonce as string,
    ciphertext: candidate.ciphertext as string,
  };
}

export function normalizeKeychainPlainRecord(value: unknown): KeychainPlainRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const fields = ["label", "username", "password", "url", "notes"] as const;
  if (fields.some((field) => typeof candidate[field] !== "string")) return null;

  const record = {
    label: candidate.label as string,
    username: candidate.username as string,
    password: candidate.password as string,
    url: candidate.url as string,
    notes: candidate.notes as string,
  };

  if (!record.label.trim()
    || record.label.length > 512
    || record.username.length > 2048
    || record.password.length > 8192
    || record.url.length > 4096
    || record.notes.length > 65_536) {
    return null;
  }

  return record;
}

export function keychainVaultAad(userId: string, purpose: "master" | "recovery") {
  return `pcc:keychain:v${KEYCHAIN_ENVELOPE_VERSION}:user:${userId}:vault:${purpose}`;
}

export function keychainRecordAad(userId: string, recordId: string, revision: number) {
  return `pcc:keychain:v${KEYCHAIN_ENVELOPE_VERSION}:user:${userId}:record:${recordId.toLowerCase()}:revision:${revision}`;
}
