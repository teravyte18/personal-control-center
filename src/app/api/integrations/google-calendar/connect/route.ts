import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createGoogleAuthorizationUrl,
  isGoogleCalendarConfigured,
} from "@/server/google-calendar";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OAUTH_COOKIE = "pcc_google_calendar_oauth";
const OAUTH_MAX_AGE_SECONDS = 10 * 60;

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.redirect(new URL("/account?calendar=not-configured", request.url));
    }

    const state = randomBytes(24).toString("base64url");
    const cookieValue = Buffer.from(JSON.stringify({
      state,
      userId: user.id,
      expiresAt: Date.now() + OAUTH_MAX_AGE_SECONDS * 1000,
    })).toString("base64url");

    const response = NextResponse.redirect(createGoogleAuthorizationUrl(state, user.email));
    response.cookies.set(OAUTH_COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.PCC_COOKIE_SECURE === "1",
      sameSite: "lax",
      path: "/api/integrations/google-calendar",
      maxAge: OAUTH_MAX_AGE_SECONDS,
      priority: "high",
    });
    return response;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.redirect(new URL("/login?next=/account", request.url));
    }
    console.error("Could not start Google Calendar authorization.", error);
    return NextResponse.redirect(new URL("/account?calendar=error", request.url));
  }
}
