import "server-only";
import { MAX_PASSPHRASE_LENGTH } from "./crypto.ts";

export const MAX_UNLOCK_BODY_BYTES = 1024;
export const MAX_LOCK_BODY_BYTES = 128;

export type BodyParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 413 | 415; error: string };

async function readBoundedUtf8Body(
  request: Request,
  maxBytes: number
): Promise<{ ok: true; text: string } | { ok: false; status: 413; error: string }> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const declaredLength = Number(contentLengthHeader);
    if (!Number.isFinite(declaredLength) || declaredLength < 0) {
      return { ok: false, status: 413, error: "Invalid content length." };
    }
    if (declaredLength > maxBytes) {
      return { ok: false, status: 413, error: "Request body too large." };
    }
  }

  if (!request.body) {
    return { ok: true, text: "" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          return { ok: false, status: 413, error: "Request body too large." };
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    ok: true,
    text: new TextDecoder("utf-8", { fatal: false }).decode(combined),
  };
}

/**
 * Strictly parses and validates POST /api/auth/unlock payloads.
 * Requires application/json, bounded size, plain JSON object with exact key
 * `passphrase` (no unexpected fields), non-empty string within length limits.
 */
export async function parseUnlockRequestBody(
  request: Request
): Promise<BodyParseResult<{ passphrase: string }>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return {
      ok: false,
      status: 415,
      error: "Content-Type must be application/json.",
    };
  }

  const bodyResult = await readBoundedUtf8Body(request, MAX_UNLOCK_BODY_BYTES);
  if (!bodyResult.ok) {
    return bodyResult;
  }

  if (bodyResult.text.trim().length === 0) {
    return { ok: false, status: 400, error: "Request body is required." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyResult.text);
  } catch {
    return { ok: false, status: 400, error: "Malformed JSON request body." };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, status: 400, error: "Expected a JSON object body." };
  }

  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "passphrase") {
    return {
      ok: false,
      status: 400,
      error: "Request body must contain only the passphrase field.",
    };
  }

  const passphrase = record.passphrase;
  if (
    typeof passphrase !== "string" ||
    passphrase.length === 0 ||
    passphrase.length > MAX_PASSPHRASE_LENGTH ||
    passphrase.includes("\0")
  ) {
    return {
      ok: false,
      status: 400,
      error: "Passphrase must be a valid non-empty string.",
    };
  }

  return { ok: true, data: { passphrase } };
}

/**
 * Validates POST /api/auth/lock payloads.
 * Accepts an empty body or an empty JSON object `{}` only; rejects oversized
 * or unexpected payloads.
 */
export async function validateLockRequestBody(
  request: Request
): Promise<BodyParseResult<null>> {
  const bodyResult = await readBoundedUtf8Body(request, MAX_LOCK_BODY_BYTES);
  if (!bodyResult.ok) {
    return bodyResult;
  }

  const trimmed = bodyResult.text.trim();
  if (trimmed.length === 0) {
    return { ok: true, data: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, status: 400, error: "Malformed request body." };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    Object.keys(parsed).length !== 0
  ) {
    return {
      ok: false,
      status: 400,
      error: "Lock request does not accept body fields.",
    };
  }

  return { ok: true, data: null };
}
