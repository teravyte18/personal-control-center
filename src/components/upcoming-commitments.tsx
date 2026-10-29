"use client";

import Link from "next/link";
import { upcomingCommitments } from "@/domain/planning-view";
import type { RhythmPeriod } from "@/domain/weekly-rhythm";
import { useCalendarCommitments } from "@/hooks/use-calendar-commitments";

export function UpcomingCommitments({ period }: { period: RhythmPeriod }) {
  const { result, error, retry } = useCalendarCommitments(period);
  const events = upcomingCommitments(result?.events ?? []);
  return (
    <section className="pcc-panel" aria-labelledby="home-commitments-title">
      <h3 id="home-commitments-title" className="pcc-section-title">Upcoming commitments</h3>
      {error ? <div role="alert"><p className="pcc-record-meta">{error}</p><button type="button" className="pcc-control mt-2" onClick={retry}>Retry Calendar</button></div>
        : !result ? <p className="pcc-record-meta" role="status">Loading Calendar…</p>
        : !result.connected || result.needsReconnect ? <Link className="pcc-calendar-link" href="/account">{result.needsReconnect ? "Reconnect" : "Connect"} Google Calendar</Link>
        : events.length ? <ul className="pcc-commitment-list">{events.slice(0, 3).map(event => (
          <li key={`${event.calendarId}:${event.id}`}>
            <p className="pcc-record-title">{event.title}</p>
            <p className="pcc-record-meta">{event.allDay ? new Date(`${event.start.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + " · All day" : new Date(event.start).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
          </li>
        ))}</ul> : <p className="pcc-record-meta">No more Calendar commitments this week.</p>}
      <Link href="/agenda" className="pcc-calendar-link mt-3">Open Agenda{events.length > 3 ? ` · ${events.length - 3} more` : ""}</Link>
    </section>
  );
}
