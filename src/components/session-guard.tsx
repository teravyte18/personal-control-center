"use client";

import { useCallback, useEffect, useState } from "react";
import {
  activeBrowserUserStorageKey,
  loadActiveBrowserUser,
} from "@/lib/personal-storage";

const SESSION_REFRESH_INTERVAL_MS = 60_000;
const LOCAL_DEVELOPMENT = process.env.NEXT_PUBLIC_PCC_LOCAL_DEV_MODE === "1";

type GuardState = "checking" | "ready" | "error";

type SessionUser = {
  id: string;
  role: "owner" | "member";
};

function redirectToLogin() {
  window.localStorage.removeItem(activeBrowserUserStorageKey);
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

function hasCachedSession() {
  return Boolean(loadActiveBrowserUser(window.localStorage));
}

async function checkSession() {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (response.status === 401) {
    redirectToLogin();
    return false;
  }
  if (!response.ok) throw new Error("Authentication service is unavailable.");

  const body = await response.json() as { user?: SessionUser };
  if (!body.user || typeof body.user.id !== "string" || !["owner", "member"].includes(body.user.role)) {
    throw new Error("Authentication service returned an invalid session.");
  }

  window.localStorage.setItem(activeBrowserUserStorageKey, JSON.stringify({
    id: body.user.id,
    role: body.user.role,
  }));
  return true;
}

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>(LOCAL_DEVELOPMENT ? "ready" : "checking");

  const retry = useCallback(() => {
    if (LOCAL_DEVELOPMENT) return;
    setState("checking");
    void checkSession()
      .then((authenticated) => {
        if (authenticated) setState("ready");
      })
      .catch(() => setState(hasCachedSession() ? "ready" : "error"));
  }, []);

  useEffect(() => {
    if (LOCAL_DEVELOPMENT) return;
    let cancelled = false;

    void checkSession()
      .then((authenticated) => {
        if (!cancelled && authenticated) setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState(hasCachedSession() ? "ready" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (LOCAL_DEVELOPMENT || state !== "ready") return;

    const recheck = () => {
      if (!navigator.onLine) return;
      void checkSession().catch(() => undefined);
    };
    const recheckWhenVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };

    const interval = window.setInterval(recheck, SESSION_REFRESH_INTERVAL_MS);
    window.addEventListener("online", recheck);
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheckWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", recheck);
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
          <p className="mt-2 text-sm leading-6 text-slate-500">Open the app online and sign in once before offline capture can be used on this device.</p>
          <button className="mt-5 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white" type="button" onClick={retry}>Try again</button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
