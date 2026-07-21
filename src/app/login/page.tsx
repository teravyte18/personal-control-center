"use client";

import { useEffect, useState, type FormEvent } from "react";

function nextDestination() {
  const value = new URLSearchParams(window.location.search).get("next");
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" }).then((response) => {
      if (response.ok) window.location.replace(nextDestination());
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Login failed.");
      window.location.assign(nextDestination());
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">P</div>
        <p className="mt-7 text-sm font-medium text-slate-500">Personal Control Center</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sign in to your space.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Accounts are invite-only. Your cards, projects, thoughts, and reviews remain separate from every other account.</p>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              type="password"
              autoComplete="current-password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <button
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
