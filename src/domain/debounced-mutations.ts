import type { PersonalDataMutation } from "@/domain/personal-data-snapshot";

export type DebouncedPersonalDataMutation = Extract<
  PersonalDataMutation,
  { type: "update-item" } | { type: "update-review-draft" }
>;

export function debouncedMutationKey(mutation: DebouncedPersonalDataMutation) {
  return mutation.type === "update-item"
    ? `item:${mutation.id}`
    : `review:${String(mutation.field)}`;
}

export function mergeDebouncedMutation(
  current: DebouncedPersonalDataMutation | undefined,
  next: DebouncedPersonalDataMutation,
): DebouncedPersonalDataMutation {
  if (!current || current.type !== next.type) return next;

  if (current.type === "update-item" && next.type === "update-item" && current.id === next.id) {
    return {
      ...next,
      updates: { ...current.updates, ...next.updates },
    };
  }

  if (
    current.type === "update-review-draft"
    && next.type === "update-review-draft"
    && current.field === next.field
  ) {
    return next;
  }

  return next;
}
