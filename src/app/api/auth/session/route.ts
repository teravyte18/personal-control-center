import { resolveOptionalRequestUser } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveOptionalRequestUser(request);
    if (!user) {
      return Response.json({ authenticated: false }, {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return Response.json({ authenticated: true, user }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Session lookup failed.", error);
    return Response.json({ error: "Session lookup is temporarily unavailable." }, { status: 503 });
  }
}
