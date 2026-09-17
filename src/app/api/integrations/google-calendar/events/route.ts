import {
  createAgendaEvent,
  deleteAgendaEvent,
  getAgendaEvents,
  updateAgendaEvent,
  type AgendaEventDraft,
} from "@/server/google-calendar";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string, status = 503) {
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  const message = error instanceof Error ? error.message : fallback;
  const clientError = [
    "required",
    "invalid",
    "too long",
    "Only standalone",
    "not connected",
  ].some((fragment) => message.includes(fragment));
  return Response.json({ error: message }, {
    status: clientError ? 400 : status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function draftFromRequest(request: Request) {
  const body = await request.json() as Partial<AgendaEventDraft>;
  return {
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    location: typeof body.location === "string" ? body.location : "",
    start: typeof body.start === "string" ? body.start : "",
    end: typeof body.end === "string" ? body.end : "",
    allDay: Boolean(body.allDay),
  } satisfies AgendaEventDraft;
}

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const url = new URL(request.url);
    const now = new Date();
    const defaultMin = new Date(now);
    defaultMin.setDate(defaultMin.getDate() - 7);
    const defaultMax = new Date(now);
    defaultMax.setDate(defaultMax.getDate() + 90);
    const timeMin = url.searchParams.get("timeMin") || defaultMin.toISOString();
    const timeMax = url.searchParams.get("timeMax") || defaultMax.toISOString();
    return Response.json(await getAgendaEvents(user.id, timeMin, timeMax), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Could not load Agenda events.", error);
    return errorResponse(error, "Agenda events could not be loaded.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const draft = await draftFromRequest(request);
    const eventId = await createAgendaEvent(user.id, draft);
    return Response.json({ eventId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not create Agenda event.", error);
    return errorResponse(error, "Agenda event could not be created.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const body = await request.json() as { eventId?: unknown; event?: Partial<AgendaEventDraft> };
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const event = body.event ?? {};
    await updateAgendaEvent(user.id, eventId, {
      title: typeof event.title === "string" ? event.title : "",
      description: typeof event.description === "string" ? event.description : "",
      location: typeof event.location === "string" ? event.location : "",
      start: typeof event.start === "string" ? event.start : "",
      end: typeof event.end === "string" ? event.end : "",
      allDay: Boolean(event.allDay),
    });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not update Agenda event.", error);
    return errorResponse(error, "Agenda event could not be updated.");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const body = await request.json() as { eventId?: unknown };
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    await deleteAgendaEvent(user.id, eventId);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not delete Agenda event.", error);
    return errorResponse(error, "Agenda event could not be deleted.");
  }
}
