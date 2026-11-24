export type AudioDeckId = "A" | "B";

/** Default gradual cinematic crossfade duration between compositions (2.5 seconds). */
export const DEFAULT_CROSSFADE_DURATION_MS = 2500;

/** Gentle fade-in duration when resuming or starting a standalone track (ms). */
export const DEFAULT_GENTLE_FADE_IN_MS = 900;

/** Gentle fade-out duration when transitioning out to an unavailable route (ms). */
export const DEFAULT_GENTLE_FADE_OUT_MS = 1200;

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function clampTrackGainMultiplier(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0.25, value));
}

export interface EqualPowerGainInput {
  /** Normalized transition progress in `[0, 1]`. */
  progress: number;
  /** Visitor's master volume in `[0, 1]`. */
  masterVolume: number;
  /** Visitor's mute toggle state. */
  muted: boolean;
  /**
   * Starting envelope level of the outgoing deck in `[0, 1]`.
   * Defaults to `1`; when superseding an in-progress crossfade, pass the
   * outgoing deck's live envelope so volume never jumps upward mid-fade.
   */
  outgoingStartEnvelope?: number;
  /** Optional perceptual loudness trim for the outgoing composition. */
  outgoingTrackGain?: number;
  /** Optional perceptual loudness trim for the incoming composition. */
  incomingTrackGain?: number;
}

export interface EqualPowerGainResult {
  /** Normalized outgoing envelope in `[0, 1]` (independent of master volume). */
  outgoingEnvelope: number;
  /** Normalized incoming envelope in `[0, 1]` (independent of master volume). */
  incomingEnvelope: number;
  /** Actual HTMLAudioElement volume for outgoing deck in `[0, 1]`. */
  outgoingVolume: number;
  /** Actual HTMLAudioElement volume for incoming deck in `[0, 1]`. */
  incomingVolume: number;
}

/**
 * Equal-power cosine/sine crossfade law:
 *   outgoing(t) = startEnvelope * cos(t * pi / 2)
 *   incoming(t) = sin(t * pi / 2)
 *
 * At `t = 0.5`, `cos^2 + sin^2 = 1`, eliminating extended silence dips and
 * preventing harsh loudness spikes while honoring master volume, mute state,
 * and per-track loudness trims.
 */
export function computeEqualPowerGains(
  input: EqualPowerGainInput
): EqualPowerGainResult {
  const t = clampUnit(input.progress);
  const startEnv = clampUnit(input.outgoingStartEnvelope ?? 1);
  const theta = t * (Math.PI / 2);

  const outgoingEnvelope = t >= 1 ? 0 : startEnv * Math.cos(theta);
  const incomingEnvelope = t <= 0 ? 0 : t >= 1 ? 1 : Math.sin(theta);

  if (input.muted) {
    return {
      outgoingEnvelope,
      incomingEnvelope,
      outgoingVolume: 0,
      incomingVolume: 0,
    };
  }

  const master = clampUnit(input.masterVolume);
  const outTrim = clampTrackGainMultiplier(input.outgoingTrackGain);
  const inTrim = clampTrackGainMultiplier(input.incomingTrackGain);

  return {
    outgoingEnvelope,
    incomingEnvelope,
    outgoingVolume: clampUnit(outgoingEnvelope * outTrim * master),
    incomingVolume: clampUnit(incomingEnvelope * inTrim * master),
  };
}

/**
 * Computes actual HTMLAudioElement volume from a deck's live normalized
 * envelope whenever the user adjusts master volume or mute state mid-fade.
 */
export function computeDeckOutputVolume(options: {
  envelope: number;
  masterVolume: number;
  muted: boolean;
  trackGain?: number;
}): number {
  if (options.muted) {
    return 0;
  }
  const env = clampUnit(options.envelope);
  const master = clampUnit(options.masterVolume);
  const trim = clampTrackGainMultiplier(options.trackGain);
  return clampUnit(env * trim * master);
}

/**
 * Selects which of the two internal decks serves as the smooth outgoing bed
 * and which deck is reclaimed for the newest incoming destination track.
 *
 * During rapid navigation while an earlier crossfade is still mid-flight,
 * keeping the louder/audible deck as the outgoing bed and immediately releasing
 * the quieter deck guarantees zero uncontrolled overlap and zero volume jumps.
 */
export function selectDeckTransitionPlan(options: {
  activeDeck: AudioDeckId;
  deckAPlaying: boolean;
  deckBPlaying: boolean;
  deckAEnvelope: number;
  deckBEnvelope: number;
}): {
  outgoingDeck: AudioDeckId;
  incomingDeck: AudioDeckId;
  outgoingStartEnvelope: number;
} {
  const { activeDeck, deckAPlaying, deckBPlaying, deckAEnvelope, deckBEnvelope } =
    options;

  if (deckAPlaying && deckBPlaying) {
    if (deckAEnvelope >= deckBEnvelope) {
      return {
        outgoingDeck: "A",
        incomingDeck: "B",
        outgoingStartEnvelope: clampUnit(deckAEnvelope),
      };
    }
    return {
      outgoingDeck: "B",
      incomingDeck: "A",
      outgoingStartEnvelope: clampUnit(deckBEnvelope),
    };
  }

  if (deckAPlaying) {
    return {
      outgoingDeck: "A",
      incomingDeck: "B",
      outgoingStartEnvelope: clampUnit(deckAEnvelope > 0 ? deckAEnvelope : 1),
    };
  }

  if (deckBPlaying) {
    return {
      outgoingDeck: "B",
      incomingDeck: "A",
      outgoingStartEnvelope: clampUnit(deckBEnvelope > 0 ? deckBEnvelope : 1),
    };
  }

  const incomingDeck: AudioDeckId = activeDeck === "A" ? "B" : "A";
  return {
    outgoingDeck: activeDeck,
    incomingDeck,
    outgoingStartEnvelope: 0,
  };
}

/**
 * Clamps a saved playback position safely inside a track's finite duration
 * before resuming Rodrigo so seeking never lands past the end of the file.
 */
export function clampRestorablePosition(
  savedSeconds: number,
  durationSeconds: number
): number {
  if (!Number.isFinite(savedSeconds) || savedSeconds <= 0) {
    return 0;
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return savedSeconds;
  }
  const safeCeiling = Math.max(0, durationSeconds - 0.5);
  return Math.min(savedSeconds, safeCeiling);
}
