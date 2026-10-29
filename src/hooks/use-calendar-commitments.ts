"use client";

import { useEffect, useState } from "react";
import type { RhythmPeriod } from "@/domain/weekly-rhythm";

export type CalendarCommitment = {
  id: string;
  calendarId: string;
  title: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  source: "google" | "agenda" | "task" | "project-action" | "pcc";
};

export function useCalendarCommitments(period: RhythmPeriod) {
  const [result, setResult] = useState<{ connected: boolean; needsReconnect: boolean; events: CalendarCommitment[] } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const end = new Date(`${period.end}T00:00:00`);
    end.setDate(end.getDate() + 1);
    const query = new URLSearchParams({ timeMin: new Date(`${period.start}T00:00:00`).toISOString(), timeMax: end.toISOString() });
    void fetch(`/api/integrations/google-calendar/events?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.events)) throw new Error("Calendar commitments could not be loaded.");
        if (!controller.signal.aborted) { setResult(body); setError(""); }
      })
      .catch(() => { if (!controller.signal.aborted) setError("Calendar commitments could not be loaded."); });
    return () => controller.abort();
  }, [period.start, period.end, attempt]);
  return { result, error, retry: () => setAttempt(value => value + 1) };
}
