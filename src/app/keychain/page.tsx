"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  KeychainPlainRecord,
  KeychainVaultEnvelope,
  StoredKeychainRecord,
  StoredKeychainVault,
} from "@/domain/keychain";
import { KeychainHardeningTools } from "@/components/keychain-hardening-tools";
import {
  clearKeychainKey,
  createKeychainVault,
  decryptKeychainRecord,
  encryptKeychainRecord,
  rewrapKeychainMasterPassword,
  unlockKeychainWithMasterPassword,
  unlockKeychainWithRecoveryKey,
} from "@/lib/keychain-crypto";
import {
  createRemoteKeychainVault,
  deleteRemoteKeychainRecord,
  KeychainApiError,
  loadKeychainRecords,
  loadKeychainVault,
  saveRemoteKeychainRecord,
  updateRemoteKeychainVault,
} from "@/lib/keychain-client";
import {
  defaultKeychainPasswordGeneratorOptions,
  generateKeychainPassword,
  type KeychainPasswordGeneratorOptions,
} from "@/lib/keychain-password-generator";

const INACTIVITY_LOCK_MS = 15 * 60 * 1000;
const BACKGROUND_LOCK_MS = 5 * 60 * 1000;
const REVEAL_MS = 30 * 1000;
const CLIPBOARD_CLEAR_MS = 30 * 1000;

const emptyRecord: KeychainPlainRecord = {
  label: "",
  username: "",
  password: "",
  url: "",
  notes: "",
};

type DecryptedRecord = {
  envelope: StoredKeychainRecord;
  data: KeychainPlainRecord;
};

type EditorState = {
  id?: string;
  revision?: number;
  data: KeychainPlainRecord;
};

type PendingSetup = {
  envelope: KeychainVaultEnvelope;
  recoveryKey: string;
};

function cloneRecord(record: KeychainPlainRecord): KeychainPlainRecord {
  return { ...record };
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function KeychainPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [vault, setVault] = useState<StoredKeychainVault | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [records, setRecords] = useState<DecryptedRecord[]>([]);
  const [corruptRecordCount, setCorruptRecordCount] = useState(0);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmation, setSetupConfirmation] = useState("");
  const [pendingSetup, setPendingSetup] = useState<PendingSetup | null>(null);
  const [recoveryConfirmation, setRecoveryConfirmation] = useState("");

  const [unlockPassword, setUnlockPassword] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryNewConfirmation, setRecoveryNewConfirmation] = useState("");
  const [unlockBlocked, setUnlockBlocked] = useState(false);

  const [changingMasterPassword, setChangingMasterPassword] = useState(false);
  const [currentMasterPassword, setCurrentMasterPassword] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [newMasterConfirmation, setNewMasterConfirmation] = useState("");

  const activeKeyRef = useRef<Uint8Array | null>(null);
  const pendingKeyRef = useRef<Uint8Array | null>(null);
  const revealTimersRef = useRef<Map<string, number>>(new Map());
  const clipboardTimerRef = useRef<number | null>(null);
  const lastCopiedRef = useRef<string | null>(null);
  const unlockFailuresRef = useRef(0);
  const unlockThrottleTimerRef = useRef<number | null>(null);

  const clearRevealTimers = useCallback(() => {
    for (const timer of revealTimersRef.current.values()) window.clearTimeout(timer);
    revealTimersRef.current.clear();
    setRevealed(new Set());
  }, []);

  const clearClipboardIfStillCurrent = useCallback(async (copied: string) => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === copied) await navigator.clipboard.writeText("");
    } catch {
      // Clipboard access is best effort and some browsers do not permit reads after the original gesture.
    }
  }, []);

  const lockVault = useCallback((message?: string) => {
    clearKeychainKey(activeKeyRef.current);
    activeKeyRef.current = null;
    setUnlocked(false);
    setRecords([]);
    setCorruptRecordCount(0);
    setEditor(null);
    setChangingMasterPassword(false);
    setCurrentMasterPassword("");
    setNewMasterPassword("");
    setNewMasterConfirmation("");
    clearRevealTimers();
    if (clipboardTimerRef.current !== null) window.clearTimeout(clipboardTimerRef.current);
    clipboardTimerRef.current = null;
    const copied = lastCopiedRef.current;
    lastCopiedRef.current = null;
    if (copied) void clearClipboardIfStillCurrent(copied);
    if (message) setNotice(message);
  }, [clearClipboardIfStillCurrent, clearRevealTimers]);

  const activateKey = useCallback((key: Uint8Array) => {
    clearKeychainKey(activeKeyRef.current);
    activeKeyRef.current = key;
    setUnlocked(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadKeychainVault()
      .then((loaded) => {
        if (cancelled) return;
        setUserId(loaded.userId);
        setVault(loaded.vault);
        setLoading(false);
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (requestError instanceof KeychainApiError && requestError.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent("/keychain")}`);
          return;
        }
        setError("Keychain could not be loaded.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const wipeOnLeave = () => {
      clearKeychainKey(activeKeyRef.current);
      activeKeyRef.current = null;
      clearKeychainKey(pendingKeyRef.current);
      pendingKeyRef.current = null;
    };
    const revealTimers = revealTimersRef.current;
    window.addEventListener("pagehide", wipeOnLeave);
    window.addEventListener("beforeunload", wipeOnLeave);
    return () => {
      window.removeEventListener("pagehide", wipeOnLeave);
      window.removeEventListener("beforeunload", wipeOnLeave);
      wipeOnLeave();
      for (const timer of revealTimers.values()) window.clearTimeout(timer);
      revealTimers.clear();
      if (clipboardTimerRef.current !== null) window.clearTimeout(clipboardTimerRef.current);
      if (unlockThrottleTimerRef.current !== null) window.clearTimeout(unlockThrottleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let inactivityTimer: number | null = null;
    let backgroundTimer: number | null = null;

    const scheduleInactivity = () => {
      if (inactivityTimer !== null) window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => lockVault("Keychain locked after 15 minutes without Keychain activity."), INACTIVITY_LOCK_MS);
    };
    const handleActivity = () => {
      if (document.visibilityState === "visible") scheduleInactivity();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (backgroundTimer !== null) window.clearTimeout(backgroundTimer);
        backgroundTimer = window.setTimeout(() => lockVault("Keychain locked after being in the background for 5 minutes."), BACKGROUND_LOCK_MS);
      } else {
        if (backgroundTimer !== null) window.clearTimeout(backgroundTimer);
        backgroundTimer = null;
        scheduleInactivity();
      }
    };

    scheduleInactivity();
    window.addEventListener("pointerdown", handleActivity, true);
    window.addEventListener("keydown", handleActivity, true);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (inactivityTimer !== null) window.clearTimeout(inactivityTimer);
      if (backgroundTimer !== null) window.clearTimeout(backgroundTimer);
      window.removeEventListener("pointerdown", handleActivity, true);
      window.removeEventListener("keydown", handleActivity, true);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [lockVault, unlocked]);

  const visibleRecords = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records
      .filter(({ data }) => !normalized
        || data.label.toLocaleLowerCase().includes(normalized)
        || data.username.toLocaleLowerCase().includes(normalized)
        || data.url.toLocaleLowerCase().includes(normalized)
        || data.notes.toLocaleLowerCase().includes(normalized))
      .sort((left, right) => left.data.label.localeCompare(right.data.label));
  }, [query, records]);

  async function decryptRemoteRecords(key: Uint8Array) {
    const remote = await loadKeychainRecords();
    const results = await Promise.allSettled(remote.records.map(async (envelope) => ({
      envelope,
      data: await decryptKeychainRecord(userId, envelope, key),
    })));
    const decrypted: DecryptedRecord[] = [];
    let failed = 0;
    for (const result of results) {
      if (result.status === "fulfilled") decrypted.push(result.value);
      else failed += 1;
    }
    setRecords(decrypted);
    setCorruptRecordCount(failed);
  }

  function scheduleUnlockThrottle() {
    unlockFailuresRef.current += 1;
    const delay = Math.min(1000 * (2 ** Math.min(unlockFailuresRef.current - 1, 4)), 15_000);
    setUnlockBlocked(true);
    if (unlockThrottleTimerRef.current !== null) window.clearTimeout(unlockThrottleTimerRef.current);
    unlockThrottleTimerRef.current = window.setTimeout(() => {
      setUnlockBlocked(false);
      unlockThrottleTimerRef.current = null;
    }, delay);
  }

  async function handleBeginSetup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!userId) return;
    if (setupPassword !== setupConfirmation) {
      setError("The two master-password entries do not match.");
      return;
    }
    setBusy(true);
    try {
      clearKeychainKey(pendingKeyRef.current);
      const created = await createKeychainVault(userId, setupPassword);
      pendingKeyRef.current = created.vaultKey;
      setPendingSetup({ envelope: created.envelope, recoveryKey: created.recoveryKey });
      setRecoveryConfirmation("");
      setSetupPassword("");
      setSetupConfirmation("");
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Keychain setup could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteSetup(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!pendingSetup || !pendingKeyRef.current) return;
    if (recoveryConfirmation.trim() !== pendingSetup.recoveryKey) {
      setError("Recovery-key confirmation does not match. Save the shown key, then paste it here exactly.");
      return;
    }
    setBusy(true);
    try {
      const response = await createRemoteKeychainVault(pendingSetup.envelope);
      const key = pendingKeyRef.current;
      pendingKeyRef.current = null;
      setVault(response.vault);
      setPendingSetup(null);
      setRecoveryConfirmation("");
      activateKey(key);
      setRecords([]);
      setCorruptRecordCount(0);
      setNotice("Keychain created and unlocked. Keep the recovery key outside Personal Control Center.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Keychain setup could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function cancelPendingSetup() {
    clearKeychainKey(pendingKeyRef.current);
    pendingKeyRef.current = null;
    setPendingSetup(null);
    setRecoveryConfirmation("");
    setError("");
  }

  async function handleUnlock(event: FormEvent) {
    event.preventDefault();
    if (!vault || unlockBlocked || busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    let key: Uint8Array | null = null;
    try {
      key = await unlockKeychainWithMasterPassword(userId, vault, unlockPassword);
      await decryptRemoteRecords(key);
      activateKey(key);
      key = null;
      setUnlockPassword("");
      unlockFailuresRef.current = 0;
    } catch {
      scheduleUnlockThrottle();
      setError("Could not unlock Keychain. Check the master password and try again.");
    } finally {
      clearKeychainKey(key);
      setBusy(false);
    }
  }

  async function handleRecovery(event: FormEvent) {
    event.preventDefault();
    if (!vault || busy) return;
    setError("");
    if (recoveryNewPassword !== recoveryNewConfirmation) {
      setError("The two new master-password entries do not match.");
      return;
    }
    setBusy(true);
    let recoveredKey: Uint8Array | null = null;
    try {
      recoveredKey = await unlockKeychainWithRecoveryKey(userId, vault, recoveryKeyInput);
      const rewrapped = await rewrapKeychainMasterPassword(userId, vault, recoveredKey, recoveryNewPassword);
      const response = await updateRemoteKeychainVault(vault.revision, rewrapped);
      await decryptRemoteRecords(recoveredKey);
      setVault(response.vault);
      activateKey(recoveredKey);
      recoveredKey = null;
      setRecovering(false);
      setRecoveryKeyInput("");
      setRecoveryNewPassword("");
      setRecoveryNewConfirmation("");
      setNotice("Master password replaced using the recovery key.");
    } catch {
      setError("Recovery failed. Check the recovery key and new master password.");
    } finally {
      clearKeychainKey(recoveredKey);
      setBusy(false);
    }
  }

  async function handleChangeMasterPassword(event: FormEvent) {
    event.preventDefault();
    if (!vault || !activeKeyRef.current || busy) return;
    setError("");
    if (newMasterPassword !== newMasterConfirmation) {
      setError("The two new master-password entries do not match.");
      return;
    }
    setBusy(true);
    let verificationKey: Uint8Array | null = null;
    try {
      verificationKey = await unlockKeychainWithMasterPassword(userId, vault, currentMasterPassword);
      const rewrapped = await rewrapKeychainMasterPassword(userId, vault, verificationKey, newMasterPassword);
      const response = await updateRemoteKeychainVault(vault.revision, rewrapped);
      setVault(response.vault);
      setChangingMasterPassword(false);
      setCurrentMasterPassword("");
      setNewMasterPassword("");
      setNewMasterConfirmation("");
      setNotice("Master password changed. The recovery key remains the same.");
    } catch {
      setError("Master password could not be changed. Check the current password and try again.");
    } finally {
      clearKeychainKey(verificationKey);
      setBusy(false);
    }
  }

  async function handleSaveRecord(event: FormEvent) {
    event.preventDefault();
    const key = activeKeyRef.current;
    if (!key || !editor || busy) return;
    setError("");
    setBusy(true);
    try {
      const id = editor.id ?? globalThis.crypto.randomUUID();
      const revision = editor.revision ? editor.revision + 1 : 1;
      const encrypted = await encryptKeychainRecord(userId, id, revision, key, editor.data);
      const response = await saveRemoteKeychainRecord(encrypted);
      const decrypted = { envelope: response.record, data: cloneRecord(editor.data) };
      setRecords((current) => {
        const existing = current.findIndex((candidate) => candidate.envelope.id === response.record.id);
        if (existing < 0) return [...current, decrypted];
        const next = [...current];
        next[existing] = decrypted;
        return next;
      });
      setEditor(null);
      setNotice(editor.id ? "Credential updated." : "Credential saved.");
    } catch (requestError) {
      if (requestError instanceof KeychainApiError && requestError.status === 409 && activeKeyRef.current) {
        try {
          await decryptRemoteRecords(activeKeyRef.current);
        } catch {
          // Preserve the original conflict message when refresh also fails.
        }
        setError("This credential changed on another device. The latest encrypted records were reloaded; review and try again.");
      } else {
        setError(requestError instanceof Error ? requestError.message : "Credential could not be saved.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRecord(record: DecryptedRecord) {
    if (!window.confirm(`Delete “${record.data.label}”? This cannot be undone.`)) return;
    setError("");
    setBusy(true);
    try {
      await deleteRemoteKeychainRecord(record.envelope.id, record.envelope.revision);
      setRecords((current) => current.filter((candidate) => candidate.envelope.id !== record.envelope.id));
      setEditor((current) => current?.id === record.envelope.id ? null : current);
      setNotice("Credential deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Credential could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  function revealPassword(recordId: string) {
    setRevealed((current) => new Set(current).add(recordId));
    const existing = revealTimersRef.current.get(recordId);
    if (existing !== undefined) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      setRevealed((current) => {
        const next = new Set(current);
        next.delete(recordId);
        return next;
      });
      revealTimersRef.current.delete(recordId);
    }, REVEAL_MS);
    revealTimersRef.current.set(recordId, timer);
  }

  function hidePassword(recordId: string) {
    const timer = revealTimersRef.current.get(recordId);
    if (timer !== undefined) window.clearTimeout(timer);
    revealTimersRef.current.delete(recordId);
    setRevealed((current) => {
      const next = new Set(current);
      next.delete(recordId);
      return next;
    });
  }

  async function copySecret(value: string, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
      if (clipboardTimerRef.current !== null) window.clearTimeout(clipboardTimerRef.current);
      lastCopiedRef.current = value;
      clipboardTimerRef.current = window.setTimeout(() => {
        const copied = lastCopiedRef.current;
        lastCopiedRef.current = null;
        clipboardTimerRef.current = null;
        if (copied) void clearClipboardIfStillCurrent(copied);
      }, CLIPBOARD_CLEAR_MS);
    } catch {
      setError("Clipboard access was blocked by this browser.");
    }
  }

  async function copyRecoveryKey() {
    if (!pendingSetup) return;
    await copySecret(pendingSetup.recoveryKey, "Recovery key");
  }

  function handleRotatedVault(nextVault: StoredKeychainVault, nextEnvelopes: StoredKeychainRecord[], nextKey: Uint8Array) {
    const dataById = new Map(records.map((record) => [record.envelope.id, record.data]));
    const nextRecords: DecryptedRecord[] = [];
    for (const envelope of nextEnvelopes) {
      const data = dataById.get(envelope.id);
      if (data) nextRecords.push({ envelope, data: cloneRecord(data) });
    }
    clearRevealTimers();
    setEditor(null);
    setVault(nextVault);
    setRecords(nextRecords);
    activateKey(nextKey);
    setNotice("Vault encryption key rotated. The newly shown recovery key replaces the old one.");
  }

  function handleRestoredVault(nextVault: StoredKeychainVault) {
    setVault(nextVault);
    lockVault("Encrypted Keychain export restored. Unlock using the export's master passphrase.");
  }

  if (loading) {
    return <section className="mx-auto max-w-3xl"><h2 className="text-3xl font-semibold tracking-tight">Keychain</h2><p className="mt-4 text-sm text-slate-500">Opening encrypted vault…</p></section>;
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">Keychain</h2>
        {unlocked ? (
          <button type="button" onClick={() => lockVault("Keychain locked.")} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
            Lock
          </button>
        ) : null}
      </div>


      {error ? <div role="alert" className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">{notice}</div> : null}

      {!vault ? (
        pendingSetup ? (
          <RecoveryConfirmation
            pending={pendingSetup}
            confirmation={recoveryConfirmation}
            setConfirmation={setRecoveryConfirmation}
            busy={busy}
            onCopy={() => void copyRecoveryKey()}
            onSubmit={handleCompleteSetup}
            onCancel={cancelPendingSetup}
          />
        ) : (
          <SetupForm
            password={setupPassword}
            confirmation={setupConfirmation}
            setPassword={setSetupPassword}
            setConfirmation={setSetupConfirmation}
            busy={busy}
            onSubmit={handleBeginSetup}
          />
        )
      ) : !unlocked ? (
        recovering ? (
          <RecoveryForm
            recoveryKey={recoveryKeyInput}
            newPassword={recoveryNewPassword}
            confirmation={recoveryNewConfirmation}
            setRecoveryKey={setRecoveryKeyInput}
            setNewPassword={setRecoveryNewPassword}
            setConfirmation={setRecoveryNewConfirmation}
            busy={busy}
            onSubmit={handleRecovery}
            onCancel={() => {
              setRecovering(false);
              setRecoveryKeyInput("");
              setRecoveryNewPassword("");
              setRecoveryNewConfirmation("");
              setError("");
            }}
          />
        ) : (
          <UnlockForm
            password={unlockPassword}
            setPassword={setUnlockPassword}
            busy={busy}
            blocked={unlockBlocked}
            onSubmit={handleUnlock}
            onRecover={() => {
              setRecovering(true);
              setError("");
            }}
          />
        )
      ) : (
        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Search Keychain</span>
              <input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search label, username, URL or notes" autoComplete="off" />
            </label>
            <button type="button" onClick={() => setEditor({ data: cloneRecord(emptyRecord) })} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">
              New credential
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">{records.length} {records.length === 1 ? "credential" : "credentials"}</p>

          {corruptRecordCount > 0 ? (
            <div role="alert" className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">
              {corruptRecordCount} encrypted {corruptRecordCount === 1 ? "record could" : "records could"} not be authenticated and {corruptRecordCount === 1 ? "was" : "were"} not opened.
            </div>
          ) : null}

          {editor ? (
            <RecordEditor
              editor={editor}
              setEditor={setEditor}
              busy={busy}
              onSubmit={handleSaveRecord}
            />
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleRecords.map((record) => {
              const isRevealed = revealed.has(record.envelope.id);
              const site = safeExternalUrl(record.data.url);
              return (
                <article key={record.envelope.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{record.data.label}</h3>
                      <p className="mt-1 truncate text-sm text-slate-500">{record.data.username || "No username"}</p>
                    </div>
                    <button type="button" onClick={() => setEditor({ id: record.envelope.id, revision: record.envelope.revision, data: cloneRecord(record.data) })} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                      Edit
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <code className="min-w-0 flex-1 truncate text-sm text-slate-700">{isRevealed ? record.data.password || "(empty secret)" : "••••••••••••"}</code>
                      <button type="button" onClick={() => isRevealed ? hidePassword(record.envelope.id) : revealPassword(record.envelope.id)} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-slate-600">
                        {isRevealed ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" disabled={!record.data.username} onClick={() => void copySecret(record.data.username, "Username")} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-40">
                      Copy user
                    </button>
                    <button type="button" disabled={!record.data.password} onClick={() => void copySecret(record.data.password, "Password")} className="min-h-10 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-40">
                      Copy password
                    </button>
                  </div>

                  {record.data.url ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span className="min-w-0 flex-1 truncate">{record.data.url}</span>
                      {site ? <a href={site} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-700 underline underline-offset-4">Open</a> : null}
                    </div>
                  ) : null}
                  {record.data.notes ? <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">{record.data.notes}</p> : null}
                  <button type="button" onClick={() => void handleDeleteRecord(record)} disabled={busy} className="mt-3 min-h-9 text-xs font-semibold text-red-700 underline decoration-red-200 underline-offset-4 disabled:opacity-50">
                    Delete
                  </button>
                </article>
              );
            })}
          </div>

          {visibleRecords.length === 0 && !editor ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">
              {records.length === 0 ? "No credentials yet." : "No credentials match this search."}
            </div>
          ) : null}

          <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">Keychain settings</summary>
            <div className="mt-3 text-sm leading-6 text-slate-500">
              <p>Locks automatically after inactivity or 5 minutes in the background.</p>
              <button type="button" onClick={() => setChangingMasterPassword((current) => !current)} className="mt-3 min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700">
                {changingMasterPassword ? "Cancel password change" : "Change master password"}
              </button>
            </div>
            {changingMasterPassword ? (
              <MasterPasswordChangeForm
                currentPassword={currentMasterPassword}
                newPassword={newMasterPassword}
                confirmation={newMasterConfirmation}
                setCurrentPassword={setCurrentMasterPassword}
                setNewPassword={setNewMasterPassword}
                setConfirmation={setNewMasterConfirmation}
                busy={busy}
                onSubmit={handleChangeMasterPassword}
              />
            ) : null}
            <KeychainHardeningTools
              userId={userId}
              vault={vault}
              records={records}
              onRotated={handleRotatedVault}
              onRestored={handleRestoredVault}
            />
          </details>
        </div>
      )}
    </section>
  );
}

function SetupForm({
  password,
  confirmation,
  setPassword,
  setConfirmation,
  busy,
  onSubmit,
}: {
  password: string;
  confirmation: string;
  setPassword: (value: string) => void;
  setConfirmation: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-xl font-semibold">Create Keychain</h3>
      <p className="mt-2 text-sm text-slate-500">Use a separate master passphrase of at least 12 characters.</p>
      <label className="mt-5 block text-sm font-medium text-slate-700">Master passphrase
        <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} autoComplete="off" required />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-700">Repeat master passphrase
        <input className="input mt-2" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} autoComplete="off" required />
      </label>
      <button type="submit" disabled={busy} className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Creating encryption keys…" : "Continue to recovery key"}
      </button>
    </form>
  );
}

function RecoveryConfirmation({
  pending,
  confirmation,
  setConfirmation,
  busy,
  onCopy,
  onSubmit,
  onCancel,
}: {
  pending: PendingSetup;
  confirmation: string;
  setConfirmation: (value: string) => void;
  busy: boolean;
  onCopy: () => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-xl font-semibold">Save the recovery key</h3>
      <p className="mt-2 text-sm text-slate-500">Save this outside PCC. Without this key and your master passphrase, the Keychain cannot be recovered.</p>
      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
        <code className="block break-all text-sm leading-6">{pending.recoveryKey}</code>
        <button type="button" onClick={onCopy} className="mt-3 min-h-10 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white">Copy recovery key</button>
      </div>
      <label className="mt-5 block text-sm font-medium text-slate-700">Confirm recovery key
        <input className="input mt-2 font-mono text-sm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Paste the recovery key here" required />
      </label>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Start over</button>
        <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Create Keychain"}</button>
      </div>
    </form>
  );
}

function UnlockForm({
  password,
  setPassword,
  busy,
  blocked,
  onSubmit,
  onRecover,
}: {
  password: string;
  setPassword: (value: string) => void;
  busy: boolean;
  blocked: boolean;
  onSubmit: (event: FormEvent) => void;
  onRecover: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-xl font-semibold">Unlock Keychain</h3>
      <label className="mt-5 block text-sm font-medium text-slate-700">Master passphrase
        <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" required autoFocus />
      </label>
      <button type="submit" disabled={busy || blocked} className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Unlocking…" : blocked ? "Try again shortly" : "Unlock"}
      </button>
      <button type="button" onClick={onRecover} className="mt-4 min-h-10 w-full text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4">Forgot master password? Use recovery key</button>
    </form>
  );
}

function RecoveryForm({
  recoveryKey,
  newPassword,
  confirmation,
  setRecoveryKey,
  setNewPassword,
  setConfirmation,
  busy,
  onSubmit,
  onCancel,
}: {
  recoveryKey: string;
  newPassword: string;
  confirmation: string;
  setRecoveryKey: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmation: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-xl font-semibold">Recover Keychain</h3>
      <label className="mt-5 block text-sm font-medium text-slate-700">Recovery key
        <input className="input mt-2 font-mono text-sm" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} autoComplete="off" spellCheck={false} required />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-700">New master passphrase
        <input className="input mt-2" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} autoComplete="off" required />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-700">Repeat new master passphrase
        <input className="input mt-2" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} autoComplete="off" required />
      </label>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Cancel</button>
        <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Recovering…" : "Recover and replace"}</button>
      </div>
    </form>
  );
}

function MasterPasswordChangeForm({
  currentPassword,
  newPassword,
  confirmation,
  setCurrentPassword,
  setNewPassword,
  setConfirmation,
  busy,
  onSubmit,
}: {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmation: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-slate-200 pt-4">
      <label className="block text-sm font-medium text-slate-700">Current master passphrase
        <input className="input mt-2" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="off" required />
      </label>
      <label className="mt-3 block text-sm font-medium text-slate-700">New master passphrase
        <input className="input mt-2" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} autoComplete="off" required />
      </label>
      <label className="mt-3 block text-sm font-medium text-slate-700">Repeat new master passphrase
        <input className="input mt-2" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} autoComplete="off" required />
      </label>
      <button type="submit" disabled={busy} className="mt-4 min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Changing…" : "Change master password"}</button>
    </form>
  );
}

function RecordEditor({
  editor,
  setEditor,
  busy,
  onSubmit,
}: {
  editor: EditorState;
  setEditor: (value: EditorState | null) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [generator, setGenerator] = useState<KeychainPasswordGeneratorOptions>({ ...defaultKeychainPasswordGeneratorOptions });
  const [generatorError, setGeneratorError] = useState("");

  function update(field: keyof KeychainPlainRecord, value: string) {
    setEditor({ ...editor, data: { ...editor.data, [field]: value } });
  }

  function generate() {
    try {
      const password = generateKeychainPassword(generator);
      update("password", password);
      setGeneratorError("");
    } catch (generationError) {
      setGeneratorError(generationError instanceof Error ? generationError.message : "Password could not be generated.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{editor.id ? "Edit credential" : "New credential"}</h3>
        <button type="button" onClick={() => setEditor(null)} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-slate-500">Close</button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Label
          <input className="input mt-2" value={editor.data.label} onChange={(event) => update("label", event.target.value)} maxLength={512} autoComplete="off" required />
        </label>
        <label className="text-sm font-medium text-slate-700">Username or email
          <input className="input mt-2" value={editor.data.username} onChange={(event) => update("username", event.target.value)} maxLength={2048} autoComplete="off" spellCheck={false} />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">Password or secret
        <div className="mt-2 flex gap-2">
          <input className="input min-w-0 flex-1 font-mono" type={passwordVisible ? "text" : "password"} value={editor.data.password} onChange={(event) => update("password", event.target.value)} maxLength={8192} autoComplete="off" spellCheck={false} />
          <button type="button" onClick={() => setPasswordVisible((current) => !current)} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700">{passwordVisible ? "Hide" : "Show"}</button>
          <button type="button" onClick={() => setGeneratorOpen((current) => !current)} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700">Generate</button>
        </div>
      </label>
      {generatorOpen ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-end">
            <label className="text-xs font-semibold text-slate-600">Length
              <input className="input mt-1" type="number" min={8} max={64} value={generator.length} onChange={(event) => setGenerator((current) => ({ ...current, length: Number(event.target.value) }))} />
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
              {(["lowercase", "uppercase", "numbers", "symbols"] as const).map((key) => (
                <label key={key} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                  <input type="checkbox" checked={generator[key]} onChange={(event) => setGenerator((current) => ({ ...current, [key]: event.target.checked }))} />
                  <span className="capitalize">{key}</span>
                </label>
              ))}
            </div>
          </div>
          {generatorError ? <p className="mt-2 text-xs text-red-700">{generatorError}</p> : null}
          <button type="button" onClick={generate} className="mt-3 min-h-10 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white">Generate password</button>
        </div>
      ) : null}
      <label className="mt-4 block text-sm font-medium text-slate-700">URL
        <input className="input mt-2" value={editor.data.url} onChange={(event) => update("url", event.target.value)} maxLength={4096} autoComplete="off" spellCheck={false} placeholder="https://…" />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-700">Notes
        <textarea className="input mt-2 min-h-28 resize-y" value={editor.data.notes} onChange={(event) => update("notes", event.target.value)} maxLength={65536} autoComplete="off" />
      </label>
      <button type="submit" disabled={busy} className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Encrypting and saving…" : "Save credential"}</button>
    </form>
  );
}
