import { NextResponse } from "next/server";
import { connectSpotify } from "@/server/spotify";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "pcc_spotify_oauth";

function oauthCookie(request: Request) {
  const cookies = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim());
  const value = cookies.find((part) => part.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!decoded || typeof decoded !== "object") return null;
    const data = decoded as { state?: unknown; userId?: unknown; expiresAt?: unknown; playlistAccess?: unknown };
    if (typeof data.state !== "string" || typeof data.userId !== "string" || typeof data.expiresAt !== "number") return null;
    return { state: data.state, userId: data.userId, expiresAt: data.expiresAt, playlistAccess: data.playlistAccess === true };
  } catch { return null; }
}

function redirect(request: Request, status: string) {
  const response = NextResponse.redirect(new URL(`/music?spotify=${encodeURIComponent(status)}`, request.url));
  response.cookies.set(COOKIE, "", {
    httpOnly: true, secure: process.env.PCC_COOKIE_SECURE === "1",
    sameSite: "lax", path: "/api/integrations/spotify", maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.has("error")) return redirect(request, "cancelled");
  try {
    const user = await resolveRequestUser(request);
    const state = oauthCookie(request);
    if (!state || state.expiresAt < Date.now() || state.userId !== user.id ||
        state.state !== params.get("state") || !params.get("code")) {
      return redirect(request, "invalid-state");
    }
    await connectSpotify(user.id, params.get("code")!, state.playlistAccess);
    return redirect(request, "connected");
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.redirect(new URL("/login?next=/music", request.url));
    }
    console.error("Could not complete Spotify authorization.", error);
    return redirect(request, "error");
  }
}
