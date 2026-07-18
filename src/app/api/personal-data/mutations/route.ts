import { normalizePersonalDataMutation } from "@/domain/personal-data-snapshot";
import { applyStoredPersonalDataMutation } from "@/server/personal-data-store";

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
    const state = await applyStoredPersonalDataMutation(mutation);
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Could not apply personal data mutation.", error);
    return Response.json(
      { error: "Personal data could not be saved." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
