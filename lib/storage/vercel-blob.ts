import "server-only";
import {
  BlobNotFoundError,
  get as vercelBlobGet,
  head as vercelBlobHead,
} from "@vercel/blob";
import { validateRelativeStoragePath } from "./path-safety.ts";
import type {
  MediaByteRange,
  MediaStat,
  MediaStorageAdapter,
  MediaStreamHandle,
} from "./types.ts";

export interface VercelBlobHeadMetadata {
  size: number;
  etag: string;
  uploadedAt: Date | string;
}

export interface VercelBlobGetResponse {
  statusCode: 200 | 304;
  stream: ReadableStream<Uint8Array> | null;
  headers: Pick<Headers, "get">;
}

export interface VercelBlobClientOps {
  head: (
    pathname: string,
    options?: {
      storeId?: string;
      oidcToken?: string;
      token?: string;
      abortSignal?: AbortSignal;
    }
  ) => Promise<VercelBlobHeadMetadata>;
  get: (
    pathname: string,
    options: {
      access: "private";
      storeId?: string;
      oidcToken?: string;
      token?: string;
      abortSignal?: AbortSignal;
      headers?: Record<string, string>;
    }
  ) => Promise<VercelBlobGetResponse | null>;
}

export interface VercelPrivateBlobAdapterOptions {
  /** Optional explicit store ID (defaults to `BLOB_STORE_ID` / OIDC or token-embedded store ID). */
  storeId?: string;
  /** Optional explicit OIDC token (defaults to Vercel runtime OIDC). */
  oidcToken?: string;
  /** Optional explicit read/write token (prefer omitting so OIDC takes precedence when available). */
  token?: string;
  /** Optional dependency injection hook for deterministic unit tests. */
  blobOps?: VercelBlobClientOps;
}

function isBlobNotFoundError(err: unknown): boolean {
  if (err instanceof BlobNotFoundError) {
    return true;
  }
  return err instanceof Error && err.name === "BlobNotFoundError";
}

function isValidByteRange(range: MediaByteRange): boolean {
  return (
    Number.isSafeInteger(range.start) &&
    Number.isSafeInteger(range.end) &&
    range.start >= 0 &&
    range.end >= range.start
  );
}

/**
 * Production Vercel Private Blob storage adapter.
 *
 * Security & streaming guarantees:
 * - Validates every internal relative storage key via `validateRelativeStoragePath`
 *   before touching Vercel Blob.
 * - Uses exclusively `access: "private"` server-side reads; never returns or logs
 *   upstream Blob URLs, download URLs, or credentials.
 * - Prefers Vercel OIDC (`BLOB_STORE_ID` + runtime OIDC) automatically via `@vercel/blob`
 *   when no explicit static `token` option overrides it, falling back to the
 *   connected store's `BLOB_READ_WRITE_TOKEN` when OIDC is unavailable.
 * - Supports RFC 9110 single-byte-range streaming (`206`) directly from Vercel
 *   Private Blob without buffering entire audio files in memory.
 * - Propagates client disconnect / abort immediately to both the upstream `fetch`
 *   `AbortSignal` and the underlying stream reader.
 */
export class VercelPrivateBlobStorageAdapter implements MediaStorageAdapter {
  readonly driverName = "vercel-private-blob";
  readonly supportsByteRanges = true;

  private readonly storeId?: string;
  private readonly oidcToken?: string;
  private readonly token?: string;
  private readonly blobOps: VercelBlobClientOps;

  constructor(options?: VercelPrivateBlobAdapterOptions) {
    this.storeId = options?.storeId?.trim() || undefined;
    this.oidcToken = options?.oidcToken?.trim() || undefined;
    this.token = options?.token?.trim() || undefined;
    this.blobOps = options?.blobOps ?? {
      head: (pathname, opts) => vercelBlobHead(pathname, opts),
      get: (pathname, opts) => vercelBlobGet(pathname, opts),
    };
  }

  private buildAuthOptions(): {
    storeId?: string;
    oidcToken?: string;
    token?: string;
  } {
    return {
      ...(this.storeId ? { storeId: this.storeId } : {}),
      ...(this.oidcToken ? { oidcToken: this.oidcToken } : {}),
      ...(this.token ? { token: this.token } : {}),
    };
  }

  async stat(
    storageRelativePath: string,
    mimeType: string
  ): Promise<MediaStat | null> {
    if (!validateRelativeStoragePath(storageRelativePath)) {
      return null;
    }

    try {
      const metadata = await this.blobOps.head(
        storageRelativePath,
        this.buildAuthOptions()
      );
      if (
        !metadata ||
        !Number.isSafeInteger(metadata.size) ||
        metadata.size < 0
      ) {
        return null;
      }

      const lastModified =
        metadata.uploadedAt instanceof Date
          ? metadata.uploadedAt
          : new Date(metadata.uploadedAt);

      return {
        size: metadata.size,
        // Enforce authoritative allowlist MIME type rather than trusting external metadata.
        contentType: mimeType,
        etag: metadata.etag,
        lastModified: Number.isNaN(lastModified.getTime())
          ? new Date(0)
          : lastModified,
      };
    } catch (err) {
      if (isBlobNotFoundError(err)) {
        return null;
      }
      throw new Error("Private media metadata lookup failed.");
    }
  }

  async openStream(
    storageRelativePath: string,
    range?: MediaByteRange
  ): Promise<MediaStreamHandle> {
    if (!validateRelativeStoragePath(storageRelativePath)) {
      throw new Error("Storage object unavailable.");
    }

    if (range && !isValidByteRange(range)) {
      throw new Error("Invalid byte range.");
    }

    const abortController = new AbortController();
    let result: VercelBlobGetResponse | null;
    try {
      result = await this.blobOps.get(storageRelativePath, {
        ...this.buildAuthOptions(),
        access: "private",
        abortSignal: abortController.signal,
        ...(range
          ? {
              headers: {
                Range: `bytes=${range.start}-${range.end}`,
              },
            }
          : {}),
      });
    } catch {
      abortController.abort();
      throw new Error("Storage object unavailable.");
    }

    if (!result || result.statusCode !== 200 || !result.stream) {
      abortController.abort();
      throw new Error("Storage object unavailable.");
    }

    if (range) {
      const upstreamContentRange = result.headers.get("content-range");
      const expectedPrefix = `bytes ${range.start}-${range.end}/`;
      if (
        !upstreamContentRange ||
        !upstreamContentRange.startsWith(expectedPrefix)
      ) {
        abortController.abort();
        void result.stream.cancel().catch(() => {});
        throw new Error("Storage byte range mismatch.");
      }
    }

    const reader = result.stream.getReader();
    let closed = false;

    const close = () => {
      if (closed) {
        return;
      }
      closed = true;
      abortController.abort();
      void reader.cancel().catch(() => {});
    };

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (closed) {
          return;
        }
        try {
          const { done, value } = await reader.read();
          if (closed) {
            return;
          }
          if (done) {
            closed = true;
            controller.close();
            return;
          }
          if (value) {
            controller.enqueue(value);
          }
        } catch (err) {
          if (closed) {
            return;
          }
          closed = true;
          abortController.abort();
          controller.error(err);
        }
      },
      cancel() {
        close();
      },
    });

    return { stream, close };
  }
}
