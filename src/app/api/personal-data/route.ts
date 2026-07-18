import { loadPersonalDataState } from "@/server/personal-data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadPersonalDataState();
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Could not load personal data.", error);
    return Response.json(
      { error: "Personal data storage is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
