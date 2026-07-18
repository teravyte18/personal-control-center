import { ImageResponse } from "next/og";

const SUPPORTED_SIZES = new Set([180, 192, 512]);

type RouteContext = {
  params: Promise<{ size: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { size: rawSize } = await context.params;
  const size = Number(rawSize);

  if (!Number.isInteger(size) || !SUPPORTED_SIZES.has(size)) {
    return Response.json({ error: "Unsupported icon size." }, { status: 404 });
  }

  const maskable = new URL(request.url).searchParams.get("purpose") === "maskable";
  const markSize = maskable ? Math.round(size * 0.46) : Math.round(size * 0.58);
  const radius = Math.round(size * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0f172a",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#f8fafc",
            borderRadius: radius,
            color: "#0f172a",
            display: "flex",
            fontFamily: "sans-serif",
            fontSize: Math.round(markSize * 0.56),
            fontWeight: 800,
            height: markSize,
            justifyContent: "center",
            letterSpacing: "-0.08em",
            paddingRight: Math.round(markSize * 0.06),
            width: markSize,
          }}
        >
          PC
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
