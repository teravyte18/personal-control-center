import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultKeychainPasswordGeneratorOptions,
  generateKeychainPassword,
} from "../src/lib/keychain-password-generator.ts";

test("password generator defaults to 20 characters with every enabled class represented", () => {
  for (let index = 0; index < 20; index += 1) {
    const generated = generateKeychainPassword(defaultKeychainPasswordGeneratorOptions);
    assert.equal(generated.length, 20);
    assert.match(generated, /[a-z]/);
    assert.match(generated, /[A-Z]/);
    assert.match(generated, /[0-9]/);
    assert.match(generated, /[!@#$%^&*()\-_=+\[\]{}:,.?]/);
  }
});

test("password generator supports site-specific character constraints", () => {
  const generated = generateKeychainPassword({
    length: 12,
    lowercase: true,
    uppercase: false,
    numbers: true,
    symbols: false,
  });
  assert.equal(generated.length, 12);
  assert.match(generated, /^[a-z0-9]+$/);
  assert.match(generated, /[a-z]/);
  assert.match(generated, /[0-9]/);
});

test("password generator rejects unsafe or impossible configurations", () => {
  assert.throws(() => generateKeychainPassword({
    length: 7,
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  }), /between 8 and 64/);
  assert.throws(() => generateKeychainPassword({
    length: 20,
    lowercase: false,
    uppercase: false,
    numbers: false,
    symbols: false,
  }), /at least one/);
});
