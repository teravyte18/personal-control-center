"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ProjectDetail, formatDateOnly } from "@/components/project-detail";
import { isProjectActionPastCheckIn } from "@/domain/project-dates";
import { focusMatches, getRhythmPeriod } from "@/domain/weekly-rhythm";
import { areaLabels, getOpenProjectActions, type AreaId, usePersonalData, useRhythmData } from "@/lib/personal-data";
import { useSourceRecord } from "@/hooks/use-source-record";

type View = "active" | "waiting" | "all";
type AreaFilter = "all" | AreaId | "incubating";

export default function ProjectsPage() {
  const { items, addItem, addProjectAction } = usePersonalData();
  const { weeklyFocuses } = useRhythmData();
  const period = getRhythmPeriod();
  const [view, setView] = useState<View>("active");
  const [area, setArea] = useState<AreaFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const sourceId = useSourceRecord("project");
  const [detailOverride, setDetailId] = useState<string | null>(null);
  const detailId = detailOverride ?? sourceId;
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newArea, setNewArea] = useState<AreaId>("uncategorized");
  const [action, setAction] = useState("");
  const [date, setDate] = useState("");
  const projects = useMemo(() => items.filter(item => item.kind === "project" && !["completed", "archived"].includes(item.status)), [items]);
  const visible = projects.filter(project => {
    if (view === "active" && project.status === "waiting") return false;
    if (view === "waiting" && project.status !== "waiting") return false;
    if (area === "incubating" ? project.status !== "incubating" : area !== "all" && project.area !== area) return false;
    return !query.trim() || `${project.title} ${project.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  });
  const selected = visible.find(project => project.id === selectedId) ?? visible[0];
  const detail = projects.find(project => project.id === detailId);
  const actions = selected ? getOpenProjectActions(selected) : [];

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    const project = addItem(title, { kind: "project", description, status: "waiting", area: newArea });
    if (!project) return;
    if (action.trim()) addProjectAction(project.id, action, date);
    setCreating(false); setTitle(""); setDescription(""); setAction(""); setDate("");
    setView(action.trim() ? "active" : "waiting"); setArea("all"); setQuery(""); setSelectedId(project.id); setDetailId(project.id);
  }

  const areaSelect = <label><span className="sr-only">Project view and area</span><select className="input" value={area} onChange={event => setArea(event.target.value as AreaFilter)}><option value="all">All areas</option>{Object.entries(areaLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}<option value="incubating">Incubating</option></select></label>;
  const actionMeta = (projectId: string, actionId: string, targetDate: string) => [
    targetDate ? `${targetDate < localDateOnly() ? "Overdue since" : "Check-in"} ${formatDateOnly(targetDate)}` : "No check-in date",
    weeklyFocuses.some(focus => focus.weekStart === period.start && focusMatches(focus, "project-action", projectId, actionId)) ? "Selected for Week" : "",
  ].filter(Boolean).join(" · ");

  return (
    <section>
      <div className="pcc-heading"><h2>Projects</h2><button className="pcc-control" onClick={() => setCreating(value => !value)}>{creating ? "Cancel" : "New"}</button></div>
      {creating ? <form className="pcc-project-create" onSubmit={createProject}>
        <h3 className="pcc-section-title">New project</h3>
        <label>Title<input className="input" value={title} onChange={event => setTitle(event.target.value)} required autoFocus /></label>
        <label>Outcome<textarea className="input" value={description} onChange={event => setDescription(event.target.value)} /></label>
        <label>Area<select className="input" value={newArea} onChange={event => setNewArea(event.target.value as AreaId)}>{Object.entries(areaLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>First action (optional)<input className="input" value={action} onChange={event => setAction(event.target.value)} /></label>
        <label>Check-in date (optional)<input type="date" className="input" value={date} onChange={event => setDate(event.target.value)} /></label>
        <button className="pcc-control theme-home-button" type="submit">Create project</button>
      </form> : null}
      <div className="pcc-view-controls">
        <button className={`pcc-control ${view === "active" ? "is-selected" : ""}`} aria-pressed={view === "active"} onClick={() => setView("active")}>Active · {projects.filter(project => project.status !== "waiting").length}</button>
        <button className={`pcc-control ${view === "waiting" ? "is-selected" : ""}`} aria-pressed={view === "waiting"} onClick={() => setView("waiting")}>Waiting · {projects.filter(project => project.status === "waiting").length}</button>
        <Link className="pcc-control" href="/spaces/accomplishments">Completed</Link>
      </div>
      <div className="pcc-project-search">
        <label><span className="sr-only">Find projects</span><input className="input" type="search" placeholder="Find projects" value={query} onChange={event => setQuery(event.target.value)} /></label>{areaSelect}
      </div>
      <div className="pcc-focus-project">
        <div className="pcc-project-selector"><label><span className="sr-only">Switch project</span><select className="input" value={selected?.id ?? ""} onChange={event => setSelectedId(event.target.value)}>{visible.length ? visible.map(project => <option key={project.id} value={project.id}>{project.title} · Switch project</option>) : <option value="">No projects</option>}</select></label><details><summary className="pcc-control">Views</summary><div className="pcc-project-views">{areaSelect}<label><span className="sr-only">Search projects</span><input className="input" placeholder="Find projects" value={query} onChange={event => setQuery(event.target.value)} /></label></div></details></div>
        {selected ? <>
          <article className="pcc-focus-action">
            <div><h3>{selected.title}</h3><p className="pcc-record-meta">{areaLabels[selected.area]}</p></div>
            {selected.description ? <p className="pcc-focus-description">{selected.description}</p> : null}
            {actions[0] ? <div className="pcc-project-current-action"><p className="pcc-record-meta">Next action</p><h4 className="pcc-section-title">{actions[0].title}</h4><p className={`pcc-record-meta ${isProjectActionPastCheckIn(actions[0]) ? "pcc-overdue" : ""}`}>{actionMeta(selected.id, actions[0].id, actions[0].targetDate)}</p>{actions[0].details ? <p className="pcc-focus-description">{actions[0].details}</p> : null}</div> : null}
            <button className="pcc-control theme-home-button" onClick={() => setDetailId(selected.id)}>{actions.length ? "Open action" : "Open project"}</button>
          </article>
          {actions.length > 1 ? <div className="pcc-panel mt-4"><h3 className="pcc-section-title">Other open actions</h3>{actions.slice(1).map(entry => <button key={entry.id} className="pcc-record pcc-action-row w-full" onClick={() => setDetailId(selected.id)}><span className="pcc-record-title">{entry.title}</span><p className={`pcc-record-meta ${isProjectActionPastCheckIn(entry) ? "pcc-overdue" : ""}`}>{actionMeta(selected.id,entry.id,entry.targetDate)}</p></button>)}</div> : null}
          <details className="mt-4"><summary className="pcc-control w-full">All {view} projects · {visible.length}</summary>{visible.map(project => <button key={project.id} className="pcc-record w-full" onClick={() => setSelectedId(project.id)}><span className="pcc-record-title">{project.title}</span><p className="pcc-record-meta">{getOpenProjectActions(project).length} open actions</p></button>)}</details>
        </> : <p className="pcc-empty">No projects match this view. Change the view or create a project.</p>}
      </div>
      <div className="pcc-atlas-projects">
        {visible.map(project => <article key={project.id} className="pcc-project-ownership">
          <div><h3 className="pcc-section-title">{project.title}</h3><p className="pcc-record-meta">{areaLabels[project.area]} · {project.description || `${getOpenProjectActions(project).length} open actions`}</p><button className="pcc-control mt-2" onClick={() => setDetailId(project.id)}>Open project</button></div>
          <div className="pcc-independent-actions">{getOpenProjectActions(project).map(entry => <div key={entry.id} className="pcc-ownership-branch"><span aria-hidden="true" /><button className="pcc-record" onClick={() => setDetailId(project.id)}><p className="pcc-record-title">{entry.title}</p><p className={`pcc-record-meta ${isProjectActionPastCheckIn(entry) ? "text-rose-700" : ""}`}>{actionMeta(project.id,entry.id,entry.targetDate)}</p></button></div>)}{!getOpenProjectActions(project).length ? <p className="pcc-record pcc-record-meta">Waiting · No open actions</p> : null}</div>
        </article>)}
        {!visible.length ? <p className="pcc-empty">No projects match this view. Change the view or create a project.</p> : null}
        <button className="pcc-control mt-4" aria-pressed={view === "all"} onClick={() => setView("all")}>All open projects</button>
      </div>
      {detail ? <ProjectDetail project={detail} onClose={() => setDetailId("")} /> : null}
    </section>
  );
}

function localDateOnly() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
