import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  formatArtefactTypeLabel,
  formatLanguageMetadata,
  getReadingTextClass,
} from "@/lib/correspondence/collection";
import type {
  CorrespondenceArtefact,
  ReaderNavigation,
} from "@/lib/correspondence/types";

export interface CorrespondenceReaderProps {
  artefact: CorrespondenceArtefact;
  navigation: ReaderNavigation;
  basePath: string;
  isTestHarness?: boolean;
}

/**
 * Focused individual reading surface for a single Correspondence literary
 * artefact — Server Component.
 *
 * - Always renders the complete, static, unmodified `originalText` as safe
 *   text nodes preserving exact UTF-8 characters and intentional line breaks.
 * - Keeps separate translations clearly labelled beneath a quiet divider
 *   without ever replacing the original writing.
 * - Previous/Next navigation operates strictly across permitted artefacts.
 */
export function CorrespondenceReader({
  artefact,
  navigation,
  basePath,
  isTestHarness = false,
}: CorrespondenceReaderProps) {
  const typeLabel = formatArtefactTypeLabel(
    artefact.type,
    artefact.customTypeLabel
  );
  const languageMeta = formatLanguageMetadata(
    artefact.language,
    artefact.script,
    artefact.languageLabel
  );
  const readingClass = getReadingTextClass(artefact.script, artefact.language);
  const isDevanagariHeading =
    artefact.title !== undefined && artefact.script === "Devanagari";

  const previousLabel = navigation.previous
    ? `Previous literary artefact: ${navigation.previous.catalogNumber}${
        navigation.previous.title
          ? ` — ${navigation.previous.title}`
          : ` (${formatArtefactTypeLabel(
              navigation.previous.type,
              navigation.previous.customTypeLabel
            )})`
      }`
    : undefined;

  const nextLabel = navigation.next
    ? `Next literary artefact: ${navigation.next.catalogNumber}${
        navigation.next.title
          ? ` — ${navigation.next.title}`
          : ` (${formatArtefactTypeLabel(
              navigation.next.type,
              navigation.next.customTypeLabel
            )})`
      }`
    : undefined;

  return (
    <div className="correspondence-container mx-auto w-full max-w-[var(--max-width-reading)]">
      {isTestHarness && (
        <div
          role="note"
          className="mb-8 border-b border-paper-hairline pb-2.5 font-mono text-[10px] tracking-[0.22em] text-paper-ink-secondary uppercase"
        >
          TEST FIXTURES — NOT ARCHIVE CONTENT
        </div>
      )}

      {/* Quiet return to collection */}
      <div className="mb-10 sm:mb-12">
        <Link
          href={basePath}
          className="threshold-control inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-paper-ink-secondary uppercase hover:text-paper-ink"
        >
          <span aria-hidden="true">←</span>
          <span>Correspondence</span>
        </Link>
      </div>

      {/* Individual literary artefact sheet */}
      <article aria-labelledby="artefact-heading" className="pb-12 sm:pb-16">
        <header className="mb-10 border-b border-paper-hairline pb-7 sm:mb-12 sm:pb-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.16em] text-paper-ink-muted uppercase">
            {artefact.title && (
              <>
                <span>{artefact.catalogNumber}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{languageMeta}</span>
            {artefact.createdAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>{artefact.createdAt}</span>
              </>
            )}
          </div>

          {artefact.title ? (
            <h1
              id="artefact-heading"
              lang={isDevanagariHeading ? artefact.language : undefined}
              className={cn(
                "mt-4 font-normal text-paper-ink",
                isDevanagariHeading
                  ? "font-devanagari text-2xl leading-relaxed tracking-normal sm:text-[2rem]"
                  : "font-serif text-3xl leading-tight tracking-[0.015em] sm:text-[2.25rem]"
              )}
            >
              {artefact.title}
            </h1>
          ) : (
            <h1
              id="artefact-heading"
              className="mt-4 font-mono text-base font-normal tracking-[0.16em] text-paper-ink uppercase"
            >
              {artefact.catalogNumber}
            </h1>
          )}

          {artefact.type === "fragment" && artefact.sourceContext && (
            <p className="mt-3 font-sans text-sm leading-relaxed text-paper-ink-secondary">
              {artefact.sourceContext}
            </p>
          )}
        </header>

        {/* Complete original literary text — static, unmodified, rendered safely as text */}
        <section aria-label="Original text" className="py-2 sm:py-4">
          {artefact.type === "letter" && artefact.salutation && (
            <p
              lang={artefact.language}
              className={cn(
                "mb-7 text-paper-ink",
                artefact.script === "Devanagari"
                  ? "font-devanagari text-xl leading-relaxed tracking-normal"
                  : "font-serif text-xl leading-relaxed italic"
              )}
            >
              {artefact.salutation}
            </p>
          )}

          <div
            lang={artefact.language}
            data-artefact-script={artefact.script}
            className={cn(readingClass, "text-paper-ink")}
          >
            {artefact.originalText}
          </div>

          {artefact.type === "letter" && artefact.signOff && (
            <p
              lang={artefact.language}
              className={cn(
                "mt-9 whitespace-pre-wrap text-paper-ink-secondary",
                artefact.script === "Devanagari"
                  ? "font-devanagari text-lg leading-relaxed tracking-normal"
                  : "font-serif text-lg leading-relaxed italic"
              )}
            >
              {artefact.signOff}
            </p>
          )}
        </section>

        {/* Optional separate translations — never replace originalText */}
        {artefact.translations && artefact.translations.length > 0 && (
          <div className="mt-14 space-y-10 border-t border-paper-hairline pt-10 sm:mt-16 sm:pt-12">
            {artefact.translations.map((translation, index) => {
              const translationClass = getReadingTextClass(
                translation.script,
                translation.language
              );
              const headingId = `artefact-translation-${index}`;

              return (
                <section
                  key={`${translation.language}-${translation.script}-${index}`}
                  aria-labelledby={headingId}
                  className="bg-paper-elevated/70 px-5 py-6 sm:px-7 sm:py-8"
                >
                  <h2
                    id={headingId}
                    className="font-mono text-[10px] tracking-[0.2em] text-paper-ink-muted uppercase"
                  >
                    Translation · {translation.languageLabel}
                  </h2>

                  {translation.title && (
                    <p
                      lang={translation.language}
                      className="mt-3 font-serif text-xl text-paper-ink"
                    >
                      {translation.title}
                    </p>
                  )}

                  <div
                    lang={translation.language}
                    className={cn(
                      translationClass,
                      "mt-5 text-paper-ink-secondary"
                    )}
                  >
                    {translation.text}
                  </div>

                  {translation.translatorNote && (
                    <p className="mt-6 border-t border-paper-hairline pt-4 font-sans text-xs leading-relaxed text-paper-ink-muted">
                      {translation.translatorNote}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* Optional editorial note — only when explicitly supplied */}
        {artefact.editorialNote && (
          <aside
            aria-label="Editorial note"
            className="mt-12 border-t border-paper-hairline pt-6"
          >
            <p className="font-mono text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase">
              Editorial Note
            </p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-paper-ink-secondary">
              {artefact.editorialNote}
            </p>
          </aside>
        )}
      </article>

      {/* Restrained Previous / Next navigation strictly across permitted artefacts */}
      <nav
        aria-label="Artefact navigation"
        className="border-t border-paper-hairline pt-8"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-start">
          <div className="min-w-0">
            {navigation.previous ? (
              <Link
                href={`${basePath}/${navigation.previous.slug}`}
                aria-label={previousLabel}
                className="threshold-control group block text-left"
              >
                <span className="block font-mono text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase group-hover:text-paper-ink">
                  ← Previous
                </span>
                <span className="mt-1.5 block font-mono text-[11px] tracking-[0.12em] text-paper-ink-secondary">
                  {navigation.previous.catalogNumber}
                </span>
                {navigation.previous.title && (
                  <span className="mt-0.5 block truncate font-serif text-base text-paper-ink">
                    {navigation.previous.title}
                  </span>
                )}
              </Link>
            ) : (
              <span className="block font-mono text-[10px] tracking-[0.18em] text-paper-ink-dim uppercase opacity-60">
                Beginning of collection
              </span>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-center">
            {navigation.total > 0 && navigation.position > 0 && (
              <span className="font-mono text-[11px] tracking-[0.16em] text-paper-ink-muted">
                {navigation.position} / {navigation.total}
              </span>
            )}
            <Link
              href={basePath}
              className="threshold-control mt-1.5 font-mono text-[10px] tracking-[0.18em] text-paper-ink-secondary uppercase hover:text-paper-ink"
            >
              Catalogue
            </Link>
          </div>

          <div className="min-w-0 sm:text-right">
            {navigation.next ? (
              <Link
                href={`${basePath}/${navigation.next.slug}`}
                aria-label={nextLabel}
                className="threshold-control group block sm:text-right"
              >
                <span className="block font-mono text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase group-hover:text-paper-ink">
                  Next →
                </span>
                <span className="mt-1.5 block font-mono text-[11px] tracking-[0.12em] text-paper-ink-secondary">
                  {navigation.next.catalogNumber}
                </span>
                {navigation.next.title && (
                  <span className="mt-0.5 block truncate font-serif text-base text-paper-ink">
                    {navigation.next.title}
                  </span>
                )}
              </Link>
            ) : (
              <span className="block font-mono text-[10px] tracking-[0.18em] text-paper-ink-dim uppercase opacity-60">
                End of collection
              </span>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
