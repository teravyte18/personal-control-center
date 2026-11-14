import type { RemSnapshot, RemSendReceipt } from "@/domain/rem-chat";

export type PendingRemIntent = { id: string; text: string };

/** Only canonical presence settles an accepted/uncertain intent; don't erase a newer draft. */
export function reconcileRemIntent(snapshot: RemSnapshot, intent: PendingRemIntent | null, draft: string) {
  if (!intent || !snapshot.messages.some(message => message.submissionId === intent.id)) return { intent, draft };
  return { intent: null, draft: draft === intent.text ? "" : draft };
}

const opaque = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{16,128}$/.test(value);
export function parseRemReceipt(value: unknown, expectedId: string): RemSendReceipt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const receipt = value as Record<string, unknown>;
  if (Object.keys(receipt).length !== 3 || receipt.submissionId !== expectedId || !opaque(receipt.runHandle) || !["accepted", "committed"].includes(String(receipt.custody))) return null;
  return receipt as RemSendReceipt;
}

/** Only known pre-admission rejections release the intent. Transport/unavailable/unknown outcomes retain it. */
export function isDefinitiveRemRejection(error: unknown) {
  return ["invalid_input", "busy", "rate_limited", "stale_view", "not_authenticated", "not_authorized"].includes(String(error));
}
