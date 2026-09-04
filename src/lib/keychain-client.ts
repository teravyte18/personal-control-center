import type {
  KeychainRecordEnvelope,
  KeychainVaultEnvelope,
  StoredKeychainRecord,
  StoredKeychainVault,
} from "@/domain/keychain";

export class KeychainApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "KeychainApiError";
    this.status = status;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  let body: unknown = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const message = body && typeof body === "object" && typeof (body as Record<string, unknown>).error === "string"
      ? String((body as Record<string, unknown>).error)
      : "Keychain request failed.";
    throw new KeychainApiError(response.status, message);
  }

  return body as T;
}

export async function loadKeychainVault() {
  return requestJson<{ userId: string; vault: StoredKeychainVault | null }>("/api/keychain/vault");
}

export async function createRemoteKeychainVault(vault: KeychainVaultEnvelope) {
  return requestJson<{ userId: string; vault: StoredKeychainVault }>("/api/keychain/vault", {
    method: "POST",
    body: JSON.stringify({ vault }),
  });
}

export async function updateRemoteKeychainVault(expectedRevision: number, vault: KeychainVaultEnvelope) {
  return requestJson<{ userId: string; vault: StoredKeychainVault }>("/api/keychain/vault", {
    method: "PUT",
    body: JSON.stringify({ expectedRevision, vault }),
  });
}

export async function loadKeychainRecords() {
  return requestJson<{ records: StoredKeychainRecord[] }>("/api/keychain/records");
}

export async function saveRemoteKeychainRecord(record: KeychainRecordEnvelope) {
  return requestJson<{ record: StoredKeychainRecord }>("/api/keychain/records", {
    method: "POST",
    body: JSON.stringify({ record }),
  });
}

export async function deleteRemoteKeychainRecord(recordId: string, revision: number) {
  await requestJson<null>(`/api/keychain/records/${encodeURIComponent(recordId)}`, {
    method: "DELETE",
    body: JSON.stringify({ revision }),
  });
}

export async function restoreRemoteKeychain(
  expectedVaultRevision: number,
  vault: KeychainVaultEnvelope,
  records: KeychainRecordEnvelope[],
) {
  return requestJson<{ userId: string; vault: StoredKeychainVault; records: StoredKeychainRecord[] }>("/api/keychain/restore", {
    method: "POST",
    body: JSON.stringify({ expectedVaultRevision, vault, records }),
  });
}

export async function rotateRemoteKeychain(
  expectedVaultRevision: number,
  vault: KeychainVaultEnvelope,
  records: KeychainRecordEnvelope[],
) {
  return requestJson<{ userId: string; vault: StoredKeychainVault; records: StoredKeychainRecord[] }>("/api/keychain/rotate", {
    method: "POST",
    body: JSON.stringify({ expectedVaultRevision, vault, records }),
  });
}
