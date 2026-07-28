(() => {
  const ACTIVE_USER_KEY = "pcc-active-browser-user-v1";
  const QUEUE_PREFIX = "pcc-offline-captures-v1";
  const QUEUE_VERSION = 1;

  const form = document.getElementById("capture-form");
  const input = document.getElementById("capture-input");
  const message = document.getElementById("message");
  const pendingSection = document.getElementById("pending-section");
  const pendingHeading = document.getElementById("pending-heading");
  const pendingList = document.getElementById("pending-list");
  const openAppButton = document.getElementById("open-app");
  const connectionLabel = document.getElementById("connection-label");

  function readIdentity() {
    try {
      const value = localStorage.getItem(ACTIVE_USER_KEY);
      if (!value) return null;
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed.id !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function queueKey(userId) {
    return `${QUEUE_PREFIX}:${userId}`;
  }

  function loadQueue(userId) {
    try {
      const raw = localStorage.getItem(queueKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== QUEUE_VERSION || !Array.isArray(parsed.records)) return [];
      return parsed.records.filter((record) => record && typeof record.id === "string");
    } catch {
      return [];
    }
  }

  function saveQueue(userId, records) {
    localStorage.setItem(queueKey(userId), JSON.stringify({ version: QUEUE_VERSION, records }));
  }

  function createCapture(title) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const item = {
      id,
      title,
      description: "",
      actions: [],
      kind: "unclassified",
      status: "inbox",
      area: "uncategorized",
      createdAt: now,
      updatedAt: now,
    };

    return {
      id,
      mutation: { type: "add-item", item },
      queuedAt: now,
      attemptCount: 0,
    };
  }

  function render() {
    const identity = readIdentity();
    const records = identity ? loadQueue(identity.id) : [];
    const online = navigator.onLine;
    connectionLabel.textContent = online ? "Server unavailable" : "Offline capture";

    if (!identity) {
      form.hidden = true;
      pendingSection.hidden = true;
      message.textContent = "Open Personal Control Center online and sign in once before offline capture can be used on this device.";
      return;
    }

    form.hidden = false;
    pendingSection.hidden = records.length === 0;
    pendingHeading.textContent = `${records.length} pending capture${records.length === 1 ? "" : "s"}`;
    pendingList.replaceChildren(...records.map((record) => {
      const item = document.createElement("li");
      item.textContent = record.mutation?.item?.title || "Untitled capture";
      return item;
    }));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const identity = readIdentity();
    const title = input.value.trim();
    if (!identity || !title) return;

    const records = loadQueue(identity.id);
    const record = createCapture(title);
    saveQueue(identity.id, [...records, record]);
    input.value = "";
    message.textContent = "Saved on this device. It will synchronise when the full app can reach the server.";
    render();
    input.focus();
  });

  openAppButton.addEventListener("click", () => {
    window.location.assign("/");
  });

  window.addEventListener("online", () => {
    connectionLabel.textContent = "Connection restored";
    message.textContent = "Connection restored. Opening the full app to synchronise pending captures…";
    window.setTimeout(() => window.location.assign("/"), 700);
  });
  window.addEventListener("offline", render);
  window.addEventListener("storage", render);

  render();
})();
