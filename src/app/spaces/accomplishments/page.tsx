"use client";

import { useMemo, useState } from "react";
import { ExpandButton, ProjectDetail, formatTimestamp } from "@/components/project-detail";
import { type Item, usePersonalData } from "@/lib/personal-data";

export default function AccomplishmentsPage() {
  const { items } = usePersonalData();
  const projects = useMemo(
    () => items.filter((item) => item.kind === "project" && item.status === "completed"),
    [items],
  );

  return (
    <section className="mx-auto max-w-4xl">
      <div className="max-w-2xl">
        <p className="text-sm text-slate-500">Project history</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Accomplishments.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">Completed projects keep their action timelines, completion notes, and the option to be reopened.</p>
      </div>

      {projects.length === 0 ? (
        <div className="mt-7 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">No completed projects yet.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Finished projects will collect here with their full action history.</p>
        </div>
      ) : (
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {projects.map((project) => <AccomplishmentCard key={project.id} project={project} />)}
        </div>
      )}
    </section>
  );
}

function AccomplishmentCard({ project }: { project: Item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <article className="rounded-[1.75rem] border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Accomplishment</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{project.title}</h3>
            <p className="mt-2 text-sm text-slate-500">Completed {project.completedAt ? formatTimestamp(project.completedAt) : "without a recorded date"}</p>
          </div>
          <ExpandButton label={`Open ${project.title}`} onClick={() => setExpanded(true)} />
        </div>
      </article>

      {expanded ? <ProjectDetail project={project} onClose={() => setExpanded(false)} accomplishment /> : null}
    </>
  );
}
