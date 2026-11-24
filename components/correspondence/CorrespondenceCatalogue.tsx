import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CorrespondenceCatalogueEntry } from "@/lib/correspondence/types";

export interface CorrespondenceCatalogueProps {
  entries: readonly CorrespondenceCatalogueEntry[];
  basePath: string;
  isTestHarness?: boolean;
}

/**
 * Correspondence Editorial Collection Overview — Server Component.
 *
 * Quiet, title-led literary table of contents designed for 25–50+ artefacts
 * without cards, technical catalogue codes, script labels, or inbox chrome.
 * Internal IDs, slugs, and collection ordering remain preserved under the hood.
 */
export function CorrespondenceCatalogue({
  entries,
  basePath,
  isTestHarness = false,
}: CorrespondenceCatalogueProps) {
  return (
    <div className="correspondence-container mx-auto w-full max-w-[var(--max-width-index)]">
      {isTestHarness && (
        <div
          role="note"
          className="mb-8 border-b border-paper-hairline pb-2.5 font-mono text-[10px] tracking-[0.22em] text-paper-ink-secondary uppercase"
        >
          TEST FIXTURES — NOT ARCHIVE CONTENT
        </div>
      )}

      {/* Quiet literary chamber heading */}
      <header className="mb-10 sm:mb-14">
        <h1 className="font-serif text-3xl font-normal tracking-[0.02em] text-paper-ink sm:text-[2.35rem]">
          Correspondence
        </h1>

        <p className="mt-3 max-w-xl font-serif text-lg leading-relaxed text-paper-ink-secondary italic">
          Poetry, letters, and pages kept in ink.
        </p>
      </header>

      {/* Title-led editorial list or quiet empty state */}
      {entries.length === 0 ? (
        <section
          aria-label="Correspondence collection"
          className="border-t border-b border-paper-hairline py-20 text-center"
        >
          <p className="font-serif text-lg text-paper-ink-secondary italic">
            No literary artefacts are available here yet.
          </p>
        </section>
      ) : (
        <nav aria-label="Correspondence collection">
          <ol className="border-t border-paper-hairline">
            {entries.map((entry) => {
              const isDevanagariTitle =
                entry.title !== undefined && entry.script === "Devanagari";

              return (
                <li
                  key={entry.id}
                  className="border-b border-paper-hairline"
                >
                  <Link
                    href={`${basePath}/${entry.slug}`}
                    aria-label={entry.title ?? "Read entry"}
                    className="threshold-control group flex flex-col gap-1.5 px-1 py-5 transition-colors hover:bg-paper-surface/65 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-3 sm:py-6"
                  >
                    <div className="min-w-0 flex-1">
                      {entry.title ? (
                        <span
                          lang={isDevanagariTitle ? entry.language : undefined}
                          className={cn(
                            "block text-paper-ink transition-colors group-hover:text-paper-ink",
                            isDevanagariTitle
                              ? "font-devanagari text-xl leading-relaxed tracking-normal sm:text-[1.35rem]"
                              : "font-serif text-xl leading-snug tracking-[0.01em] sm:text-[1.35rem]"
                          )}
                        >
                          {entry.title}
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="block font-serif text-xl leading-snug text-paper-ink-secondary"
                        >
                          —
                        </span>
                      )}

                      {entry.summary && (
                        <span className="mt-1.5 block font-sans text-sm leading-relaxed text-paper-ink-secondary">
                          {entry.summary}
                        </span>
                      )}
                    </div>

                    {entry.createdAt && (
                      <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-paper-ink-muted uppercase">
                        {entry.createdAt}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </div>
  );
}
