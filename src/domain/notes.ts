import type { Item } from "@/domain/personal-data";

export type ParsedNoteContent = {
  title: string;
  description: string;
};

export function parseNoteContent(value: string): ParsedNoteContent | null {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return null;

  const [firstLine, ...remainingLines] = normalized.split("\n");
  const title = firstLine.trim();
  if (!title) return null;

  return {
    title,
    description: remainingLines.join("\n").trimEnd(),
  };
}

export function noteContent(note: Pick<Item, "title" | "description">) {
  return note.description ? `${note.title}\n${note.description}` : note.title;
}

export function getNotes(items: readonly Item[]) {
  return items
    .filter((item) => item.kind === "note" && item.status === "active")
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}
