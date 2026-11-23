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
  status: AudioPlaybackStatus;
  volume: number;
  muted: boolean;
  enteredSilently: boolean;
}

export const DEFAULT_AUDIO_CUE_TITLE = "Concierto de Aranjuez · II. Adagio";
export const DEFAULT_AUDIO_VOLUME = 0.7;

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_AUDIO_VOLUME;
  }
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function createInitialAudioState(options: {
  available: boolean;
  src: string | null;
  cueTitle?: string;
}): AudioState {
  const isUsable = options.available && Boolean(options.src);
  return {
    available: isUsable,
    src: isUsable ? options.src : null,
    cueTitle: options.cueTitle ?? DEFAULT_AUDIO_CUE_TITLE,
    status: isUsable ? "idle" : "unavailable",
    volume: DEFAULT_AUDIO_VOLUME,
    muted: false,
    enteredSilently: false,
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
