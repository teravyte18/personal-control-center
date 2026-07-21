"use client";

import { useState, type FormEvent } from "react";

export default function ActivatePage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Account activation failed.");
      window.location.assign("/");
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "Account activation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">P</div>
        <p className="mt-7 text-sm font-medium text-slate-500">Invited account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Create your password.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">This activation link works once. Your account receives its own empty private dataset in the shared installation.</p>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Confirm password</span>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>

          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <button
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Activating…" : "Activate account"}
          </button>
        </form>
      </div>
    </main>
  );
}
