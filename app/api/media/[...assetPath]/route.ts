import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { parseSingleByteRange } from "@/lib/http/range";
import {
  resolveApprovedMediaAsset,
  type MediaAssetRecord,
} from "@/lib/media/registry";
import { getMediaStorageAdapter } from "@/lib/storage";
import type { MediaStat } from "@/lib/storage/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex",
};

interface RouteContext {
  params: Promise<{ assetPath: string[] }>;
}

function buildBaseMediaHeaders(
  asset: MediaAssetRecord,
  stat: MediaStat,
  contentLength: number
): Headers {
  const headers = new Headers();
  headers.set("Content-Type", stat.contentType);
  headers.set(
    "Content-Disposition",
    `inline; filename="${asset.downloadFilename}"`
  );
  headers.set("Content-Length", String(contentLength));
  headers.set("Accept-Ranges", "bytes");
  headers.set("ETag", stat.etag);
  headers.set("Last-Modified", stat.lastModified.toUTCString());
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, noimageindex");
  headers.set(
    "Cache-Control",
    asset.sensitivity === "high"
      ? "private, no-store, max-age=0"
      : "private, max-age=300, no-transform"
  );
  return headers;
}

async function authorizeAndResolve(
  context: RouteContext
): Promise<
  | {
      ok: true;
      asset: MediaAssetRecord;
      stat: MediaStat;
      storage: ReturnType<typeof getMediaStorageAdapter>;
    }
  | { ok: false; response: NextResponse }
> {
  // 1. Authoritative server-side session verification via the DAL (independent of proxy.ts).
  let session = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401, headers: NO_STORE_HEADERS }
      ),
    };
  }

  // 2. Strict opaque single-segment asset identifier check & consent allowlist lookup.
  const { assetPath } = await context.params;
  if (!Array.isArray(assetPath) || assetPath.length !== 1) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Asset not found." },
        { status: 404, headers: NO_STORE_HEADERS }
      ),
    };
  }

  const asset = resolveApprovedMediaAsset(assetPath[0]);
  if (!asset) {
    // Uniform 404 for unknown, malformed, draft, unconsented, and withheld assets.
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Asset not found." },
        { status: 404, headers: NO_STORE_HEADERS }
      ),
    };
  }

  // 3. Storage lookup (never exposes internal filesystem paths or error details).
  try {
    const storage = getMediaStorageAdapter();
    const stat = await storage.stat(asset.storageRelativePath, asset.mimeType);
    if (!stat) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Asset not found." },
          { status: 404, headers: NO_STORE_HEADERS }
        ),
      };
    }

    return { ok: true, asset, stat, storage };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Asset not found." },
        { status: 404, headers: NO_STORE_HEADERS }
      ),
    };
  }
}

export async function HEAD(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const resolved = await authorizeAndResolve(context);
  if (!resolved.ok) {
    return new NextResponse(null, {
      status: resolved.response.status,
      headers: resolved.response.headers,
    });
  }

  const headers = buildBaseMediaHeaders(
    resolved.asset,
    resolved.stat,
    resolved.stat.size
  );

  return new NextResponse(null, { status: 200, headers });
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const resolved = await authorizeAndResolve(context);
  if (!resolved.ok) {
    return resolved.response;
  }

  const { asset, stat, storage } = resolved;
  const parsedRange = parseSingleByteRange(
    request.headers.get("range"),
    stat.size
  );

  if (parsedRange.kind === "unsatisfiable") {
    const headers = new Headers(NO_STORE_HEADERS);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Range", `bytes */${stat.size}`);
    return new NextResponse(null, { status: 416, headers });
  }

  try {
    if (parsedRange.kind === "satisfiable" && storage.supportsByteRanges) {
      const handle = await storage.openStream(asset.storageRelativePath, {
        start: parsedRange.start,
        end: parsedRange.end,
      });

      const onAbort = () => handle.close();
      request.signal.addEventListener("abort", onAbort, { once: true });

      const headers = buildBaseMediaHeaders(asset, stat, parsedRange.length);
      headers.set(
        "Content-Range",
        `bytes ${parsedRange.start}-${parsedRange.end}/${stat.size}`
      );

      return new NextResponse(handle.stream, { status: 206, headers });
    }

    // Full representation (no Range, malformed/multi/unsupported Range fallback).
    const handle = await storage.openStream(asset.storageRelativePath);
    const onAbort = () => handle.close();
    request.signal.addEventListener("abort", onAbort, { once: true });

    const headers = buildBaseMediaHeaders(asset, stat, stat.size);
    return new NextResponse(handle.stream, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: "Asset not found." },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }
}
