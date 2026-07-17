"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { areaLabels, AreaId, ItemStatus, usePersonalData } from "@/lib/personal-data";

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
  const { items, setItemStatus, toggleCompleted } = usePersonalData();
  const [filter, setFilter] = useState<Filter>("all");

  const projects = useMemo(() => items.filter((item) => item.kind === "project" && item.status !== "archived"), [items]);
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
        <p className="mt-3 text-sm leading-6 text-slate-500">Work, Education, and Personal are areas—not separate apps. A project can move between them without changing how it works.</p>
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
          <article key={project.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{areaLabels[project.area]}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{project.title}</h3>
              </div>
              <button type="button" onClick={() => toggleCompleted(project.id)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${project.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"}`} aria-label={project.status === "completed" ? `Reopen ${project.title}` : `Complete ${project.title}`}>
                ✓
              </button>
            </div>

            {project.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p> : <p className="mt-3 text-sm italic text-slate-400">No project outcome or notes yet.</p>}

            <label className="mt-5 block text-sm font-medium text-slate-600">
              Status
              <select className="input mt-2" value={project.status} onChange={(event) => setItemStatus(project.id, event.target.value as ItemStatus)}>
                {projectStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Next action</p>
              <p className="mt-2 text-sm text-slate-500">Next actions will be added in the following project slice.</p>
            </div>
          </article>
        ))}
      </div>

      {projects.length > 0 && visibleProjects.length === 0 ? <p className="mt-8 text-sm text-slate-500">No projects match this area yet.</p> : null}
    </section>
  );
}
