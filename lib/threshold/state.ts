export type ThresholdStatus = "initial" | "pending" | "rejected" | "accepted";

export type EntryAudioChoice = "sound" | "silence" | "sound-unavailable";

export interface ThresholdState {
  status: ThresholdStatus;
  rejectionMessage: string | null;
  audioFallbackNotice: string | null;
}

export const INITIAL_THRESHOLD_STATE: ThresholdState = {
  status: "initial",
  rejectionMessage: null,
  audioFallbackNotice: null,
};

export function createInitialThresholdState(
  initiallyAuthenticated: boolean
): ThresholdState {
  if (initiallyAuthenticated) {
    return {
      status: "accepted",
      rejectionMessage: null,
      audioFallbackNotice: null,
    };
  }
  return INITIAL_THRESHOLD_STATE;
}

/**
 * Prevents duplicate submissions while a request is in flight or after acceptance.
 */
export function canSubmitPassphrase(
  status: ThresholdStatus,
  passphrase: string
): boolean {
  if (status === "pending" || status === "accepted") {
    return false;
  }
  return passphrase.length > 0;
}

/**
 * Maps server unlock HTTP responses to quiet, neutral Threshold states.
 * Never reveals accepted state optimistically.
 */
export function resolveUnlockResponse(
  httpStatus: number,
  ok: boolean
): ThresholdState {
  if (ok && httpStatus === 200) {
    return {
      status: "accepted",
      rejectionMessage: null,
      audioFallbackNotice: null,
    };
  }

  if (httpStatus === 429) {
    return {
      status: "rejected",
      rejectionMessage: "Too many attempts. Wait a moment.",
      audioFallbackNotice: null,
    };
  }

  if (httpStatus === 503) {
    return {
      status: "rejected",
      rejectionMessage: "Archive access is temporarily unavailable.",
      audioFallbackNotice: null,
    };
  }

  return {
    status: "rejected",
    rejectionMessage: "Not recognized.",
    audioFallbackNotice: null,
  };
}

/**
 * Resolves the visitor's entry choice honestly based on whether an authorized
 * audio source is actually configured.
 */
export function resolveEntryAudioAction(
  choice: "sound" | "silence",
  audioAvailable: boolean
): {
  mode: EntryAudioChoice;
  shouldInitiateAudio: boolean;
  notice: string | null;
} {
  if (choice === "silence") {
    return {
      mode: "silence",
      shouldInitiateAudio: false,
      notice: null,
    };
  }

  if (audioAvailable) {
    return {
      mode: "sound",
      shouldInitiateAudio: true,
      notice: null,
    };
  }

  return {
    mode: "sound-unavailable",
    shouldInitiateAudio: false,
    notice: "No authorized recording is connected yet. Entering in silence.",
  };
}
