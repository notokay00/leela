import { ARCHIVE_DEFAULT_SOUNDTRACK } from "../../content/soundtracks.ts";
import { toClientSoundtrackTrack } from "./soundtrack.ts";
import type {
  ClientSoundtrackTrack,
  SoundPreference,
} from "./soundtrack-types.ts";

export type AudioPlaybackStatus =
  | "unavailable"
  | "idle"
  | "playing"
  | "waiting"
  | "paused"
  | "ended"
  | "error";

export type AudioMediaEvent =
  | "playing"
  | "waiting"
  | "pause"
  | "ended"
  | "error";

export interface AudioState {
  available: boolean;
  src: string | null;
  cueTitle: string;
  activeTrack: ClientSoundtrackTrack;
  status: AudioPlaybackStatus;
  volume: number;
  muted: boolean;
  enteredSilently: boolean;
  soundPreference: SoundPreference;
  manuallyPaused: boolean;
  pausedForRoomMedia: boolean;
  isCrossfading: boolean;
}

export const DEFAULT_AUDIO_CUE_TITLE = "Concierto de Aranjuez · II. Adagio";
export const DEFAULT_AUDIO_VOLUME = 0.7;

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_AUDIO_VOLUME;
  }
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function createDefaultArchiveClientTrack(options?: {
  available?: boolean;
  src?: string | null;
  title?: string;
}): ClientSoundtrackTrack {
  const isUsable = Boolean(options?.available && options?.src);
  const base = toClientSoundtrackTrack(ARCHIVE_DEFAULT_SOUNDTRACK, {
    available: isUsable,
  });
  return {
    ...base,
    title: options?.title ?? base.title,
    available: isUsable,
    availability: isUsable ? "available" : "unavailable",
    src: isUsable ? (options?.src ?? base.src) : null,
  };
}

export function createInitialAudioState(options: {
  available: boolean;
  src: string | null;
  cueTitle?: string;
  activeTrack?: ClientSoundtrackTrack;
}): AudioState {
  const activeTrack =
    options.activeTrack ??
    createDefaultArchiveClientTrack({
      available: options.available,
      src: options.src,
      title: options.cueTitle ?? ARCHIVE_DEFAULT_SOUNDTRACK.title,
    });
  const isUsable = activeTrack.available && Boolean(activeTrack.src);

  return {
    available: isUsable,
    src: isUsable ? activeTrack.src : null,
    cueTitle:
      options.cueTitle ??
      (options.activeTrack ? options.activeTrack.title : DEFAULT_AUDIO_CUE_TITLE),
    activeTrack: {
      ...activeTrack,
      available: isUsable,
      availability: isUsable ? "available" : "unavailable",
      src: isUsable ? activeTrack.src : null,
    },
    status: isUsable ? "idle" : "unavailable",
    volume: DEFAULT_AUDIO_VOLUME,
    muted: false,
    enteredSilently: false,
    soundPreference: "unset",
    manuallyPaused: false,
    pausedForRoomMedia: false,
    isCrossfading: false,
  };
}

/**
 * Pure reducer driven strictly by real HTMLMediaElement events.
 * Never infers playback from button clicks and never reports `playing` when
 * no authorized audio source is connected.
 */
export function reduceAudioMediaEvent(
  state: AudioState,
  event: AudioMediaEvent
): AudioState {
  if (!state.available || !state.src) {
    return {
      ...state,
      status: "unavailable",
    };
  }

  switch (event) {
    case "playing":
      return {
        ...state,
        status: "playing",
        enteredSilently: false,
      };
    case "waiting":
      return {
        ...state,
        status: "waiting",
      };
    case "pause":
      return {
        ...state,
        status: state.status === "ended" ? "ended" : "paused",
      };
    case "ended":
      return {
        ...state,
        status: "ended",
      };
    case "error":
      return {
        ...state,
        status: "error",
      };
  }
}

export function formatAudioStatusLabel(status: AudioPlaybackStatus): string {
  switch (status) {
    case "playing":
      return "playing";
    case "waiting":
      return "buffering";
    case "paused":
      return "paused";
    case "ended":
      return "ended";
    case "error":
      return "unavailable";
    case "unavailable":
      return "no recording";
    case "idle":
      return "ready";
  }
}
