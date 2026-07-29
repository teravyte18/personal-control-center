"use client";

import { useEffect, useState, type FormEvent } from "react";
import { isProjectActionPastCheckIn } from "@/domain/project-dates";
import {
  areaLabels,
  getCompletedProjectActions,
  getOpenProjectActions,
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
];

type ProjectActionEdit = Pick<ProjectAction, "title" | "targetDate"> & {
  rescheduleNote?: string;
};

export function ExpandButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function ProjectDetail({ project, onClose, accomplishment = false, archived = false }: { project: Item; onClose: () => void; accomplishment?: boolean; archived?: boolean }) {
  const { updateItem, setItemStatus, addProjectAction, updateProjectAction, completeProjectAction, toggleCompleted, archiveItem, restoreArchivedItem } = usePersonalData();
  const [editingProject, setEditingProject] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
  const [completingActionId, setCompletingActionId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const openActions = getOpenProjectActions(project);
  const completingAction = openActions.find((action) => action.id === completingActionId);
  const editingAction = openActions.find((action) => action.id === editingActionId);
  const statusLabel = projectStatuses.find((option) => option.value === project.status)?.label ?? project.status;
  const readOnly = archived || accomplishment;

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
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700" aria-label="Close project">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {!archived ? <button type="button" onClick={() => setEditingProject((value) => !value)} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-slate-500">{editingProject ? "Cancel" : "Edit project"}</button> : <span />}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-7 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          <span>{areaLabels[project.area]}</span><span aria-hidden="true">·</span><span>{archived ? "Archived" : accomplishment ? "Completed" : statusLabel}</span>
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{project.title}</h2>
        {project.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{project.description}</p> : null}

        {editingProject && !archived ? <ProjectEditForm project={project} updateItem={updateItem} setItemStatus={setItemStatus} onSaved={() => setEditingProject(false)} /> : null}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Next steps</p><h3 className="mt-1 text-xl font-semibold text-slate-950">Open actions</h3></div>
            <span className="text-xs text-slate-400">{openActions.length} open</span>
          </div>

          {openActions.length ? (
            <div className="mt-5 space-y-3">
              {openActions.map((action, index) => (
                <OpenActionCard
                  key={action.id}
                  action={action}
                  primary={index === 0}
                  readOnly={readOnly}
                  onComplete={() => { setCompletingActionId(action.id); setEditingActionId(null); }}
                  onEdit={() => { setEditingActionId(action.id); setCompletingActionId(null); }}
                />
              ))}
            </div>
          ) : <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No open actions.</p>}

          {!readOnly ? (
            <button type="button" onClick={() => { setAddingAction((value) => !value); setCompletingActionId(null); setEditingActionId(null); }} className="mt-4 min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
              {addingAction ? "Cancel new action" : "Add open action"}
            </button>
          ) : null}

          {addingAction && !readOnly ? <AddActionForm onCancel={() => setAddingAction(false)} onAdd={(title, date) => { addProjectAction(project.id, title, date); setAddingAction(false); }} /> : null}
          {editingAction && !readOnly ? <EditActionForm action={editingAction} onCancel={() => setEditingActionId(null)} onSave={(title, date, note) => { const updates: ProjectActionEdit = { title, targetDate: date, rescheduleNote: note }; updateProjectAction(project.id, editingAction.id, updates); setEditingActionId(null); }} /> : null}
          {completingAction && !readOnly ? <CompleteActionForm action={completingAction} hasOtherOpenActions={openActions.length > 1} onCancel={() => setCompletingActionId(null)} onComplete={(note, resolution, nextTitle, nextDate) => { completeProjectAction(project.id, completingAction.id, note, resolution, nextTitle, nextDate); setCompletingActionId(null); }} /> : null}
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Progress</p><h3 className="mt-1 text-xl font-semibold text-slate-950">Completed action history</h3></div>
            <span className="text-xs text-slate-400">{getCompletedProjectActions(project).length} completed</span>
          </div>
          <CompletedTimeline project={project} showAll={showFullHistory} />
          {getCompletedProjectActions(project).length > 3 ? <button type="button" onClick={() => setShowFullHistory((value) => !value)} className="mt-3 min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">{showFullHistory ? "Show recent history" : "View full history"}</button> : null}
        </section>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-200 pt-6">
          {archived ? <button type="button" onClick={() => restoreArchivedItem(project.id)} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Restore project</button> : (
            <>
              {accomplishment ? <button type="button" onClick={() => toggleCompleted(project.id)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">Reopen project</button> : null}
              <button type="button" onClick={() => archiveItem(project.id)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500">Archive project</button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function OpenActionCard({ action, primary, readOnly, onComplete, onEdit }: { action: ProjectAction; primary: boolean; readOnly: boolean; onComplete: () => void; onEdit: () => void }) {
  const overdue = isProjectActionPastCheckIn(action);
  return (
    <article className={`rounded-2xl border p-4 ${overdue ? "border-rose-300 bg-rose-50" : primary ? "border-slate-300 bg-white" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><span className={overdue ? "text-rose-700" : "text-slate-400"}>{overdue ? "Overdue" : primary ? "Next" : "Open"}</span></div>
          <p className="mt-2 font-semibold leading-6 text-slate-900">{action.title}</p>
          <p className={`mt-1 text-xs ${overdue ? "font-semibold text-rose-700" : "text-slate-500"}`}>{action.targetDate ? `${overdue ? "Check-in passed" : "Check in"} ${formatDateOnly(action.targetDate)}` : "No check-in date"}</p>
        </div>
        {!readOnly ? <div className="flex shrink-0 gap-1"><button type="button" onClick={onEdit} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-slate-500">Edit</button><button type="button" onClick={onComplete} className="min-h-10 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white">Complete</button></div> : null}
      </div>
      <RescheduleHistory action={action} compact />
    </article>
  );
}

function ProjectEditForm({ project, updateItem, setItemStatus, onSaved }: { project: Item; updateItem: ReturnType<typeof usePersonalData>["updateItem"]; setItemStatus: ReturnType<typeof usePersonalData>["setItemStatus"]; onSaved: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [area, setArea] = useState<AreaId>(project.area);
  const [status, setStatus] = useState<ItemStatus>(project.status);
  function saveProject(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const trimmedTitle = title.trim(); if (!trimmedTitle) return; updateItem(project.id, { title: trimmedTitle, description: description.trim(), area }); setItemStatus(project.id, status); onSaved(); }
  return <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={saveProject}>
    <label className="block text-sm font-medium text-slate-700">Project title<input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
    <label className="mt-4 block text-sm font-medium text-slate-700">Outcome or context<textarea className="input mt-2 min-h-24 resize-y" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Area<select className="input mt-2" value={area} onChange={(event) => setArea(event.target.value as AreaId)}>{Object.entries(areaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Status<select className="input mt-2" value={status} onChange={(event) => setStatus(event.target.value as ItemStatus)}>{projectStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
    <div className="mt-4 flex justify-end"><button type="submit" className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Save project</button></div>
  </form>;
}

function CompletedTimeline({ project, showAll }: { project: Item; showAll: boolean }) {
  const completed = getCompletedProjectActions(project);
  const visible = showAll ? completed : completed.slice(0, 3);
  if (!visible.length) return <p className="mt-5 text-sm text-slate-500">No completed actions yet.</p>;
  return <div className="mt-6">{visible.map((action, index) => <TimelinePoint key={action.id} action={action} detailed={showAll} last={index === visible.length - 1} />)}</div>;
}

function TimelinePoint({ action, detailed, last }: { action: ProjectAction; detailed: boolean; last: boolean }) {
  return <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3"><div className="flex flex-col items-center"><span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-emerald-600 bg-white" />{!last ? <span className="my-1 min-h-10 flex-1 border-l-2 border-dotted border-slate-300" /> : null}</div><div className={last ? "" : "pb-5"}><p className="text-sm font-semibold leading-6 text-slate-900">{action.title}</p><p className="mt-1 text-xs text-slate-500">Completed {action.completedAt ? formatTimestamp(action.completedAt) : "without a recorded date"}</p>{detailed ? <div className="mt-2 text-xs leading-5 text-slate-500"><p>Opened {formatTimestamp(action.openedAt)}</p><p>{action.targetDate ? `Final check-in date ${formatDateOnly(action.targetDate)}` : "No final check-in date"}</p><RescheduleHistory action={action} />{action.completionNote ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{action.completionNote}</p> : null}</div> : null}</div></div>;
}

function RescheduleHistory({ action, compact = false }: { action: ProjectAction; compact?: boolean }) {
  const entries = action.reschedules ?? [];
  if (!entries.length) return null;
  const visible = compact ? entries.slice(-1) : entries;
  return <div className={compact ? "mt-3 border-t border-slate-100 pt-3" : "mt-2"}>{visible.map((entry, index) => <div key={`${entry.changedAt}-${index}`} className="text-xs leading-5 text-slate-500"><p>{formatReschedule(entry.previousTargetDate, entry.targetDate)} on {formatTimestamp(entry.changedAt)}</p>{entry.note ? <p className="whitespace-pre-wrap text-slate-600">{entry.note}</p> : null}</div>)}</div>;
}

function AddActionForm({ onAdd, onCancel }: { onAdd: (title: string, date: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(""); const [date, setDate] = useState("");
  return <form className="mt-4 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={(event) => { event.preventDefault(); onAdd(title, date); }}><p className="text-sm font-semibold text-slate-900">Add an open action</p><label className="mt-3 block text-sm font-medium text-slate-700">Action<input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label className="mt-3 block text-sm font-medium text-slate-700">Check-in date<input type="date" className="input mt-2" value={date} onChange={(event) => setDate(event.target.value)} /><span className="mt-2 block text-xs font-normal text-slate-500">Optional. Undated actions remain open without creating warnings.</span></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Add action</button></div></form>;
}

function EditActionForm({ action, onSave, onCancel }: { action: ProjectAction; onSave: (title: string, date: string, note: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(action.title); const [date, setDate] = useState(action.targetDate); const [note, setNote] = useState("");
  return <form className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4" onSubmit={(event) => { event.preventDefault(); onSave(title, date, note); }}><p className="text-sm font-semibold text-sky-950">Edit open action</p><label className="mt-3 block text-sm font-medium text-sky-950">Action<input className="input mt-2 bg-white" value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label className="mt-3 block text-sm font-medium text-sky-950">Check-in date<input type="date" className="input mt-2 bg-white" value={date} onChange={(event) => setDate(event.target.value)} /><span className="mt-2 block text-xs font-normal text-sky-800">Optional. Clearing it keeps the action open without a date.</span></label><label className="mt-3 block text-sm font-medium text-sky-950">Reschedule note<textarea className="input mt-2 min-h-20 resize-y bg-white" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional reason or context for the date change" /></label><p className="mt-3 text-xs leading-5 text-sky-800">Changing or removing the date keeps this action open and records the previous date and optional note.</p><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-sky-900">Cancel</button><button type="submit" className="min-h-10 rounded-xl bg-sky-950 px-4 text-sm font-semibold text-white">Save action</button></div></form>;
}

function CompleteActionForm({ action, hasOtherOpenActions, onCancel, onComplete }: { action: ProjectAction; hasOtherOpenActions: boolean; onCancel: () => void; onComplete: (note: string, resolution: ActionCompletionResolution, nextTitle: string, nextDate: string) => void }) {
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState<ActionCompletionResolution>(hasOtherOpenActions ? "keep-active" : "next-action");
  const [nextTitle, setNextTitle] = useState(""); const [nextDate, setNextDate] = useState("");
  return <form className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" onSubmit={(event) => { event.preventDefault(); onComplete(note, resolution, nextTitle, nextDate); }}><p className="text-sm font-semibold text-emerald-950">Complete: {action.title}</p><label className="mt-3 block text-sm font-medium text-emerald-950">What happened?<textarea className="input mt-2 min-h-24 resize-y bg-white" value={note} onChange={(event) => setNote(event.target.value)} required /></label><label className="mt-3 block text-sm font-medium text-emerald-950">What happens next?<select className="input mt-2 bg-white" value={resolution} onChange={(event) => setResolution(event.target.value as ActionCompletionResolution)}>{hasOtherOpenActions ? <><option value="keep-active">Continue with the other open actions</option><option value="next-action">Add another open action</option></> : <><option value="next-action">Open the next action</option><option value="waiting">Move project to waiting</option><option value="complete-project">Complete the project</option></>}</select></label>{resolution === "next-action" ? <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_11rem]"><label className="block text-sm font-medium text-emerald-950">Next action<input className="input mt-2 bg-white" value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} required /></label><label className="block text-sm font-medium text-emerald-950">Check-in date<input type="date" className="input mt-2 bg-white" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /><span className="mt-2 block text-xs font-normal text-emerald-800">Optional.</span></label></div> : null}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-emerald-900">Cancel</button><button type="submit" className="min-h-10 rounded-xl bg-emerald-900 px-4 text-sm font-semibold text-white">Save completion</button></div></form>;
}

function formatReschedule(previousDate: string, nextDate: string) {
  if (!previousDate && nextDate) return `Date set to ${formatDateOnly(nextDate)}`;
  if (previousDate && !nextDate) return `Date removed (was ${formatDateOnly(previousDate)})`;
  return `Moved from ${formatDateOnly(previousDate)} to ${formatDateOnly(nextDate)}`;
}

export function formatDateOnly(value: string) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" }) : "No date"; }
export function formatTimestamp(value: string) { return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }); }
