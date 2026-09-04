(() => {
  const ACTIVE_USER_KEY = "pcc-active-browser-user-v1";
  const QUEUE_PREFIX = "pcc-offline-captures-v1";
  const QUEUE_VERSION = 1;
  const SERVER_CHECK_INTERVAL_MS = 15_000;

  const form = document.getElementById("capture-form");
  const input = document.getElementById("capture-input");
  const message = document.getElementById("message");
  const pendingSection = document.getElementById("pending-section");
  const pendingHeading = document.getElementById("pending-heading");
  const pendingList = document.getElementById("pending-list");
  const openAppButton = document.getElementById("open-app");
  const connectionLabel = document.getElementById("connection-label");
  let checkingServer = false;

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
    connectionLabel.textContent = navigator.onLine ? "Server unavailable" : "Offline capture";

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

  async function openFullAppWhenAvailable(showStatus = false) {
    if (checkingServer || !navigator.onLine) return false;
    checkingServer = true;
    if (showStatus) {
      connectionLabel.textContent = "Checking server";
      message.textContent = "Checking whether Personal Control Center is reachable…";
    }

    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) return false;
      connectionLabel.textContent = "Server restored";
      message.textContent = "Opening the full app to synchronise pending captures…";
      window.location.replace("/");
      return true;
    } catch {
      if (showStatus) {
        connectionLabel.textContent = "Server unavailable";
        message.textContent = "The server is still unavailable. Your captures remain safe on this device.";
      }
      return false;
    } finally {
      checkingServer = false;
    }
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
    void openFullAppWhenAvailable(true);
  });

  window.addEventListener("online", () => {
    void openFullAppWhenAvailable(true);
  });
  window.addEventListener("offline", render);
  window.addEventListener("storage", render);
  window.setInterval(() => {
    void openFullAppWhenAvailable(false);
  }, SERVER_CHECK_INTERVAL_MS);

  render();
  void openFullAppWhenAvailable(false);
})();
