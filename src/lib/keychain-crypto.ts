import sodium from "libsodium-wrappers-sumo";
import {
  KEYCHAIN_ENVELOPE_VERSION,
  KEYCHAIN_KDF_ALGORITHM,
  KEYCHAIN_KDF_DEFAULT_MEMLIMIT,
  KEYCHAIN_KDF_DEFAULT_OPSLIMIT,
  keychainRecordAad,
  keychainVaultAad,
  normalizeKeychainPlainRecord,
  type KeychainKdfParameters,
  type KeychainPlainRecord,
  type KeychainRecordEnvelope,
  type KeychainVaultEnvelope,
  type KeychainWrappedKey,
} from "../domain/keychain.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const VAULT_KEY_BYTES = 32;

export class KeychainDecryptionError extends Error {
  constructor() {
    super("Keychain data could not be decrypted.");
    this.name = "KeychainDecryptionError";
  }
}

async function readySodium() {
  await sodium.ready;
  return sodium;
}

function wipe(value: Uint8Array | null | undefined) {
  value?.fill(0);
}

function encodeBytes(library: typeof sodium, value: Uint8Array) {
  return library.to_base64(value, library.base64_variants.URLSAFE_NO_PADDING);
}

function decodeBytes(library: typeof sodium, value: string) {
  return library.from_base64(value, library.base64_variants.URLSAFE_NO_PADDING);
}

function validateMasterPassword(password: string) {
  if (password.length < 12) {
    throw new TypeError("Keychain master password must contain at least 12 characters.");
  }
}

async function deriveMasterKey(password: string, kdf: KeychainKdfParameters) {
  const library = await readySodium();
  const salt = decodeBytes(library, kdf.salt);
  try {
    if (salt.length !== library.crypto_pwhash_SALTBYTES) throw new TypeError("Invalid Keychain KDF salt.");
    return library.crypto_pwhash(
      VAULT_KEY_BYTES,
      password,
      salt,
      kdf.opslimit,
      kdf.memlimit,
      library.crypto_pwhash_ALG_ARGON2ID13,
    );
  } finally {
    wipe(salt);
  }
}

function encryptBytes(
  library: typeof sodium,
  plaintext: Uint8Array,
  key: Uint8Array,
  additionalData: string,
): KeychainWrappedKey {
  const nonce = library.randombytes_buf(library.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const aad = encoder.encode(additionalData);
  try {
    const ciphertext = library.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      aad,
      null,
      nonce,
      key,
    );
    return {
      nonce: encodeBytes(library, nonce),
      ciphertext: encodeBytes(library, ciphertext),
    };
  } finally {
    wipe(nonce);
    wipe(aad);
  }
}

function decryptBytes(
  library: typeof sodium,
  wrapped: KeychainWrappedKey,
  key: Uint8Array,
  additionalData: string,
) {
  const nonce = decodeBytes(library, wrapped.nonce);
  const ciphertext = decodeBytes(library, wrapped.ciphertext);
  const aad = encoder.encode(additionalData);
  try {
    return library.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ciphertext,
      aad,
      nonce,
      key,
    );
  } catch {
    throw new KeychainDecryptionError();
  } finally {
    wipe(nonce);
    wipe(ciphertext);
    wipe(aad);
  }
}

export type NewKeychainVault = {
  envelope: KeychainVaultEnvelope;
  recoveryKey: string;
  vaultKey: Uint8Array;
};

export async function createKeychainVault(userId: string, masterPassword: string): Promise<NewKeychainVault> {
  validateMasterPassword(masterPassword);
  const library = await readySodium();
  const salt = library.randombytes_buf(library.crypto_pwhash_SALTBYTES);
  const vaultKey = library.randombytes_buf(VAULT_KEY_BYTES);
  const recoveryBytes = library.randombytes_buf(VAULT_KEY_BYTES);
  const kdf: KeychainKdfParameters = {
    algorithm: KEYCHAIN_KDF_ALGORITHM,
    salt: encodeBytes(library, salt),
    opslimit: KEYCHAIN_KDF_DEFAULT_OPSLIMIT,
    memlimit: KEYCHAIN_KDF_DEFAULT_MEMLIMIT,
  };
  let masterKey: Uint8Array | undefined;

  try {
    masterKey = await deriveMasterKey(masterPassword, kdf);
    const envelope: KeychainVaultEnvelope = {
      version: KEYCHAIN_ENVELOPE_VERSION,
      kdf,
      masterWrap: encryptBytes(library, vaultKey, masterKey, keychainVaultAad(userId, "master")),
      recoveryWrap: encryptBytes(library, vaultKey, recoveryBytes, keychainVaultAad(userId, "recovery")),
    };
    return {
      envelope,
      recoveryKey: encodeBytes(library, recoveryBytes),
      vaultKey,
    };
  } catch (error) {
    wipe(vaultKey);
    throw error;
  } finally {
    wipe(salt);
    wipe(recoveryBytes);
    wipe(masterKey);
  }
}

export async function unlockKeychainWithMasterPassword(
  userId: string,
  envelope: KeychainVaultEnvelope,
  masterPassword: string,
) {
  const library = await readySodium();
  let masterKey: Uint8Array | undefined;
  try {
    masterKey = await deriveMasterKey(masterPassword, envelope.kdf);
    const vaultKey = decryptBytes(library, envelope.masterWrap, masterKey, keychainVaultAad(userId, "master"));
    if (vaultKey.length !== VAULT_KEY_BYTES) {
      wipe(vaultKey);
      throw new KeychainDecryptionError();
    }
    return vaultKey;
  } finally {
    wipe(masterKey);
  }
}

export async function unlockKeychainWithRecoveryKey(
  userId: string,
  envelope: KeychainVaultEnvelope,
  recoveryKey: string,
) {
  const library = await readySodium();
  let recoveryBytes: Uint8Array | undefined;
  try {
    recoveryBytes = decodeBytes(library, recoveryKey.trim());
    if (recoveryBytes.length !== VAULT_KEY_BYTES) throw new KeychainDecryptionError();
    const vaultKey = decryptBytes(library, envelope.recoveryWrap, recoveryBytes, keychainVaultAad(userId, "recovery"));
    if (vaultKey.length !== VAULT_KEY_BYTES) {
      wipe(vaultKey);
      throw new KeychainDecryptionError();
    }
    return vaultKey;
  } catch (error) {
    if (error instanceof KeychainDecryptionError) throw error;
    throw new KeychainDecryptionError();
  } finally {
    wipe(recoveryBytes);
  }
}

export async function rewrapKeychainMasterPassword(
  userId: string,
  envelope: KeychainVaultEnvelope,
  vaultKey: Uint8Array,
  newMasterPassword: string,
): Promise<KeychainVaultEnvelope> {
  validateMasterPassword(newMasterPassword);
  const library = await readySodium();
  const salt = library.randombytes_buf(library.crypto_pwhash_SALTBYTES);
  const kdf: KeychainKdfParameters = {
    algorithm: KEYCHAIN_KDF_ALGORITHM,
    salt: encodeBytes(library, salt),
    opslimit: KEYCHAIN_KDF_DEFAULT_OPSLIMIT,
    memlimit: KEYCHAIN_KDF_DEFAULT_MEMLIMIT,
  };
  let masterKey: Uint8Array | undefined;
  try {
    masterKey = await deriveMasterKey(newMasterPassword, kdf);
    return {
      ...envelope,
      kdf,
      masterWrap: encryptBytes(library, vaultKey, masterKey, keychainVaultAad(userId, "master")),
    };
  } finally {
    wipe(salt);
    wipe(masterKey);
  }
}

export async function encryptKeychainRecord(
  userId: string,
  id: string,
  revision: number,
  vaultKey: Uint8Array,
  record: KeychainPlainRecord,
): Promise<KeychainRecordEnvelope> {
  const normalized = normalizeKeychainPlainRecord(record);
  if (!normalized) throw new TypeError("Keychain record is invalid.");
  const library = await readySodium();
  const plaintext = encoder.encode(JSON.stringify(normalized));
  try {
    const wrapped = encryptBytes(library, plaintext, vaultKey, keychainRecordAad(userId, id, revision));
    return {
      id: id.toLowerCase(),
      version: KEYCHAIN_ENVELOPE_VERSION,
      revision,
      nonce: wrapped.nonce,
      ciphertext: wrapped.ciphertext,
    };
  } finally {
    wipe(plaintext);
  }
}

export async function decryptKeychainRecord(
  userId: string,
  envelope: KeychainRecordEnvelope,
  vaultKey: Uint8Array,
): Promise<KeychainPlainRecord> {
  const library = await readySodium();
  const plaintext = decryptBytes(
    library,
    envelope,
    vaultKey,
    keychainRecordAad(userId, envelope.id, envelope.revision),
  );
  try {
    const parsed = JSON.parse(decoder.decode(plaintext));
    const normalized = normalizeKeychainPlainRecord(parsed);
    if (!normalized) throw new KeychainDecryptionError();
    return normalized;
  } catch (error) {
    if (error instanceof KeychainDecryptionError) throw error;
    throw new KeychainDecryptionError();
  } finally {
    wipe(plaintext);
  }
}

export function clearKeychainKey(key: Uint8Array | null | undefined) {
  wipe(key);
}
