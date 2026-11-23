import "server-only";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { resolveSafeLocalFile } from "./path-safety.ts";
import type {
  MediaByteRange,
  MediaStat,
  MediaStorageAdapter,
  MediaStreamHandle,
} from "./types.ts";

function buildWeakEtag(size: number, mtimeMs: number, key: string): string {
  const digest = createHash("sha256")
    .update(`${key}:${size}:${mtimeMs}`)
    .digest("hex")
    .slice(0, 16);
  return `W/"${size.toString(16)}-${digest}"`;
}

export class LocalFsStorageAdapter implements MediaStorageAdapter {
  readonly driverName = "local-fs";
  readonly supportsByteRanges = true;
  private readonly storageRoot: string;
  private readonly repoRoot?: string;

  constructor(storageRoot: string, options?: { repoRoot?: string }) {
    this.storageRoot = storageRoot;
    this.repoRoot = options?.repoRoot;
  }

  async stat(
    storageRelativePath: string,
    mimeType: string
  ): Promise<MediaStat | null> {
    const resolved = await resolveSafeLocalFile(
      this.storageRoot,
      storageRelativePath,
      { repoRoot: this.repoRoot }
    );
    if (!resolved) {
      return null;
    }

    return {
      size: resolved.size,
      contentType: mimeType,
      etag: buildWeakEtag(
        resolved.size,
        resolved.mtime.getTime(),
        storageRelativePath
      ),
      lastModified: resolved.mtime,
    };
  }

  async openStream(
    storageRelativePath: string,
    range?: MediaByteRange
  ): Promise<MediaStreamHandle> {
    const resolved = await resolveSafeLocalFile(
      this.storageRoot,
      storageRelativePath,
      { repoRoot: this.repoRoot }
    );
    if (!resolved) {
      throw new Error("Storage object unavailable.");
    }

    const nodeStream = createReadStream(
      resolved.canonicalPath,
      range ? { start: range.start, end: range.end } : undefined
    );

    let closed = false;
    const close = () => {
      if (!closed) {
        closed = true;
        nodeStream.destroy();
      }
    };

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        nodeStream.on("data", (chunk: string | Buffer) => {
          if (closed) {
            return;
          }
          const bytes =
            typeof chunk === "string"
              ? new TextEncoder().encode(chunk)
              : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
          controller.enqueue(bytes);
        });

        nodeStream.once("end", () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
        });

        nodeStream.once("error", (err) => {
          if (!closed) {
            closed = true;
            controller.error(err);
          }
        });
      },
      cancel() {
        close();
      },
    });

    return { stream, close };
  }
}
