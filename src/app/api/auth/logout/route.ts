import { logout } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await logout(request);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Logout failed.", error);
    return Response.json({ error: "Logout is temporarily unavailable." }, { status: 503 });
  }
}
