import {
  removeReviewPushSubscription,
  registerReviewPushSubscription,
  reviewPushPublicConfig,
  ReviewPushInputError,
} from "@/server/review-push";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveRequestUser(request);
    return Response.json(reviewPushPublicConfig(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not load review push configuration.", error);
    return Response.json({ error: "Review push configuration is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const body = await request.json();
    await registerReviewPushSubscription(user.id, body);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ReviewPushInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not save review push subscription.", error);
    return Response.json({ error: "Review push subscription could not be saved." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const body = await request.json() as { endpoint?: unknown };
    await removeReviewPushSubscription(user.id, body.endpoint);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ReviewPushInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not remove review push subscription.", error);
    return Response.json({ error: "Review push subscription could not be removed." }, { status: 503 });
  }
}
