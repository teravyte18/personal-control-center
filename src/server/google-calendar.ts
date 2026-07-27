import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  buildGoogleCalendarEventBody,
  buildGoogleCalendarProjections,
  type GoogleCalendarEventBody,
  type GoogleCalendarProjection,
  type GoogleCalendarSourceType,
} from "@/domain/google-calendar";
import type { PersonalDataSnapshot } from "@/domain/personal-data-snapshot";
import { getDatabase } from "@/server/database";
import { loadPersonalDataState } from "@/server/personal-data-store";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
const DEFAULT_CALENDAR_NAME = "Personal Control Center";

type GoogleCalendarConnectionRow = {
  user_id: string;
  calendar_id: string;
  encrypted_refresh_token: string;
  connected_at: Date | string;
  updated_at: Date | string;
  last_synced_at: Date | string | null;
  last_error: string | null;
};

type GoogleCalendarEventRow = {
  source_type: GoogleCalendarSourceType;
  source_id: string;
  item_id: string;
  event_id: string;
  content_hash: string;
  synced_at: Date | string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleCalendarResource = {
  id?: string;
  summary?: string;
};

type GoogleEventResource = {
  id?: string;
};

export type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  calendarId: string | null;
  calendarName: string;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  lastError: string;
  projectedEventCount: number;
  syncedEventCount: number;
};

const globalForGoogleCalendar = globalThis as typeof globalThis & {
  pccGoogleCalendarQueues?: Map<string, Promise<void>>;
};

function queues() {
  globalForGoogleCalendar.pccGoogleCalendarQueues ??= new Map();
  return globalForGoogleCalendar.pccGoogleCalendarQueues;
}

function asIso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Google Calendar integration.`);
  return value;
}

function encryptionKey() {
  const encoded = requiredEnvironment("PCC_GOOGLE_TOKEN_ENCRYPTION_KEY");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("PCC_GOOGLE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function googleCalendarRedirectUri() {
  const explicit = process.env.PCC_GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const publicUrl = requiredEnvironment("PCC_PUBLIC_URL");
  return new URL("/api/integrations/google-calendar/callback", publicUrl).toString();
}

export function isGoogleCalendarConfigured() {
  try {
    requiredEnvironment("PCC_GOOGLE_CLIENT_ID");
    requiredEnvironment("PCC_GOOGLE_CLIENT_SECRET");
    googleCalendarRedirectUri();
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function createGoogleAuthorizationUrl(state: string, loginHint?: string) {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", requiredEnvironment("PCC_GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", googleCalendarRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url;
}

function encryptRefreshToken(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptRefreshToken(payload: string) {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Stored Google Calendar credentials are invalid.");
  const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function responseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function googleErrorMessage(value: unknown, fallback: string) {
  if (isRecord(value)) {
    if (typeof value.error_description === "string") return value.error_description;
    if (typeof value.error === "string") return value.error;
    if (isRecord(value.error) && typeof value.error.message === "string") return value.error.message;
  }
  return fallback;
}

async function exchangeToken(parameters: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters,
    cache: "no-store",
  });
  const body = await responseJson(response) as GoogleTokenResponse | null;
  if (!response.ok) {
    throw new Error(googleErrorMessage(body, "Google authorization failed."));
  }
  if (!body?.access_token) throw new Error("Google did not return an access token.");
  return body;
}

async function exchangeAuthorizationCode(code: string) {
  return exchangeToken(new URLSearchParams({
    code,
    client_id: requiredEnvironment("PCC_GOOGLE_CLIENT_ID"),
    client_secret: requiredEnvironment("PCC_GOOGLE_CLIENT_SECRET"),
    redirect_uri: googleCalendarRedirectUri(),
    grant_type: "authorization_code",
  }));
}

async function refreshAccessToken(refreshToken: string) {
  const body = await exchangeToken(new URLSearchParams({
    refresh_token: refreshToken,
    client_id: requiredEnvironment("PCC_GOOGLE_CLIENT_ID"),
    client_secret: requiredEnvironment("PCC_GOOGLE_CLIENT_SECRET"),
    grant_type: "refresh_token",
  }));
  return body.access_token as string;
}

class GoogleApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "GoogleApiError";
  }
}

async function googleRequest<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await responseJson(response);
  if (!response.ok) {
    throw new GoogleApiError(response.status, googleErrorMessage(body, `Google Calendar request failed (${response.status}).`));
  }
  return body as T;
}

async function createCalendar(accessToken: string) {
  const calendar = await googleRequest<GoogleCalendarResource>(accessToken, "/calendars", {
    method: "POST",
    body: JSON.stringify({
      summary: DEFAULT_CALENDAR_NAME,
      description: "All-day dates projected from Personal Control Center.",
    }),
  });
  if (!calendar?.id) throw new Error("Google Calendar was created without an identifier.");
  return calendar.id;
}

async function loadConnection(userId: string) {
  const sql = getDatabase();
  const [row] = await sql<GoogleCalendarConnectionRow[]>`
    select user_id, calendar_id, encrypted_refresh_token, connected_at, updated_at, last_synced_at, last_error
    from google_calendar_connections
    where user_id = ${userId}
  `;
  return row ?? null;
}

async function saveConnection(userId: string, calendarId: string, refreshToken: string) {
  const sql = getDatabase();
  const [row] = await sql<GoogleCalendarConnectionRow[]>`
    insert into google_calendar_connections (user_id, calendar_id, encrypted_refresh_token)
    values (${userId}, ${calendarId}, ${encryptRefreshToken(refreshToken)})
    on conflict (user_id) do update
      set calendar_id = excluded.calendar_id,
          encrypted_refresh_token = excluded.encrypted_refresh_token,
          updated_at = now(),
          last_error = null
    returning user_id, calendar_id, encrypted_refresh_token, connected_at, updated_at, last_synced_at, last_error
  `;
  if (!row) throw new Error("Google Calendar connection could not be stored.");
  return row;
}

async function loadMappings(userId: string) {
  const sql = getDatabase();
  return sql<GoogleCalendarEventRow[]>`
    select source_type, source_id, item_id, event_id, content_hash, synced_at
    from google_calendar_events
    where user_id = ${userId}
  `;
}

function mappingKey(sourceType: GoogleCalendarSourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function projectionHash(body: GoogleCalendarEventBody) {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

async function insertEvent(accessToken: string, calendarId: string, body: GoogleCalendarEventBody) {
  const event = await googleRequest<GoogleEventResource>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!event?.id) throw new Error("Google Calendar event was created without an identifier.");
  return event.id;
}

async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  body: GoogleCalendarEventBody,
) {
  await googleRequest<GoogleEventResource>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
  try {
    await googleRequest<null>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
      { method: "DELETE" },
    );
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === 404) return;
    throw error;
  }
}

async function upsertMapping(
  userId: string,
  projection: GoogleCalendarProjection,
  eventId: string,
  contentHash: string,
) {
  const sql = getDatabase();
  await sql`
    insert into google_calendar_events (user_id, source_type, source_id, item_id, event_id, content_hash)
    values (${userId}, ${projection.sourceType}, ${projection.sourceId}, ${projection.itemId}, ${eventId}, ${contentHash})
    on conflict (user_id, source_type, source_id) do update
      set item_id = excluded.item_id,
          event_id = excluded.event_id,
          content_hash = excluded.content_hash,
          synced_at = now()
  `;
}

async function deleteMapping(userId: string, sourceType: GoogleCalendarSourceType, sourceId: string) {
  const sql = getDatabase();
  await sql`
    delete from google_calendar_events
    where user_id = ${userId}
      and source_type = ${sourceType}
      and source_id = ${sourceId}
  `;
}

async function recordSyncSuccess(userId: string) {
  const sql = getDatabase();
  await sql`
    update google_calendar_connections
    set last_synced_at = now(), last_error = null, updated_at = now()
    where user_id = ${userId}
  `;
}

async function recordSyncFailure(userId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Google Calendar synchronisation failed.";
  const sql = getDatabase();
  await sql`
    update google_calendar_connections
    set last_error = ${message.slice(0, 2000)}, updated_at = now()
    where user_id = ${userId}
  `;
}

async function reconcileNow(userId: string, snapshot: PersonalDataSnapshot) {
  const connection = await loadConnection(userId);
  if (!connection) return;

  try {
    const accessToken = await refreshAccessToken(decryptRefreshToken(connection.encrypted_refresh_token));
    const projections = buildGoogleCalendarProjections(snapshot);
    const desired = new Map(projections.map((projection) => [mappingKey(projection.sourceType, projection.sourceId), projection]));
    const mappings = await loadMappings(userId);
    const existing = new Map(mappings.map((mapping) => [mappingKey(mapping.source_type, mapping.source_id), mapping]));

    for (const projection of projections) {
      const key = mappingKey(projection.sourceType, projection.sourceId);
      const mapping = existing.get(key);
      const body = buildGoogleCalendarEventBody(projection);
      const contentHash = projectionHash(body);
      if (mapping?.content_hash === contentHash) continue;

      let eventId = mapping?.event_id;
      if (eventId) {
        try {
          await updateEvent(accessToken, connection.calendar_id, eventId, body);
        } catch (error) {
          if (!(error instanceof GoogleApiError) || error.status !== 404) throw error;
          eventId = await insertEvent(accessToken, connection.calendar_id, body);
        }
      } else {
        eventId = await insertEvent(accessToken, connection.calendar_id, body);
      }
      await upsertMapping(userId, projection, eventId, contentHash);
    }

    for (const mapping of mappings) {
      if (desired.has(mappingKey(mapping.source_type, mapping.source_id))) continue;
      await deleteEvent(accessToken, connection.calendar_id, mapping.event_id);
      await deleteMapping(userId, mapping.source_type, mapping.source_id);
    }

    await recordSyncSuccess(userId);
  } catch (error) {
    await recordSyncFailure(userId, error);
    throw error;
  }
}

export async function reconcileGoogleCalendar(userId: string, snapshot: PersonalDataSnapshot) {
  const userQueues = queues();
  const previous = userQueues.get(userId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(() => reconcileNow(userId, snapshot));
  userQueues.set(userId, current);
  try {
    await current;
  } finally {
    if (userQueues.get(userId) === current) userQueues.delete(userId);
  }
}

export async function connectGoogleCalendar(userId: string, code: string) {
  const tokens = await exchangeAuthorizationCode(code);
  const existing = await loadConnection(userId);
  const previousRefreshToken = existing ? decryptRefreshToken(existing.encrypted_refresh_token) : "";
  const refreshToken = tokens.refresh_token ?? previousRefreshToken;
  if (!refreshToken) {
    throw new Error("Google did not return offline access. Revoke the app in Google Account settings and connect again.");
  }
  const calendarId = existing?.calendar_id ?? await createCalendar(tokens.access_token as string);
  await saveConnection(userId, calendarId, refreshToken);
  const state = await loadPersonalDataState(userId);
  await reconcileGoogleCalendar(userId, state.snapshot);
}

export async function syncGoogleCalendar(userId: string) {
  const state = await loadPersonalDataState(userId);
  await reconcileGoogleCalendar(userId, state.snapshot);
}

export async function getGoogleCalendarStatus(userId: string): Promise<GoogleCalendarStatus> {
  const configured = isGoogleCalendarConfigured();
  const connection = await loadConnection(userId);
  if (!connection) {
    return {
      configured,
      connected: false,
      calendarId: null,
      calendarName: DEFAULT_CALENDAR_NAME,
      connectedAt: null,
      lastSyncedAt: null,
      lastError: "",
      projectedEventCount: 0,
      syncedEventCount: 0,
    };
  }

  const [state, mappings] = await Promise.all([loadPersonalDataState(userId), loadMappings(userId)]);
  return {
    configured,
    connected: true,
    calendarId: connection.calendar_id,
    calendarName: DEFAULT_CALENDAR_NAME,
    connectedAt: asIso(connection.connected_at),
    lastSyncedAt: asIso(connection.last_synced_at),
    lastError: connection.last_error ?? "",
    projectedEventCount: buildGoogleCalendarProjections(state.snapshot).length,
    syncedEventCount: mappings.length,
  };
}

export async function disconnectGoogleCalendar(userId: string) {
  const connection = await loadConnection(userId);
  if (!connection) return { warning: "" };

  let warning = "";
  try {
    const accessToken = await refreshAccessToken(decryptRefreshToken(connection.encrypted_refresh_token));
    await googleRequest<null>(accessToken, `/calendars/${encodeURIComponent(connection.calendar_id)}`, {
      method: "DELETE",
    });
  } catch (error) {
    warning = error instanceof Error
      ? `The local connection was removed, but the Google calendar may need to be deleted manually: ${error.message}`
      : "The local connection was removed, but the Google calendar may need to be deleted manually.";
  }

  const sql = getDatabase();
  await sql`delete from google_calendar_connections where user_id = ${userId}`;
  return { warning };
}
