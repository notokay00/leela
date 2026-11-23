import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex",
};

async function handleMissingIdentifier(isHead: boolean): Promise<NextResponse> {
  let session = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }

  if (!session) {
    return isHead
      ? new NextResponse(null, { status: 401, headers: NO_STORE_HEADERS })
      : NextResponse.json(
          { error: "Unauthorized." },
          { status: 401, headers: NO_STORE_HEADERS }
        );
  }

  return isHead
    ? new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS })
    : NextResponse.json(
        { error: "Asset not found." },
        { status: 404, headers: NO_STORE_HEADERS }
      );
}

export async function GET(): Promise<NextResponse> {
  return handleMissingIdentifier(false);
}

export async function HEAD(): Promise<NextResponse> {
  return handleMissingIdentifier(true);
}
