"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  KeychainPlainRecord,
  StoredKeychainRecord,
  StoredKeychainVault,
} from "@/domain/keychain";
import {
  clearKeychainKey,
  createKeychainVault,
  encryptKeychainRecord,
  unlockKeychainWithMasterPassword,
} from "@/lib/keychain-crypto";
import {
  buildKeychainEncryptedExport,
  parseKeychainEncryptedExport,
  serializeKeychainEncryptedExport,
  validateKeychainEncryptedExport,
  type KeychainEncryptedExport,
} from "@/lib/keychain-export";
import {
  restoreRemoteKeychain,
  rotateRemoteKeychain,
} from "@/lib/keychain-client";

type DecryptedRecord = {
  envelope: StoredKeychainRecord;
  data: KeychainPlainRecord;
};

type PendingRotation = {
  envelope: KeychainEncryptedExport["vault"];
  records: KeychainEncryptedExport["records"];
  recoveryKey: string;
};

export function KeychainHardeningTools({
  userId,
  vault,
  records,
  onRotated,
  onRestored,
}: {
  userId: string;
  vault: StoredKeychainVault;
  records: DecryptedRecord[];
  onRotated: (vault: StoredKeychainVault, records: StoredKeychainRecord[], key: Uint8Array) => void;
  onRestored: (vault: StoredKeychainVault) => void;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [restoreCandidate, setRestoreCandidate] = useState<KeychainEncryptedExport | null>(null);
  const [restorePassword, setRestorePassword] = useState("");

  const [rotationPassword, setRotationPassword] = useState("");
  const [pendingRotation, setPendingRotation] = useState<PendingRotation | null>(null);
  const [rotationRecoveryConfirmation, setRotationRecoveryConfirmation] = useState("");
  const pendingRotationKeyRef = useRef<Uint8Array | null>(null);

  useEffect(() => () => {
    clearKeychainKey(pendingRotationKeyRef.current);
    pendingRotationKeyRef.current = null;
  }, []);

  function downloadExport() {
    setError("");
    const exported = buildKeychainEncryptedExport(userId, vault, records.map(({ envelope }) => envelope));
    const blob = new Blob([serializeKeychainEncryptedExport(exported)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `pcc-keychain-${exported.exportedAt.replace(/[:.]/g, "-")}.json`;
    anchor.rel = "noopener";
    anchor.click();
    URL.revokeObjectURL(href);
    setNotice(`Encrypted export created with ${records.length} ${records.length === 1 ? "record" : "records"}.`);
  }

  async function selectRestoreFile(file: File | null) {
    setError("");
    setNotice("");
    setRestoreCandidate(null);
    setRestorePassword("");
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Encrypted Keychain export is unexpectedly large.");
      return;
    }
    try {
      const parsed = parseKeychainEncryptedExport(await file.text(), userId);
      setRestoreCandidate(parsed);
      setNotice(`Encrypted export loaded: ${parsed.records.length} ${parsed.records.length === 1 ? "record" : "records"}.`);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Encrypted Keychain export could not be read.");
    }
  }

  async function restoreExport(event: FormEvent) {
    event.preventDefault();
    if (!restoreCandidate || busy) return;
    if (!window.confirm("Replace the current Keychain with this encrypted export?")) return;
    setBusy(true);
    setError("");
    try {
      await validateKeychainEncryptedExport(restoreCandidate, restorePassword);
      const response = await restoreRemoteKeychain(vault.revision, restoreCandidate.vault, restoreCandidate.records);
      setRestoreCandidate(null);
      setRestorePassword("");
      onRestored(response.vault);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Encrypted Keychain restore failed.");
    } finally {
      setBusy(false);
    }
  }

  async function beginRotation(event: FormEvent) {
    event.preventDefault();
    if (busy || pendingRotation) return;
    setBusy(true);
    setError("");
    setNotice("");
    let verificationKey: Uint8Array | null = null;
    let newKey: Uint8Array | null = null;
    try {
      verificationKey = await unlockKeychainWithMasterPassword(userId, vault, rotationPassword);
      const created = await createKeychainVault(userId, rotationPassword);
      newKey = created.vaultKey;
      const encrypted = await Promise.all(records.map(({ envelope, data }) =>
        encryptKeychainRecord(userId, envelope.id, envelope.revision + 1, newKey!, data)));
      clearKeychainKey(pendingRotationKeyRef.current);
      pendingRotationKeyRef.current = newKey;
      newKey = null;
      setPendingRotation({ envelope: created.envelope, records: encrypted, recoveryKey: created.recoveryKey });
      setRotationRecoveryConfirmation("");
      setRotationPassword("");
      setNotice("Save the new recovery key before completing rotation.");
    } catch {
      setError("Could not prepare rotation. Check the master passphrase and try again.");
    } finally {
      clearKeychainKey(verificationKey);
      clearKeychainKey(newKey);
      setBusy(false);
    }
  }

  function cancelRotation() {
    clearKeychainKey(pendingRotationKeyRef.current);
    pendingRotationKeyRef.current = null;
    setPendingRotation(null);
    setRotationRecoveryConfirmation("");
    setError("");
    setNotice("Rotation cancelled.");
  }

  async function completeRotation(event: FormEvent) {
    event.preventDefault();
    if (!pendingRotation || !pendingRotationKeyRef.current || busy) return;
    if (rotationRecoveryConfirmation.trim() !== pendingRotation.recoveryKey) {
      setError("Recovery-key confirmation does not match.");
      return;
    }
    if (!window.confirm("Rotate the Keychain encryption key? The old recovery key will stop working.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await rotateRemoteKeychain(vault.revision, pendingRotation.envelope, pendingRotation.records);
      const key = pendingRotationKeyRef.current;
      pendingRotationKeyRef.current = null;
      setPendingRotation(null);
      setRotationRecoveryConfirmation("");
      onRotated(response.vault, response.records, key);
      setNotice("Encryption key rotated. Replace the old recovery key with the new one.");
    } catch (rotationError) {
      setError(rotationError instanceof Error ? rotationError.message : "Vault-key rotation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <h4 className="font-semibold text-slate-800">Backup & maintenance</h4>

      {error ? <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">{error}</div> : null}
      {notice ? <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{notice}</div> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h5 className="text-sm font-semibold">Encrypted export</h5>
          <button type="button" onClick={downloadExport} disabled={busy} className="mt-3 min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">Download export</button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h5 className="text-sm font-semibold">Restore export</h5>
          <input className="mt-3 block w-full text-xs" type="file" accept="application/json,.json" onChange={(event) => void selectRestoreFile(event.target.files?.[0] ?? null)} disabled={busy} />
          {restoreCandidate ? (
            <form onSubmit={restoreExport} className="mt-3">
              <label className="block text-xs font-semibold text-slate-600">Export master passphrase
                <input className="input mt-1" type="password" value={restorePassword} onChange={(event) => setRestorePassword(event.target.value)} autoComplete="off" required />
              </label>
              <button type="submit" disabled={busy} className="mt-3 min-h-10 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-50">Restore</button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 p-4">
        <h5 className="text-sm font-semibold">Rotate encryption key</h5>
        {!pendingRotation ? (
          <form onSubmit={beginRotation} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">Master passphrase
              <input className="input mt-1" type="password" value={rotationPassword} onChange={(event) => setRotationPassword(event.target.value)} autoComplete="off" required />
            </label>
            <button type="submit" disabled={busy} className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">Prepare rotation</button>
          </form>
        ) : (
          <form onSubmit={completeRotation} className="mt-3 rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-xs font-semibold">New recovery key</p>
            <code className="mt-2 block break-all text-xs leading-5">{pendingRotation.recoveryKey}</code>
            <label className="mt-3 block text-xs font-semibold text-slate-200">Confirm recovery key
              <input className="input mt-1 text-slate-950" value={rotationRecoveryConfirmation} onChange={(event) => setRotationRecoveryConfirmation(event.target.value)} autoComplete="off" spellCheck={false} required />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={cancelRotation} disabled={busy} className="min-h-10 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={busy} className="min-h-10 rounded-xl bg-white px-3 text-xs font-semibold text-slate-950 disabled:opacity-50">Rotate</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
