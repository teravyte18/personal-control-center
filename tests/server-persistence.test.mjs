import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.PCC_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const ownerEmail = "owner@example.test";
const ownerPassword = "owner-bootstrap-password-123";
const secondUserEmail = "second-user@example.test";
const invitedUserEmail = "invited-user@example.test";
const invitedUserPassword = "invited-user-password-123";

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

function sessionCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "expected a session cookie");
  return setCookie.split(";", 1)[0];
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

test("authentication, same-user sharing, and cross-user isolation", async () => {
  const unauthenticated = await request("/api/personal-data");
  assert.equal(unauthenticated.response.status, 401);

  const ownerInitial = await request("/api/personal-data", {}, ownerEmail);
  const secondInitial = await request("/api/personal-data", {}, secondUserEmail);
  assert.equal(ownerInitial.response.status, 200);
  assert.equal(secondInitial.response.status, 200);
  assert.equal(ownerInitial.body.isEmpty, true);
  assert.equal(secondInitial.body.isEmpty, true);

  const ownerLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
  });
  assert.equal(ownerLogin.response.status, 200);
  assert.equal(ownerLogin.body.user.role, "owner");
  const ownerCookie = sessionCookie(ownerLogin.response);

  const ownerSession = await request("/api/auth/session", {
    headers: { Cookie: ownerCookie },
  });
  assert.equal(ownerSession.response.status, 200);
  assert.equal(ownerSession.body.user.email, ownerEmail);

  const imported = await request("/api/personal-data/import", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify(browserExport),
  });
  assert.equal(imported.response.status, 200);
  assert.equal(imported.body.alreadyImported, false);
  assert.equal(imported.body.snapshot.items[0].id, importedItem.id);

  const ownerClientA = await request("/api/personal-data", { headers: { Cookie: ownerCookie } });
  const ownerClientB = await request("/api/personal-data", {}, ownerEmail);
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
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
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

  const refreshedOwnerClientB = await request("/api/personal-data", { headers: { Cookie: ownerCookie } });
  const refreshedSecondUser = await request("/api/personal-data", {}, secondUserEmail);
  assert.deepEqual(
    refreshedOwnerClientB.body.snapshot.items.map((item) => item.id),
    [ownerSecondItem.id, importedItem.id],
  );
  assert.deepEqual(
    refreshedSecondUser.body.snapshot.items.map((item) => item.id),
    [secondPrivateItem.id],
  );

  const invitation = await request("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ email: invitedUserEmail }),
  });
  assert.equal(invitation.response.status, 200);
  const activationToken = new URL(invitation.body.activationUrl).searchParams.get("token");
  assert.ok(activationToken);

  const activated = await request("/api/auth/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: activationToken, password: invitedUserPassword }),
  });
  assert.equal(activated.response.status, 200);
  assert.equal(activated.body.user.email, invitedUserEmail);
  const invitedCookie = sessionCookie(activated.response);

  const invitedInitial = await request("/api/personal-data", { headers: { Cookie: invitedCookie } });
  assert.equal(invitedInitial.response.status, 200);
  assert.deepEqual(invitedInitial.body.snapshot.items, []);

  const invitedItem = {
    ...secondPrivateItem,
    id: "invited-user-item-1",
    title: "Invited user's private item",
  };
  const invitedChanged = await request("/api/personal-data/mutations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: invitedCookie },
    body: JSON.stringify({ type: "add-item", item: invitedItem }),
  });
  assert.equal(invitedChanged.response.status, 200);

  const ownerAfterInvite = await request("/api/personal-data", { headers: { Cookie: ownerCookie } });
  assert.equal(ownerAfterInvite.body.snapshot.items.some((item) => item.id === invitedItem.id), false);

  const managedUsers = await request("/api/admin/users", { headers: { Cookie: ownerCookie } });
  assert.equal(managedUsers.response.status, 200);
  const invitedManagedUser = managedUsers.body.users.find((user) => user.email === invitedUserEmail);
  assert.equal(invitedManagedUser.status, "active");

  const revoked = await request(`/api/admin/users/${invitedManagedUser.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ action: "revoke" }),
  });
  assert.equal(revoked.response.status, 200);
  assert.equal(revoked.body.user.status, "revoked");

  const revokedSession = await request("/api/personal-data", { headers: { Cookie: invitedCookie } });
  assert.equal(revokedSession.response.status, 401);

  const repeatedOwnerImport = await request("/api/personal-data/import", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify(browserExport),
  });
  assert.equal(repeatedOwnerImport.response.status, 200);
  assert.equal(repeatedOwnerImport.body.alreadyImported, true);
  assert.equal(repeatedOwnerImport.body.snapshot.items.length, 2);

  const ownerExport = await request("/api/personal-data/export", { headers: { Cookie: ownerCookie } });
  const secondExport = await request("/api/personal-data/export", {}, secondUserEmail);
  assert.equal(ownerExport.response.status, 200);
  assert.equal(secondExport.response.status, 200);
  assert.equal(ownerExport.body.data.items.length, 2);
  assert.equal(secondExport.body.data.items.length, 1);
  assert.equal(secondExport.body.data.items[0].id, secondPrivateItem.id);

  const loggedOut = await request("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: ownerCookie },
  });
  assert.equal(loggedOut.response.status, 200);
});
