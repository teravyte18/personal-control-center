import { NextResponse } from "next/server";
import { connectGoogleCalendar } from "@/server/google-calendar";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OAUTH_COOKIE = "pcc_google_calendar_oauth";

type OAuthCookie = {
  state: string;
  userId: string;
  expiresAt: number;
};

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const entry of header.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() === name) return entry.slice(separator + 1).trim();
  }
  return null;
}

function parseOAuthCookie(value: string | null): OAuthCookie | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("state" in parsed) || typeof parsed.state !== "string") return null;
    if (!("userId" in parsed) || typeof parsed.userId !== "string") return null;
    if (!("expiresAt" in parsed) || typeof parsed.expiresAt !== "number") return null;
    return { state: parsed.state, userId: parsed.userId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function redirect(request: Request, result: string) {
  const response = NextResponse.redirect(new URL(`/account?calendar=${encodeURIComponent(result)}`, request.url));
  response.cookies.set(OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.PCC_COOKIE_SECURE === "1",
    sameSite: "lax",
    path: "/api/integrations/google-calendar",
    maxAge: 0,
    priority: "high",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("error")) return redirect(request, "cancelled");

  try {
    const user = await resolveRequestUser(request);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthCookie = parseOAuthCookie(readCookie(request, OAUTH_COOKIE));

    if (!code || !state || !oauthCookie) return redirect(request, "invalid-state");
    if (oauthCookie.expiresAt < Date.now()) return redirect(request, "expired");
    if (oauthCookie.userId !== user.id || oauthCookie.state !== state) return redirect(request, "invalid-state");

    await connectGoogleCalendar(user.id, code);
    return redirect(request, "connected");
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.redirect(new URL("/login?next=/account", request.url));
    }
    console.error("Could not finish Google Calendar authorization.", error);
    return redirect(request, "error");
  }
}
