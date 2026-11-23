import { requireSession } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

/**
 * Minimal Phase 1 server-rendered verification route for `/archive`.
 * Independently verifies the session via the server-side DAL (`requireSession`)
 * without exposing exhibition rooms or personal media yet.
 */
export default async function ArchiveVerificationPage() {
  const session = await requireSession();
  const expiresIso = new Date(session.expiresAt * 1000).toISOString();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 py-16 text-center text-ink">
      <div className="w-full max-w-xl border border-hairline bg-chamber/70 px-8 py-14 sm:px-14">
        <p className="font-mono text-xs tracking-[0.26em] text-brass uppercase">
          Authorized Session
        </p>

        <h1 className="mt-6 text-3xl font-normal tracking-wide text-ink sm:text-4xl">
          The Archive of Us
        </h1>

        <div
          aria-hidden="true"
          className="mx-auto my-8 h-px w-12 bg-hairline"
        />

        <p className="text-base leading-relaxed text-ink-muted">
          Server-side authorization verified. Exhibition rooms will be mounted in
          Phase 4.
        </p>

        <p className="mt-8 font-mono text-[11px] tracking-[0.16em] text-ink-faint">
          Session expires · {expiresIso}
        </p>
      </div>
    </main>
  );
}
