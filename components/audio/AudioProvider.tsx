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
import {
  clampVolume,
  createInitialAudioState,
  DEFAULT_AUDIO_CUE_TITLE,
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
  enterInSilence: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export interface AudioProviderProps {
  available: boolean;
  src: string | null;
  cueTitle?: string;
  children: ReactNode;
}

/**
 * Persistent root-level audio provider mounted in `app/layout.tsx`.
 * Keeps a single `<audio>` element alive across archive room transitions
 * and drives all playback state strictly from genuine HTMLMediaElement events.
 */
export function AudioProvider({
  available,
  src,
  cueTitle = DEFAULT_AUDIO_CUE_TITLE,
  children,
}: AudioProviderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<AudioState>(() =>
    createInitialAudioState({ available, src, cueTitle })
  );

  // Sync actual HTMLMediaElement events into React state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = state.volume;
    audio.muted = state.muted;

    const onPlaying = () =>
      setState((prev) => reduceAudioMediaEvent(prev, "playing"));
    const onWaiting = () =>
      setState((prev) => reduceAudioMediaEvent(prev, "waiting"));
    const onPause = () =>
      setState((prev) =>
        audio.ended
          ? reduceAudioMediaEvent(prev, "ended")
          : reduceAudioMediaEvent(prev, "pause")
      );
    const onEnded = () =>
      setState((prev) => reduceAudioMediaEvent(prev, "ended"));
    const onError = () =>
      setState((prev) => reduceAudioMediaEvent(prev, "error"));
    const onVolumeChange = () =>
      setState((prev) => ({
        ...prev,
        volume: clampVolume(audio.volume),
        muted: audio.muted,
      }));

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("volumechange", onVolumeChange);

    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("volumechange", onVolumeChange);
    };
    // Initial volume/mute sync runs once; subsequent updates flow through volumechange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback(() => {
    if (!state.available || !state.src) {
      return;
    }
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    void audio.play().catch(() => {
      // Never infer playback on rejected play(); real media events remain source of truth.
      setState((prev) =>
        prev.status === "playing" ? prev : { ...prev, status: "paused" }
      );
    });
  }, [state.available, state.src]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.available) {
      return;
    }
    audio.pause();
  }, [state.available]);

  const togglePlayback = useCallback(() => {
    if (!state.available || !state.src) {
      return;
    }
    if (state.status === "playing" || state.status === "waiting") {
      pause();
    } else {
      play();
    }
  }, [pause, play, state.available, state.src, state.status]);

  const setVolume = useCallback((nextVolume: number) => {
    const clamped = clampVolume(nextVolume);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = clamped;
      if (clamped > 0 && audio.muted) {
        audio.muted = false;
      }
    }
    setState((prev) => ({
      ...prev,
      volume: clamped,
      muted: clamped > 0 ? false : prev.muted,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !audio.muted;
      return;
    }
    setState((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const enterInSilence = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
    }
    setState((prev) => ({
      ...prev,
      enteredSilently: true,
    }));
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      state,
      play,
      pause,
      togglePlayback,
      setVolume,
      toggleMute,
      enterInSilence,
    }),
    [enterInSilence, pause, play, setVolume, state, toggleMute, togglePlayback]
  );

  return (
    <AudioContext.Provider value={value}>
      {/* Single persistent media element; src is omitted when no authorized recording is configured. */}
      <audio
        ref={audioRef}
        src={state.available && state.src ? state.src : undefined}
        preload="none"
        crossOrigin="use-credentials"
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
