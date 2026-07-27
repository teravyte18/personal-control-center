import { reconcileGoogleCalendar } from "@/server/google-calendar";
import {
  importPersonalData,
  PersonalDataImportConflictError,
} from "@/server/personal-data-store";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Import must be valid JSON." }, { status: 400 });
  }

  try {
    const user = await resolveRequestUser(request);
    const state = await importPersonalData(user.id, body);
    try {
      await reconcileGoogleCalendar(user.id, state.snapshot);
    } catch (calendarError) {
      console.error("Personal data was imported, but Google Calendar synchronisation failed.", calendarError);
    }
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof TypeError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PersonalDataImportConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    console.error("Could not import personal data.", error);
    return Response.json(
      { error: "Personal data import failed." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
