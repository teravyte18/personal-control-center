import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.PCC_TEST_BASE_URL ?? "http://127.0.0.1:3000";

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
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
  id: "cross-client-item-1",
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

test("two independent clients observe the same PostgreSQL-backed state", async () => {
  const initial = await request("/api/personal-data");
  assert.equal(initial.response.status, 200);
  assert.equal(initial.body.isEmpty, true);
  assert.deepEqual(initial.body.snapshot.items, []);

  const imported = await request("/api/personal-data/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(browserExport),
  });
  assert.equal(imported.response.status, 200);
  assert.equal(imported.body.alreadyImported, false);
  assert.equal(imported.body.snapshot.items[0].id, importedItem.id);

  const clientA = await request("/api/personal-data");
  const clientB = await request("/api/personal-data");
  assert.equal(clientA.response.status, 200);
  assert.equal(clientB.response.status, 200);
  assert.deepEqual(clientA.body.snapshot, clientB.body.snapshot);

  const secondItem = {
    id: "cross-client-item-2",
    title: "Created from client A",
    description: "",
    actions: [],
    kind: "note",
    status: "inbox",
    area: "uncategorized",
    createdAt: "2026-07-18T12:30:00.000Z",
    updatedAt: "2026-07-18T12:30:00.000Z",
  };
  const changed = await request("/api/personal-data/mutations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "add-item", item: secondItem }),
  });
  assert.equal(changed.response.status, 200);
  assert.ok(changed.body.revision > clientA.body.revision);

  const refreshedClientB = await request("/api/personal-data");
  assert.equal(refreshedClientB.response.status, 200);
  assert.equal(refreshedClientB.body.snapshot.items[0].id, secondItem.id);
  assert.equal(refreshedClientB.body.snapshot.items[1].id, importedItem.id);

  const repeatedImport = await request("/api/personal-data/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(browserExport),
  });
  assert.equal(repeatedImport.response.status, 200);
  assert.equal(repeatedImport.body.alreadyImported, true);
  assert.equal(repeatedImport.body.snapshot.items.length, 2);

  const exported = await request("/api/personal-data/export");
  assert.equal(exported.response.status, 200);
  assert.equal(exported.body.format, "personal-control-center");
  assert.equal(exported.body.version, 1);
  assert.equal(exported.body.data.items.length, 2);
});
