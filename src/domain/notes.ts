import type { Item } from "./personal-data";

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
    .sort((left, right) => {
      const leftOrdered = typeof left.noteOrder === "number";
      const rightOrdered = typeof right.noteOrder === "number";

      if (leftOrdered && rightOrdered) {
        const byOrder = (left.noteOrder ?? 0) - (right.noteOrder ?? 0);
        if (byOrder) return byOrder;
      }
      if (leftOrdered !== rightOrdered) return leftOrdered ? 1 : -1;

      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
}

export function reorderNotes(notes: readonly Item[], draggedId: string, targetId: string) {
  const fromIndex = notes.findIndex((note) => note.id === draggedId);
  const toIndex = notes.findIndex((note) => note.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [...notes];

  const reordered = [...notes];
  const [dragged] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, dragged);
  return reordered;
}
