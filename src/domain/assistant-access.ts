export const assistantDomains = ["library", "projects", "tasks", "rhythm", "reviews", "notes", "thoughts"] as const;
export type AssistantDomain = typeof assistantDomains[number];
export const planningDomains: AssistantDomain[] = ["projects", "tasks", "rhythm"];

export class AssistantInputError extends Error {}
export class AssistantAccessError extends Error {}
export class AssistantConflictError extends Error {}

export function recordInput(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !keys.includes(key))) {
    throw new AssistantInputError("Unsupported input fields.");
  }
  return value as Record<string, unknown>;
}

export function parseAssistantDomains(value: unknown): AssistantDomain[] {
  if (!Array.isArray(value) || !value.length || value.length > 7
    || value.some((name) => !assistantDomains.includes(name as AssistantDomain))) {
    throw new AssistantInputError("Select supported assistant domains.");
  }
  const domains = [...new Set(value)] as AssistantDomain[];
  // Rhythm includes references to task/project titles. Require those grants too.
  if (domains.includes("rhythm") && planningDomains.some((name) => !domains.includes(name))) {
    throw new AssistantInputError("Weekly Rhythm also requires Tasks and Projects.");
  }
  return domains;
}

export function requireAssistantDomains(granted: readonly AssistantDomain[], requested: readonly AssistantDomain[]) {
  if (requested.some((name) => !granted.includes(name))) throw new AssistantAccessError("Domain access is not granted.");
}

export function inputText(value: unknown, max: number, required = true) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new AssistantInputError("Invalid text input.");
  }
  return value.trim();
}

export function inputInteger(value: unknown, fallback: number, max: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new AssistantInputError("Invalid numeric limit.");
  }
  return value;
}

export function requireSameOrigin(request: Request, publicUrl?: string) {
  const origin = request.headers.get("origin");
  const expected = new URL(publicUrl || request.url).origin;
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AssistantAccessError("A same-origin request is required.");
  }
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    throw new AssistantInputError("JSON is required.");
  }
}

export async function readAssistantJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AssistantInputError("JSON is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new AssistantInputError("Request is too large."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    if (error instanceof AssistantInputError) throw error;
    throw new AssistantInputError("Invalid JSON.");
  } finally { reader.releaseLock(); }
}
