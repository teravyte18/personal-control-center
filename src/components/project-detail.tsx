"use client";

import { useEffect, useState, type FormEvent } from "react";
import { isProjectActionPastCheckIn } from "@/domain/project-dates";
import {
  areaLabels,
  getCompletedProjectActions,
  getCurrentProjectAction,
  type ActionCompletionResolution,
  type AreaId,
  type Item,
  type ItemStatus,
  type ProjectAction,
  usePersonalData,
} from "@/lib/personal-data";

const projectStatuses: Array<{ value: ItemStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "in-progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "incubating", label: "Incubating" },
  { value: "archived", label: "Archived" },
];

export function ExpandButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function ProjectDetail({
  project,
  onClose,
  accomplishment = false,
}: {
  project: Item;
  onClose: () => void;
  accomplishment?: boolean;
}) {
  const {
    updateItem,
    setItemStatus,
    addProjectAction,
    completeProjectAction,
    toggleCompleted,
  } = usePersonalData();
  const [editingProject, setEditingProject] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
  const [completingAction, setCompletingAction] = useState(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const currentAction = getCurrentProjectAction(project);
  const statusLabel = projectStatuses.find((option) => option.value === project.status)?.label ?? project.status;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Close project"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setEditingProject((value) => !value)}
            className="min-h-10 rounded-xl px-3 text-xs font-semibold text-slate-500"
          >
            {editingProject ? "Cancel" : "Edit project"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-7 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          <span>{areaLabels[project.area]}</span>
          <span aria-hidden="true">·</span>
          <span>{accomplishment ? "Completed" : statusLabel}</span>
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{project.title}</h2>
        {project.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{project.description}</p> : null}

        {editingProject ? (
          <ProjectEditForm
            project={project}
            updateItem={updateItem}
            setItemStatus={setItemStatus}
            onSaved={() => setEditingProject(false)}
          />
        ) : null}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Progress</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">Action timeline</h3>
            </div>
            <span className="text-xs text-slate-400">{project.actions.length} total</span>
          </div>

          <Timeline project={project} showAll={showFullTimeline} />

          {project.actions.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowFullTimeline((value) => !value)}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {showFullTimeline ? "Show timeline overview" : "View full timeline"}
            </button>
          ) : null}
        </section>

        {!accomplishment && currentAction && completingAction ? (
          <CompleteActionForm
            action={currentAction}
            onCancel={() => setCompletingAction(false)}
            onComplete={(note, resolution, nextTitle, nextDate) => {
              completeProjectAction(project.id, currentAction.id, note, resolution, nextTitle, nextDate);
              setCompletingAction(false);
            }}
          />
        ) : null}

        {!accomplishment && !currentAction && addingAction ? (
          <AddActionForm
            onCancel={() => setAddingAction(false)}
            onAdd={(actionTitle, targetDate) => {
              addProjectAction(project.id, actionTitle, targetDate);
              setAddingAction(false);
            }}
          />
        ) : null}

        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-200 pt-6">
          {accomplishment ? (
            <button
              type="button"
              onClick={() => toggleCompleted(project.id)}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Reopen project
            </button>
          ) : currentAction ? (
            <button
              type="button"
              onClick={() => setCompletingAction((value) => !value)}
              className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Complete current action
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAddingAction((value) => !value)}
              className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Add action point
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function ProjectEditForm({
  project,
  updateItem,
  setItemStatus,
  onSaved,
}: {
  project: Item;
  updateItem: ReturnType<typeof usePersonalData>["updateItem"];
  setItemStatus: ReturnType<typeof usePersonalData>["setItemStatus"];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [area, setArea] = useState<AreaId>(project.area);
  const [status, setStatus] = useState<ItemStatus>(project.status);

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    updateItem(project.id, { title: trimmedTitle, description: description.trim(), area });
    setItemStatus(project.id, status);
    onSaved();
  }

  return (
    <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={saveProject}>
      <label className="block text-sm font-medium text-slate-700">
        Project title
        <input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Outcome or context
        <textarea className="input mt-2 min-h-24 resize-y" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Area
          <select className="input mt-2" value={area} onChange={(event) => setArea(event.target.value as AreaId)}>
            {Object.entries(areaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Status
          <select className="input mt-2" value={status} onChange={(event) => setStatus(event.target.value as ItemStatus)}>
            {projectStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Save project</button>
      </div>
    </form>
  );
}

function Timeline({ project, showAll }: { project: Item; showAll: boolean }) {
  const currentAction = getCurrentProjectAction(project);
  const completedActions = getCompletedProjectActions(project);
  const orderedActions = currentAction ? [currentAction, ...completedActions] : completedActions;
  const visibleActions = showAll ? orderedActions : orderedActions.slice(0, 3);
  const hasHiddenActions = !showAll && orderedActions.length > visibleActions.length;

  if (visibleActions.length === 0) {
    return <p className="mt-5 text-sm text-slate-500">No action points recorded.</p>;
  }

  return (
    <div className="mt-6">
      {visibleActions.map((action, index) => (
        <TimelinePoint
          key={action.id}
          action={action}
          current={action.id === currentAction?.id}
          detailed={showAll}
          last={index === visibleActions.length - 1 && !hasHiddenActions}
        />
      ))}
      {hasHiddenActions ? (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
          <div className="flex flex-col items-center">
            <span className="min-h-5 border-l-2 border-dotted border-slate-300" />
          </div>
          <p className="pb-1 text-lg tracking-[0.35em] text-slate-400">•••</p>
        </div>
      ) : null}
    </div>
  );
}

function TimelinePoint({
  action,
  current,
  detailed,
  last,
}: {
  action: ProjectAction;
  current: boolean;
  detailed: boolean;
  last: boolean;
}) {
  const overdue = current && isProjectActionPastCheckIn(action);

  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
      <div className="flex flex-col items-center">
        <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${overdue ? "border-rose-600 bg-rose-600" : current ? "border-slate-950 bg-slate-950" : "border-emerald-600 bg-white"}`} />
        {!last ? <span className="my-1 min-h-10 flex-1 border-l-2 border-dotted border-slate-300" /> : null}
      </div>
      <div className={last ? "" : "pb-5"}>
        <p className="text-sm font-semibold leading-6 text-slate-900">{action.title}</p>
        <p className={`mt-1 text-xs ${overdue ? "font-semibold text-rose-700" : "text-slate-500"}`}>
          {current
            ? action.targetDate ? `${overdue ? "Check-in passed" : "Check in"} ${formatDateOnly(action.targetDate)}` : "Check-in date not set"
            : action.completedAt ? `Completed ${formatTimestamp(action.completedAt)}` : `Check in ${formatDateOnly(action.targetDate)}`}
        </p>
        {detailed ? (
          <div className="mt-2 text-xs leading-5 text-slate-500">
            <p>Opened {formatTimestamp(action.openedAt)}</p>
            {action.targetDate ? <p>Check-in date {formatDateOnly(action.targetDate)}</p> : null}
            {action.completedAt ? <p>Completed {formatTimestamp(action.completedAt)}</p> : null}
            {action.completionNote ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{action.completionNote}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AddActionForm({ onAdd, onCancel }: { onAdd: (title: string, date: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  return (
    <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={(event) => { event.preventDefault(); onAdd(title, date); }}>
      <p className="text-sm font-semibold text-slate-900">Add the next action point</p>
      <label className="mt-3 block text-sm font-medium text-slate-700">Action<input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label className="mt-3 block text-sm font-medium text-slate-700">Check-in date<input type="date" className="input mt-2" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-600">Cancel</button>
        <button type="submit" className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Add action</button>
      </div>
    </form>
  );
}

function CompleteActionForm({
  action,
  onCancel,
  onComplete,
}: {
  action: ProjectAction;
  onCancel: () => void;
  onComplete: (note: string, resolution: ActionCompletionResolution, nextTitle: string, nextDate: string) => void;
}) {
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState<ActionCompletionResolution>("next-action");
  const [nextTitle, setNextTitle] = useState("");
  const [nextDate, setNextDate] = useState("");

  return (
    <form className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" onSubmit={(event) => { event.preventDefault(); onComplete(note, resolution, nextTitle, nextDate); }}>
      <p className="text-sm font-semibold text-emerald-950">Complete: {action.title}</p>
      <label className="mt-3 block text-sm font-medium text-emerald-950">
        What happened?
        <textarea className="input mt-2 min-h-24 resize-y bg-white" value={note} onChange={(event) => setNote(event.target.value)} placeholder="A free-form result, observation, or reason it is not fully done…" required />
      </label>
      <label className="mt-3 block text-sm font-medium text-emerald-950">
        What happens next?
        <select className="input mt-2 bg-white" value={resolution} onChange={(event) => setResolution(event.target.value as ActionCompletionResolution)}>
          <option value="next-action">Open the next action point</option>
          <option value="waiting">Move project to waiting</option>
          <option value="complete-project">Complete the project</option>
        </select>
      </label>
      {resolution === "next-action" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_11rem]">
          <label className="block text-sm font-medium text-emerald-950">Next action<input className="input mt-2 bg-white" value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} required /></label>
          <label className="block text-sm font-medium text-emerald-950">Check-in date<input type="date" className="input mt-2 bg-white" value={nextDate} onChange={(event) => setNextDate(event.target.value)} required /></label>
        </div>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-emerald-900">Cancel</button>
        <button type="submit" className="min-h-10 rounded-xl bg-emerald-900 px-4 text-sm font-semibold text-white">Save completion</button>
      </div>
    </form>
  );
}

export function formatDateOnly(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}
