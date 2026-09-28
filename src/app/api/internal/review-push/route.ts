import { sendDueReviewPushes, validWorkerToken } from "@/server/review-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!validWorkerToken(request)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  try {
    return Response.json(await sendDueReviewPushes(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Review push scheduler failed.", error);
    return Response.json({ error: "Review push scheduler failed." }, { status: 503 });
  }
}
