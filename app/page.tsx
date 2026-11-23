import { connection } from "next/server";
import { cn } from "@/lib/cn";

export default async function ThresholdPlaceholderPage() {
  // Opt into dynamic rendering so Next.js injects the fresh per-request CSP nonce.
  await connection();

  return (
    <main
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center",
        "bg-void px-6 py-16 text-center text-ink"
      )}
    >
      <div className="w-full max-w-xl border border-hairline bg-chamber/70 px-8 py-14 sm:px-14 sm:py-20">
        <p className="font-mono text-xs tracking-[0.28em] text-ink-faint uppercase">
          Private Collection
        </p>

        <h1 className="mt-6 text-4xl font-normal tracking-wide text-ink sm:text-5xl">
          The Archive of Us
        </h1>

        <div
          aria-hidden="true"
          className="mx-auto my-8 h-px w-12 bg-brass/50"
        />

        <p className="text-lg leading-relaxed text-ink-muted italic">
          A quiet room of memories and things left unsaid.
        </p>

        <p className="mt-10 font-mono text-[11px] tracking-[0.22em] text-ink-faint uppercase">
          Threshold · Access Gate Pending
        </p>
      </div>
    </main>
  );
}
