import Link from "next/link";

export default function ArchiveNotFoundPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center text-ink">
      <p className="font-mono text-xs tracking-[0.22em] text-ink-dim uppercase">
        404
      </p>
      <h1 className="mt-4 font-serif text-2xl font-normal tracking-[0.06em] text-ink">
        This page is not part of the archive.
      </h1>
      <Link
        href="/"
        className="threshold-control mt-8 font-mono text-[11px] tracking-[0.22em] text-ink-secondary uppercase hover:text-ink"
      >
        Threshold
      </Link>
    </main>
  );
}
