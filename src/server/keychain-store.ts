import {
  KEYCHAIN_ENVELOPE_VERSION,
  KEYCHAIN_KDF_ALGORITHM,
  type KeychainRecordEnvelope,
  type KeychainVaultEnvelope,
  type StoredKeychainRecord,
  type StoredKeychainVault,
} from "@/domain/keychain";
import { getDatabase } from "@/server/database";

type VaultRow = {
  envelope_version: number;
  vault_revision: number;
  kdf_algorithm: string;
  kdf_salt: string;
  kdf_opslimit: number;
  kdf_memlimit: number;
  master_nonce: string;
  master_ciphertext: string;
  recovery_nonce: string;
  recovery_ciphertext: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type RecordRow = {
  record_id: string;
  envelope_version: number;
  revision: number;
  nonce: string;
  ciphertext: string;
  created_at: Date | string;
  updated_at: Date | string;
};

export class KeychainConflictError extends Error {
  constructor(message = "Keychain data changed before this operation completed.") {
    super(message);
    this.name = "KeychainConflictError";
  }
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapVault(row: VaultRow): StoredKeychainVault {
  return {
    version: KEYCHAIN_ENVELOPE_VERSION,
    revision: Number(row.vault_revision),
    kdf: {
      algorithm: KEYCHAIN_KDF_ALGORITHM,
      salt: row.kdf_salt,
      opslimit: Number(row.kdf_opslimit),
      memlimit: Number(row.kdf_memlimit),
    },
    masterWrap: { nonce: row.master_nonce, ciphertext: row.master_ciphertext },
    recoveryWrap: { nonce: row.recovery_nonce, ciphertext: row.recovery_ciphertext },
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapRecord(row: RecordRow): StoredKeychainRecord {
  return {
    id: row.record_id,
    version: KEYCHAIN_ENVELOPE_VERSION,
    revision: Number(row.revision),
    nonce: row.nonce,
    ciphertext: row.ciphertext,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function loadKeychainVault(userId: string): Promise<StoredKeychainVault | null> {
  const sql = getDatabase();
  const [row] = await sql<VaultRow[]>`
    select envelope_version, vault_revision, kdf_algorithm, kdf_salt, kdf_opslimit, kdf_memlimit,
           master_nonce, master_ciphertext, recovery_nonce, recovery_ciphertext, created_at, updated_at
    from keychain_vaults
    where user_id = ${userId}
  `;
  return row ? mapVault(row) : null;
}

export async function createStoredKeychainVault(userId: string, envelope: KeychainVaultEnvelope) {
  const sql = getDatabase();
  const rows = await sql<VaultRow[]>`
    insert into keychain_vaults (
      user_id, envelope_version, kdf_algorithm, kdf_salt, kdf_opslimit, kdf_memlimit,
      master_nonce, master_ciphertext, recovery_nonce, recovery_ciphertext
    ) values (
      ${userId}, ${envelope.version}, ${envelope.kdf.algorithm}, ${envelope.kdf.salt},
      ${envelope.kdf.opslimit}, ${envelope.kdf.memlimit}, ${envelope.masterWrap.nonce},
      ${envelope.masterWrap.ciphertext}, ${envelope.recoveryWrap.nonce}, ${envelope.recoveryWrap.ciphertext}
    )
    on conflict (user_id) do nothing
    returning envelope_version, vault_revision, kdf_algorithm, kdf_salt, kdf_opslimit, kdf_memlimit,
              master_nonce, master_ciphertext, recovery_nonce, recovery_ciphertext, created_at, updated_at
  `;
  if (!rows[0]) throw new KeychainConflictError("A Keychain vault already exists for this user.");
  return mapVault(rows[0]);
}

export async function updateStoredKeychainVault(
  userId: string,
  expectedRevision: number,
  envelope: KeychainVaultEnvelope,
) {
  const sql = getDatabase();
  const rows = await sql<VaultRow[]>`
    update keychain_vaults
    set envelope_version = ${envelope.version},
        kdf_algorithm = ${envelope.kdf.algorithm},
        kdf_salt = ${envelope.kdf.salt},
        kdf_opslimit = ${envelope.kdf.opslimit},
        kdf_memlimit = ${envelope.kdf.memlimit},
        master_nonce = ${envelope.masterWrap.nonce},
        master_ciphertext = ${envelope.masterWrap.ciphertext},
        recovery_nonce = ${envelope.recoveryWrap.nonce},
        recovery_ciphertext = ${envelope.recoveryWrap.ciphertext},
        vault_revision = vault_revision + 1,
        updated_at = now()
    where user_id = ${userId}
      and vault_revision = ${expectedRevision}
    returning envelope_version, vault_revision, kdf_algorithm, kdf_salt, kdf_opslimit, kdf_memlimit,
              master_nonce, master_ciphertext, recovery_nonce, recovery_ciphertext, created_at, updated_at
  `;
  if (!rows[0]) throw new KeychainConflictError();
  return mapVault(rows[0]);
}

export async function listStoredKeychainRecords(userId: string) {
  const sql = getDatabase();
  const rows = await sql<RecordRow[]>`
    select record_id, envelope_version, revision, nonce, ciphertext, created_at, updated_at
    from keychain_records
    where user_id = ${userId}
    order by updated_at desc, record_id
  `;
  return rows.map(mapRecord);
}

export async function saveStoredKeychainRecord(userId: string, envelope: KeychainRecordEnvelope) {
  const sql = getDatabase();
  if (envelope.revision === 1) {
    const rows = await sql<RecordRow[]>`
      insert into keychain_records (user_id, record_id, envelope_version, revision, nonce, ciphertext)
      values (${userId}, ${envelope.id}, ${envelope.version}, ${envelope.revision}, ${envelope.nonce}, ${envelope.ciphertext})
      on conflict (user_id, record_id) do nothing
      returning record_id, envelope_version, revision, nonce, ciphertext, created_at, updated_at
    `;
    if (!rows[0]) throw new KeychainConflictError();
    return mapRecord(rows[0]);
  }

  const rows = await sql<RecordRow[]>`
    update keychain_records
    set envelope_version = ${envelope.version},
        revision = ${envelope.revision},
        nonce = ${envelope.nonce},
        ciphertext = ${envelope.ciphertext},
        updated_at = now()
    where user_id = ${userId}
      and record_id = ${envelope.id}
      and revision = ${envelope.revision - 1}
    returning record_id, envelope_version, revision, nonce, ciphertext, created_at, updated_at
  `;
  if (!rows[0]) throw new KeychainConflictError();
  return mapRecord(rows[0]);
}

export async function deleteStoredKeychainRecord(userId: string, recordId: string, expectedRevision: number) {
  const sql = getDatabase();
  const rows = await sql<{ record_id: string }[]>`
    delete from keychain_records
    where user_id = ${userId}
      and record_id = ${recordId}
      and revision = ${expectedRevision}
    returning record_id
  `;
  if (!rows[0]) throw new KeychainConflictError();
}
