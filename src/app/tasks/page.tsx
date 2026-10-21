"use client";

import { useMemo, useState, type FormEvent } from "react";
import { focusMatches, getRhythmPeriod } from "@/domain/weekly-rhythm";
import { useSourceRecord } from "@/hooks/use-source-record";
import {
  areaLabels,
  isOpenTask,
  isTaskDueToday,
  isTaskOverdue,
  type AreaId,
  type Item,
  usePersonalData,
  useRhythmData,
} from "@/lib/personal-data";

export default function TasksPage() {
  const { items, addItem, updateItem, toggleCompleted } = usePersonalData();
  const { weeklyFocuses, addWeeklyFocus, removeWeeklyFocus } = useRhythmData();
  const rhythmPeriod = useMemo(() => getRhythmPeriod(), []);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"open" | "completed">("open");
  const sourceId = useSourceRecord("task");
  const [selectedOverride, setSelectedId] = useState<string | null>(null);
  const selectedId = selectedOverride ?? sourceId;
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [area, setArea] = useState<AreaId>("uncategorized");

  const tasks = useMemo(() => items.filter(item => view === "open" ? isOpenTask(item) : item.kind === "task" && item.status === "completed").sort(compareTasks), [items, view]);
  const selected = tasks.find(task => task.id === selectedId) ?? tasks[0];

  function resetForm() {
    setTitle("");
    setNotes("");
    setCheckInDate("");
    setArea("uncategorized");
  }

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const task = addItem(title, {
      description: notes,
      kind: "task",
      status: "active",
      area,
    });
    if (!task) return;
    if (checkInDate) updateItem(task.id, { checkInDate });
    resetForm();
    setCreating(false);
  }

  function cancelCreation() {
    resetForm();
    setCreating(false);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">Tasks</h2>
        {!creating ? (
          <button type="button" onClick={() => setCreating(true)} className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white active:scale-[0.99]">
            New task
          </button>
        ) : null}
      </div>
      <div className="pcc-view-controls"><button className={`pcc-control ${view === "open" ? "is-selected" : ""}`} aria-pressed={view === "open"} onClick={() => {setView("open");setSelectedId("");}}>Open</button><button className={`pcc-control ${view === "completed" ? "is-selected" : ""}`} aria-pressed={view === "completed"} onClick={() => {setView("completed");setSelectedId("");}}>Completed</button></div>

      {creating ? (
        <form onSubmit={createTask} className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">New task</h3>
            <button type="button" onClick={cancelCreation} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100">
              Cancel
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              Title
              <input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="One concrete thing to do" autoFocus required />
            </label>
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              Notes
              <textarea className="input mt-2 min-h-24 resize-y" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional context, links, or details…" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Check-in date
              <input type="date" className="input mt-2" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Area
              <select className="input mt-2" value={area} onChange={(event) => setArea(event.target.value as AreaId)}>
                {Object.entries(areaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" className="mt-5 min-h-12 w-full rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white active:scale-[0.99] sm:w-auto">
            Add task
          </button>
        </form>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">No {view} tasks.</h3>
        </div>
      ) : (
        <div className="pcc-task-layout" data-detail-open={Boolean(selectedId)}>
          <div className="pcc-task-list">{tasks.map(task => <button key={task.id} className="pcc-record w-full" onClick={() => setSelectedId(task.id)} aria-pressed={selected?.id === task.id}><p className="pcc-record-title">{task.title}</p><p className="pcc-record-meta">{areaLabels[task.area]} · {task.checkInDate ? formatDate(task.checkInDate) : "No date"}</p></button>)}</div>
          <div className="pcc-task-detail"><button className="pcc-task-back pcc-control mb-4" onClick={() => setSelectedId("")}>Back to tasks</button>
          {selected ? (
            <TaskCard
              key={selected.id}
              task={selected}
              weeklyFocusId={weeklyFocuses.find((focus) => (
                focus.weekStart === rhythmPeriod.start && focusMatches(focus, "task", selected.id)
              ))?.id}
              onUpdate={(updates) => updateItem(selected.id, updates)}
              onComplete={() => {toggleCompleted(selected.id);setSelectedId("");}}
              onToggleWeeklyFocus={(focusId) => {
                if (focusId) removeWeeklyFocus(focusId);
                else addWeeklyFocus("task", selected.id);
              }}
            />
          ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function TaskCard({
  task,
  onUpdate,
  weeklyFocusId,
  onComplete,
  onToggleWeeklyFocus,
}: {
  task: Item;
  weeklyFocusId?: string;
  onUpdate: (updates: Partial<Pick<Item, "title" | "description" | "checkInDate" | "area">>) => void;
  onComplete: () => void;
  onToggleWeeklyFocus: (focusId?: string) => void;
}) {
  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const border = overdue
    ? "border-slate-200 border-l-4 border-l-rose-500 bg-white"
    : dueToday
      ? "border-slate-200 border-l-4 border-l-amber-400 bg-white"
      : "border-slate-200 bg-white";

  return (
    <details open className={`group rounded-2xl border shadow-sm ${border}`}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onComplete();
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:border-emerald-500 hover:text-emerald-700"
          aria-label={`${task.status === "completed" ? "Reopen" : "Complete"} ${task.title}`}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{task.title}</p>
          <p className={`mt-1 text-xs ${overdue ? "font-semibold text-rose-700" : dueToday ? "font-semibold text-amber-700" : "text-slate-500"}`}>
            {task.checkInDate
              ? overdue
                ? `Overdue since ${formatDate(task.checkInDate)}`
                : dueToday
                  ? "Due today"
                  : `Check in ${formatDate(task.checkInDate)}`
              : "No check-in date"}
          </p>
        </div>
        <span className="text-xl text-slate-400 transition group-open:rotate-45" aria-hidden="true">＋</span>
      </summary>

      <div className="border-t border-slate-200/70 px-3 pb-4 pt-3 sm:px-4">
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input className="input mt-2" defaultValue={task.title} onBlur={(event) => {
            if (event.target.value.trim()) onUpdate({ title: event.target.value });
          }} />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Notes
          <textarea className="input mt-2 min-h-24 resize-y" defaultValue={task.description} onBlur={(event) => onUpdate({ description: event.target.value })} placeholder="Optional context…" />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Check-in date
            <input type="date" className="input mt-2" value={task.checkInDate ?? ""} onChange={(event) => onUpdate({ checkInDate: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Area
            <select className="input mt-2" value={task.area} onChange={(event) => onUpdate({ area: event.target.value as AreaId })}>
              {Object.entries(areaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onToggleWeeklyFocus(weeklyFocusId)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${weeklyFocusId ? "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-200 bg-white text-slate-700"}`}
          >
            {weeklyFocusId ? "Remove from this week" : "Add to this week"}
          </button>
          <button type="button" onClick={onComplete} className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
            {task.status === "completed" ? "Reopen task" : "Complete task"}
          </button>
        </div>
      </div>
    </details>
  );
}

function compareTasks(a: Item, b: Item) {
  const aOverdue = isTaskOverdue(a);
  const bOverdue = isTaskOverdue(b);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
  const aDue = isTaskDueToday(a);
  const bDue = isTaskDueToday(b);
  if (aDue !== bDue) return aDue ? -1 : 1;
  const aDate = a.checkInDate ?? "";
  const bDate = b.checkInDate ?? "";
  if (aDate && bDate) return aDate.localeCompare(bDate);
  if (aDate !== bDate) return aDate ? -1 : 1;
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
