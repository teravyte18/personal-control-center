import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.PCC_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const secondUserEmail = "second-user@example.test";

async function request(path, init = {}, userEmail) {
  const headers = new Headers(init.headers);
  if (userEmail) headers.set("x-pcc-user-email", userEmail);

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

const exportedAt = "2026-07-18T12:00:00.000Z";
const createdAt = "2026-07-18T11:00:00.000Z";
const importedItem = {
  id: "owner-imported-item-1",
  title: "Neutral imported item",
  description: "",
  actions: [],
  kind: "note",
  status: "active",
  area: "uncategorized",
  createdAt,
  updatedAt: createdAt,
};

const browserExport = {
  format: "personal-control-center",
  version: 1,
  exportedAt,
  data: {
    items: [importedItem],
    draft: {
      location: "",
      photoName: "",
      happened: "",
      wentWell: "",
      difficult: "",
      learned: "",
      nextWeek: "",
    },
    history: [],
  },
};

test("same-user clients share state while different users remain isolated", async () => {
  const ownerInitial = await request("/api/personal-data");
  const secondInitial = await request("/api/personal-data", {}, secondUserEmail);
  assert.equal(ownerInitial.response.status, 200);
  assert.equal(secondInitial.response.status, 200);
  assert.equal(ownerInitial.body.isEmpty, true);
  assert.equal(secondInitial.body.isEmpty, true);

  const imported = await request("/api/personal-data/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(browserExport),
  });
  assert.equal(imported.response.status, 200);
  assert.equal(imported.body.alreadyImported, false);
  assert.equal(imported.body.snapshot.items[0].id, importedItem.id);

  const ownerClientA = await request("/api/personal-data");
  const ownerClientB = await request("/api/personal-data");
  const secondAfterOwnerImport = await request("/api/personal-data", {}, secondUserEmail);
  assert.deepEqual(ownerClientA.body.snapshot, ownerClientB.body.snapshot);
  assert.deepEqual(secondAfterOwnerImport.body.snapshot.items, []);

  const ownerSecondItem = {
    id: "owner-item-2",
    title: "Created from owner client A",
    description: "",
    actions: [],
    kind: "note",
    status: "inbox",
    area: "uncategorized",
    createdAt: "2026-07-18T12:30:00.000Z",
    updatedAt: "2026-07-18T12:30:00.000Z",
  };
  const ownerChanged = await request("/api/personal-data/mutations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "add-item", item: ownerSecondItem }),
  });
  assert.equal(ownerChanged.response.status, 200);
  assert.ok(ownerChanged.body.revision > ownerClientA.body.revision);

  const secondPrivateItem = {
    id: "second-user-item-1",
    title: "Second user's private item",
    description: "",
    actions: [],
    kind: "note",
    status: "active",
    area: "uncategorized",
    createdAt: "2026-07-18T12:45:00.000Z",
    updatedAt: "2026-07-18T12:45:00.000Z",
  };
  const secondChanged = await request("/api/personal-data/mutations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "add-item", item: secondPrivateItem }),
  }, secondUserEmail);
  assert.equal(secondChanged.response.status, 200);

  const refreshedOwnerClientB = await request("/api/personal-data");
  const refreshedSecondUser = await request("/api/personal-data", {}, secondUserEmail);
  assert.deepEqual(
    refreshedOwnerClientB.body.snapshot.items.map((item) => item.id),
    [ownerSecondItem.id, importedItem.id],
  );
  assert.deepEqual(
    refreshedSecondUser.body.snapshot.items.map((item) => item.id),
    [secondPrivateItem.id],
  );

  const repeatedOwnerImport = await request("/api/personal-data/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(browserExport),
  });
  assert.equal(repeatedOwnerImport.response.status, 200);
  assert.equal(repeatedOwnerImport.body.alreadyImported, true);
  assert.equal(repeatedOwnerImport.body.snapshot.items.length, 2);

  const ownerExport = await request("/api/personal-data/export");
  const secondExport = await request("/api/personal-data/export", {}, secondUserEmail);
  assert.equal(ownerExport.response.status, 200);
  assert.equal(secondExport.response.status, 200);
  assert.equal(ownerExport.body.data.items.length, 2);
  assert.equal(secondExport.body.data.items.length, 1);
  assert.equal(secondExport.body.data.items[0].id, secondPrivateItem.id);
});
