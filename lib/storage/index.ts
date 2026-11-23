import "server-only";
import { LocalFsStorageAdapter } from "./local-fs.ts";
import { VercelPrivateBlobStorageAdapter } from "./vercel-blob.ts";
import type { MediaStorageAdapter } from "./types.ts";

export function getMediaStorageAdapter(
  env: Record<string, string | undefined> = process.env
): MediaStorageAdapter {
  const driver = (env.STORAGE_DRIVER ?? "local-fs").trim().toLowerCase();

  if (driver === "local-fs") {
    const root = env.LOCAL_MEDIA_ROOT?.trim();
    if (!root) {
      throw new Error(
        "Missing LOCAL_MEDIA_ROOT environment variable for local-fs media storage."
      );
    }
    return new LocalFsStorageAdapter(root);
  }

  if (driver === "vercel-private-blob" || driver === "vercel-blob") {
    return new VercelPrivateBlobStorageAdapter();
  }

  throw new Error(`Unsupported STORAGE_DRIVER configuration: "${driver}".`);
}
