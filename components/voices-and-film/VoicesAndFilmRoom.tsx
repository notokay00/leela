"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useAudio } from "@/components/audio/AudioProvider";
import { cn } from "@/lib/cn";
import { resolveExclusivePlaybackTargets } from "@/lib/voices-and-film/collection";
import type { VoicesAndFilmSectionView } from "@/lib/voices-and-film/types";
import { VoicesAndFilmMediaFrame } from "./VoicesAndFilmMediaFrame";

export interface VoicesAndFilmRoomProps {
  sections: readonly VoicesAndFilmSectionView[];
}

/**
 * Movement III — Voices & Film.
 *
 * - Warm, playful, sunlit private listening & screening room contrasting with
 *   Stillness's darkroom and Correspondence's quiet paper.
 * - Presents the three canonical sections in exact order with their exact
 *   human-facing titles (zero Roman numerals, zero `AU/III` codes, zero
 *   fabricated media, thumbnails, or fake waveforms).
 * - Enforces exclusive single-recording playback and coordinates respectfully
 *   with the persistent root `AudioDock` without unexpected audio changes on
 *   room entry and without per-frame React re-renders.
 */
export function VoicesAndFilmRoom({ sections }: VoicesAndFilmRoomProps) {
  const { state: audioState, pause: pauseDock } = useAudio();
  const mediaRegistryRef = useRef<Map<string, HTMLMediaElement>>(new Map());
  const dockStatusRef = useRef(audioState.status);

  useEffect(() => {
    dockStatusRef.current = audioState.status;
  }, [audioState.status]);

  const registerMedia = useCallback(
    (id: string, element: HTMLMediaElement | null) => {
      if (element) {
        mediaRegistryRef.current.set(id, element);
      } else {
        mediaRegistryRef.current.delete(id);
      }
    },
    []
  );

  // When the visitor starts any recording, pause all other room recordings and
  // gently pause the persistent background AudioDock so audio tracks never collide.
  const handleMediaPlay = useCallback(
    (targetId: string) => {
      const { pauseRecordingIds, shouldPauseDock } =
        resolveExclusivePlaybackTargets({
          targetId,
          registeredIds: Array.from(mediaRegistryRef.current.keys()),
          dockStatus: dockStatusRef.current,
        });

      for (const otherId of pauseRecordingIds) {
        const otherEl = mediaRegistryRef.current.get(otherId);
        if (otherEl && !otherEl.paused) {
          otherEl.pause();
        }
      }

      if (shouldPauseDock) {
        pauseDock();
      }
    },
    [pauseDock]
  );

  // Conversely, if the visitor explicitly resumes the persistent AudioDock,
  // pause any active room recording so two audio sources never overlap.
  useEffect(() => {
    if (audioState.status !== "playing") {
      return;
    }
    for (const el of mediaRegistryRef.current.values()) {
      if (!el.paused) {
        el.pause();
      }
    }
  }, [audioState.status]);

  return (
    <div className="voices-film-container mx-auto w-full max-w-[60rem]">
      {/* Restrained, warm editorial introduction */}
      <header className="pt-2 pb-10 sm:pt-4 sm:pb-14">
        <h1 className="font-serif text-[clamp(2rem,1.6rem+1.6vw,3rem)] font-normal tracking-[0.015em] text-vf-ink">
          Voices &amp; Film
        </h1>
        <p className="mt-3 max-w-[34rem] font-serif text-lg leading-relaxed text-vf-ink-secondary italic sm:text-[1.2rem]">
          Voices, laughter, and small moving moments kept as they were.
        </p>

        {/* Responsive section jump navigation — exact human-facing titles only */}
        <nav
          aria-label="Voices and Film sections"
          className="mt-8 flex flex-wrap items-center gap-2.5 sm:mt-9 sm:gap-3"
        >
          {sections.map(({ section }) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "vf-section-jump",
                section.treatment === "listening-alcove" &&
                  "vf-section-jump-listening",
                section.treatment === "playful-reel" &&
                  "vf-section-jump-playful",
                section.treatment === "standalone-feature" &&
                  "vf-section-jump-noice"
              )}
            >
              <span aria-hidden="true" className="vf-section-jump-dot" />
              <span>{section.title}</span>
            </a>
          ))}
        </nav>
      </header>

      {/* Three distinct editorial sections in exact canonical order */}
      <div className="space-y-20 sm:space-y-28">
        {sections.map(({ section, items }) => {
          const headingId = `${section.id}-heading`;

          if (section.treatment === "listening-alcove") {
            return (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={headingId}
                className="vf-section-listening scroll-mt-8"
              >
                <div className="mb-8 flex items-baseline justify-between gap-4 sm:mb-10">
                  <h2
                    id={headingId}
                    className="font-serif text-[clamp(1.6rem,1.35rem+1vw,2.25rem)] font-normal tracking-[0.01em] text-vf-ink"
                  >
                    {section.title}
                  </h2>
                  <span
                    aria-hidden="true"
                    className="vf-listening-indicator"
                  />
                </div>

                {items.length > 0 ? (
                  <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
                    {items.map((item, idx) => (
                      <VoicesAndFilmMediaFrame
                        key={item.id}
                        item={item}
                        treatment={section.treatment}
                        indexInSection={idx}
                        registerMedia={registerMedia}
                        onMediaPlay={handleMediaPlay}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="vf-empty-alcove">
                    <div className="vf-empty-alcove-inner">
                      <span
                        aria-hidden="true"
                        className="vf-empty-listening-motif"
                      >
                        <span className="vf-empty-listening-ring" />
                        <span className="vf-empty-listening-core" />
                      </span>
                      <p className="max-w-[28rem] font-serif text-base leading-relaxed text-vf-ink-secondary italic sm:text-[1.0625rem]">
                        {section.emptyNotice}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            );
          }

          if (section.treatment === "playful-reel") {
            return (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={headingId}
                className="vf-section-playful scroll-mt-8"
              >
                <div className="mb-9 sm:mb-12">
                  <h2
                    id={headingId}
                    className="font-serif text-[clamp(1.7rem,1.4rem+1.15vw,2.45rem)] font-normal tracking-[0.01em] text-vf-ink italic"
                  >
                    {section.title}
                  </h2>
                  <div
                    aria-hidden="true"
                    className="vf-playful-rule mt-4"
                  />
                </div>

                {items.length > 0 ? (
                  <div className="space-y-12 sm:space-y-16">
                    {items.map((item, idx) => (
                      <VoicesAndFilmMediaFrame
                        key={item.id}
                        item={item}
                        treatment={section.treatment}
                        indexInSection={idx}
                        registerMedia={registerMedia}
                        onMediaPlay={handleMediaPlay}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="vf-empty-playful">
                    <div
                      aria-hidden="true"
                      className="vf-empty-playful-frames"
                    >
                      <span className="vf-empty-film-mat vf-empty-film-mat-a" />
                      <span className="vf-empty-film-mat vf-empty-film-mat-b" />
                    </div>
                    <p className="max-w-[27rem] font-serif text-base leading-relaxed text-vf-ink-secondary sm:text-[1.0625rem]">
                      {section.emptyNotice}
                    </p>
                  </div>
                )}
              </section>
            );
          }

          // Section III — "Noice": standalone, unhurried, title alone is sufficient.
          return (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={headingId}
              className="vf-section-noice scroll-mt-8"
            >
              <div className="mx-auto max-w-[44rem] text-center">
                <h2
                  id={headingId}
                  className="font-serif text-[clamp(1.75rem,1.45rem+1.1vw,2.4rem)] font-normal tracking-[0.02em] text-vf-ink"
                >
                  {section.title}
                </h2>

                {items.length > 0 ? (
                  <div className="mt-10 space-y-12 text-left">
                    {items.map((item, idx) => (
                      <VoicesAndFilmMediaFrame
                        key={item.id}
                        item={item}
                        treatment={section.treatment}
                        indexInSection={idx}
                        registerMedia={registerMedia}
                        onMediaPlay={handleMediaPlay}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="vf-empty-noice mt-9">
                    <div
                      aria-hidden="true"
                      className="vf-empty-noice-frame"
                    />
                    <p className="mt-6 font-serif text-base text-vf-ink-muted italic">
                      {section.emptyNotice}
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Quiet forward transition into the concluding movement */}
      <footer className="mt-20 flex justify-end border-t border-[var(--room-voices-film-hairline)]/80 pt-10 sm:mt-24">
        <Link
          href="/archive/cadenza"
          className="threshold-control inline-flex min-h-[2.75rem] items-center gap-2.5 font-serif text-lg tracking-[0.02em] text-vf-ink-secondary italic hover:text-vf-ink"
        >
          <span>Cadenza</span>
          <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </div>
  );
}
