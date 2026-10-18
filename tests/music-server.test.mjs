import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.PCC_TEST_BASE_URL ?? "http://127.0.0.1:3000";

async function request(path, account, init = {}) {
  const headers = new Headers(init.headers);
  if (account) headers.set("x-pcc-user-email", account);
  const response = await fetch(base + path, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}
const owner = "owner@example.test";
const member = "second-user@example.test";

test("Music insights protect identities and summarize real database events", async () => {
  const path = "/api/music/insights?mode=month&period=2026-01&tz=UTC";
  const unauthenticated = await request(path);
  assert.equal(unauthenticated.response.status, 401);
  const own = await request(path, owner);
  assert.equal(own.response.status, 200, JSON.stringify(own.body));
  assert.equal(own.body.plays, 3);
  assert.equal(own.body.uniqueTracks, 2);
  assert.equal(own.body.newTracks, 1);
  assert.equal(own.body.knownDurationMs, 70000);
  assert.equal(own.body.unknownDurationPlays, 1);
  assert.equal(own.body.topTracks[0].name, "Example A");
  assert.equal(own.body.rediscoveries.length, 1);
  assert.equal(own.body.rediscoveries[0].name, "Example A");
  assert.equal(own.body.topGenres[0].name, "Rock");

  const other = await request(path, member);
  assert.equal(other.response.status, 200, JSON.stringify(other.body));
  assert.equal(other.body.plays, 1);
  assert.equal(other.body.topTracks[0].name, "Other Account Track");
  assert.equal(other.body.topGenres.length, 0);
  assert.ok(!JSON.stringify(other.body).includes("Example A"));
});

test("music period values are validated and archive preferences are isolated", async () => {
  const invalid = await request("/api/music/insights?mode=month&period=2026-13&tz=UTC", owner);
  assert.equal(invalid.response.status, 400);
  const before = await request("/api/music/archive", owner);
  assert.equal(before.response.status, 200, JSON.stringify(before.body));
  assert.equal(before.body.enabled, false);
  const noAuth = await request("/api/music/archive");
  assert.equal(noAuth.response.status, 401);
  const malformed = await request("/api/music/archive", owner, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "configure", playlist: "https://example.com/playlist/invalid", threshold: 5, enabled: true }),
  });
  assert.equal(malformed.response.status, 400);
  const settings = await request("/api/music/archive", owner, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "configure", playlist: "https://open.spotify.com/playlist/1234567890123456789012", threshold: 5, enabled: false }),
  });
  assert.equal(settings.response.status, 200, JSON.stringify(settings.body));
  assert.equal(settings.body.playlistId, "1234567890123456789012");
  const other = await request("/api/music/archive", member);
  assert.equal(other.response.status, 200);
  assert.equal(other.body.playlistId, null);
});
