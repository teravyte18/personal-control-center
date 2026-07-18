import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    await sql`select 1 as healthy`;
    return Response.json({
      status: "ok",
      database: "ok",
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Health check failed.", error);
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
