"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExpandButton, ProjectDetail, formatDateOnly } from "@/components/project-detail";
import {
  areaLabels,
  getCurrentProjectAction,
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
  { value: "archived", label: "Archived" },
];

export default function ProjectsPage() {
  const { items } = usePersonalData();
  const [filter, setFilter] = useState<Filter>("all");

  const activeProjects = useMemo(
    () => items.filter((item) => item.kind === "project" && !["completed", "archived"].includes(item.status)),
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
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Cards stay focused on what happens next. Expand one project to see its timeline and record progress.
        </p>
      </div>

      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${
                filter === option.id
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {activeProjects.length === 0 ? <EmptyProjects /> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {visibleProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
      </div>

      {activeProjects.length > 0 && visibleProjects.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No projects match this area yet.</p>
      ) : null}
    </section>
  );
}

function EmptyProjects() {
  return (
    <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
      <h3 className="text-lg font-semibold">No active projects yet.</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Capture an idea, then classify it as a project with its first action point.
      </p>
      <Link
        href="/inbox"
        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
      >
        Open inbox
      </Link>
    </div>
  );
}

function ProjectCard({ project }: { project: Item }) {
  const [expanded, setExpanded] = useState(false);
  const currentAction = getCurrentProjectAction(project);
  const needsAction = projectRequiresNextAction(project) && !currentAction;
  const needsDate = Boolean(currentAction && !currentAction.targetDate);
  const statusLabel = projectStatuses.find((option) => option.value === project.status)?.label ?? project.status;

  return (
    <>
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
          <ExpandButton label={`Open ${project.title}`} onClick={() => setExpanded(true)} />
        </div>

        <div className={`mt-4 rounded-2xl p-4 ${needsAction || needsDate ? "border border-amber-200 bg-amber-50" : "bg-slate-50"}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${needsAction || needsDate ? "text-amber-700" : "text-slate-400"}`}>
            Current action
          </p>
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
      </article>

      {expanded ? <ProjectDetail project={project} onClose={() => setExpanded(false)} /> : null}
    </>
  );
}
