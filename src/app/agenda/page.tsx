"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type AgendaEventSource = "google" | "agenda" | "task" | "project-action" | "pcc";

type AgendaEvent = {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  description: string;
  location: string;
  htmlLink: string;
  meetLink: string;
  start: string;
  end: string;
  allDay: boolean;
  editable: boolean;
  source: AgendaEventSource;
};

type AgendaResponse = {
  configured: boolean;
  connected: boolean;
  needsReconnect: boolean;
  calendarName: string;
  events: AgendaEvent[];
};

type EventFormState = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
};

function localDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialFormState(): EventFormState {
  return {
    title: "",
    date: localDateInput(),
    startTime: "11:00",
    endTime: "12:00",
    allDay: false,
    location: "",
    description: "",
  };
}

function nextDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function eventDateKey(event: AgendaEvent) {
  if (event.allDay) return event.start.slice(0, 10);
  return localDateInput(new Date(event.start));
}

function localTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function eventTimeLabel(event: AgendaEvent) {
  if (event.allDay) return "All day";
  return `${localTime(event.start)}–${localTime(event.end)}`;
}

function dateHeading(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  const today = localDateInput();
  const tomorrowValue = new Date();
  tomorrowValue.setDate(tomorrowValue.getDate() + 1);
  const tomorrow = localDateInput(tomorrowValue);
  const prefix = date === today ? "Today · " : date === tomorrow ? "Tomorrow · " : "";
  return prefix + new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parsed);
}

function sourceLabel(source: AgendaEventSource) {
  if (source === "agenda") return "Agenda";
  if (source === "task") return "Task";
  if (source === "project-action") return "Project action";
  if (source === "pcc") return "Personal Control Center";
  return "Google Calendar";
}

function errorMessage(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}

function eventToForm(event: AgendaEvent): EventFormState {
  if (event.allDay) {
    return {
      title: event.title,
      date: event.start.slice(0, 10),
      startTime: "11:00",
      endTime: "12:00",
      allDay: true,
      location: event.location,
      description: event.description,
    };
  }

  const start = new Date(event.start);
  const end = new Date(event.end);
  return {
    title: event.title,
    date: localDateInput(start),
    startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
    endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
    allDay: false,
    location: event.location,
    description: event.description,
  };
}

export default function AgendaPage() {
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(() => initialFormState());

  const loadAgenda = useCallback(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 90);
    const query = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    });
    const response = await fetch(`/api/integrations/google-calendar/events?${query.toString()}`, { cache: "no-store" });
    const body = await response.json() as AgendaResponse | { error?: string };
    if (!response.ok || !("events" in body)) {
      throw new Error(errorMessage(body, "Agenda could not be loaded."));
    }
    setAgenda(body);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAgenda()
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Agenda could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadAgenda]);

  const groups = useMemo(() => {
    const grouped = new Map<string, AgendaEvent[]>();
    for (const event of agenda?.events ?? []) {
      const key = eventDateKey(event);
      const current = grouped.get(key) ?? [];
      current.push(event);
      grouped.set(key, current);
    }
    return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [agenda]);

  function openNewEvent() {
    setEditingId(null);
    setForm(initialFormState());
    setFormOpen(true);
    setError("");
  }

  function editEvent(event: AgendaEvent) {
    setEditingId(event.id);
    setForm(eventToForm(event));
    setFormOpen(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setEditingId(null);
    setForm(initialFormState());
    setFormOpen(false);
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const start = form.allDay ? form.date : new Date(`${form.date}T${form.startTime}`).toISOString();
      const end = form.allDay ? nextDate(form.date) : new Date(`${form.date}T${form.endTime}`).toISOString();
      if (!form.allDay && new Date(end).getTime() <= new Date(start).getTime()) {
        throw new Error("End time must be after the start time.");
      }
      const draft = {
        title: form.title,
        description: form.description,
        location: form.location,
        start,
        end,
        allDay: form.allDay,
      };
      const response = await fetch("/api/integrations/google-calendar/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { eventId: editingId, event: draft } : draft),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(errorMessage(body, "Event could not be saved."));
      closeForm();
      await loadAgenda();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Event could not be saved.");
    } finally {
      setWorking(false);
    }
  }

  async function deleteEvent(event: AgendaEvent) {
    if (!event.editable || !window.confirm(`Delete “${event.title}”?`)) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/google-calendar/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(errorMessage(body, "Event could not be deleted."));
      if (editingId === event.id) closeForm();
      await loadAgenda();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Event could not be deleted.");
    } finally {
      setWorking(false);
    }
  }

  async function refreshAgenda() {
    setError("");
    try {
      await loadAgenda();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Agenda could not be refreshed.");
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Agenda</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Your upcoming Google Calendar events together with dated Tasks and Project Actions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading || working}
            onClick={() => void refreshAgenda()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="min-h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={!agenda?.connected || agenda.needsReconnect || working}
            onClick={openNewEvent}
          >
            New event
          </button>
        </div>
      </div>

      {error ? <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {formOpen ? (
        <form onSubmit={saveEvent} className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{editingId ? "Edit event" : "New event"}</h3>
            <button type="button" className="text-sm font-semibold text-slate-500 hover:text-slate-950" onClick={closeForm}>Cancel</button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              Title
              <input
                required
                className="input mt-2"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Event title"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Date
              <input
                required
                type="date"
                className="input mt-2"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </label>

            <label className="flex min-h-11 items-center gap-3 self-end rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(event) => setForm((current) => ({ ...current, allDay: event.target.checked }))}
              />
              All-day event
            </label>

            {!form.allDay ? (
              <>
                <label className="text-sm font-medium text-slate-700">
                  Start
                  <input
                    required
                    type="time"
                    className="input mt-2"
                    value={form.startTime}
                    onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  End
                  <input
                    required
                    type="time"
                    className="input mt-2"
                    value={form.endTime}
                    onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                  />
                </label>
              </>
            ) : null}

            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              Location <span className="font-normal text-slate-400">optional</span>
              <input
                className="input mt-2"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Office, café, address…"
              />
            </label>

            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              Details <span className="font-normal text-slate-400">optional</span>
              <textarea
                className="input mt-2 min-h-24 resize-y"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Notes for this event"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={working}
            className="mt-5 min-h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {working ? "Saving…" : editingId ? "Save changes" : "Create event"}
          </button>
        </form>
      ) : null}

      {loading ? <p className="mt-8 text-sm text-slate-500">Loading Agenda…</p> : null}

      {!loading && agenda && !agenda.configured ? (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          Google Calendar is not configured on this deployment yet.
        </div>
      ) : null}

      {!loading && agenda?.configured && !agenda.connected ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="font-semibold">Connect Google Calendar</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Agenda uses your Google calendars for appointments and keeps standalone events created here in the separate Personal Control Center calendar.
          </p>
          <a className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/api/integrations/google-calendar/connect">
            Connect Google Calendar
          </a>
        </div>
      ) : null}

      {!loading && agenda?.needsReconnect ? (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <p className="font-semibold text-amber-950">One reconnect is needed</p>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Your existing connection can write the Personal Control Center calendar, but it was authorised before Agenda could read your other Google calendars. Reconnect once to approve read access.
          </p>
          <a className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/api/integrations/google-calendar/connect">
            Reconnect Google Calendar
          </a>
        </div>
      ) : null}

      {!loading && agenda?.connected && !agenda.needsReconnect ? (
        <div className="mt-7 space-y-7">
          {groups.length ? groups.map(([date, events]) => (
            <section key={date}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-slate-400">{dateHeading(date)}</h3>
              <div className="space-y-2">
                {events.map((event) => (
                  <article key={`${event.calendarId}:${event.id}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                    <div className="flex gap-4">
                      <div className="w-[5.5rem] shrink-0 pt-0.5 text-sm font-semibold text-slate-600">{eventTimeLabel(event)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-950">{event.title}</p>
                            <p className="mt-1 text-xs text-slate-400">{sourceLabel(event.source)} · {event.calendarName}</p>
                          </div>
                          {event.editable ? (
                            <div className="flex gap-2">
                              <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-950" onClick={() => editEvent(event)}>Edit</button>
                              <button type="button" className="text-xs font-semibold text-red-600 hover:text-red-800" onClick={() => void deleteEvent(event)}>Delete</button>
                            </div>
                          ) : null}
                        </div>

                        {event.location ? <p className="mt-2 text-sm text-slate-600">{event.location}</p> : null}
                        {event.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{event.description}</p> : null}

                        {(event.meetLink || event.htmlLink) ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {event.meetLink ? (
                              <a className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white" href={event.meetLink} target="_blank" rel="noreferrer">Join meeting</a>
                            ) : null}
                            {event.htmlLink ? (
                              <a className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600" href={event.htmlLink} target="_blank" rel="noreferrer">Open in Google Calendar</a>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 px-5 py-10 text-center text-sm text-slate-500">
              Nothing scheduled in the next 90 days.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
