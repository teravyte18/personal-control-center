import type { Item } from "./personal-data";

export const NOTE_ORDER_METADATA_TITLE = "__pcc_note_order_v1__";
const BOOK_DESCRIPTION_PREFIX = "__pcc_book_v1__\n";

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

export function getNoteOrderMetadata(items: readonly Item[]) {
  return items.find((item) => (
    item.title === NOTE_ORDER_METADATA_TITLE
    && item.kind === "unclassified"
    && item.status === "archived"
  ));
}

export function parseNoteOrder(items: readonly Item[]) {
  const metadata = getNoteOrderMetadata(items);
  if (!metadata) return [];

  try {
    const value: unknown = JSON.parse(metadata.description);
    if (!Array.isArray(value)) return [];
    const ids: string[] = [];
    for (const candidate of value) {
      if (typeof candidate !== "string" || ids.includes(candidate)) continue;
      ids.push(candidate);
    }
    return ids;
  } catch {
    return [];
  }
}

export function serializeNoteOrder(notes: readonly Pick<Item, "id">[]) {
  return JSON.stringify(notes.map((note) => note.id));
}

export function getNotes(items: readonly Item[]) {
  const order = parseNoteOrder(items);
  const orderIndexes = new Map(order.map((id, index) => [id, index]));

  return items
    .filter((item) => (
      item.kind === "note"
      && item.status === "active"
      && !item.description.startsWith(BOOK_DESCRIPTION_PREFIX)
    ))
    .sort((left, right) => {
      const leftIndex = orderIndexes.get(left.id);
      const rightIndex = orderIndexes.get(right.id);
      const leftOrdered = leftIndex !== undefined;
      const rightOrdered = rightIndex !== undefined;

      if (leftOrdered && rightOrdered) return leftIndex - rightIndex;
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
