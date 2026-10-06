"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  currentWeeklyFocus,
  focusMatches,
  getDatedRhythmWork,
  getRhythmPeriod,
  getRhythmProgress,
  resolveWeeklyFocus,
  rhythmDayparts,
  type RhythmDaypart,
  type RhythmTemplate,
  type WeeklyFocusSourceType,
} from "@/domain/weekly-rhythm";
import {
  areaLabels,
  getOpenProjectActions,
  isOpenTask,
  usePersonalData,
  useRhythmData,
  type AreaId,
} from "@/lib/personal-data";

type AgendaEventSource = "google" | "agenda" | "task" | "project-action" | "pcc";

type AgendaEvent = {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  source: AgendaEventSource;
};

type AgendaResponse = {
  configured: boolean;
  connected: boolean;
  needsReconnect: boolean;
  events: AgendaEvent[];
};

type WorkCandidate = {
  key: string;
  sourceType: WeeklyFocusSourceType;
  sourceItemId: string;
  sourceActionId?: string;
  title: string;
  context: string;
};

function localDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return localDate(date);
}

function previousWeekStart(value: string) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - 7);
  return localDate(date);
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);
}

function formatPeriod(start: string, end: string) {
  return `${formatDate(start, { day: "numeric", month: "short" })} – ${formatDate(end, { day: "numeric", month: "short" })}`;
}

function eventDate(event: AgendaEvent) {
  return event.allDay ? event.start.slice(0, 10) : localDate(new Date(event.start));
}

function eventTime(event: AgendaEvent) {
  if (event.allDay) return "All day";
  return new Date(event.start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function metadata(template: RhythmTemplate) {
  const values: string[] = [];
  if (template.area) values.push(areaLabels[template.area]);
  if (template.preferredDaypart) values.push(template.preferredDaypart[0].toUpperCase() + template.preferredDaypart.slice(1));
  if (template.approximateMinutes) values.push(`~${template.approximateMinutes} min`);
  return values.join(" · ");
}

export default function RhythmPage() {
  const { items } = usePersonalData();
  const {
    rhythmTemplates,
    rhythmCompletions,
    weeklyFocuses,
    addRhythm,
    updateRhythm,
    deleteRhythm,
    addRhythmCompletion,
    deleteRhythmCompletion,
    addWeeklyFocus,
    removeWeeklyFocus,
  } = useRhythmData();

  const period = useMemo(() => getRhythmPeriod(), []);
  const [creatingRhythm, setCreatingRhythm] = useState(false);
  const [addingWork, setAddingWork] = useState(false);
  const [selectedWork, setSelectedWork] = useState("");
  const [calendar, setCalendar] = useState<AgendaResponse | null>(null);
  const [calendarError, setCalendarError] = useState("");

  const datedWork = useMemo(() => getDatedRhythmWork(items, period), [items, period]);
  const focused = useMemo(
    () => currentWeeklyFocus(items, weeklyFocuses, new Date(`${period.start}T12:00:00`)),
    [items, period.start, weeklyFocuses],
  );

  const activeRhythms = useMemo(
    () => rhythmTemplates.filter((template) => template.state === "active"),
    [rhythmTemplates],
  );
  const pausedRhythms = useMemo(
    () => rhythmTemplates.filter((template) => template.state === "paused"),
    [rhythmTemplates],
  );

  const workCandidates = useMemo(() => {
    const candidates: WorkCandidate[] = [];
    for (const item of items) {
      if (isOpenTask(item)) {
        const alreadyFocused = weeklyFocuses.some((focus) => (
          focus.weekStart === period.start && focusMatches(focus, "task", item.id)
        ));
        if (!alreadyFocused) {
          candidates.push({
            key: `task|${item.id}|`,
            sourceType: "task",
            sourceItemId: item.id,
            title: item.title,
            context: "Task",
          });
        }
      }

      if (item.kind === "project" && !["completed", "archived"].includes(item.status)) {
        for (const action of getOpenProjectActions(item)) {
          const alreadyFocused = weeklyFocuses.some((focus) => (
            focus.weekStart === period.start && focusMatches(focus, "project-action", item.id, action.id)
          ));
          if (!alreadyFocused) {
            candidates.push({
              key: `project-action|${item.id}|${action.id}`,
              sourceType: "project-action",
              sourceItemId: item.id,
              sourceActionId: action.id,
              title: action.title,
              context: item.title,
            });
          }
        }
      }
    }
    return candidates.sort((left, right) => left.context.localeCompare(right.context) || left.title.localeCompare(right.title));
  }, [items, period.start, weeklyFocuses]);

  const previousFocus = useMemo(() => {
    const previousStart = previousWeekStart(period.start);
    return weeklyFocuses
      .filter((focus) => focus.weekStart === previousStart)
      .flatMap((focus) => {
        const resolved = resolveWeeklyFocus(items, focus);
        if (!resolved?.active) return [];
        const alreadyCarried = weeklyFocuses.some((candidate) => (
          candidate.weekStart === period.start
          && focusMatches(candidate, focus.sourceType, focus.sourceItemId, focus.sourceActionId)
        ));
        return alreadyCarried ? [] : [resolved];
      });
  }, [items, period.start, weeklyFocuses]);

  useEffect(() => {
    let cancelled = false;
    const start = new Date(`${period.start}T00:00:00`);
    const end = new Date(`${nextDate(period.end)}T00:00:00`);
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    });

    void fetch(`/api/integrations/google-calendar/events?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as AgendaResponse | { error?: string };
        if (!response.ok || !("events" in body)) {
          throw new Error("Calendar commitments could not be loaded.");
        }
        if (!cancelled) setCalendar(body);
      })
      .catch((error) => {
        if (!cancelled) setCalendarError(error instanceof Error ? error.message : "Calendar commitments could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, [period.end, period.start]);

  const commitments = useMemo(
    () => (calendar?.events ?? []).filter((event) => ["google", "agenda"].includes(event.source)),
    [calendar],
  );

  function addSelectedWork() {
    const candidate = workCandidates.find((entry) => entry.key === selectedWork);
    if (!candidate) return;
    addWeeklyFocus(candidate.sourceType, candidate.sourceItemId, candidate.sourceActionId);
    setSelectedWork("");
    setAddingWork(false);
  }

  return (
    <section className="mx-auto min-w-0 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Saturday → Friday</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">This week</h2>
          <p className="mt-2 text-sm text-slate-500">{formatPeriod(period.start, period.end)}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreatingRhythm((value) => !value)}
          className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
        >
          {creatingRhythm ? "Cancel" : "New rhythm"}
        </button>
      </div>

      {creatingRhythm ? (
        <NewRhythmForm
          onCancel={() => setCreatingRhythm(false)}
          onAdd={(title, target, options) => {
            const created = addRhythm(title, target, options);
            if (created) setCreatingRhythm(false);
          }}
        />
      ) : null}

      <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="min-w-0 space-y-5">
          <WeekSection title="Rhythm" count={activeRhythms.length}>
            {activeRhythms.length ? (
              <div className="space-y-3">
                {activeRhythms.map((template) => {
                  const progress = getRhythmProgress(template.id, rhythmCompletions, period);
                  return (
                    <RhythmCard
                      key={template.id}
                      template={template}
                      count={progress.count}
                      mostRecentCompletionId={progress.completions[0]?.id}
                      onComplete={() => addRhythmCompletion(template.id)}
                      onUndo={() => {
                        const id = progress.completions[0]?.id;
                        if (id) deleteRhythmCompletion(id);
                      }}
                      onUpdate={(updates) => updateRhythm(template.id, updates)}
                      onDelete={() => deleteRhythm(template.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyText>No weekly intentions yet. Add something you want to make room for a few times this week.</EmptyText>
            )}
          </WeekSection>

          <WeekSection
            title="Weekly focus"
            count={focused.length}
            action={(
              <button
                type="button"
                onClick={() => setAddingWork((value) => !value)}
                className="min-h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"
              >
                {addingWork ? "Cancel" : "Add work"}
              </button>
            )}
          >
            {addingWork ? (
              <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {workCandidates.length ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select className="input" value={selectedWork} onChange={(event) => setSelectedWork(event.target.value)}>
                      <option value="">Choose a Task or Project Action…</option>
                      {workCandidates.map((candidate) => (
                        <option key={candidate.key} value={candidate.key}>
                          {candidate.context}: {candidate.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedWork}
                      onClick={addSelectedWork}
                      className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                ) : <p className="text-sm text-slate-500">All open work is already focused this week.</p>}
              </div>
            ) : null}

            {focused.length ? (
              <div className="divide-y divide-slate-100">
                {focused.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
                    <Link
                      href={entry.sourceType === "task" ? "/tasks" : "/projects"}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-semibold text-slate-900">{entry.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{entry.context}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeWeeklyFocus(entry.id)}
                      className="min-h-9 rounded-xl px-3 text-xs font-semibold text-slate-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : <EmptyText>No flexible work selected for this week.</EmptyText>}
          </WeekSection>

          {previousFocus.length ? (
            <WeekSection title="Still open from last week" count={previousFocus.length}>
              <div className="divide-y divide-slate-100">
                {previousFocus.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{entry.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{entry.context}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addWeeklyFocus(entry.sourceType, entry.sourceItemId, entry.sourceActionId)}
                      className="min-h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                    >
                      Carry forward
                    </button>
                  </div>
                ))}
              </div>
            </WeekSection>
          ) : null}
        </div>

        <div className="min-w-0 space-y-5">
          <WeekSection title="Fixed commitments" count={commitments.length}>
            {calendarError ? <p className="text-sm text-amber-700">{calendarError}</p> : null}
            {!calendarError && calendar && !calendar.connected ? (
              <p className="text-sm leading-6 text-slate-500">
                Google Calendar is not connected. Rhythm still works with PCC work and intentions.
              </p>
            ) : null}
            {commitments.length ? (
              <div className="divide-y divide-slate-100">
                {commitments.map((event) => (
                  <div key={`${event.calendarId}:${event.id}`} className="min-w-0 py-3 first:pt-0 last:pb-0">
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <p className="min-w-0 break-words text-sm font-semibold leading-5 text-slate-900">{event.title}</p>
                      <span className="shrink-0 pt-0.5 text-xs font-semibold text-slate-500">{eventTime(event)}</span>
                    </div>
                    <p className="mt-1 min-w-0 break-words text-xs leading-5 text-slate-500">
                      {formatDate(eventDate(event))}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : !calendarError && calendar?.connected ? <EmptyText>No fixed Calendar commitments this week.</EmptyText> : null}
          </WeekSection>

          <WeekSection title="Dated work" count={datedWork.length}>
            {datedWork.length ? (
              <div className="divide-y divide-slate-100">
                {datedWork.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.sourceType === "task" ? "/tasks" : "/projects"}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{entry.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{entry.context}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-600">{formatDate(entry.date, { weekday: "short", day: "numeric" })}</span>
                  </Link>
                ))}
              </div>
            ) : <EmptyText>No Tasks or Project Actions dated inside this week.</EmptyText>}
          </WeekSection>

          {pausedRhythms.length ? (
            <WeekSection title="Paused rhythms" count={pausedRhythms.length}>
              <div className="divide-y divide-slate-100">
                {pausedRhythms.map((template) => (
                  <div key={template.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-600">{template.title}</p>
                    <button type="button" onClick={() => updateRhythm(template.id, { state: "active" })} className="min-h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">Resume</button>
                    <button type="button" onClick={() => deleteRhythm(template.id)} className="min-h-9 rounded-xl px-2 text-xs font-semibold text-rose-600">Delete</button>
                  </div>
                ))}
              </div>
            </WeekSection>
          ) : null}

          <p className="px-1 text-xs leading-5 text-slate-400">
            Detailed calendar browsing still belongs in <Link href="/agenda" className="font-semibold underline">Agenda / Google Calendar</Link>. This view only keeps the week understandable.
          </p>
        </div>
      </div>
    </section>
  );
}

function WeekSection({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="font-semibold text-slate-950">{title}</h3>
          <span className="text-xs tabular-nums text-slate-400">{count}</span>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-slate-500">{children}</p>;
}

function RhythmCard({
  template,
  count,
  mostRecentCompletionId,
  onComplete,
  onUndo,
  onUpdate,
  onDelete,
}: {
  template: RhythmTemplate;
  count: number;
  mostRecentCompletionId?: string;
  onComplete: () => void;
  onUndo: () => void;
  onUpdate: (updates: Partial<Pick<RhythmTemplate, "title" | "targetPerWeek" | "area" | "preferredDaypart" | "approximateMinutes" | "note" | "state">>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const completed = Math.min(count, template.targetPerWeek);
  const exceeded = Math.max(0, count - template.targetPerWeek);

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{template.title}</p>
          {metadata(template) ? <p className="mt-1 text-xs text-slate-500">{metadata(template)}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label={`${count} of ${template.targetPerWeek} completed`}>
            {Array.from({ length: template.targetPerWeek }, (_, index) => (
              <span
                key={index}
                className={`h-2.5 min-w-5 flex-1 rounded-full ${index < completed ? "bg-slate-900" : "bg-slate-200"}`}
              />
            ))}
            <span className="ml-2 shrink-0 text-xs font-semibold tabular-nums text-slate-600">
              {count} / {template.targetPerWeek}{exceeded ? ` +${exceeded}` : ""}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="min-h-10 shrink-0 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white"
        >
          + Done
        </button>
      </div>

      {template.note ? <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-500">{template.note}</p> : null}

      <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-200 pt-2">
        {mostRecentCompletionId ? <button type="button" onClick={onUndo} className="min-h-9 rounded-xl px-2 text-xs font-semibold text-slate-500">Undo last</button> : null}
        <button type="button" onClick={() => setEditing((value) => !value)} className="min-h-9 rounded-xl px-2 text-xs font-semibold text-slate-500">{editing ? "Close" : "Edit"}</button>
        <button type="button" onClick={() => onUpdate({ state: "paused" })} className="min-h-9 rounded-xl px-2 text-xs font-semibold text-slate-500">Pause</button>
      </div>

      {editing ? (
        <EditRhythmForm template={template} onUpdate={onUpdate} onDelete={onDelete} onClose={() => setEditing(false)} />
      ) : null}
    </article>
  );
}

function NewRhythmForm({
  onAdd,
  onCancel,
}: {
  onAdd: (
    title: string,
    target: number,
    options: { area?: AreaId; preferredDaypart?: RhythmDaypart; approximateMinutes?: number; note?: string },
  ) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(3);
  const [area, setArea] = useState<AreaId | "">("");
  const [daypart, setDaypart] = useState<RhythmDaypart | "">("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdd(title, target, {
      area: area || undefined,
      preferredDaypart: daypart || undefined,
      approximateMinutes: minutes ? Number(minutes) : undefined,
      note,
    });
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-medium text-slate-700">
          Rhythm
          <input autoFocus required className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Run, focused work, reading…" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Target per week
          <select className="input mt-2" value={target} onChange={(event) => setTarget(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 7].map((value) => <option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Area <span className="font-normal text-slate-400">optional</span>
          <select className="input mt-2" value={area} onChange={(event) => setArea(event.target.value as AreaId | "")}>
            <option value="">None</option>
            {Object.entries(areaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Preferred time <span className="font-normal text-slate-400">optional</span>
          <select className="input mt-2" value={daypart} onChange={(event) => setDaypart(event.target.value as RhythmDaypart | "")}>
            <option value="">Any time</option>
            {rhythmDayparts.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Approx. minutes <span className="font-normal text-slate-400">optional</span>
          <input type="number" min={5} max={720} step={5} className="input mt-2" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="45" />
        </label>
        <label className="sm:col-span-2 text-sm font-medium text-slate-700">
          Note <span className="font-normal text-slate-400">optional</span>
          <textarea className="input mt-2 min-h-20 resize-y" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything that makes this easier to act on…" />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-500">Cancel</button>
        <button type="submit" className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Add rhythm</button>
      </div>
    </form>
  );
}

function EditRhythmForm({
  template,
  onUpdate,
  onDelete,
  onClose,
}: {
  template: RhythmTemplate;
  onUpdate: (updates: Partial<Pick<RhythmTemplate, "title" | "targetPerWeek" | "area" | "preferredDaypart" | "approximateMinutes" | "note" | "state">>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(template.title);
  const [target, setTarget] = useState(template.targetPerWeek);
  const [daypart, setDaypart] = useState<RhythmDaypart | "">(template.preferredDaypart ?? "");
  const [minutes, setMinutes] = useState(template.approximateMinutes ? String(template.approximateMinutes) : "");
  const [note, setNote] = useState(template.note ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate({
      title,
      targetPerWeek: target,
      preferredDaypart: daypart || undefined,
      approximateMinutes: minutes ? Number(minutes) : undefined,
      note,
    });
    onClose();
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
      <label className="sm:col-span-2 text-xs font-semibold text-slate-600">Title<input className="input mt-1.5 bg-white" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label className="text-xs font-semibold text-slate-600">Target<select className="input mt-1.5 bg-white" value={target} onChange={(event) => setTarget(Number(event.target.value))}>{[1, 2, 3, 4, 5, 7].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Preferred time<select className="input mt-1.5 bg-white" value={daypart} onChange={(event) => setDaypart(event.target.value as RhythmDaypart | "")}><option value="">Any time</option>{rhythmDayparts.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Minutes<input type="number" min={5} max={720} step={5} className="input mt-1.5 bg-white" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
      <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Note<textarea className="input mt-1.5 min-h-20 resize-y bg-white" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="sm:col-span-2 flex justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete “${template.title}” and its completion history?`)) onDelete();
          }}
          className="min-h-10 rounded-xl px-3 text-xs font-semibold text-rose-600"
        >
          Delete
        </button>
        <button type="submit" className="min-h-10 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white">Save</button>
      </div>
    </form>
  );
}
