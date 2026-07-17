"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  areaLabels,
  projectRequiresNextAction,
  type AreaId,
  type Item,
  type ItemStatus,
  usePersonalData,
} from "@/lib/personal-data";

type Filter = "all" | AreaId | "incubating";

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
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function ProjectsPage() {
  const { items, updateItem, setItemStatus, toggleCompleted } = usePersonalData();
  const [filter, setFilter] = useState<Filter>("all");

  const projects = useMemo(
    () => items.filter((item) => item.kind === "project" && item.status !== "archived"),
    [items],
  );
  const visibleProjects = projects.filter((project) => {
    if (filter === "all") return true;
    if (filter === "incubating") return project.status === "incubating";
    return project.area === filter;
  });

  return (
    <section>
      <div className="max-w-3xl">
        <p className="text-sm text-slate-500">Finite outcomes that need more than one action</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Projects across your life.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">Active projects should make the next physical action clear. Waiting and incubating projects can intentionally pause without one.</p>
      </div>

      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {filters.map((option) => (
            <button key={option.id} type="button" onClick={() => setFilter(option.id)} className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${filter === option.id ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">No projects yet.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Capture an idea, then classify it as a project from the inbox.</p>
          <Link href="/inbox" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Open inbox</Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {visibleProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            updateItem={updateItem}
            setItemStatus={setItemStatus}
            toggleCompleted={toggleCompleted}
          />
        ))}
      </div>

      {projects.length > 0 && visibleProjects.length === 0 ? <p className="mt-8 text-sm text-slate-500">No projects match this area yet.</p> : null}
    </section>
  );
}

function ProjectCard({
  project,
  updateItem,
  setItemStatus,
  toggleCompleted,
}: {
  project: Item;
  updateItem: ReturnType<typeof usePersonalData>["updateItem"];
  setItemStatus: ReturnType<typeof usePersonalData>["setItemStatus"];
  toggleCompleted: ReturnType<typeof usePersonalData>["toggleCompleted"];
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [nextAction, setNextAction] = useState(project.nextAction);
  const [area, setArea] = useState<AreaId>(project.area);
  const [status, setStatus] = useState<ItemStatus>(project.status);
  const needsNextAction = projectRequiresNextAction(project) && !project.nextAction.trim();

  function beginEditing() {
    setTitle(project.title);
    setDescription(project.description);
    setNextAction(project.nextAction);
    setArea(project.area);
    setStatus(project.status);
    setEditing(true);
  }

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    updateItem(project.id, {
      title: trimmedTitle,
      description: description.trim(),
      nextAction: nextAction.trim(),
      area,
    });
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
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Next action
            <input className="input mt-2" value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="One concrete action you can take next" />
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
            <span>{areaLabels[project.area]}</span>
            <span aria-hidden="true">·</span>
            <span>{statusLabel}</span>
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{project.title}</h3>
        </div>
        <button type="button" onClick={() => toggleCompleted(project.id)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${project.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"}`} aria-label={project.status === "completed" ? `Reopen ${project.title}` : `Complete ${project.title}`}>
          ✓
        </button>
      </div>

      {project.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p> : <p className="mt-3 text-sm italic text-slate-400">No outcome or context recorded.</p>}

      <div className={`mt-4 rounded-2xl p-4 ${needsNextAction ? "border border-amber-200 bg-amber-50" : "bg-slate-50"}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${needsNextAction ? "text-amber-700" : "text-slate-400"}`}>Next action</p>
        <p className={`mt-2 text-sm leading-6 ${needsNextAction ? "font-medium text-amber-900" : "text-slate-700"}`}>
          {project.nextAction || (needsNextAction ? "This active project needs a concrete next action." : "No current next action required.")}
        </p>
      </div>

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={beginEditing} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Edit project</button>
      </div>
    </article>
  );
}
