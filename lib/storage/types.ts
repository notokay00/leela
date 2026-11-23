import "server-only";

export interface MediaStat {
  size: number;
  contentType: string;
  etag: string;
  lastModified: Date;
}

export interface MediaByteRange {
  /** Inclusive start byte offset (0-indexed). */
  start: number;
  /** Inclusive end byte offset (0-indexed). */
  end: number;
}

export interface MediaStreamHandle {
  stream: ReadableStream<Uint8Array>;
  close: () => void;
}

/**
 * Storage-agnostic private media backend contract.
 * Implementations must operate exclusively on validated internal storage keys
 * and never expose physical filesystem paths or external storage URLs.
 */
export interface MediaStorageAdapter {
  readonly driverName: string;
  readonly supportsByteRanges: boolean;
  stat(storageRelativePath: string, mimeType: string): Promise<MediaStat | null>;
  openStream(
    storageRelativePath: string,
    range?: MediaByteRange
  ): Promise<MediaStreamHandle>;
}
