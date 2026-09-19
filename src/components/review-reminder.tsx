"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentReviewPeriod,
  isReviewCompletedForPeriod,
  isReviewDraftForPeriod,
  isReviewReminderDue,
} from "@/domain/weekly-review";
import { emptyReview, useReviewData } from "@/lib/personal-data";

const LOCAL_DEVELOPMENT = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_PCC_LOCAL_DEV_MODE === "1";
const DURABLE_PHOTO_REFERENCE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reviewContentFields = [
  "location",
  "photoName",
  "happened",
  "wentWell",
  "difficult",
  "learned",
  "nextWeek",
] as const;

type ReviewPushConfig = {
  configured: boolean;
  publicKey: string;
};

export function ReviewReminderController() {
  const { draft, history, loaded, updateDraft } = useReviewData();
  const [now, setNow] = useState(() => new Date());
  const period = useMemo(() => getCurrentReviewPeriod(now), [now]);
  const ensuredPeriodRef = useRef("");
  const completed = isReviewCompletedForPeriod(history, period);
  const currentDraft = isReviewDraftForPeriod(draft, period);
  const reminderDue = loaded && isReviewReminderDue(now, draft, history);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = window.setInterval(refresh, 60_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (!loaded || completed || currentDraft) return;
    const key = `${period.start}:${period.end}`;
    if (ensuredPeriodRef.current === key) return;
    ensuredPeriodRef.current = key;

    if (!draft.periodStart && !draft.periodEnd) {
      updateDraft("periodStart", period.start);
      updateDraft("periodEnd", period.end);
      return;
    }

    if (DURABLE_PHOTO_REFERENCE.test(draft.photoName) && !LOCAL_DEVELOPMENT) {
      void fetch(`/api/review-photos/${draft.photoName}`, { method: "DELETE" }).catch(() => undefined);
    }
    for (const field of reviewContentFields) updateDraft(field, emptyReview[field]);
    updateDraft("periodStart", period.start);
    updateDraft("periodEnd", period.end);
  }, [completed, currentDraft, draft.periodEnd, draft.periodStart, draft.photoName, loaded, period.end, period.start, updateDraft]);

  if (!reminderDue) return null;

  return (
    <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
      <div>
        <p className="text-sm font-semibold">Weekly Review is due</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          The review for {period.start} to {period.end} has not been submitted yet.
        </p>
      </div>
      <Link href="/review" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-950 px-4 text-sm font-semibold text-white">
        Open review
      </Link>
    </section>
  );
}

export function ReviewNotificationControl() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [secure, setSecure] = useState(false);
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const isSecure = window.isSecureContext;
      const isSupported = "Notification" in window
        && "serviceWorker" in navigator
        && "PushManager" in window;
      if (cancelled) return;

      setSecure(isSecure);
      setSupported(isSupported);
      setPermission("Notification" in window ? Notification.permission : "unsupported");
      if (!isSecure || !isSupported) return;

      try {
        const config = await loadReviewPushConfig();
        if (cancelled) return;
        setConfigured(config.configured);

        const registration = await registerReminderWorker();
        const existing = await registration?.pushManager.getSubscription();
        if (cancelled) return;
        setSubscribed(Boolean(existing));

        if (existing && config.configured) {
          await savePushSubscription(existing);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Push reminder status could not be loaded.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!supported || !secure || !("Notification" in window)) return;
    setWorking(true);
    setError("");

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;

      const config = await loadReviewPushConfig();
      setConfigured(config.configured);
      if (!config.configured || !config.publicKey) {
        throw new Error("Reliable review push is not configured on this server yet.");
      }

      const registration = await registerReminderWorker();
      if (!registration) throw new Error("The service worker could not be registered.");

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(config.publicKey),
      });
      await savePushSubscription(subscription);
      setSubscribed(true);
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : "Weekly Review push could not be enabled.");
    } finally {
      setWorking(false);
    }
  }

  async function disable() {
    setWorking(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/review-push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : "Weekly Review push could not be disabled.");
    } finally {
      setWorking(false);
    }
  }

  if (!secure) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Weekly Review reminders</p>
        <p className="mt-1 leading-6">Reliable push reminders require the HTTPS installation.</p>
      </div>
    );
  }

  if (!supported || permission === "unsupported") {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">This browser does not support Web Push. In-app reminders remain available.</p>;
  }

  if (permission === "denied") {
    return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Notifications are blocked in this browser&apos;s site settings. In-app reminders remain available.</p>;
  }

  if (subscribed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Weekly Review reminders are enabled</p>
            <p className="mt-1 leading-6 text-emerald-800">This device can receive one morning reminder while the current Weekly Review is due and not yet submitted, even when PCC is closed.</p>
          </div>
          <button type="button" disabled={working} onClick={() => void disable()} className="min-h-10 shrink-0 rounded-xl border border-emerald-300 px-4 font-semibold disabled:opacity-60">
            Disable
          </button>
        </div>
        {error ? <p className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-800">Enable Weekly Review reminders</p>
        <p className="mt-1 leading-6">
          One morning reminder from Saturday onward while the current Weekly Review is due and not yet submitted.
          {!configured ? " Server setup is still required before this can be enabled." : ""}
        </p>
        {error ? <p className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}
      </div>
      <button type="button" disabled={working || !configured} onClick={() => void enable()} className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 font-semibold text-white disabled:opacity-50">
        {working ? "Enabling…" : "Enable"}
      </button>
    </div>
  );
}

async function loadReviewPushConfig(): Promise<ReviewPushConfig> {
  const response = await fetch("/api/notifications/review-push", { cache: "no-store" });
  const body = await response.json() as ReviewPushConfig | { error?: string };
  if (!response.ok || !("configured" in body)) {
    throw new Error("Review push configuration could not be loaded.");
  }
  return body;
}

async function registerReminderWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return null;
  return navigator.serviceWorker.register("/pcc-sw.js", { scope: "/" });
}

function decodeApplicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function savePushSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await fetch("/api/notifications/review-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: {
        p256dh: keys.p256dh ?? "",
        auth: keys.auth ?? "",
      },
      timezone,
    }),
  });
  if (!response.ok) throw new Error("This device could not be registered for Weekly Review push.");
}
