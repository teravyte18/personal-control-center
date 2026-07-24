"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  areaLabels,
  isOpenTask,
  isTaskDueToday,
  isTaskOverdue,
  type AreaId,
  type Item,
  usePersonalData,
} from "@/lib/personal-data";

export default function TasksPage() {
  const { items, addItem, updateItem, toggleCompleted } = usePersonalData();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [area, setArea] = useState<AreaId>("uncategorized");

  const tasks = useMemo(() => items.filter(isOpenTask).sort(compareTasks), [items]);
  const datedCount = tasks.filter((task) => task.checkInDate).length;

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
    setTitle("");
    setNotes("");
    setCheckInDate("");
    setArea("uncategorized");
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Concrete one-off actions</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Tasks</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Keep actions here when they do not need a project timeline. Dates are optional and can be changed freely.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold text-slate-500">
          <span className="rounded-full bg-white px-3 py-2 shadow-sm">{tasks.length} open</span>
          <span className="rounded-full bg-white px-3 py-2 shadow-sm">{datedCount} dated</span>
        </div>
      </div>

      <form onSubmit={createTask} className="mt-7 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h3 className="text-lg font-semibold">Add a task</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Title
            <input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="One concrete thing to do" required />
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

      {tasks.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">No open tasks.</h3>
          <p className="mt-2 text-sm text-slate-500">Tasks completed here disappear from this view and remain available to the relevant Weekly Review.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={(updates) => updateItem(task.id, updates)}
              onComplete={() => toggleCompleted(task.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskCard({
  task,
  onUpdate,
  onComplete,
}: {
  task: Item;
  onUpdate: (updates: Partial<Pick<Item, "title" | "description" | "checkInDate" | "area">>) => void;
  onComplete: () => void;
}) {
  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const border = overdue ? "border-rose-300 bg-rose-50" : dueToday ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white";

  return (
    <details className={`group rounded-2xl border shadow-sm ${border}`}>
      <summary className="flex min-h-18 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onComplete();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:border-emerald-500 hover:text-emerald-700"
          aria-label={`Complete ${task.title}`}
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

      <div className="border-t border-slate-200/70 px-4 pb-5 pt-4 sm:px-5">
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
        <button type="button" onClick={onComplete} className="mt-5 min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
          Complete task
        </button>
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
