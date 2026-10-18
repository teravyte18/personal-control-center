import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isSpotifyConfigured, spotifyAuthorizationUrl } from "@/server/spotify";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "pcc_spotify_oauth";
const MAX_AGE = 600;

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    if (!isSpotifyConfigured()) return NextResponse.redirect(new URL("/music?spotify=not-configured", request.url));
    const state = randomBytes(24).toString("base64url");
    const value = Buffer.from(JSON.stringify({
      state, userId: user.id, expiresAt: Date.now() + MAX_AGE * 1000,
    })).toString("base64url");
    const response = NextResponse.redirect(spotifyAuthorizationUrl(state));
    response.cookies.set(COOKIE, value, {
      httpOnly: true, secure: process.env.PCC_COOKIE_SECURE === "1",
      sameSite: "lax", path: "/api/integrations/spotify", maxAge: MAX_AGE,
    });
    return response;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.redirect(new URL("/login?next=/music", request.url));
    }
    console.error("Could not start Spotify authorization.", error);
    return NextResponse.redirect(new URL("/music?spotify=error", request.url));
  }
}
