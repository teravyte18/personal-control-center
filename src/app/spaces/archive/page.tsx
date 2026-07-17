"use client";

import { useMemo, useState } from "react";
import { ExpandButton, ProjectDetail, formatTimestamp } from "@/components/project-detail";
import { areaLabels, type Item, usePersonalData } from "@/lib/personal-data";

const statusLabels: Record<string, string> = {
  inbox: "Inbox",
  active: "Active",
  "in-progress": "In progress",
  waiting: "Waiting",
  incubating: "Incubating",
  completed: "Accomplishment",
};

export default function ArchivePage() {
  const { items } = usePersonalData();
  const projects = useMemo(
    () => items
      .filter((item) => item.kind === "project" && item.status === "archived")
      .sort((left, right) => (right.archivedAt ?? right.updatedAt).localeCompare(left.archivedAt ?? left.updatedAt)),
    [items],
  );

  return (
    <section className="mx-auto max-w-4xl">
      <div className="max-w-2xl">
        <p className="text-sm text-slate-500">Recoverable project storage</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Archive.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Archived projects leave active views without losing their action timeline, notes, or previous status.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="mt-7 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">Nothing archived.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Projects you archive will remain recoverable here.</p>
        </div>
      ) : (
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {projects.map((project) => <ArchivedProjectCard key={project.id} project={project} />)}
        </div>
      )}
    </section>
  );
}

function ArchivedProjectCard({ project }: { project: Item }) {
  const [expanded, setExpanded] = useState(false);
  const previousStatus = project.statusBeforeArchive
    ? statusLabels[project.statusBeforeArchive] ?? project.statusBeforeArchive
    : "Active";

  return (
    <>
      <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              <span>{areaLabels[project.area]}</span>
              <span aria-hidden="true">·</span>
              <span>Returns to {previousStatus}</span>
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{project.title}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Archived {project.archivedAt ? formatTimestamp(project.archivedAt) : formatTimestamp(project.updatedAt)}
            </p>
          </div>
          <ExpandButton label={`Open archived ${project.title}`} onClick={() => setExpanded(true)} />
        </div>
      </article>

      {expanded ? <ProjectDetail project={project} onClose={() => setExpanded(false)} archived /> : null}
    </>
  );
}
