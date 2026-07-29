import type { Item } from "./personal-data";

export function getThoughts(items: readonly Item[]) {
  return items
    .filter((item) => item.kind === "thought" && item.status !== "archived")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
