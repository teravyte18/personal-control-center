import { scrypt, timingSafeEqual } from "node:crypto";

const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_ATTEMPT_LIMIT = 30;
const ACCOUNT_FAILURE_LIMIT = 5;
const ACCOUNT_COOLDOWN_MS = 60_000;
const ACCOUNT_ENTRY_TTL_MS = 10 * 60_000;
const MAX_ACCOUNT_ENTRIES = 500;

const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const DUMMY_SALT = Buffer.from("cGVyc29uYWwtY29udHJvbA", "base64url");
const DUMMY_EXPECTED_KEY = Buffer.from(
  "25mqQiWaBPaR6scB6SyY4ZyubfV38TDemaOiyJS1yHM",
  "base64url",
);

type AccountAttemptState = {
  failures: number[];
  blockedUntil: number;
  lastSeenAt: number;
};

type LoginProtectionState = {
  globalAttempts: number[];
  accounts: Map<string, AccountAttemptState>;
};

type LoginProtectionGlobal = typeof globalThis & {
  __pccLoginProtectionState?: LoginProtectionState;
};

const protectionGlobal = globalThis as LoginProtectionGlobal;
const state = protectionGlobal.__pccLoginProtectionState ?? {
  globalAttempts: [],
  accounts: new Map<string, AccountAttemptState>(),
};
protectionGlobal.__pccLoginProtectionState = state;

export const loginProtectionLimits = {
  globalWindowMs: GLOBAL_WINDOW_MS,
  globalAttemptLimit: GLOBAL_ATTEMPT_LIMIT,
  accountFailureLimit: ACCOUNT_FAILURE_LIMIT,
  accountCooldownMs: ACCOUNT_COOLDOWN_MS,
} as const;

export class LoginRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    super("Too many login attempts. Try again shortly.");
    this.name = "LoginRateLimitError";
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));
  }
}

function accountKey(value: unknown) {
  if (typeof value !== "string") return "<invalid>";
  const normalized = value.trim().toLowerCase();
  return normalized ? normalized.slice(0, 320) : "<invalid>";
}

function pruneBefore(values: number[], cutoff: number) {
  let firstCurrent = 0;
  while (firstCurrent < values.length && values[firstCurrent] <= cutoff) firstCurrent += 1;
  if (firstCurrent > 0) values.splice(0, firstCurrent);
}

function evictAccountEntries(now: number) {
  for (const [key, entry] of state.accounts) {
    if (entry.blockedUntil <= now && entry.lastSeenAt <= now - ACCOUNT_ENTRY_TTL_MS) {
      state.accounts.delete(key);
    }
  }

  while (state.accounts.size >= MAX_ACCOUNT_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestSeenAt = Number.POSITIVE_INFINITY;
    for (const [key, entry] of state.accounts) {
      if (entry.lastSeenAt < oldestSeenAt) {
        oldestKey = key;
        oldestSeenAt = entry.lastSeenAt;
      }
    }
    if (!oldestKey) break;
    state.accounts.delete(oldestKey);
  }
}

function getAccountState(value: unknown, now: number) {
  const key = accountKey(value);
  let entry = state.accounts.get(key);
  if (!entry) {
    evictAccountEntries(now);
    entry = { failures: [], blockedUntil: 0, lastSeenAt: now };
    state.accounts.set(key, entry);
  }
  entry.lastSeenAt = now;
  return { key, entry };
}

export function assertLoginAllowed(emailValue: unknown, now = Date.now()) {
  pruneBefore(state.globalAttempts, now - GLOBAL_WINDOW_MS);
  if (state.globalAttempts.length >= GLOBAL_ATTEMPT_LIMIT) {
    const retryAt = state.globalAttempts[0] + GLOBAL_WINDOW_MS;
    throw new LoginRateLimitError(retryAt - now);
  }
  state.globalAttempts.push(now);

  const { entry } = getAccountState(emailValue, now);
  if (entry.blockedUntil > now) {
    throw new LoginRateLimitError(entry.blockedUntil - now);
  }
  if (entry.blockedUntil > 0) {
    entry.blockedUntil = 0;
    entry.failures = [];
  }
}

export function recordLoginFailure(emailValue: unknown, now = Date.now()) {
  const { entry } = getAccountState(emailValue, now);
  entry.failures.push(now);
  if (entry.failures.length >= ACCOUNT_FAILURE_LIMIT) {
    entry.failures = [];
    entry.blockedUntil = now + ACCOUNT_COOLDOWN_MS;
  }
}

export function recordLoginSuccess(emailValue: unknown) {
  state.accounts.delete(accountKey(emailValue));
}

export function performDummyPasswordVerification(passwordValue: unknown) {
  const password = typeof passwordValue === "string" ? passwordValue.slice(0, 256) : "";
  return new Promise<void>((resolve, reject) => {
    scrypt(
      password,
      DUMMY_SALT,
      SCRYPT_KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAX_MEMORY },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        if (derivedKey.length === DUMMY_EXPECTED_KEY.length) {
          void timingSafeEqual(derivedKey, DUMMY_EXPECTED_KEY);
        }
        resolve();
      },
    );
  });
}

export function resetLoginProtectionForTests() {
  state.globalAttempts = [];
  state.accounts.clear();
}
