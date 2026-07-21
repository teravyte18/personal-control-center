import {
  AuthenticationInputError,
  AuthenticationRequiredError,
  login,
} from "@/server/auth";
import {
  assertLoginAllowed,
  LoginRateLimitError,
  performDummyPasswordVerification,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/server/login-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  try {
    assertLoginAllowed(record.email);

    const [loginResult, dummyResult] = await Promise.allSettled([
      login(record.email, record.password),
      performDummyPasswordVerification(record.password),
    ]);

    if (dummyResult.status === "rejected") {
      console.error("Dummy password verification failed.", dummyResult.reason);
    }
    if (loginResult.status === "rejected") throw loginResult.reason;

    recordLoginSuccess(record.email);
    return Response.json({ user: loginResult.value }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof LoginRateLimitError) {
      return Response.json(
        { error: error.message },
        {
          status: 429,
          headers: {
            ...noStoreHeaders,
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }
    if (error instanceof AuthenticationInputError) {
      return Response.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
    }
    if (error instanceof AuthenticationRequiredError) {
      recordLoginFailure(record.email);
      return Response.json(
        { error: "Email or password is incorrect, or the account is not active." },
        { status: 401, headers: noStoreHeaders },
      );
    }

    console.error("Login failed.", error);
    return Response.json(
      { error: "Login is temporarily unavailable." },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
