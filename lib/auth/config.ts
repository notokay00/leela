import "server-only";
import {
  MIN_SESSION_SECRET_BYTES,
  parsePassphraseHash,
} from "./crypto.ts";

const HEX_PATTERN = /^[0-9a-f]+$/i;

export interface AuthConfig {
  passphraseHash: string;
  sessionSecret: Buffer;
}

function decodeSessionSecret(raw: string | undefined): Buffer {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error(
      "Missing ARCHIVE_SESSION_SECRET environment variable. Configure .env.local before running authentication."
    );
  }

  const trimmed = raw.trim();

  // Prefer hex decoding when a 64+ character even-length hex string is provided.
  const secretBuffer =
    HEX_PATTERN.test(trimmed) &&
    trimmed.length % 2 === 0 &&
    trimmed.length >= MIN_SESSION_SECRET_BYTES * 2
      ? Buffer.from(trimmed, "hex")
      : Buffer.from(trimmed, "utf8");

  if (secretBuffer.length < MIN_SESSION_SECRET_BYTES) {
    throw new Error(
      `ARCHIVE_SESSION_SECRET must provide at least ${MIN_SESSION_SECRET_BYTES} bytes of entropy.`
    );
  }

  return secretBuffer;
}

export function getSessionSecret(): Buffer {
  return decodeSessionSecret(process.env.ARCHIVE_SESSION_SECRET);
}

export function getAuthConfig(): AuthConfig {
  const passphraseHash = process.env.ARCHIVE_PASSPHRASE_HASH?.trim() ?? "";

  if (!parsePassphraseHash(passphraseHash)) {
    throw new Error(
      "Missing or invalid ARCHIVE_PASSPHRASE_HASH environment variable. Expected format: scrypt:N:r:p:saltHex:keyHex."
    );
  }

  return {
    passphraseHash,
    sessionSecret: getSessionSecret(),
  };
}
