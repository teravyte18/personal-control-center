"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentReviewPeriod,
  isReviewCompletedForPeriod,
  isReviewDraftForPeriod,
  isReviewReminderDue,
  reviewReminderDateKey,
} from "@/domain/weekly-review";
import { emptyReview, useReviewData } from "@/lib/personal-data";

const REMINDER_STORAGE_PREFIX = "pcc-review-reminder-shown-v1:";
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

export function ReviewReminderController() {
  const { draft, history, loaded, updateDraft } = useReviewData();
  const [now, setNow] = useState(() => new Date());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
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
    setPermission("Notification" in window ? Notification.permission : "unsupported");
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

    if (DURABLE_PHOTO_REFERENCE.test(draft.photoName) && process.env.NEXT_PUBLIC_PCC_LOCAL_DEV_MODE !== "1") {
      void fetch(`/api/review-photos/${draft.photoName}`, { method: "DELETE" }).catch(() => undefined);
    }
    for (const field of reviewContentFields) updateDraft(field, emptyReview[field]);
    updateDraft("periodStart", period.start);
    updateDraft("periodEnd", period.end);
  }, [completed, currentDraft, draft.periodEnd, draft.periodStart, draft.photoName, loaded, period.end, period.start, updateDraft]);

  useEffect(() => {
    if (!reminderDue || permission !== "granted") return;
    const reminderKey = reviewReminderDateKey(now, period);
    const storageKey = `${REMINDER_STORAGE_PREFIX}${reminderKey}`;
    if (window.localStorage.getItem(storageKey)) return;

    void showReviewNotification().then((shown) => {
      if (shown) window.localStorage.setItem(storageKey, new Date().toISOString());
    });
  }, [now, period, permission, reminderDue]);

  if (!reminderDue) return null;

  return (
    <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
      <div>
        <p className="text-sm font-semibold">Weekly Review is still open</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          Finish the review for {period.start} to {period.end} before the next Saturday replaces the unfinished draft.
        </p>
        {permission === "denied" ? <p className="mt-1 text-xs text-amber-700">Browser notifications are blocked, so this in-app reminder remains active.</p> : null}
        {permission === "unsupported" ? <p className="mt-1 text-xs text-amber-700">This browser cannot deliver the notification path; the in-app reminder remains active.</p> : null}
      </div>
      <Link href="/review" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-950 px-4 text-sm font-semibold text-white">
        Open review
      </Link>
    </section>
  );
}

export function ReviewNotificationControl() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [requesting, setRequesting] = useState(false);
  const [secure, setSecure] = useState(false);

  useEffect(() => {
    setSecure(window.isSecureContext);
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  async function enable() {
    if (!("Notification" in window) || !window.isSecureContext) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") await registerReminderWorker();
    } finally {
      setRequesting(false);
    }
  }

  if (!secure) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Weekly Review notifications</p>
        <p className="mt-1 leading-6">Notification permission requires HTTPS. The local-network development setup will still show in-app reminders; test phone notifications after live deployment.</p>
      </div>
    );
  }

  if (permission === "unsupported") {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">This browser does not expose notification support. In-app reminders remain available.</p>;
  }

  if (permission === "granted") {
    return <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Weekly Review notifications are enabled on this browser.</p>;
  }

  if (permission === "denied") {
    return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Notifications are blocked in this browser&apos;s site settings. In-app reminders will still appear.</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-800">Enable Weekly Review notifications</p>
        <p className="mt-1 leading-6">From Sunday through Friday, the app attempts one browser notification after 08:00 while this PWA or browser is allowed to run.</p>
      </div>
      <button type="button" disabled={requesting} onClick={() => void enable()} className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 font-semibold text-white disabled:opacity-60">
        {requesting ? "Requesting…" : "Enable"}
      </button>
    </div>
  );
}

async function registerReminderWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return null;
  return navigator.serviceWorker.register("/review-reminder-sw.js", { scope: "/" });
}

async function showReviewNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const registration = await registerReminderWorker();
    if (registration) {
      await registration.showNotification("Weekly Review is still open", {
        body: "Complete this week's review before Saturday opens a new period.",
        icon: "/api/pwa-icon/192",
        badge: "/api/pwa-icon/192",
        tag: "pcc-weekly-review",
        renotify: false,
        data: { url: "/review" },
      });
      return true;
    }
    new Notification("Weekly Review is still open", {
      body: "Complete this week's review before Saturday opens a new period.",
      tag: "pcc-weekly-review",
    });
    return true;
  } catch {
    return false;
  }
}
