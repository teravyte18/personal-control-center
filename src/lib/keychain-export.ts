import {
  normalizeKeychainRecordEnvelope,
  normalizeKeychainVaultEnvelope,
  type KeychainRecordEnvelope,
  type KeychainVaultEnvelope,
  type StoredKeychainRecord,
  type StoredKeychainVault,
} from "@/domain/keychain";
import {
  clearKeychainKey,
  decryptKeychainRecord,
  unlockKeychainWithMasterPassword,
} from "@/lib/keychain-crypto";

export const KEYCHAIN_EXPORT_FORMAT = "pcc-keychain-export" as const;
export const KEYCHAIN_EXPORT_VERSION = 1 as const;
const MAX_EXPORT_RECORDS = 10_000;

export type KeychainEncryptedExport = {
  format: typeof KEYCHAIN_EXPORT_FORMAT;
  version: typeof KEYCHAIN_EXPORT_VERSION;
  userId: string;
  exportedAt: string;
  vault: KeychainVaultEnvelope;
  records: KeychainRecordEnvelope[];
};

function plainVault(vault: StoredKeychainVault | KeychainVaultEnvelope): KeychainVaultEnvelope {
  return {
    version: vault.version,
    kdf: { ...vault.kdf },
    masterWrap: { ...vault.masterWrap },
    recoveryWrap: { ...vault.recoveryWrap },
  };
}

function plainRecord(record: StoredKeychainRecord | KeychainRecordEnvelope): KeychainRecordEnvelope {
  return {
    id: record.id,
    version: record.version,
    revision: record.revision,
    nonce: record.nonce,
    ciphertext: record.ciphertext,
  };
}

export function buildKeychainEncryptedExport(
  userId: string,
  vault: StoredKeychainVault | KeychainVaultEnvelope,
  records: Array<StoredKeychainRecord | KeychainRecordEnvelope>,
  exportedAt = new Date().toISOString(),
): KeychainEncryptedExport {
  if (!userId || userId.length > 256) throw new TypeError("Keychain export user binding is invalid.");
  if (records.length > MAX_EXPORT_RECORDS) throw new TypeError("Keychain export contains too many records.");
  return {
    format: KEYCHAIN_EXPORT_FORMAT,
    version: KEYCHAIN_EXPORT_VERSION,
    userId,
    exportedAt,
    vault: plainVault(vault),
    records: records.map(plainRecord),
  };
}

export function serializeKeychainEncryptedExport(value: KeychainEncryptedExport) {
  return JSON.stringify(value, null, 2);
}

export function parseKeychainEncryptedExport(text: string, expectedUserId: string): KeychainEncryptedExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("Encrypted Keychain export is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") throw new TypeError("Encrypted Keychain export is invalid.");
  const candidate = parsed as Record<string, unknown>;
  if (candidate.format !== KEYCHAIN_EXPORT_FORMAT || candidate.version !== KEYCHAIN_EXPORT_VERSION) {
    throw new TypeError("Encrypted Keychain export format or version is unsupported.");
  }
  if (candidate.userId !== expectedUserId) {
    throw new TypeError("This encrypted Keychain export belongs to a different PCC user.");
  }
  if (typeof candidate.exportedAt !== "string" || Number.isNaN(Date.parse(candidate.exportedAt))) {
    throw new TypeError("Encrypted Keychain export timestamp is invalid.");
  }
  const vault = normalizeKeychainVaultEnvelope(candidate.vault);
  if (!vault) throw new TypeError("Encrypted Keychain export vault envelope is invalid.");
  if (!Array.isArray(candidate.records) || candidate.records.length > MAX_EXPORT_RECORDS) {
    throw new TypeError("Encrypted Keychain export records are invalid.");
  }
  const records: KeychainRecordEnvelope[] = [];
  const ids = new Set<string>();
  for (const value of candidate.records) {
    const record = normalizeKeychainRecordEnvelope(value);
    if (!record || ids.has(record.id)) throw new TypeError("Encrypted Keychain export contains an invalid or duplicate record.");
    ids.add(record.id);
    records.push(record);
  }
  return {
    format: KEYCHAIN_EXPORT_FORMAT,
    version: KEYCHAIN_EXPORT_VERSION,
    userId: expectedUserId,
    exportedAt: candidate.exportedAt,
    vault,
    records,
  };
}

export async function validateKeychainEncryptedExport(
  value: KeychainEncryptedExport,
  masterPassword: string,
) {
  let key: Uint8Array | null = null;
  try {
    key = await unlockKeychainWithMasterPassword(value.userId, value.vault, masterPassword);
    for (const record of value.records) await decryptKeychainRecord(value.userId, record, key);
    return { recordCount: value.records.length };
  } finally {
    clearKeychainKey(key);
  }
}
