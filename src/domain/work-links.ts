export type WorkSource = { sourceType: "task" | "project-action"; sourceItemId: string; sourceActionId?: string };

/** Link to canonical work; URL metadata never mutates the underlying record. */
export function workHref(source: WorkSource, complete = false) {
  if (source.sourceType === "task") return `/tasks?task=${encodeURIComponent(source.sourceItemId)}`;
  const params = new URLSearchParams({ project: source.sourceItemId });
  if (source.sourceActionId) params.set("action", source.sourceActionId);
  if (complete && source.sourceActionId) params.set("complete", "1");
  return `/projects?${params.toString()}`;
}

export function projectedWorkHref(properties: Record<string, string> | undefined) {
  if (!properties?.pccItemId) return undefined;
  if (properties.pccSourceType === "task") return workHref({ sourceType: "task", sourceItemId: properties.pccItemId });
  if (properties.pccSourceType === "project-action" && properties.pccSourceId) {
    return workHref({ sourceType: "project-action", sourceItemId: properties.pccItemId, sourceActionId: properties.pccSourceId });
  }
  return undefined;
}
