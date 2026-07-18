import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "pcc_session";
const INSECURE_USER_HEADER = "x-pcc-user-email";

function isPublicPath(pathname: string) {
  return pathname === "/login"
    || pathname === "/activate"
    || pathname === "/api/health"
    || pathname === "/api/auth/login"
    || pathname === "/api/auth/activate"
    || pathname === "/api/auth/session"
    || pathname === "/manifest.webmanifest"
    || pathname === "/favicon.ico"
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/icons/");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const testIdentityAllowed = process.env.PCC_ALLOW_INSECURE_USER_HEADER === "1"
    && Boolean(request.headers.get(INSECURE_USER_HEADER));
  if (testIdentityAllowed || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\.(?:svg|jpg|jpeg|png|webp|ico)$).*)"],
};
