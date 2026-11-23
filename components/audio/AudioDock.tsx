"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatAudioStatusLabel } from "@/lib/audio/state";
import { useAudio } from "./AudioProvider";

/**
 * Persistent root-level Audio Dock mounted inside `app/layout.tsx`.
 * Stays mounted across archive room transitions; hidden on the Threshold ("/")
 * so the entry composition remains pure void.
 */
export function AudioDock() {
  const pathname = usePathname();
  const { state, togglePlayback, setVolume, toggleMute } = useAudio();
  const [volumeExpanded, setVolumeExpanded] = useState(false);
  const volumePanelId = useId();
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!volumeExpanded) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVolumeExpanded(false);
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setVolumeExpanded(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [volumeExpanded]);

  if (pathname === "/") {
    return null;
  }

  const isPlaying = state.status === "playing";
  const isWaiting = state.status === "waiting";
  const isUnavailable = !state.available || state.status === "unavailable";
  const statusLabel = formatAudioStatusLabel(state.status);
  const effectiveVolume = state.muted ? 0 : state.volume;
  const volumePercent = Math.round(effectiveVolume * 100);

  return (
    <aside
      ref={dockRef}
      aria-label="Archive audio dock"
      data-audio-status={state.status}
      className="audio-dock-position fixed z-40"
    >
      <div className="flex items-center gap-3 border border-hairline bg-void/90 px-3.5 py-2 text-ink backdrop-blur-sm">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={isUnavailable}
          aria-pressed={isPlaying}
          aria-label={
            isUnavailable
              ? "Audio unavailable — no authorized recording connected"
              : isPlaying
                ? "Pause audio"
                : "Play audio"
          }
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center text-ink-secondary transition-colors",
            isUnavailable
              ? "cursor-not-allowed opacity-40"
              : "cursor-pointer hover:text-ink"
          )}
        >
          {isPlaying ? (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="1.5" y="1" width="2.2" height="8" />
              <rect x="6.3" y="1" width="2.2" height="8" />
            </svg>
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="2,1 9,5 2,9" />
            </svg>
          )}
        </button>

        <div className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] tracking-[0.06em]">
          <span className="max-w-[14rem] truncate text-ink-secondary sm:max-w-[18rem]">
            {state.cueTitle}
          </span>
          <span
            aria-live="polite"
            className="shrink-0 text-[10px] tracking-[0.08em] text-ink-dim uppercase"
          >
            {isWaiting ? "buffering" : statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 border-l border-hairline pl-2.5">
          {volumeExpanded && (
            <div
              id={volumePanelId}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={state.muted}
                aria-label={state.muted ? "Unmute audio" : "Mute audio"}
                className="cursor-pointer font-mono text-[10px] tracking-[0.08em] text-ink-dim uppercase hover:text-ink"
              >
                {state.muted ? "muted" : `${volumePercent}%`}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={effectiveVolume}
                onChange={(event) => setVolume(Number(event.target.value))}
                aria-label="Audio volume"
                aria-valuetext={`${volumePercent} percent`}
                className="h-1 w-16 cursor-pointer accent-ink"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setVolumeExpanded((open) => !open)}
            aria-expanded={volumeExpanded}
            aria-controls={volumePanelId}
            aria-label={
              volumeExpanded
                ? "Collapse volume control"
                : "Expand volume control"
            }
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center text-ink-secondary transition-colors hover:text-ink"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <path d="M1.5 4.5H3.8L6.5 2.2V9.8L3.8 7.5H1.5V4.5Z" />
              {!state.muted && effectiveVolume > 0 ? (
                <path d="M8.5 4.1C9.2 4.7 9.6 5.3 9.6 6C9.6 6.7 9.2 7.3 8.5 7.9" />
              ) : (
                <path d="M8.5 4.4L10.7 7.6M10.7 4.4L8.5 7.6" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
