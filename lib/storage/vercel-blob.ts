import "server-only";
import type {
  MediaByteRange,
  MediaStat,
  MediaStorageAdapter,
  MediaStreamHandle,
} from "./types.ts";

/**
 * Future Vercel Private Blob adapter scaffold.
 *
 * Status: NOT YET IMPLEMENTED (Milestone 1.3 is local-first only).
 * - Does not provision a Blob store, require `@vercel/blob`, upload media,
 *   or generate public asset URLs.
 * - `supportsByteRanges` is explicitly `false` until server-side private blob
 *   fetching with verified RFC 9110 single-range (`200`/`206`/`416`/fallback)
 *   semantics is implemented and integration-tested in Phase 6.
 */
export class VercelPrivateBlobStorageAdapter implements MediaStorageAdapter {
  readonly driverName = "vercel-private-blob";
  readonly supportsByteRanges = false;

  async stat(
    _storageRelativePath: string,
    _mimeType: string
  ): Promise<MediaStat | null> {
    void _storageRelativePath;
    void _mimeType;
    throw new Error(
      "VercelPrivateBlobStorageAdapter is a Phase 6 scaffold and is not active yet. Use STORAGE_DRIVER=local-fs."
    );
  }

  async openStream(
    _storageRelativePath: string,
    _range?: MediaByteRange
  ): Promise<MediaStreamHandle> {
    void _storageRelativePath;
    void _range;
    throw new Error(
      "VercelPrivateBlobStorageAdapter is a Phase 6 scaffold and does not implement streaming or byte ranges yet."
    );
  }
}
