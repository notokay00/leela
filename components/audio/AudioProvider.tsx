"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  clampRestorablePosition,
  computeDeckOutputVolume,
  computeEqualPowerGains,
  DEFAULT_CROSSFADE_DURATION_MS,
  DEFAULT_GENTLE_FADE_IN_MS,
  DEFAULT_GENTLE_FADE_OUT_MS,
  selectDeckTransitionPlan,
  type AudioDeckId,
} from "@/lib/audio/crossfade";
import {
  createInitialSoundtrackIntent,
  reduceSoundtrackIntent,
  resolveTargetSoundtrackForRoute,
  shouldAutoTransitionOnRouteChange,
  shouldRestoreMusicAfterRoomMediaEnded,
  type SoundtrackIntentState,
} from "@/lib/audio/soundtrack";
import type {
  ClientSoundtrackCatalog,
  ClientSoundtrackTrack,
} from "@/lib/audio/soundtrack-types";
import {
  clampVolume,
  createDefaultArchiveClientTrack,
  createInitialAudioState,
  DEFAULT_AUDIO_VOLUME,
  reduceAudioMediaEvent,
  type AudioState,
} from "@/lib/audio/state";

export interface AudioContextValue {
  state: AudioState;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  setVolume: (nextVolume: number) => void;
  toggleMute: () => void;
  enterWithSound: () => void;
  enterInSilence: () => void;
  pauseForRoomMedia: () => void;
  resumeAfterRoomMedia: () => void;
  syncSoundtrackCatalog: (catalog: ClientSoundtrackCatalog) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export interface AudioProviderProps {
  available?: boolean;
  src?: string | null;
  cueTitle?: string;
  archiveTrack?: ClientSoundtrackTrack;
  initialPoemTracks?: readonly ClientSoundtrackTrack[];
  crossfadeDurationMs?: number;
  children: ReactNode;
}

function buildCatalogSignature(catalog: ClientSoundtrackCatalog): string {
  const parts = [
    `${catalog.archiveTrack.id}:${catalog.archiveTrack.available}:${catalog.archiveTrack.src ?? ""}`,
    ...catalog.poemTracks.map(
      (t) => `${t.id}:${t.poemSlug ?? ""}:${t.available}:${t.src ?? ""}`
    ),
  ];
  return parts.join("|");
}

/**
 * Persistent root-level soundtrack provider mounted in `app/layout.tsx`.
 *
 * Internally coordinates two `<audio>` decks (`deckA`, `deckB`) to deliver
 * gradual 2.5-second equal-power crossfades between the archive-wide Rodrigo
 * soundtrack and individual poem compositions while presenting ONE logical
 * active soundtrack and ONE user-facing `AudioDock`.
 *
 * All playback state is strictly driven by genuine HTMLMediaElement events
 * and explicit user intent (Threshold choice, manual pause, silence, and
 * Voices & Film mutual exclusion).
 */
export function AudioProvider({
  available = false,
  src = null,
  cueTitle,
  archiveTrack,
  initialPoemTracks = [],
  crossfadeDurationMs = DEFAULT_CROSSFADE_DURATION_MS,
  children,
}: AudioProviderProps) {
  const pathname = usePathname();
  const deckARef = useRef<HTMLAudioElement>(null);
  const deckBRef = useRef<HTMLAudioElement>(null);

  const initialArchiveTrack = useMemo<ClientSoundtrackTrack>(
    () =>
      archiveTrack ??
      createDefaultArchiveClientTrack({
        available,
        src,
        title: cueTitle,
      }),
    [archiveTrack, available, cueTitle, src]
  );

  const initialCatalog = useMemo<ClientSoundtrackCatalog>(
    () => ({
      archiveTrack: initialArchiveTrack,
      poemTracks: initialPoemTracks,
    }),
    [initialArchiveTrack, initialPoemTracks]
  );

  const catalogRef = useRef<ClientSoundtrackCatalog>(initialCatalog);
  const catalogSignatureRef = useRef<string>(
    buildCatalogSignature(initialCatalog)
  );
  const [catalogVersion, setCatalogVersion] = useState(0);

  const [state, setState] = useState<AudioState>(() =>
    createInitialAudioState({
      available: initialArchiveTrack.available,
      src: initialArchiveTrack.src,
      cueTitle: initialArchiveTrack.title,
      activeTrack: initialArchiveTrack,
    })
  );

  const activeDeckRef = useRef<AudioDeckId>("A");
  const deckTrackRef = useRef<Record<AudioDeckId, ClientSoundtrackTrack | null>>({
    A: null,
    B: null,
  });
  const deckEnvelopeRef = useRef<Record<AudioDeckId, number>>({ A: 0, B: 0 });
  const masterVolumeRef = useRef<number>(DEFAULT_AUDIO_VOLUME);
  const mutedRef = useRef<boolean>(false);
  const intentRef = useRef<SoundtrackIntentState>(
    createInitialSoundtrackIntent()
  );
  const rodrigoSavedTimeRef = useRef<number>(0);
  const transitionTokenRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const isCrossfadingRef = useRef<boolean>(false);
  const activeTrackRef = useRef<ClientSoundtrackTrack>(initialArchiveTrack);
  const pathnameRef = useRef<string>(pathname);
  const previousPathnameRef = useRef<string>(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const getDeckEl = useCallback((deckId: AudioDeckId): HTMLAudioElement | null => {
    return deckId === "A" ? deckARef.current : deckBRef.current;
  }, []);

  const cancelTransitionTimers = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const saveRodrigoTimeFromDeck = useCallback(
    (deckId: AudioDeckId) => {
      const track = deckTrackRef.current[deckId];
      if (!track || track.scope !== "archive") {
        return;
      }
      const el = getDeckEl(deckId);
      if (el && Number.isFinite(el.currentTime) && el.currentTime > 0) {
        rodrigoSavedTimeRef.current = el.currentTime;
      }
    },
    [getDeckEl]
  );

  const applyDeckVolumes = useCallback(() => {
    const decks: AudioDeckId[] = ["A", "B"];
    for (const deckId of decks) {
      const el = getDeckEl(deckId);
      if (!el) {
        continue;
      }
      const track = deckTrackRef.current[deckId];
      el.muted = mutedRef.current;
      el.volume = computeDeckOutputVolume({
        envelope: deckEnvelopeRef.current[deckId],
        masterVolume: masterVolumeRef.current,
        muted: mutedRef.current,
        trackGain: track?.gainMultiplier,
      });
    }
  }, [getDeckEl]);

  const releaseDeck = useCallback(
    (deckId: AudioDeckId) => {
      saveRodrigoTimeFromDeck(deckId);
      // Clear track assignment BEFORE pausing/resetting so synthetic pause/error
      // events fired during deck cleanup are ignored by active-deck listeners.
      deckTrackRef.current[deckId] = null;
      deckEnvelopeRef.current[deckId] = 0;
      const el = getDeckEl(deckId);
      if (el) {
        if (!el.paused) {
          el.pause();
        }
        el.removeAttribute("src");
        el.load();
        el.volume = 0;
      }
    },
    [getDeckEl, saveRodrigoTimeFromDeck]
  );

  const isDeckAudiblyPlaying = useCallback(
    (deckId: AudioDeckId): boolean => {
      const el = getDeckEl(deckId);
      return Boolean(
        el && !el.paused && !el.ended && deckTrackRef.current[deckId] !== null
      );
    },
    [getDeckEl]
  );

  const attachRodrigoPositionRestore = useCallback(
    (el: HTMLAudioElement, track: ClientSoundtrackTrack, token: number) => {
      if (track.scope !== "archive" || rodrigoSavedTimeRef.current <= 0) {
        return;
      }
      const saved = rodrigoSavedTimeRef.current;
      const applySeek = () => {
        if (transitionTokenRef.current !== token) {
          return;
        }
        const safeTarget = clampRestorablePosition(saved, el.duration);
        if (safeTarget > 0) {
          try {
            el.currentTime = safeTarget;
          } catch {
            // Ignore seek rejections before media buffers are seekable.
          }
        }
      };

      if (el.readyState >= 1) {
        applySeek();
      } else {
        el.addEventListener("loadedmetadata", applySeek, { once: true });
      }
    },
    []
  );

  const syncTrackMetadataIntoState = useCallback(
    (
      track: ClientSoundtrackTrack,
      overrides?: Partial<
        Pick<
          AudioState,
          | "status"
          | "isCrossfading"
          | "enteredSilently"
          | "soundPreference"
          | "manuallyPaused"
          | "pausedForRoomMedia"
        >
      >
    ) => {
      activeTrackRef.current = track;
      const usable = track.available && Boolean(track.src);
      setState((prev) => {
        const nextStatus =
          overrides?.status ??
          (!usable
            ? "unavailable"
            : prev.status === "unavailable"
              ? intentRef.current.manuallyPaused
                ? "paused"
                : "idle"
              : prev.status);

        return {
          ...prev,
          available: usable,
          src: usable ? track.src : null,
          cueTitle: track.title,
          activeTrack: track,
          status: nextStatus,
          isCrossfading: overrides?.isCrossfading ?? prev.isCrossfading,
          enteredSilently:
            overrides?.enteredSilently ??
            (intentRef.current.soundPreference === "silence"),
          soundPreference:
            overrides?.soundPreference ?? intentRef.current.soundPreference,
          manuallyPaused:
            overrides?.manuallyPaused ?? intentRef.current.manuallyPaused,
          pausedForRoomMedia:
            overrides?.pausedForRoomMedia ?? intentRef.current.pausedForRoomMedia,
        };
      });
    },
    []
  );

  /**
   * Starts a single track directly on the active deck (used synchronously inside
   * user click gestures for `enterWithSound` / `play` and for gentle post-media
   * restoration).
   */
  const startSingleTrack = useCallback(
    (
      track: ClientSoundtrackTrack,
      options?: { fadeInMs?: number }
    ) => {
      if (!track.available || !track.src) {
        syncTrackMetadataIntoState(track, {
          status: "unavailable",
          isCrossfading: false,
        });
        return;
      }

      const token = ++transitionTokenRef.current;
      cancelTransitionTimers();
      isCrossfadingRef.current = false;

      const activeDeck = activeDeckRef.current;
      const otherDeck: AudioDeckId = activeDeck === "A" ? "B" : "A";
      releaseDeck(otherDeck);

      const el = getDeckEl(activeDeck);
      if (!el) {
        return;
      }

      const loadedSameTrack =
        deckTrackRef.current[activeDeck]?.id === track.id &&
        Boolean(el.getAttribute("src"));

      if (!loadedSameTrack) {
        saveRodrigoTimeFromDeck(activeDeck);
        el.pause();
        el.src = track.src;
        deckTrackRef.current[activeDeck] = track;
        attachRodrigoPositionRestore(el, track, token);
      }

      const fadeInMs = options?.fadeInMs ?? 0;
      const initialEnvelope = fadeInMs > 0 ? 0 : 1;
      deckEnvelopeRef.current[activeDeck] = initialEnvelope;
      el.muted = mutedRef.current;
      el.volume = computeDeckOutputVolume({
        envelope: initialEnvelope,
        masterVolume: masterVolumeRef.current,
        muted: mutedRef.current,
        trackGain: track.gainMultiplier,
      });

      syncTrackMetadataIntoState(track, { isCrossfading: false });

      const playPromise = el.play();
      if (!playPromise) {
        return;
      }

      void playPromise
        .then(() => {
          if (transitionTokenRef.current !== token) {
            return;
          }
          if (fadeInMs <= 0) {
            deckEnvelopeRef.current[activeDeck] = 1;
            applyDeckVolumes();
            return;
          }

          const startedAt = performance.now();
          const completeFadeIn = () => {
            if (transitionTokenRef.current !== token) {
              return;
            }
            cancelTransitionTimers();
            deckEnvelopeRef.current[activeDeck] = 1;
            applyDeckVolumes();
          };

          const step = (now: number) => {
            if (transitionTokenRef.current !== token) {
              return;
            }
            const progress = Math.min(1, (now - startedAt) / fadeInMs);
            const gains = computeEqualPowerGains({
              progress,
              masterVolume: masterVolumeRef.current,
              muted: mutedRef.current,
              outgoingStartEnvelope: 0,
              incomingTrackGain: track.gainMultiplier,
            });
            deckEnvelopeRef.current[activeDeck] = gains.incomingEnvelope;
            applyDeckVolumes();
            if (progress < 1) {
              rafIdRef.current = window.requestAnimationFrame(step);
            } else {
              completeFadeIn();
            }
          };

          rafIdRef.current = window.requestAnimationFrame(step);
          safetyTimerRef.current = window.setTimeout(
            completeFadeIn,
            fadeInMs + 150
          );
        })
        .catch(() => {
          if (transitionTokenRef.current !== token) {
            return;
          }
          setState((prev) =>
            prev.status === "playing" ? prev : { ...prev, status: "paused" }
          );
        });
    },
    [
      applyDeckVolumes,
      attachRodrigoPositionRestore,
      cancelTransitionTimers,
      getDeckEl,
      releaseDeck,
      saveRodrigoTimeFromDeck,
      syncTrackMetadataIntoState,
    ]
  );

  /**
   * Gently fades out any currently playing deck when navigating to a route
   * whose resolved soundtrack is genuinely unavailable.
   */
  const fadeOutToUnavailable = useCallback(
    (unavailableTrack: ClientSoundtrackTrack) => {
      const token = ++transitionTokenRef.current;
      cancelTransitionTimers();

      const plan = selectDeckTransitionPlan({
        activeDeck: activeDeckRef.current,
        deckAPlaying: isDeckAudiblyPlaying("A"),
        deckBPlaying: isDeckAudiblyPlaying("B"),
        deckAEnvelope: deckEnvelopeRef.current.A,
        deckBEnvelope: deckEnvelopeRef.current.B,
      });

      releaseDeck(plan.incomingDeck);
      const outgoingEl = getDeckEl(plan.outgoingDeck);

      if (!outgoingEl || outgoingEl.paused || plan.outgoingStartEnvelope <= 0) {
        releaseDeck(plan.outgoingDeck);
        isCrossfadingRef.current = false;
        syncTrackMetadataIntoState(unavailableTrack, {
          status: "unavailable",
          isCrossfading: false,
        });
        return;
      }

      isCrossfadingRef.current = true;
      const startedAt = performance.now();
      const durationMs = DEFAULT_GENTLE_FADE_OUT_MS;

      const finish = () => {
        if (transitionTokenRef.current !== token) {
          return;
        }
        cancelTransitionTimers();
        releaseDeck("A");
        releaseDeck("B");
        isCrossfadingRef.current = false;
        syncTrackMetadataIntoState(unavailableTrack, {
          status: "unavailable",
          isCrossfading: false,
        });
      };

      const step = (now: number) => {
        if (transitionTokenRef.current !== token) {
          return;
        }
        const progress = Math.min(1, (now - startedAt) / durationMs);
        const gains = computeEqualPowerGains({
          progress,
          masterVolume: masterVolumeRef.current,
          muted: mutedRef.current,
          outgoingStartEnvelope: plan.outgoingStartEnvelope,
          outgoingTrackGain: deckTrackRef.current[plan.outgoingDeck]?.gainMultiplier,
        });
        deckEnvelopeRef.current[plan.outgoingDeck] = gains.outgoingEnvelope;
        applyDeckVolumes();

        if (progress < 1) {
          rafIdRef.current = window.requestAnimationFrame(step);
        } else {
          finish();
        }
      };

      rafIdRef.current = window.requestAnimationFrame(step);
      safetyTimerRef.current = window.setTimeout(finish, durationMs + 150);
    },
    [
      applyDeckVolumes,
      cancelTransitionTimers,
      getDeckEl,
      isDeckAudiblyPlaying,
      releaseDeck,
      syncTrackMetadataIntoState,
    ]
  );

  /**
   * Central 2.5-second equal-power crossfade between the currently audible deck
   * and the destination route's soundtrack. Supersedes unfinished transitions
   * cleanly during rapid poem navigation without uncontrolled overlapping audio.
   */
  const crossfadeToTrack = useCallback(
    (targetTrack: ClientSoundtrackTrack) => {
      if (!targetTrack.available || !targetTrack.src) {
        fadeOutToUnavailable(targetTrack);
        return;
      }

      const token = ++transitionTokenRef.current;
      cancelTransitionTimers();

      const plan = selectDeckTransitionPlan({
        activeDeck: activeDeckRef.current,
        deckAPlaying: isDeckAudiblyPlaying("A"),
        deckBPlaying: isDeckAudiblyPlaying("B"),
        deckAEnvelope: deckEnvelopeRef.current.A,
        deckBEnvelope: deckEnvelopeRef.current.B,
      });

      const outgoingDeck = plan.outgoingDeck;
      const incomingDeck = plan.incomingDeck;
      const outgoingEl = getDeckEl(outgoingDeck);
      const incomingEl = getDeckEl(incomingDeck);

      if (!incomingEl) {
        return;
      }

      const hasAudibleOutgoing = Boolean(
        outgoingEl &&
          !outgoingEl.paused &&
          !outgoingEl.ended &&
          plan.outgoingStartEnvelope > 0
      );

      if (!hasAudibleOutgoing) {
        activeDeckRef.current = incomingDeck;
        startSingleTrack(targetTrack, { fadeInMs: DEFAULT_GENTLE_FADE_IN_MS });
        return;
      }

      // Release any previous unfinished source on the incoming deck before loading.
      releaseDeck(incomingDeck);

      const previousTrack = deckTrackRef.current[outgoingDeck];
      incomingEl.src = targetTrack.src;
      incomingEl.muted = mutedRef.current;
      incomingEl.volume = 0;
      deckTrackRef.current[incomingDeck] = targetTrack;
      deckEnvelopeRef.current[incomingDeck] = 0;

      attachRodrigoPositionRestore(incomingEl, targetTrack, token);

      const playPromise = incomingEl.play();
      if (!playPromise) {
        return;
      }

      isCrossfadingRef.current = true;
      activeDeckRef.current = incomingDeck;
      syncTrackMetadataIntoState(targetTrack, {
        isCrossfading: true,
      });

      void playPromise
        .then(() => {
          if (transitionTokenRef.current !== token) {
            // Superseded by a newer navigation before playback began: stop cleanly.
            if (!incomingEl.paused) {
              incomingEl.pause();
            }
            return;
          }

          const startedAt = performance.now();
          const durationMs = Math.max(250, crossfadeDurationMs);
          const outgoingStartEnvelope = plan.outgoingStartEnvelope;

          const completeCrossfade = () => {
            if (transitionTokenRef.current !== token) {
              return;
            }
            cancelTransitionTimers();
            releaseDeck(outgoingDeck);
            deckEnvelopeRef.current[incomingDeck] = 1;
            applyDeckVolumes();
            isCrossfadingRef.current = false;
            setState((prev) => ({
              ...prev,
              status: incomingEl.paused ? prev.status : "playing",
              isCrossfading: false,
            }));
          };

          const step = (now: number) => {
            if (transitionTokenRef.current !== token) {
              return;
            }
            const progress = Math.min(1, (now - startedAt) / durationMs);
            const gains = computeEqualPowerGains({
              progress,
              masterVolume: masterVolumeRef.current,
              muted: mutedRef.current,
              outgoingStartEnvelope,
              outgoingTrackGain: previousTrack?.gainMultiplier,
              incomingTrackGain: targetTrack.gainMultiplier,
            });

            deckEnvelopeRef.current[outgoingDeck] = gains.outgoingEnvelope;
            deckEnvelopeRef.current[incomingDeck] = gains.incomingEnvelope;
            applyDeckVolumes();

            if (progress < 1) {
              rafIdRef.current = window.requestAnimationFrame(step);
            } else {
              completeCrossfade();
            }
          };

          rafIdRef.current = window.requestAnimationFrame(step);
          safetyTimerRef.current = window.setTimeout(
            completeCrossfade,
            durationMs + 150
          );
        })
        .catch(() => {
          if (transitionTokenRef.current !== token) {
            return;
          }
          // Incoming poem audio failed to start: release it and keep outgoing bed cleanly intact.
          releaseDeck(incomingDeck);
          activeDeckRef.current = outgoingDeck;
          isCrossfadingRef.current = false;
          if (previousTrack) {
            deckEnvelopeRef.current[outgoingDeck] = 1;
            applyDeckVolumes();
            syncTrackMetadataIntoState(previousTrack, {
              status: outgoingEl && !outgoingEl.paused ? "playing" : "paused",
              isCrossfading: false,
            });
          } else {
            setState((prev) => ({
              ...prev,
              status: "error",
              isCrossfading: false,
            }));
          }
        });
    },
    [
      applyDeckVolumes,
      attachRodrigoPositionRestore,
      cancelTransitionTimers,
      crossfadeDurationMs,
      fadeOutToUnavailable,
      getDeckEl,
      isDeckAudiblyPlaying,
      releaseDeck,
      startSingleTrack,
      syncTrackMetadataIntoState,
    ]
  );

  // Attach genuine HTMLMediaElement event listeners to both internal decks;
  // only the logical active deck updates visible AudioState.status.
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const decks: AudioDeckId[] = ["A", "B"];

    for (const deckId of decks) {
      const audio = deckId === "A" ? deckARef.current : deckBRef.current;
      if (!audio) {
        continue;
      }

      audio.volume = 0;
      audio.muted = mutedRef.current;

      const onPlaying = () => {
        if (
          activeDeckRef.current !== deckId ||
          deckTrackRef.current[deckId] === null
        ) {
          return;
        }
        setState((prev) => reduceAudioMediaEvent(prev, "playing"));
      };
      const onWaiting = () => {
        if (
          activeDeckRef.current !== deckId ||
          deckTrackRef.current[deckId] === null
        ) {
          return;
        }
        setState((prev) => reduceAudioMediaEvent(prev, "waiting"));
      };
      const onPause = () => {
        if (
          activeDeckRef.current !== deckId ||
          deckTrackRef.current[deckId] === null
        ) {
          return;
        }
        setState((prev) =>
          audio.ended
            ? reduceAudioMediaEvent(prev, "ended")
            : reduceAudioMediaEvent(prev, "pause")
        );
      };
      const onEnded = () => {
        if (
          activeDeckRef.current !== deckId ||
          deckTrackRef.current[deckId] === null
        ) {
          return;
        }
        setState((prev) => reduceAudioMediaEvent(prev, "ended"));
      };
      const onError = () => {
        if (
          activeDeckRef.current !== deckId ||
          deckTrackRef.current[deckId] === null
        ) {
          return;
        }
        // Ignore empty-src cleanup events fired during deck release.
        if (!audio.getAttribute("src")) {
          return;
        }
        setState((prev) => reduceAudioMediaEvent(prev, "error"));
      };

      audio.addEventListener("playing", onPlaying);
      audio.addEventListener("waiting", onWaiting);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);

      cleanups.push(() => {
        audio.removeEventListener("playing", onPlaying);
        audio.removeEventListener("waiting", onWaiting);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
      });
    }

    return () => {
      cancelTransitionTimers();
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [cancelTransitionTimers]);

  // Synchronize route changes & authenticated soundtrack catalog updates into
  // the single central soundtrack controller.
  useEffect(() => {
    const prevPath = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    const leftRoomMedia =
      prevPath.startsWith("/archive/voices-and-film") &&
      !pathname.startsWith("/archive/voices-and-film");

    intentRef.current = reduceSoundtrackIntent(intentRef.current, {
      type: "route-changed",
      leftRoomMedia,
    });

    const { track: targetTrack } = resolveTargetSoundtrackForRoute(
      pathname,
      catalogRef.current
    );

    const currentTrack = activeTrackRef.current;
    const isSameTrack =
      currentTrack.id === targetTrack.id &&
      currentTrack.available === targetTrack.available &&
      currentTrack.src === targetTrack.src;

    if (isSameTrack) {
      return;
    }

    const shouldAutoPlay = shouldAutoTransitionOnRouteChange(intentRef.current);

    if (shouldAutoPlay) {
      if (targetTrack.available && targetTrack.src) {
        crossfadeToTrack(targetTrack);
      } else {
        fadeOutToUnavailable(targetTrack);
      }
      return;
    }

    // Silence, manual pause, paused for Voices & Film, or initial load:
    // NEVER start playback unexpectedly; update displayed track metadata honestly.
    const activeDeck = activeDeckRef.current;
    const otherDeck: AudioDeckId = activeDeck === "A" ? "B" : "A";
    saveRodrigoTimeFromDeck("A");
    saveRodrigoTimeFromDeck("B");
    releaseDeck(otherDeck);
    if (deckTrackRef.current[activeDeck]?.id !== targetTrack.id) {
      releaseDeck(activeDeck);
    }
    isCrossfadingRef.current = false;

    const nextStatus = !targetTrack.available
      ? "unavailable"
      : intentRef.current.manuallyPaused || intentRef.current.pausedForRoomMedia
        ? "paused"
        : "idle";

    syncTrackMetadataIntoState(targetTrack, {
      status: nextStatus,
      isCrossfading: false,
    });
  }, [
    catalogVersion,
    crossfadeToTrack,
    fadeOutToUnavailable,
    pathname,
    releaseDeck,
    saveRodrigoTimeFromDeck,
    syncTrackMetadataIntoState,
  ]);

  const syncSoundtrackCatalog = useCallback(
    (catalog: ClientSoundtrackCatalog) => {
      const nextSignature = buildCatalogSignature(catalog);
      if (nextSignature === catalogSignatureRef.current) {
        return;
      }
      catalogRef.current = catalog;
      catalogSignatureRef.current = nextSignature;
      setCatalogVersion((v) => v + 1);
    },
    []
  );

  const play = useCallback(() => {
    const { track: targetTrack } = resolveTargetSoundtrackForRoute(
      pathnameRef.current,
      catalogRef.current
    );

    if (!targetTrack.available || !targetTrack.src) {
      syncTrackMetadataIntoState(targetTrack, {
        status: "unavailable",
        isCrossfading: false,
      });
      return;
    }

    intentRef.current = reduceSoundtrackIntent(intentRef.current, {
      type: "user-play",
    });

    startSingleTrack(targetTrack);
  }, [startSingleTrack, syncTrackMetadataIntoState]);

  const enterWithSound = useCallback(() => {
    const archive = catalogRef.current.archiveTrack;
    if (!archive.available || !archive.src) {
      intentRef.current = reduceSoundtrackIntent(intentRef.current, {
        type: "enter-in-silence",
      });
      syncTrackMetadataIntoState(archive, {
        status: "unavailable",
        enteredSilently: true,
        isCrossfading: false,
      });
      return;
    }

    intentRef.current = reduceSoundtrackIntent(intentRef.current, {
      type: "enter-with-sound",
    });
    startSingleTrack(archive);
  }, [startSingleTrack, syncTrackMetadataIntoState]);

  const pause = useCallback(() => {
    intentRef.current = reduceSoundtrackIntent(intentRef.current, {
      type: "user-pause",
    });

    transitionTokenRef.current += 1;
    cancelTransitionTimers();
    isCrossfadingRef.current = false;

    const activeDeck = activeDeckRef.current;
    const otherDeck: AudioDeckId = activeDeck === "A" ? "B" : "A";
    saveRodrigoTimeFromDeck("A");
    saveRodrigoTimeFromDeck("B");
    releaseDeck(otherDeck);

    const activeEl = getDeckEl(activeDeck);
    if (activeEl && !activeEl.paused) {
      activeEl.pause();
    }

    setState((prev) => ({
      ...prev,
      status: prev.available ? "paused" : "unavailable",
      manuallyPaused: true,
      pausedForRoomMedia: false,
      isCrossfading: false,
    }));
  }, [cancelTransitionTimers, getDeckEl, releaseDeck, saveRodrigoTimeFromDeck]);

  const togglePlayback = useCallback(() => {
    const { track: targetTrack } = resolveTargetSoundtrackForRoute(
      pathnameRef.current,
      catalogRef.current
    );
    if (!targetTrack.available || !targetTrack.src) {
      return;
    }
    if (
      state.status === "playing" ||
      state.status === "waiting" ||
      isCrossfadingRef.current
    ) {
      pause();
    } else {
      play();
    }
  }, [pause, play, state.status]);

  const setVolume = useCallback(
    (nextVolume: number) => {
      const clamped = clampVolume(nextVolume);
      masterVolumeRef.current = clamped;
      if (clamped > 0 && mutedRef.current) {
        mutedRef.current = false;
      }
      applyDeckVolumes();
      setState((prev) => ({
        ...prev,
        volume: clamped,
        muted: clamped > 0 ? false : prev.muted,
      }));
    },
    [applyDeckVolumes]
  );

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    applyDeckVolumes();
    setState((prev) => ({
      ...prev,
      muted: mutedRef.current,
    }));
  }, [applyDeckVolumes]);

  const enterInSilence = useCallback(() => {
    intentRef.current = reduceSoundtrackIntent(intentRef.current, {
      type: "enter-in-silence",
    });

    transitionTokenRef.current += 1;
    cancelTransitionTimers();
    isCrossfadingRef.current = false;
    releaseDeck("A");
    releaseDeck("B");

    setState((prev) => ({
      ...prev,
      status: prev.available ? "paused" : "unavailable",
      enteredSilently: true,
      soundPreference: "silence",
      manuallyPaused: false,
      pausedForRoomMedia: false,
      isCrossfading: false,
    }));
  }, [cancelTransitionTimers, releaseDeck]);

  const pauseForRoomMedia = useCallback(() => {
    const wasPlaying =
      isDeckAudiblyPlaying("A") ||
      isDeckAudiblyPlaying("B") ||
      isCrossfadingRef.current;

    intentRef.current = reduceSoundtrackIntent(intentRef.current, {
      type: "room-media-started",
      wasMusicActivelyPlaying: wasPlaying,
    });

    if (!wasPlaying) {
      return;
    }

    transitionTokenRef.current += 1;
    cancelTransitionTimers();
    isCrossfadingRef.current = false;

    const activeDeck = activeDeckRef.current;
    const otherDeck: AudioDeckId = activeDeck === "A" ? "B" : "A";
    saveRodrigoTimeFromDeck("A");
    saveRodrigoTimeFromDeck("B");
    releaseDeck(otherDeck);

    const activeEl = getDeckEl(activeDeck);
    if (activeEl && !activeEl.paused) {
      activeEl.pause();
    }

    setState((prev) => ({
      ...prev,
      status: prev.available ? "paused" : "unavailable",
      pausedForRoomMedia: intentRef.current.pausedForRoomMedia,
      isCrossfading: false,
    }));
  }, [
    cancelTransitionTimers,
    getDeckEl,
    isDeckAudiblyPlaying,
    releaseDeck,
    saveRodrigoTimeFromDeck,
  ]);

  const resumeAfterRoomMedia = useCallback(() => {
    const shouldRestore = shouldRestoreMusicAfterRoomMediaEnded(
      intentRef.current
    );
    intentRef.current = reduceSoundtrackIntent(intentRef.current, {
      type: "room-media-ended",
    });

    if (!shouldRestore) {
      setState((prev) => ({
        ...prev,
        pausedForRoomMedia: false,
      }));
      return;
    }

    const { track: targetTrack } = resolveTargetSoundtrackForRoute(
      pathnameRef.current,
      catalogRef.current
    );

    if (!targetTrack.available || !targetTrack.src) {
      syncTrackMetadataIntoState(targetTrack, {
        status: "unavailable",
        pausedForRoomMedia: false,
        isCrossfading: false,
      });
      return;
    }

    startSingleTrack(targetTrack, { fadeInMs: DEFAULT_GENTLE_FADE_IN_MS });
  }, [startSingleTrack, syncTrackMetadataIntoState]);

  const value = useMemo<AudioContextValue>(
    () => ({
      state,
      play,
      pause,
      togglePlayback,
      setVolume,
      toggleMute,
      enterWithSound,
      enterInSilence,
      pauseForRoomMedia,
      resumeAfterRoomMedia,
      syncSoundtrackCatalog,
    }),
    [
      enterInSilence,
      enterWithSound,
      pause,
      pauseForRoomMedia,
      play,
      resumeAfterRoomMedia,
      setVolume,
      state,
      syncSoundtrackCatalog,
      toggleMute,
      togglePlayback,
    ]
  );

  return (
    <AudioContext.Provider value={value}>
      {/* Two internally coordinated media decks controlled solely by this central provider. */}
      <audio
        ref={deckARef}
        preload="none"
        loop
        crossOrigin="use-credentials"
        data-soundtrack-deck="A"
        aria-hidden="true"
      />
      <audio
        ref={deckBRef}
        preload="none"
        loop
        crossOrigin="use-credentials"
        data-soundtrack-deck="B"
        aria-hidden="true"
      />
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error("useAudio must be used within AudioProvider.");
  }
  return ctx;
}
