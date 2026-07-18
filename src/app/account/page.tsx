"use client";

import { useEffect, useState, type FormEvent } from "react";

type SessionUser = {
  id: string;
  email: string;
  role: "owner" | "member";
  status: "invited" | "active" | "revoked";
};

type ManagedUser = SessionUser & {
  createdAt: string;
  invitedAt: string | null;
  activatedAt: string | null;
  revokedAt: string | null;
};

type AccountData = {
  currentUser: SessionUser;
  users: ManagedUser[];
};

function messageFrom(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}

async function fetchAccountData(): Promise<AccountData | null> {
  const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
  if (sessionResponse.status === 401) {
    window.location.assign("/login?next=/account");
    return null;
  }

  const sessionBody = await sessionResponse.json() as { user?: SessionUser; error?: string };
  if (!sessionResponse.ok || !sessionBody.user) {
    throw new Error(sessionBody.error ?? "Could not load the current account.");
  }

  if (sessionBody.user.role !== "owner") {
    return { currentUser: sessionBody.user, users: [] };
  }

  const usersResponse = await fetch("/api/admin/users", { cache: "no-store" });
  const usersBody = await usersResponse.json() as { users?: ManagedUser[]; error?: string };
  if (!usersResponse.ok || !usersBody.users) {
    throw new Error(usersBody.error ?? "Could not load managed accounts.");
  }

  return { currentUser: sessionBody.user, users: usersBody.users };
}

export default function AccountPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [email, setEmail] = useState("");
  const [activationUrl, setActivationUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetchAccountData()
      .then((data) => {
        if (!cancelled && data) {
          setCurrentUser(data.currentUser);
          setUsers(data.users);
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load account settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAccounts() {
    const data = await fetchAccountData();
    if (data) {
      setCurrentUser(data.currentUser);
      setUsers(data.users);
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    setActivationUrl("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json() as { activationUrl?: string; error?: string };
      if (!response.ok || !body.activationUrl) throw new Error(messageFrom(body, "Could not create the invitation."));
      setActivationUrl(body.activationUrl);
      setEmail("");
      setNotice("Invitation created. Send the activation link directly to that person.");
      await refreshAccounts();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not create the invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(user: ManagedUser) {
    if (!window.confirm(`Revoke access for ${user.email}? Their stored data will be preserved.`)) return;
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(messageFrom(body, "Could not revoke the account."));
      setNotice(`${user.email} can no longer sign in. Their existing sessions were closed.`);
      await refreshAccounts();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Could not revoke the account.");
    }
  }

  async function copyActivationLink() {
    try {
      await navigator.clipboard.writeText(activationUrl);
      setNotice("Activation link copied.");
    } catch {
      setNotice("Select and copy the activation link manually.");
    }
  }

  async function logout() {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading account…</p>;
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="max-w-2xl">
        <p className="text-sm text-slate-500">Account & access</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Private data, explicit access.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">Each account has a separate dataset inside the same PostgreSQL installation. There is no public registration.</p>
      </div>

      {error ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Signed in as</p>
            <p className="mt-1 font-semibold">{currentUser?.email}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{currentUser?.role}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:border-slate-400" href="/api/personal-data/export">Export my data</a>
            <button className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" type="button" onClick={logout} disabled={submitting}>Sign out</button>
          </div>
        </div>
      </div>

      {currentUser?.role === "owner" ? (
        <>
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold">Invite another user</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">The account starts with empty private data. Send the generated one-time link directly to the person.</p>
            <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={invite}>
              <input
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                type="email"
                required
                placeholder="person@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60" type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create invitation"}</button>
            </form>

            {activationUrl ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">One-time activation link</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" readOnly value={activationUrl} />
                  <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:border-slate-400" type="button" onClick={copyActivationLink}>Copy</button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Allowed accounts</p>
                <p className="mt-1 text-sm text-slate-500">Revoking access closes existing sessions but preserves that user’s data.</p>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{user.email}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{user.role}</span>
                      <span className={`rounded-full px-2.5 py-1 ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : user.status === "revoked" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{user.status}</span>
                    </div>
                  </div>
                  {user.role !== "owner" ? (
                    user.status === "active" ? (
                      <button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50" type="button" onClick={() => revoke(user)}>Revoke</button>
                    ) : (
                      <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:border-slate-400" type="button" onClick={() => setEmail(user.email)}>Invite again</button>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
