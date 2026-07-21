import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLoginAllowed,
  loginProtectionLimits,
  LoginRateLimitError,
  performDummyPasswordVerification,
  recordLoginFailure,
  recordLoginSuccess,
  resetLoginProtectionForTests,
} from "../src/server/login-protection.ts";

test.beforeEach(() => {
  resetLoginProtectionForTests();
});

test("limits total login work within the global window", () => {
  const now = 1_000_000;
  for (let attempt = 0; attempt < loginProtectionLimits.globalAttemptLimit; attempt += 1) {
    assert.doesNotThrow(() => assertLoginAllowed(`person-${attempt}@example.test`, now));
  }

  assert.throws(
    () => assertLoginAllowed("blocked@example.test", now),
    (error: unknown) => error instanceof LoginRateLimitError && error.retryAfterSeconds === 60,
  );

  assert.doesNotThrow(() => assertLoginAllowed(
    "after-window@example.test",
    now + loginProtectionLimits.globalWindowMs + 1,
  ));
});

test("applies a short account cooldown after repeated failures", () => {
  const email = "owner@example.test";
  const now = 2_000_000;

  for (let failure = 0; failure < loginProtectionLimits.accountFailureLimit; failure += 1) {
    assertLoginAllowed(email, now + failure);
    recordLoginFailure(email, now + failure);
  }

  assert.throws(
    () => assertLoginAllowed(email, now + loginProtectionLimits.accountFailureLimit),
    (error: unknown) => error instanceof LoginRateLimitError
      && error.retryAfterSeconds === Math.ceil(loginProtectionLimits.accountCooldownMs / 1_000),
  );

  assert.doesNotThrow(() => assertLoginAllowed(
    email,
    now + loginProtectionLimits.accountFailureLimit + loginProtectionLimits.accountCooldownMs,
  ));
});

test("successful login clears prior account failures", () => {
  const email = "owner@example.test";
  const now = 3_000_000;

  for (let failure = 0; failure < loginProtectionLimits.accountFailureLimit - 1; failure += 1) {
    assertLoginAllowed(email, now + failure);
    recordLoginFailure(email, now + failure);
  }

  recordLoginSuccess(email);

  for (let failure = 0; failure < loginProtectionLimits.accountFailureLimit - 1; failure += 1) {
    assert.doesNotThrow(() => assertLoginAllowed(email, now + 100 + failure));
    recordLoginFailure(email, now + 100 + failure);
  }
});

test("dummy password verification accepts arbitrary input without exposing a result", async () => {
  await assert.doesNotReject(performDummyPasswordVerification("incorrect password"));
  await assert.doesNotReject(performDummyPasswordVerification(undefined));
});
