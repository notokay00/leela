import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Stateless HMAC-SHA256 session token format:
 *   v1.<issuedAtEpochSec>.<expiresAtEpochSec>.<nonceBase64Url>.<hmacBase64Url>
 *
 * Security model notes (intentional stateless design — no database):
 * 1. Stateless HMAC tokens remain cryptographically valid until `expiresAt` even if
 *    the user's browser cookie is cleared on lock/logout.
 * 2. Rotating `ARCHIVE_SESSION_SECRET` immediately invalidates all existing sessions.
 * 3. The random 128-bit session nonce provides per-token uniqueness/entropy only; it
 *    is NOT replay prevention (there is no server-side nonce store).
 */

export const SESSION_TOKEN_VERSION = "v1";
export const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours
export const MAX_SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours hard ceiling
export const MAX_CLOCK_SKEW_SECONDS = 60;

export const MIN_SESSION_SECRET_BYTES = 32;
export const MAX_TOKEN_LENGTH = 512;
export const MAX_PASSPHRASE_LENGTH = 256;

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_KEY_BYTES = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024; // 64 MiB safety cap

const TIMESTAMP_PATTERN = /^\d{10,12}$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{22}$/; // 16 bytes base64url (unpadded)
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 bytes base64url (unpadded)
const HEX_PATTERN = /^[0-9a-f]+$/i;

export interface ParsedPassphraseHash {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  derivedKey: Buffer;
}

export interface SessionPayload {
  version: typeof SESSION_TOKEN_VERSION;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

function scryptAsync(
  passphrase: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(passphrase, salt, keyLength, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey);
    });
  });
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

export async function hashPassphrase(passphrase: string): Promise<string> {
  if (
    typeof passphrase !== "string" ||
    passphrase.length === 0 ||
    passphrase.length > MAX_PASSPHRASE_LENGTH
  ) {
    throw new Error("Passphrase must be a non-empty string within length limits.");
  }

  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derivedKey = await scryptAsync(passphrase, salt, SCRYPT_KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });

  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export function parsePassphraseHash(encoded: string): ParsedPassphraseHash | null {
  if (typeof encoded !== "string") {
    return null;
  }

  const parts = encoded.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return null;
  }

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltHex = parts[4];
  const keyHex = parts[5];

  if (
    !Number.isSafeInteger(n) ||
    !Number.isSafeInteger(r) ||
    !Number.isSafeInteger(p) ||
    n < SCRYPT_N ||
    n > 131072 ||
    !isPowerOfTwo(n) ||
    r < 8 ||
    r > 32 ||
    p < 1 ||
    p > 8
  ) {
    return null;
  }

  if (
    !HEX_PATTERN.test(saltHex) ||
    saltHex.length % 2 !== 0 ||
    saltHex.length < SCRYPT_SALT_BYTES * 2 ||
    !HEX_PATTERN.test(keyHex) ||
    keyHex.length !== SCRYPT_KEY_BYTES * 2
  ) {
    return null;
  }

  const salt = Buffer.from(saltHex, "hex");
  const derivedKey = Buffer.from(keyHex, "hex");

  if (salt.length < SCRYPT_SALT_BYTES || derivedKey.length !== SCRYPT_KEY_BYTES) {
    return null;
  }

  return { n, r, p, salt, derivedKey };
}

export async function verifyPassphrase(
  passphrase: string,
  encodedHash: string
): Promise<boolean> {
  if (
    typeof passphrase !== "string" ||
    passphrase.length === 0 ||
    passphrase.length > MAX_PASSPHRASE_LENGTH
  ) {
    return false;
  }

  const parsed = parsePassphraseHash(encodedHash);
  if (!parsed) {
    return false;
  }

  const candidateKey = await scryptAsync(
    passphrase,
    parsed.salt,
    parsed.derivedKey.length,
    {
      N: parsed.n,
      r: parsed.r,
      p: parsed.p,
      maxmem: SCRYPT_MAXMEM,
    }
  );

  if (candidateKey.length !== parsed.derivedKey.length) {
    return false;
  }

  return timingSafeEqual(candidateKey, parsed.derivedKey);
}

function signPayload(payload: string, secret: Buffer): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createSessionToken(
  secret: Buffer,
  options?: { nowSeconds?: number; ttlSeconds?: number }
): { token: string; session: SessionPayload } {
  if (!Buffer.isBuffer(secret) || secret.length < MIN_SESSION_SECRET_BYTES) {
    throw new Error(
      `Session secret must be at least ${MIN_SESSION_SECRET_BYTES} bytes.`
    );
  }

  const nowSeconds =
    options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;

  if (
    !Number.isSafeInteger(nowSeconds) ||
    nowSeconds <= 0 ||
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds <= 0 ||
    ttlSeconds > MAX_SESSION_TTL_SECONDS
  ) {
    throw new Error("Invalid session timestamp or TTL.");
  }

  const issuedAt = nowSeconds;
  const expiresAt = nowSeconds + ttlSeconds;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${SESSION_TOKEN_VERSION}.${issuedAt}.${expiresAt}.${nonce}`;
  const signature = signPayload(payload, secret).toString("base64url");

  return {
    token: `${payload}.${signature}`,
    session: {
      version: SESSION_TOKEN_VERSION,
      issuedAt,
      expiresAt,
      nonce,
    },
  };
}

export function verifySessionToken(
  token: string,
  secret: Buffer,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): SessionPayload | null {
  if (!Buffer.isBuffer(secret) || secret.length < MIN_SESSION_SECRET_BYTES) {
    return null;
  }

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 5) {
    return null;
  }

  const [version, issuedAtRaw, expiresAtRaw, nonce, signatureRaw] = parts;

  if (version !== SESSION_TOKEN_VERSION) {
    return null;
  }

  if (
    !TIMESTAMP_PATTERN.test(issuedAtRaw) ||
    !TIMESTAMP_PATTERN.test(expiresAtRaw) ||
    !NONCE_PATTERN.test(nonce) ||
    !SIGNATURE_PATTERN.test(signatureRaw)
  ) {
    return null;
  }

  const issuedAt = Number(issuedAtRaw);
  const expiresAt = Number(expiresAtRaw);

  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) {
    return null;
  }

  const lifetime = expiresAt - issuedAt;
  if (
    issuedAt <= 0 ||
    lifetime <= 0 ||
    lifetime > MAX_SESSION_TTL_SECONDS ||
    issuedAt > nowSeconds + MAX_CLOCK_SKEW_SECONDS ||
    nowSeconds >= expiresAt
  ) {
    return null;
  }

  const payload = `${version}.${issuedAtRaw}.${expiresAtRaw}.${nonce}`;
  const expectedSig = signPayload(payload, secret);
  const actualSig = Buffer.from(signatureRaw, "base64url");

  if (actualSig.length !== expectedSig.length) {
    return null;
  }

  if (!timingSafeEqual(expectedSig, actualSig)) {
    return null;
  }

  return {
    version: SESSION_TOKEN_VERSION,
    issuedAt,
    expiresAt,
    nonce,
  };
}
