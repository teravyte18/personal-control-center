import { exportStoredPersonalData } from "@/server/personal-data-store";
import { InvalidUserIdentityError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const dataExport = await exportStoredPersonalData(user.id);
    const date = dataExport.exportedAt.slice(0, 10);
    return new Response(`${JSON.stringify(dataExport, null, 2)}\n`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="personal-control-center-${date}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof InvalidUserIdentityError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not export personal data.", error);
    return Response.json(
      { error: "Personal data export is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
