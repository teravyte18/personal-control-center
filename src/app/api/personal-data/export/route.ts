import { exportStoredPersonalData } from "@/server/personal-data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataExport = await exportStoredPersonalData();
    const date = dataExport.exportedAt.slice(0, 10);
    return new Response(`${JSON.stringify(dataExport, null, 2)}\n`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="personal-control-center-${date}.json"`,
      },
    });
  } catch (error) {
    console.error("Could not export personal data.", error);
    return Response.json(
      { error: "Personal data export is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
