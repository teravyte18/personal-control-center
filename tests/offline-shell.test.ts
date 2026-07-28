import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const serviceWorkerPath = new URL("../public/pcc-sw.js", import.meta.url);
const offlineScriptPath = new URL("../public/offline-capture.js", import.meta.url);
const offlinePagePath = new URL("../public/offline-capture.html", import.meta.url);

test("offline shell scripts are valid JavaScript", async () => {
  const [serviceWorker, offlineScript] = await Promise.all([
    readFile(serviceWorkerPath, "utf8"),
    readFile(offlineScriptPath, "utf8"),
  ]);

  assert.doesNotThrow(() => new vm.Script(serviceWorker, { filename: "pcc-sw.js" }));
  assert.doesNotThrow(() => new vm.Script(offlineScript, { filename: "offline-capture.js" }));
});

test("service worker pre-caches and serves the dedicated offline page", async () => {
  const serviceWorker = await readFile(serviceWorkerPath, "utf8");

  assert.match(serviceWorker, /const OFFLINE_PAGE = "\/offline-capture\.html"/);
  assert.match(serviceWorker, /await cache\.addAll\(OFFLINE_ASSETS\)/);
  assert.match(serviceWorker, /return await cache\.match\(OFFLINE_PAGE\)/);
  assert.doesNotMatch(serviceWorker, /cacheablePage|warmOfflineCapture/);
});

test("offline page writes the same user-scoped queue consumed by the app", async () => {
  const [page, script] = await Promise.all([
    readFile(offlinePagePath, "utf8"),
    readFile(offlineScriptPath, "utf8"),
  ]);

  assert.match(page, /<script src="\/offline-capture\.js" defer><\/script>/);
  assert.match(script, /pcc-active-browser-user-v1/);
  assert.match(script, /pcc-offline-captures-v1/);
  assert.match(script, /version: QUEUE_VERSION, records/);
  assert.match(script, /type: "add-item"/);
  assert.match(script, /status: "inbox"/);
  assert.match(script, /kind: "unclassified"/);
});
