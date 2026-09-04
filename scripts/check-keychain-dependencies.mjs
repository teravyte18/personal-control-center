import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));

const wrapperVersion = packageJson.dependencies?.["libsodium-wrappers-sumo"];
assert.equal(wrapperVersion, "0.8.4", "libsodium-wrappers-sumo must stay exact-pinned; review before changing it.");

const wrapperLock = packageLock.packages?.["node_modules/libsodium-wrappers-sumo"];
assert.ok(wrapperLock, "libsodium-wrappers-sumo is missing from package-lock.json.");
assert.equal(wrapperLock.version, wrapperVersion, "package-lock libsodium wrapper version differs from package.json.");
assert.match(wrapperLock.resolved ?? "", /^https:\/\/registry\.npmjs\.org\/libsodium-wrappers-sumo\//, "libsodium wrapper must resolve from the npm registry.");
assert.match(wrapperLock.integrity ?? "", /^sha512-/, "libsodium wrapper must be integrity-pinned in package-lock.json.");

const sodiumDependency = wrapperLock.dependencies?.["libsodium-sumo"];
assert.equal(typeof sodiumDependency, "string", "libsodium-wrappers-sumo must declare its libsodium-sumo dependency.");
const sodiumLock = packageLock.packages?.["node_modules/libsodium-sumo"];
assert.ok(sodiumLock, "libsodium-sumo is missing from package-lock.json.");
assert.match(sodiumLock.integrity ?? "", /^sha512-/, "libsodium-sumo must be integrity-pinned in package-lock.json.");
assert.match(sodiumLock.resolved ?? "", /^https:\/\/registry\.npmjs\.org\/libsodium-sumo\//, "libsodium-sumo must resolve from the npm registry.");

assert.equal(packageJson.allowScripts?.["libsodium-wrappers-sumo@0.8.4"], undefined, "Keychain crypto dependency must not require an install lifecycle-script exception.");
assert.equal(Object.keys(packageJson.dependencies ?? {}).filter((name) => name.toLowerCase().includes("sodium")).length, 1, "Review any additional direct sodium dependency before adding it.");

console.log(`Keychain crypto dependency verified: libsodium-wrappers-sumo ${wrapperVersion}, libsodium-sumo ${sodiumLock.version}.`);
