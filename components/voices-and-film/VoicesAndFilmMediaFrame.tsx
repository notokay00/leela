"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type {
  MediaAspectClassKey,
  VoicesAndFilmClientItem,
} from "@/lib/voices-and-film/types";

export interface VoicesAndFilmMediaFrameProps {
  item: VoicesAndFilmClientItem;
  treatment: "listening-alcove" | "playful-reel" | "standalone-feature";
  indexInSection: number;
  registerMedia: (id: string, element: HTMLMediaElement | null) => void;
  onMediaPlay: (id: string) => void;
}

const ASPECT_CLASS_BY_KEY: Record<MediaAspectClassKey, string> = {
  "portrait-tall": "vf-aspect-portrait-tall",
  portrait: "vf-aspect-portrait",
  square: "vf-aspect-square",
  "landscape-classic": "vf-aspect-landscape-classic",
  "landscape-wide": "vf-aspect-landscape-wide",
  natural: "vf-aspect-natural",
};

/**
 * Individual playback frame for Movement III — Voices & Film.
 *
 * - Uses native `<video controls preload="none" playsInline>` (never autoplays,
 *   never preloads eagerly on room entry, preserves original aspect ratio and
 *   screen-recording UI without cropping).
 * - Avoids continuous React renders: state updates strictly on discrete native
 *   `play` / `pause` / `ended` events (never on `timeupdate`).
 * - When an approved audio derivative exists alongside a `voice-screen-recording`,
 *   provides an understated source toggle while preserving the original screen
 *   recording as the default source artefact.
 */
export function VoicesAndFilmMediaFrame({
  item,
  treatment,
  indexInSection,
  registerMedia,
  onMediaPlay,
}: VoicesAndFilmMediaFrameProps) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [playbackState, setPlaybackState] = useState<
    "idle" | "playing" | "paused" | "ended"
  >("idle");
  const [playbackMode, setPlaybackMode] = useState<"source" | "audio-only">(
    "source"
  );

  const isListeningSpace = treatment === "listening-alcove";
  const hasAudioDerivative = Boolean(item.audioDerivative);
  const showingAudioOnly =
    isListeningSpace && hasAudioDerivative && playbackMode === "audio-only";

  const setMediaElement = useCallback(
    (node: HTMLMediaElement | null) => {
      mediaRef.current = node;
      registerMedia(item.id, node);
    },
    [item.id, registerMedia]
  );

  useEffect(() => {
    return () => {
      registerMedia(item.id, null);
    };
  }, [item.id, registerMedia]);

  const handlePlayToggle = useCallback(() => {
    const el = mediaRef.current;
    if (!el) {
      return;
    }
    if (el.paused || el.ended) {
      if (el.ended) {
        el.currentTime = 0;
      }
      void el.play().catch(() => {
        setPlaybackState("paused");
      });
    } else {
      el.pause();
    }
  }, []);

  const handleReplay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) {
      return;
    }
    el.currentTime = 0;
    void el.play().catch(() => {
      setPlaybackState("paused");
    });
  }, []);

  const handleModeSwitch = useCallback((nextMode: "source" | "audio-only") => {
    const el = mediaRef.current;
    if (el && !el.paused) {
      el.pause();
    }
    setPlaybackState("idle");
    setPlaybackMode(nextMode);
  }, []);

  const accessibleLabel = item.title
    ? item.title
    : item.mediaType === "voice-screen-recording"
      ? `Voice screen recording ${indexInSection + 1}`
      : `Video recording ${indexInSection + 1}`;

  const aspectClass = ASPECT_CLASS_BY_KEY[item.aspectClassKey];

  // Playful asymmetric horizontal rhythm for "Ahhh i am in love again" on desktop
  const playfulAlignmentClass =
    treatment === "playful-reel"
      ? indexInSection % 3 === 0
        ? "md:mr-auto md:max-w-[38rem]"
        : indexInSection % 3 === 1
          ? "md:ml-auto md:max-w-[35rem]"
          : "md:mx-auto md:max-w-[42rem]"
      : undefined;

  if (isListeningSpace) {
    return (
      <article className="vf-listening-card mx-auto w-full max-w-[30rem]">
        <div className="vf-listening-stage">
          {showingAudioOnly && item.audioDerivative ? (
            <div className="flex flex-col items-center justify-center px-5 py-8">
              <audio
                ref={setMediaElement}
                controls
                preload="none"
                controlsList="nodownload"
                aria-label={`${accessibleLabel} — audio`}
                onPlay={() => {
                  setPlaybackState("playing");
                  onMediaPlay(item.id);
                }}
                onPause={() => {
                  setPlaybackState((prev) =>
                    prev === "ended" ? "ended" : "paused"
                  );
                }}
                onEnded={() => setPlaybackState("ended")}
                className="w-full"
              >
                <source
                  src={item.audioDerivative.src}
                  type={item.audioDerivative.mimeType}
                />
              </audio>
            </div>
          ) : (
            <div className={cn("vf-screen-frame", aspectClass)}>
              <video
                ref={setMediaElement}
                controls
                playsInline
                preload="none"
                poster={item.posterSrc}
                aria-label={accessibleLabel}
                onPlay={() => {
                  setPlaybackState("playing");
                  onMediaPlay(item.id);
                }}
                onPause={() => {
                  setPlaybackState((prev) =>
                    prev === "ended" ? "ended" : "paused"
                  );
                }}
                onEnded={() => setPlaybackState("ended")}
                className="vf-video-contain"
              >
                <source src={item.src} type={item.mimeType} />
              </video>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePlayToggle}
              aria-pressed={playbackState === "playing"}
              className="vf-pill-control"
            >
              {playbackState === "playing" ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={handleReplay}
              className="vf-pill-control vf-pill-control-subtle"
            >
              Replay
            </button>
          </div>

          {hasAudioDerivative && (
            <div
              role="group"
              aria-label="Recording presentation"
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => handleModeSwitch("source")}
                aria-pressed={playbackMode === "source"}
                className={cn(
                  "vf-mode-toggle",
                  playbackMode === "source" && "vf-mode-toggle-active"
                )}
              >
                Screen recording
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch("audio-only")}
                aria-pressed={playbackMode === "audio-only"}
                className={cn(
                  "vf-mode-toggle",
                  playbackMode === "audio-only" && "vf-mode-toggle-active"
                )}
              >
                Audio only
              </button>
            </div>
          )}
        </div>

        {(item.title || item.description) && (
          <div className="mt-3 px-1">
            {item.title && (
              <h3 className="font-serif text-lg font-normal text-vf-ink">
                {item.title}
              </h3>
            )}
            {item.description && (
              <p className="mt-1 font-sans text-sm leading-relaxed text-vf-ink-secondary">
                {item.description}
              </p>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "w-full",
        treatment === "standalone-feature"
          ? "mx-auto max-w-[44rem]"
          : playfulAlignmentClass
      )}
    >
      <div
        className={cn(
          treatment === "standalone-feature"
            ? "vf-standalone-frame"
            : "vf-playful-frame"
        )}
      >
        <div className={cn("vf-video-shell", aspectClass)}>
          <video
            ref={setMediaElement}
            controls
            playsInline
            preload="none"
            poster={item.posterSrc}
            aria-label={accessibleLabel}
            onPlay={() => {
              setPlaybackState("playing");
              onMediaPlay(item.id);
            }}
            onPause={() => {
              setPlaybackState((prev) =>
                prev === "ended" ? "ended" : "paused"
              );
            }}
            onEnded={() => setPlaybackState("ended")}
            className="vf-video-contain"
          >
            <source src={item.src} type={item.mimeType} />
          </video>
        </div>
      </div>

      {treatment !== "standalone-feature" &&
        (item.title || item.description) && (
          <div className="mt-3.5 px-1">
            {item.title && (
              <h3 className="font-serif text-xl font-normal text-vf-ink">
                {item.title}
              </h3>
            )}
            {item.description && (
              <p className="mt-1 font-sans text-sm leading-relaxed text-vf-ink-secondary">
                {item.description}
              </p>
            )}
          </div>
        )}
    </article>
  );
}
