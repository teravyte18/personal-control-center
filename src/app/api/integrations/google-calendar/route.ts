import {
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  syncGoogleCalendar,
} from "@/server/google-calendar";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    return Response.json(await getGoogleCalendarStatus(user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not load Google Calendar status.", error);
    return Response.json({ error: "Google Calendar status could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    await syncGoogleCalendar(user.id);
    return Response.json(await getGoogleCalendarStatus(user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not synchronise Google Calendar.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Google Calendar could not be synchronised." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const result = await disconnectGoogleCalendar(user.id);
    return Response.json({
      ...(await getGoogleCalendarStatus(user.id)),
      warning: result.warning,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not disconnect Google Calendar.", error);
    return Response.json({ error: "Google Calendar could not be disconnected." }, { status: 503 });
  }
}
