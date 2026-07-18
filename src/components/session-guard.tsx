"use client";

import { useCallback, useEffect, useState } from "react";

const SESSION_REFRESH_INTERVAL_MS = 60_000;

type GuardState = "checking" | "ready" | "error";

function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

async function checkSession() {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (response.status === 401) {
    redirectToLogin();
    return false;
  }
  if (!response.ok) throw new Error("Authentication service is unavailable.");
  return true;
}

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>("checking");

  const retry = useCallback(() => {
    setState("checking");
    void checkSession()
      .then((authenticated) => {
        if (authenticated) setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void checkSession()
      .then((authenticated) => {
        if (!cancelled && authenticated) setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== "ready") return;

    const recheck = () => {
      void checkSession().catch(() => undefined);
    };
    const recheckWhenVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };

    const interval = window.setInterval(recheck, SESSION_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheckWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheckWhenVisible);
    };
  }, [state]);

  if (state === "checking") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Checking session…</main>;
  }

  if (state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
        <div className="max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold">The authentication service is unavailable.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Your personal data has not been loaded. Check the server and try again.</p>
          <button className="mt-5 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white" type="button" onClick={retry}>Try again</button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
