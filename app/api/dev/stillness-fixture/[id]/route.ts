import { NextResponse, type NextRequest } from "next/server";
import {
  renderSyntheticFixturePng,
  SYNTHETIC_STILLNESS_FIXTURES,
} from "@/lib/stillness/synthetic-fixtures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DEVELOPMENT-ONLY synthetic calibration plate endpoint.
 * Strictly disabled in production (`NODE_ENV !== "development"` -> 404).
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not found." },
      { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  }

  const { id } = await context.params;
  const fixture = SYNTHETIC_STILLNESS_FIXTURES.find((item) => item.id === id);
  if (!fixture) {
    return NextResponse.json(
      { error: "Not found." },
      { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  }

  const png = renderSyntheticFixturePng(fixture);
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex",
    },
  });
}
