import { randomBytes, scrypt } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

// OWASP Password Storage Cheat Sheet baseline: N=65536 (2^16), r=8, p=2 (~64 MiB)
const SCRYPT_N = 65536;
const SCRYPT_R = 8;
const SCRYPT_P = 2;
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_KEY_BYTES = 64;
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

function scryptAsync(passphrase, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      passphrase,
      salt,
      SCRYPT_KEY_BYTES,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM },
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(derivedKey);
      }
    );
  });
}

async function createPassphraseHash(passphrase) {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derivedKey = await scryptAsync(passphrase, salt);
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

function promptHiddenPassphrase() {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      let buffered = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        buffered += chunk;
      });
      process.stdin.on("end", () => {
        resolve(buffered.replace(/\r?\n$/, ""));
      });
      process.stdin.on("error", reject);
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    const originalWrite = rl._writeToOutput;
    rl._writeToOutput = function writeMuted(stringToWrite) {
      if (stringToWrite.includes("\n") || stringToWrite.includes("\r")) {
        originalWrite.call(this, "\n");
      }
    };

    process.stdout.write("Enter archive passphrase (input hidden): ");
    rl.question("", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function initLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    console.error(".env.local already exists. Refusing to overwrite.");
    process.exitCode = 1;
    return;
  }

  // Generate an ephemeral high-entropy dev passphrase internally in memory.
  // Never passed via CLI args, env vars, or printed to stdout.
  const ephemeralPassphrase = randomBytes(24).toString("base64url");
  const passphraseHash = await createPassphraseHash(ephemeralPassphrase);
  const sessionSecret = randomBytes(32).toString("hex");

  const contents = [
    "# Local-only development configuration (gitignored; never commit)",
    "STORAGE_DRIVER=local-fs",
    "LOCAL_MEDIA_ROOT=D:\\leela-archive-media",
    `ARCHIVE_PASSPHRASE_HASH=${passphraseHash}`,
    `ARCHIVE_SESSION_SECRET=${sessionSecret}`,
    "",
  ].join("\n");

  writeFileSync(envPath, contents, { encoding: "utf8", mode: 0o600 });
  console.log(
    "Created .env.local with a generated session secret and scrypt hash. Run `node scripts/generate-auth-env.mjs` interactively to set your own passphrase hash."
  );
}

async function runInteractive() {
  const passphrase = await promptHiddenPassphrase();
  if (!passphrase || passphrase.length > 256) {
    console.error("Passphrase must be between 1 and 256 characters.");
    process.exitCode = 1;
    return;
  }

  const passphraseHash = await createPassphraseHash(passphrase);
  const sessionSecret = randomBytes(32).toString("hex");

  console.log("# Paste into .env.local (never commit):");
  console.log(`ARCHIVE_PASSPHRASE_HASH=${passphraseHash}`);
  console.log(`ARCHIVE_SESSION_SECRET=${sessionSecret}`);
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--init-local") {
  await initLocalEnv();
} else if (args.length === 0) {
  await runInteractive();
} else {
  console.error(
    "Usage: node scripts/generate-auth-env.mjs [--init-local]\nPassphrases are never accepted as CLI arguments."
  );
  process.exitCode = 1;
}
