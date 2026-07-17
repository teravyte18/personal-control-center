"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  areaLabels,
  getCompletedProjectActions,
  getCurrentProjectAction,
  projectRequiresNextAction,
  type ActionCompletionResolution,
  type AreaId,
  type Item,
  type ItemStatus,
  type ProjectAction,
  usePersonalData,
} from "@/lib/personal-data";

type Filter = "all" | AreaId | "incubating";
type ProjectsTab = "active" | "accomplishments";

const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "work", label: "Work" },
  { id: "education", label: "Education" },
  { id: "personal", label: "Personal" },
  { id: "incubating", label: "Incubating" },
];

const projectStatuses: Array<{ value: ItemStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "in-progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "incubating", label: "Incubating" },
  { value: "archived", label: "Archived" },
];

export default function ProjectsPage() {
  const { items } = usePersonalData();
  const [tab, setTab] = useState<ProjectsTab>("active");
  const [filter, setFilter] = useState<Filter>("all");

  const activeProjects = useMemo(
    () => items.filter((item) => item.kind === "project" && !["completed", "archived"].includes(item.status)),
    [items],
  );
  const accomplishments = useMemo(
    () => items.filter((item) => item.kind === "project" && item.status === "completed"),
    [items],
  );
  const visibleProjects = activeProjects.filter((project) => {
    if (filter === "all") return true;
    if (filter === "incubating") return project.status === "incubating";
    return project.area === filter;
  });

  return (
    <section>
      <div className="max-w-3xl">
        <p className="text-sm text-slate-500">Finite outcomes that move through dated action points</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Projects across your life.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">The overview shows only the current action. Open a project to review its recent timeline, notes, and earlier actions.</p>
      </div>

      <div className="mt-6 flex rounded-2xl bg-slate-200 p-1 sm:w-fit">
        <button type="button" onClick={() => setTab("active")} className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold sm:flex-none ${tab === "active" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
          Active ({activeProjects.length})
        </button>
        <button type="button" onClick={() => setTab("accomplishments")} className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold sm:flex-none ${tab === "accomplishments" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
          Accomplishments ({accomplishments.length})
        </button>
      </div>

      {tab === "active" ? (
        <>
          <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2">
              {filters.map((option) => (
                <button key={option.id} type="button" onClick={() => setFilter(option.id)} className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${filter === option.id ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {activeProjects.length === 0 ? <EmptyProjects /> : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {visibleProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>

          {activeProjects.length > 0 && visibleProjects.length === 0 ? <p className="mt-8 text-sm text-slate-500">No projects match this area yet.</p> : null}
        </>
      ) : (
        <div className="mt-6">
          {accomplishments.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold">No completed projects yet.</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Finished projects will collect here with their action history.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {accomplishments.map((project) => <AccomplishmentCard key={project.id} project={project} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function EmptyProjects() {
  return (
    <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
      <h3 className="text-lg font-semibold">No active projects yet.</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">Capture an idea, then classify it as a project with its first action point.</p>
      <Link href="/inbox" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Open inbox</Link>
    </div>
  );
}

function ProjectCard({ project }: { project: Item }) {
  const {
    updateItem,
    setItemStatus,
    addProjectAction,
    updateProjectAction,
    completeProjectAction,
  } = usePersonalData();
  const [editing, setEditing] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
  const [completingAction, setCompletingAction] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [area, setArea] = useState<AreaId>(project.area);
  const [status, setStatus] = useState<ItemStatus>(project.status);
  const currentAction = getCurrentProjectAction(project);
  const needsAction = projectRequiresNextAction(project) && !currentAction;
  const needsDate = Boolean(currentAction && !currentAction.targetDate);

  function beginEditing() {
    setTitle(project.title);
    setDescription(project.description);
    setArea(project.area);
    setStatus(project.status);
    setEditing(true);
  }

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    updateItem(project.id, { title: trimmedTitle, description: description.trim(), area });
    setItemStatus(project.id, status);
    setEditing(false);
  }

  if (editing) {
    return (
      <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={saveProject}>
          <label className="block text-sm font-medium text-slate-700">
            Project title
            <input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Outcome or context
            <textarea className="input mt-2 min-h-24 resize-y" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does finished look like, or what context matters?" />
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
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Save project</button>
          </div>
        </form>
      </article>
    );
  }

  const statusLabel = projectStatuses.find((option) => option.value === project.status)?.label ?? project.status;

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            <span>{areaLabels[project.area]}</span><span aria-hidden="true">·</span><span>{statusLabel}</span>
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{project.title}</h3>
        </div>
        <button type="button" onClick={beginEditing} className="min-h-10 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700">Edit</button>
      </div>

      {project.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p> : null}

      <div className={`mt-4 rounded-2xl p-4 ${needsAction || needsDate ? "border border-amber-200 bg-amber-50" : "bg-slate-50"}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${needsAction || needsDate ? "text-amber-700" : "text-slate-400"}`}>Current action</p>
        {currentAction ? (
          <>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{currentAction.title}</p>
            <p className={`mt-2 text-xs ${needsDate ? "font-semibold text-amber-800" : "text-slate-500"}`}>
              {currentAction.targetDate ? `Check in ${formatDateOnly(currentAction.targetDate)}` : "Choose a check-in date."}
            </p>
          </>
        ) : (
          <p className={`mt-2 text-sm leading-6 ${needsAction ? "font-medium text-amber-900" : "text-slate-600"}`}>
            {needsAction ? "This project needs a dated action point." : "No current action while this project is paused."}
          </p>
        )}
      </div>

      {currentAction && completingAction ? (
        <CompleteActionForm
          action={currentAction}
          onCancel={() => setCompletingAction(false)}
          onComplete={(note, resolution, nextTitle, nextDate) => {
            completeProjectAction(project.id, currentAction.id, note, resolution, nextTitle, nextDate);
            setCompletingAction(false);
            setShowTimeline(true);
          }}
        />
      ) : null}

      {!currentAction && addingAction ? (
        <AddActionForm
          onCancel={() => setAddingAction(false)}
          onAdd={(actionTitle, targetDate) => {
            addProjectAction(project.id, actionTitle, targetDate);
            setAddingAction(false);
          }}
        />
      ) : null}

      {showTimeline ? <ActionTimeline project={project} updateProjectAction={updateProjectAction} /> : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {currentAction ? (
          <button type="button" onClick={() => setCompletingAction((value) => !value)} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Complete action</button>
        ) : (
          <button type="button" onClick={() => setAddingAction((value) => !value)} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Add action point</button>
        )}
        <button type="button" onClick={() => setShowTimeline((value) => !value)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
          {showTimeline ? "Hide timeline" : "View timeline"}
        </button>
      </div>
    </article>
  );
}

function AddActionForm({ onAdd, onCancel }: { onAdd: (title: string, date: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  return (
    <form className="mt-4 rounded-2xl border border-slate-200 p-4" onSubmit={(event) => { event.preventDefault(); onAdd(title, date); }}>
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
    <form className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" onSubmit={(event) => { event.preventDefault(); onComplete(note, resolution, nextTitle, nextDate); }}>
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

function ActionTimeline({ project, updateProjectAction }: { project: Item; updateProjectAction: ReturnType<typeof usePersonalData>["updateProjectAction"] }) {
  const [showAll, setShowAll] = useState(false);
  const currentAction = getCurrentProjectAction(project);
  const completedActions = getCompletedProjectActions(project);
  const visibleCompleted = showAll ? completedActions : completedActions.slice(0, 3);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">Action timeline</p>
        <span className="text-xs text-slate-400">{project.actions.length} total</span>
      </div>
      <div className="mt-3 space-y-3">
        {currentAction ? <ActionRow projectId={project.id} action={currentAction} label="Current" updateProjectAction={updateProjectAction} /> : null}
        {visibleCompleted.map((action) => <ActionRow key={action.id} projectId={project.id} action={action} label="Completed" updateProjectAction={updateProjectAction} />)}
        {!currentAction && visibleCompleted.length === 0 ? <p className="text-sm text-slate-500">No action points recorded.</p> : null}
      </div>
      {completedActions.length > 3 ? (
        <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-3 min-h-10 text-sm font-semibold text-slate-600">
          {showAll ? "Show recent only" : `View full history (${completedActions.length})`}
        </button>
      ) : null}
    </div>
  );
}

function ActionRow({
  projectId,
  action,
  label,
  updateProjectAction,
}: {
  projectId: string;
  action: ProjectAction;
  label: string;
  updateProjectAction: ReturnType<typeof usePersonalData>["updateProjectAction"];
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(action.title);
  const [date, setDate] = useState(action.targetDate);

  if (editing) {
    return (
      <form className="rounded-xl bg-slate-50 p-3" onSubmit={(event) => { event.preventDefault(); updateProjectAction(projectId, action.id, { title, targetDate: date }); setEditing(false); }}>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <input type="date" className="input mt-2" value={date} onChange={(event) => setDate(event.target.value)} required />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-500">Cancel</button>
          <button type="submit" className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white">Save correction</button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{action.title}</p>
        </div>
        <button type="button" onClick={() => { setTitle(action.title); setDate(action.targetDate); setEditing(true); }} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-slate-500">Edit</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Opened {formatTimestamp(action.openedAt)} · Check-in {action.targetDate ? formatDateOnly(action.targetDate) : "not set"}</p>
      {action.completedAt ? <p className="mt-1 text-xs text-slate-500">Completed {formatTimestamp(action.completedAt)}</p> : null}
      {action.completionNote ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{action.completionNote}</p> : null}
    </div>
  );
}

function AccomplishmentCard({ project }: { project: Item }) {
  const { toggleCompleted, updateProjectAction } = usePersonalData();
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <article className="rounded-[1.75rem] border border-emerald-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Accomplishment</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{project.title}</h3>
      <p className="mt-2 text-sm text-slate-500">Completed {project.completedAt ? formatTimestamp(project.completedAt) : "without a recorded date"} · {project.actions.length} action points</p>
      {showTimeline ? <ActionTimeline project={project} updateProjectAction={updateProjectAction} /> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => toggleCompleted(project.id)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Reopen project</button>
        <button type="button" onClick={() => setShowTimeline((value) => !value)} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">{showTimeline ? "Hide timeline" : "View timeline"}</button>
      </div>
    </article>
  );
}

function formatDateOnly(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}
