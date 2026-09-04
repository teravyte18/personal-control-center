import {
  KEYCHAIN_ENVELOPE_VERSION,
  KEYCHAIN_KDF_ALGORITHM,
  type KeychainRecordEnvelope,
  type KeychainVaultEnvelope,
  type StoredKeychainRecord,
  type StoredKeychainVault,
} from "@/domain/keychain";
import { getDatabase } from "@/server/database";
import { KeychainConflictError } from "@/server/keychain-store";

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

export async function restoreStoredKeychain(
  userId: string,
  expectedVaultRevision: number,
  vault: KeychainVaultEnvelope,
  records: KeychainRecordEnvelope[],
) {
  const database = getDatabase();
  return database.begin(async (sql) => {
    const [current] = await sql<{ vault_revision: number }[]>`
      select vault_revision from keychain_vaults where user_id = ${userId} for update
    `;
    if (!current || Number(current.vault_revision) !== expectedVaultRevision) throw new KeychainConflictError();

    await sql`delete from keychain_records where user_id = ${userId}`;
    const storedRecords: StoredKeychainRecord[] = [];
    for (const record of records) {
      const rows = await sql<RecordRow[]>`
        insert into keychain_records (user_id, record_id, envelope_version, revision, nonce, ciphertext)
        values (${userId}, ${record.id}, ${record.version}, ${record.revision}, ${record.nonce}, ${record.ciphertext})
        returning record_id, envelope_version, revision, nonce, ciphertext, created_at, updated_at
      `;
      storedRecords.push(mapRecord(rows[0]));
    }

    const vaultRows = await sql<VaultRow[]>`
      update keychain_vaults
      set envelope_version = ${vault.version},
          kdf_algorithm = ${vault.kdf.algorithm},
          kdf_salt = ${vault.kdf.salt},
          kdf_opslimit = ${vault.kdf.opslimit},
          kdf_memlimit = ${vault.kdf.memlimit},
          master_nonce = ${vault.masterWrap.nonce},
          master_ciphertext = ${vault.masterWrap.ciphertext},
          recovery_nonce = ${vault.recoveryWrap.nonce},
          recovery_ciphertext = ${vault.recoveryWrap.ciphertext},
          vault_revision = vault_revision + 1,
          updated_at = now()
      where user_id = ${userId}
        and vault_revision = ${expectedVaultRevision}
      returning envelope_version, vault_revision, kdf_algorithm, kdf_salt, kdf_opslimit, kdf_memlimit,
                master_nonce, master_ciphertext, recovery_nonce, recovery_ciphertext, created_at, updated_at
    `;
    if (!vaultRows[0]) throw new KeychainConflictError();
    return { vault: mapVault(vaultRows[0]), records: storedRecords };
  });
}

export async function rotateStoredKeychain(
  userId: string,
  expectedVaultRevision: number,
  vault: KeychainVaultEnvelope,
  records: KeychainRecordEnvelope[],
) {
  const database = getDatabase();
  return database.begin(async (sql) => {
    const [current] = await sql<{ vault_revision: number }[]>`
      select vault_revision from keychain_vaults where user_id = ${userId} for update
    `;
    if (!current || Number(current.vault_revision) !== expectedVaultRevision) throw new KeychainConflictError();

    const existing = await sql<{ record_id: string; revision: number }[]>`
      select record_id, revision
      from keychain_records
      where user_id = ${userId}
      order by record_id
      for update
    `;
    if (existing.length !== records.length) throw new KeychainConflictError("Keychain records changed before rotation completed.");
    const incoming = new Map(records.map((record) => [record.id, record]));
    for (const row of existing) {
      const record = incoming.get(row.record_id);
      if (!record || record.revision !== Number(row.revision) + 1) {
        throw new KeychainConflictError("Keychain records changed before rotation completed.");
      }
    }

    const vaultRows = await sql<VaultRow[]>`
      update keychain_vaults
      set envelope_version = ${vault.version},
          kdf_algorithm = ${vault.kdf.algorithm},
          kdf_salt = ${vault.kdf.salt},
          kdf_opslimit = ${vault.kdf.opslimit},
          kdf_memlimit = ${vault.kdf.memlimit},
          master_nonce = ${vault.masterWrap.nonce},
          master_ciphertext = ${vault.masterWrap.ciphertext},
          recovery_nonce = ${vault.recoveryWrap.nonce},
          recovery_ciphertext = ${vault.recoveryWrap.ciphertext},
          vault_revision = vault_revision + 1,
          updated_at = now()
      where user_id = ${userId}
        and vault_revision = ${expectedVaultRevision}
      returning envelope_version, vault_revision, kdf_algorithm, kdf_salt, kdf_opslimit, kdf_memlimit,
                master_nonce, master_ciphertext, recovery_nonce, recovery_ciphertext, created_at, updated_at
    `;
    if (!vaultRows[0]) throw new KeychainConflictError();

    const storedRecords: StoredKeychainRecord[] = [];
    for (const record of records) {
      const rows = await sql<RecordRow[]>`
        update keychain_records
        set envelope_version = ${record.version},
            revision = ${record.revision},
            nonce = ${record.nonce},
            ciphertext = ${record.ciphertext},
            updated_at = now()
        where user_id = ${userId}
          and record_id = ${record.id}
          and revision = ${record.revision - 1}
        returning record_id, envelope_version, revision, nonce, ciphertext, created_at, updated_at
      `;
      if (!rows[0]) throw new KeychainConflictError("Keychain records changed before rotation completed.");
      storedRecords.push(mapRecord(rows[0]));
    }
    return { vault: mapVault(vaultRows[0]), records: storedRecords };
  });
}
