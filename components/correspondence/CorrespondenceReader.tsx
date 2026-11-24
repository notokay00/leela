import Link from "next/link";
import { cn } from "@/lib/cn";
import { getReadingTextClass } from "@/lib/correspondence/collection";
import type {
  CorrespondenceArtefact,
  ReaderNavigation,
} from "@/lib/correspondence/types";
import { ReaderSwipeSurface } from "./ReaderSwipeSurface";

export interface CorrespondenceReaderProps {
  artefact: CorrespondenceArtefact;
  navigation: ReaderNavigation;
  basePath: string;
  isTestHarness?: boolean;
}

/**
 * Focused individual reading surface for a single Correspondence literary
 * artefact — Server Component wrapped in an unobtrusive touch-swipe surface.
 *
 * Presentation prioritises purely:
 * 1. The poem's title (only when supplied; untitled works begin directly with the text).
 * 2. The complete, static, unmodified original text.
 * 3. Quiet Previous and Next navigation (plus mobile horizontal swipe).
 */
export function CorrespondenceReader({
  artefact,
  navigation,
  basePath,
  isTestHarness = false,
}: CorrespondenceReaderProps) {
  const readingClass = getReadingTextClass(artefact.script, artefact.language);
  const isDevanagariHeading =
    artefact.title !== undefined && artefact.script === "Devanagari";

  const previousHref = navigation.previous
    ? `${basePath}/${navigation.previous.slug}`
    : null;
  const nextHref = navigation.next
    ? `${basePath}/${navigation.next.slug}`
    : null;

  const previousLabel = navigation.previous
    ? navigation.previous.title
      ? `Previous: ${navigation.previous.title}`
      : "Previous entry"
    : undefined;

  const nextLabel = navigation.next
    ? navigation.next.title
      ? `Next: ${navigation.next.title}`
      : "Next entry"
    : undefined;

  const isPrevDevanagari =
    navigation.previous?.title !== undefined &&
    navigation.previous.script === "Devanagari";
  const isNextDevanagari =
    navigation.next?.title !== undefined &&
    navigation.next.script === "Devanagari";

  const hasVisibleHeader =
    artefact.title !== undefined ||
    artefact.createdAt !== undefined ||
    (artefact.type === "fragment" && artefact.sourceContext !== undefined);

  return (
    <ReaderSwipeSurface previousHref={previousHref} nextHref={nextHref}>
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

        {/* Individual literary sheet */}
        <article
          aria-labelledby={artefact.title ? "artefact-heading" : undefined}
          aria-label={artefact.title ? undefined : "Correspondence"}
          className="pb-12 sm:pb-16"
        >
          {!artefact.title && (
            <h1 className="sr-only">Correspondence</h1>
          )}

          {hasVisibleHeader && (
            <header className="mb-10 border-b border-paper-hairline pb-7 sm:mb-12 sm:pb-8">
              {artefact.title && (
                <h1
                  id="artefact-heading"
                  lang={isDevanagariHeading ? artefact.language : undefined}
                  className={cn(
                    "font-normal text-paper-ink",
                    isDevanagariHeading
                      ? "font-devanagari text-2xl leading-relaxed tracking-normal sm:text-[2rem]"
                      : "font-serif text-3xl leading-tight tracking-[0.015em] sm:text-[2.25rem]"
                  )}
                >
                  {artefact.title}
                </h1>
              )}

              {artefact.createdAt && (
                <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-paper-ink-muted">
                  {artefact.createdAt}
                </p>
              )}

              {artefact.type === "fragment" && artefact.sourceContext && (
                <p className="mt-3 font-sans text-sm leading-relaxed text-paper-ink-secondary">
                  {artefact.sourceContext}
                </p>
              )}
            </header>
          )}

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

        {/* Quiet Previous / Next navigation strictly across permitted artefacts */}
        <nav
          aria-label="Poem navigation"
          className="border-t border-paper-hairline pt-8"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-start">
            <div className="min-w-0">
              {navigation.previous && previousHref ? (
                <Link
                  href={previousHref}
                  aria-label={previousLabel}
                  className="threshold-control group block text-left"
                >
                  <span className="block font-mono text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase group-hover:text-paper-ink">
                    ← Previous
                  </span>
                  {navigation.previous.title && (
                    <span
                      lang={
                        isPrevDevanagari
                          ? navigation.previous.language
                          : undefined
                      }
                      className={cn(
                        "mt-1.5 block truncate text-paper-ink",
                        isPrevDevanagari
                          ? "font-devanagari text-base leading-relaxed tracking-normal"
                          : "font-serif text-base"
                      )}
                    >
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
              <Link
                href={basePath}
                className="threshold-control font-mono text-[10px] tracking-[0.18em] text-paper-ink-secondary uppercase hover:text-paper-ink"
              >
                Correspondence
              </Link>
            </div>

            <div className="min-w-0 sm:text-right">
              {navigation.next && nextHref ? (
                <Link
                  href={nextHref}
                  aria-label={nextLabel}
                  className="threshold-control group block sm:text-right"
                >
                  <span className="block font-mono text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase group-hover:text-paper-ink">
                    Next →
                  </span>
                  {navigation.next.title && (
                    <span
                      lang={
                        isNextDevanagari ? navigation.next.language : undefined
                      }
                      className={cn(
                        "mt-1.5 block truncate text-paper-ink",
                        isNextDevanagari
                          ? "font-devanagari text-base leading-relaxed tracking-normal"
                          : "font-serif text-base"
                      )}
                    >
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
    </ReaderSwipeSurface>
  );
}
