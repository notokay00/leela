import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  formatArtefactTypeLabel,
  formatLanguageMetadata,
} from "@/lib/correspondence/collection";
import type { CorrespondenceCatalogueEntry } from "@/lib/correspondence/types";

export interface CorrespondenceCatalogueProps {
  entries: readonly CorrespondenceCatalogueEntry[];
  basePath: string;
  isTestHarness?: boolean;
}

/**
 * Correspondence (`AU/II`) Editorial Literary Catalogue — Server Component.
 *
 * Designed as a quiet table of contents for a private literary volume capable
 * of holding 25–50+ artefacts without cards, inbox rows, chat bubbles, or
 * unnecessary pagination. Never renders full poem text or auto-excerpts.
 */
export function CorrespondenceCatalogue({
  entries,
  basePath,
  isTestHarness = false,
}: CorrespondenceCatalogueProps) {
  const countLabel =
    entries.length === 1
      ? "1 literary artefact"
      : `${entries.length} literary artefacts`;

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

      {/* Room identity & quiet literary introduction */}
      <header className="mb-10 sm:mb-14">
        <p className="font-mono text-[11px] tracking-[0.2em] text-paper-ink-muted uppercase">
          II · AU/II
        </p>

        <h1 className="mt-3 font-serif text-3xl font-normal tracking-[0.02em] text-paper-ink sm:text-[2.35rem]">
          Correspondence
        </h1>

        <p className="mt-3 max-w-xl font-serif text-lg leading-relaxed text-paper-ink-secondary italic">
          Poetry, letters, and pages kept in ink.
        </p>

        <p className="mt-4 font-mono text-[11px] tracking-[0.16em] text-paper-ink-muted uppercase">
          {countLabel}
        </p>
      </header>

      {/* Editorial Collection Catalogue or quiet empty state */}
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
        <nav aria-label="Correspondence literary catalogue">
          <ol className="border-t border-paper-hairline">
            {entries.map((entry) => {
              const typeLabel = formatArtefactTypeLabel(
                entry.type,
                entry.customTypeLabel
              );
              const languageMeta = formatLanguageMetadata(
                entry.language,
                entry.script,
                entry.languageLabel
              );
              const isDevanagariTitle =
                entry.title !== undefined &&
                entry.script === "Devanagari";
              const accessibleLabel = entry.title
                ? `${entry.catalogNumber} — ${entry.title} (${typeLabel})`
                : `${entry.catalogNumber} (${typeLabel})`;

              return (
                <li
                  key={entry.id}
                  className="border-b border-paper-hairline"
                >
                  <Link
                    href={`${basePath}/${entry.slug}`}
                    aria-label={accessibleLabel}
                    className="threshold-control group flex flex-col gap-2 px-1 py-5 transition-colors hover:bg-paper-surface/65 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-3 sm:py-6"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-6">
                      <span
                        className={cn(
                          "shrink-0 font-mono tracking-[0.14em]",
                          entry.title
                            ? "w-24 text-[11px] text-paper-ink-muted"
                            : "text-sm text-paper-ink"
                        )}
                      >
                        {entry.catalogNumber}
                      </span>

                      {(entry.title || entry.summary) && (
                        <div className="min-w-0 flex-1">
                          {entry.title && (
                            <span
                              lang={
                                isDevanagariTitle ? entry.language : undefined
                              }
                              className={cn(
                                "block text-paper-ink transition-colors group-hover:text-paper-ink",
                                isDevanagariTitle
                                  ? "font-devanagari text-xl leading-relaxed tracking-normal"
                                  : "font-serif text-xl leading-snug tracking-[0.01em] sm:text-[1.35rem]"
                              )}
                            >
                              {entry.title}
                            </span>
                          )}

                          {entry.summary && (
                            <span className="mt-1.5 block font-sans text-sm leading-relaxed text-paper-ink-secondary">
                              {entry.summary}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.14em] text-paper-ink-muted uppercase sm:shrink-0 sm:justify-end">
                      <span>{typeLabel}</span>
                      {entry.script !== "Latin" && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{languageMeta}</span>
                        </>
                      )}
                      {entry.createdAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{entry.createdAt}</span>
                        </>
                      )}
                    </div>
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
