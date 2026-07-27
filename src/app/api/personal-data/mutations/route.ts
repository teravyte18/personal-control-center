import {
  mutationAffectsGoogleCalendar,
} from "@/domain/google-calendar";
import { normalizePersonalDataMutation } from "@/domain/personal-data-snapshot";
import { reconcileGoogleCalendar } from "@/server/google-calendar";
import { applyStoredPersonalDataMutation } from "@/server/personal-data-store";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const mutation = normalizePersonalDataMutation(body);
  if (!mutation) {
    return Response.json({ error: "Personal data mutation is invalid." }, { status: 400 });
  }

  try {
    const user = await resolveRequestUser(request);
    const state = await applyStoredPersonalDataMutation(user.id, mutation);

    if (mutationAffectsGoogleCalendar(mutation)) {
      try {
        await reconcileGoogleCalendar(user.id, state.snapshot);
      } catch (calendarError) {
        console.error("Personal data was saved, but Google Calendar synchronisation failed.", calendarError);
      }
    }

    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not apply personal data mutation.", error);
    return Response.json(
      { error: "Personal data could not be saved." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
