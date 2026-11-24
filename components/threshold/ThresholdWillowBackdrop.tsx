/**
 * Decorative nocturnal weeping willow silhouette backdrop for the Threshold.
 *
 * - Strictly decorative (`aria-hidden="true"`, `pointer-events-none`); never
 *   displays captions, tooltips, or text hints and never intercepts clicks or
 *   keyboard focus.
 * - Lightweight pure SVG: all arching-and-weeping whips and narrow lanceolate
 *   leaf blades within each curtain are merged into compact `<path>` primitives
 *   animated solely via asynchronous GPU CSS transforms (zero React re-renders,
 *   zero inline `style=""` attributes for strict nonce CSP compliance).
 * - Under `prefers-reduced-motion: reduce`, renders the full static silhouette.
 */

interface StrandSpec {
  /** Interior bough attachment point where the branch rises and arches outward. */
  x0: number;
  y0: number;
  /** Outward arch reach before gravity pulls the whip downward (negative = left, positive = right). */
  archX: number;
  /** Upward lift of the arch crest (negative rises upward). */
  archY: number;
  /** Total vertical cascade drop of the weeping whip. */
  length: number;
  /** Gentle horizontal drift of the hanging tip relative to the outer arch shoulder. */
  tipDriftX: number;
  /** Spacing between narrow willow-leaf nodes along the whip. */
  leafStep: number;
  /** Base leaf blade length in viewBox units. */
  leafLen: number;
  /** Deterministic organic variation seed so strands never look mechanical. */
  seed: number;
}

interface CurtainGroupSpec {
  id: string;
  swayClass: string;
  layer: "back" | "mid" | "front";
  strands: readonly StrandSpec[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Evaluates a cubic Bezier along a genuine arching-then-cascading willow whip:
 * rises gently from a bough, crests softly outward, and drapes vertically down
 * with slender irregular lanceolate willow leaves.
 */
function buildCurtainPaths(strands: readonly StrandSpec[]): {
  stemsPath: string;
  leavesPath: string;
} {
  const stemSegments: string[] = [];
  const leafSegments: string[] = [];

  for (const s of strands) {
    // Cubic Bezier control points: arch up & out from interior bough, then drop cleanly
    const c1x = s.x0 + s.archX * 0.72;
    const c1y = s.y0 + s.archY;
    const shoulderX = s.x0 + s.archX;
    const c2x = shoulderX + s.tipDriftX * 0.45;
    const c2y = s.y0 + s.length * 0.34;
    const x3 = shoulderX + s.tipDriftX;
    const y3 = s.y0 + s.length;

    stemSegments.push(
      `M${round1(s.x0)},${round1(s.y0)}C${round1(c1x)},${round1(c1y)} ${round1(c2x)},${round1(c2y)} ${round1(x3)},${round1(y3)}`
    );

    const steps = Math.max(6, Math.floor(s.length / s.leafStep));
    for (let i = 1; i <= steps; i++) {
      const jitter = Math.sin(i * 2.19 + s.seed) * 0.28;
      const t = Math.min(0.985, Math.max(0.06, (i + jitter * 0.4) / (steps + 0.6)));
      const u = 1 - t;

      // Cubic Bezier position
      const px =
        u * u * u * s.x0 +
        3 * u * u * t * c1x +
        3 * u * t * t * c2x +
        t * t * t * x3;
      const py =
        u * u * u * s.y0 +
        3 * u * u * t * c1y +
        3 * u * t * t * c2y +
        t * t * t * y3;

      // Gentle taper at both the arched attachment (t -> 0) and wispy lower tip (t -> 1)
      const envelope =
        t < 0.16
          ? 0.58 + (t / 0.16) * 0.42
          : 1 - Math.pow((t - 0.16) / 0.84, 1.25) * 0.48;
      const lenNoise = 1 + Math.sin(i * 3.17 + s.seed * 1.9) * 0.22;
      const len = s.leafLen * envelope * lenNoise;
      const width = len * 0.165;

      // Slender lanceolate willow leaf blade drooping softly downward
      const side = (i + Math.round(s.seed)) % 2 === 0 ? 1 : -1;
      const spread = 0.2 + Math.abs(Math.cos(i * 1.47 + s.seed)) * 0.22;
      const dx = side * len * spread;
      const dy = len * 0.97;

      const cx1 = px + dx * 0.46 + side * width;
      const cy1 = py + dy * 0.36;
      const cx2 = px + dx * 0.42 - side * width * 0.42;
      const cy2 = py + dy * 0.6;
      const tx = px + dx;
      const ty = py + dy;

      leafSegments.push(
        `M${round1(px)},${round1(py)}Q${round1(cx1)},${round1(cy1)} ${round1(tx)},${round1(ty)}Q${round1(cx2)},${round1(cy2)} ${round1(px)},${round1(py)}`
      );

      // Irregular secondary drooping leaf on opposite side for organic feathery density
      if (t > 0.1 && t < 0.86 && (i + Math.floor(s.seed)) % 3 !== 0) {
        const opp = -side;
        const len2 = len * (0.72 + Math.abs(Math.sin(i * 1.83 + s.seed)) * 0.24);
        const w2 = len2 * 0.16;
        const dx2 = opp * len2 * (0.18 + Math.abs(Math.sin(i * 2.41 + s.seed)) * 0.2);
        const dy2 = len2 * 0.98;
        const py2 = py + 2.2;

        leafSegments.push(
          `M${round1(px)},${round1(py2)}Q${round1(px + dx2 * 0.45 + opp * w2)},${round1(py2 + dy2 * 0.38)} ${round1(px + dx2)},${round1(py2 + dy2)}Q${round1(px + dx2 * 0.4 - opp * w2 * 0.4)},${round1(py2 + dy2 * 0.6)} ${round1(px)},${round1(py2)}`
        );
      }
    }
  }

  return {
    stemsPath: stemSegments.join(""),
    leavesPath: leafSegments.join(""),
  };
}

/**
 * Ten layered weeping-curtain groups (58 arching-and-cascading willow whips in viewBox 1000x840).
 * Slightly asymmetric organic crown (broad gentle sweep toward left-of-trunk) so the silhouette
 * reads like a real solitary weeping willow in twilight rather than a geometric dome.
 */
const WILLOW_CURTAINS: readonly CurtainGroupSpec[] = [
  // Layer 1: Deep twilight background curtains (full depth behind trunk & interior boughs)
  {
    id: "back-far-left",
    swayClass: "willow-sway-1",
    layer: "back",
    strands: [
      { x0: 258, y0: 300, archX: -94, archY: -22, length: 374, tipDriftX: -36, leafStep: 15, leafLen: 21, seed: 1.1 },
      { x0: 292, y0: 256, archX: -84, archY: -30, length: 428, tipDriftX: -28, leafStep: 15, leafLen: 22, seed: 2.3 },
      { x0: 334, y0: 218, archX: -72, archY: -34, length: 468, tipDriftX: -22, leafStep: 15, leafLen: 22, seed: 3.4 },
      { x0: 376, y0: 192, archX: -60, archY: -34, length: 492, tipDriftX: -16, leafStep: 15, leafLen: 22, seed: 4.2 },
    ],
  },
  {
    id: "back-inner-left",
    swayClass: "willow-sway-2",
    layer: "back",
    strands: [
      { x0: 416, y0: 174, archX: -52, archY: -36, length: 504, tipDriftX: -12, leafStep: 16, leafLen: 22, seed: 5.1 },
      { x0: 454, y0: 160, archX: -40, archY: -38, length: 492, tipDriftX: -8, leafStep: 16, leafLen: 22, seed: 6.4 },
      { x0: 488, y0: 154, archX: -24, archY: -36, length: 432, tipDriftX: -6, leafStep: 16, leafLen: 21, seed: 7.2 },
      { x0: 514, y0: 156, archX: -10, archY: -32, length: 376, tipDriftX: -4, leafStep: 16, leafLen: 20, seed: 8.5 },
    ],
  },
  {
    id: "back-inner-right",
    swayClass: "willow-sway-3",
    layer: "back",
    strands: [
      { x0: 534, y0: 158, archX: 18, archY: -34, length: 392, tipDriftX: 6, leafStep: 16, leafLen: 21, seed: 9.3 },
      { x0: 566, y0: 166, archX: 38, archY: -36, length: 470, tipDriftX: 10, leafStep: 16, leafLen: 22, seed: 10.6 },
      { x0: 604, y0: 182, archX: 54, archY: -36, length: 496, tipDriftX: 14, leafStep: 15, leafLen: 22, seed: 11.4 },
      { x0: 644, y0: 206, archX: 68, archY: -32, length: 480, tipDriftX: 20, leafStep: 15, leafLen: 22, seed: 12.1 },
    ],
  },
  {
    id: "back-far-right",
    swayClass: "willow-sway-4",
    layer: "back",
    strands: [
      { x0: 682, y0: 238, archX: 78, archY: -28, length: 446, tipDriftX: 24, leafStep: 15, leafLen: 22, seed: 13.7 },
      { x0: 718, y0: 274, archX: 84, archY: -22, length: 404, tipDriftX: 30, leafStep: 15, leafLen: 21, seed: 14.2 },
      { x0: 748, y0: 316, archX: 86, archY: -16, length: 344, tipDriftX: 34, leafStep: 15, leafLen: 20, seed: 15.8 },
    ],
  },

  // Layer 2: Midground iconic weeping cascades defining the natural, billowing willow form
  {
    id: "mid-outer-left",
    swayClass: "willow-sway-5",
    layer: "mid",
    strands: [
      { x0: 238, y0: 332, archX: -102, archY: -18, length: 346, tipDriftX: -40, leafStep: 14, leafLen: 21, seed: 16.3 },
      { x0: 266, y0: 282, archX: -94, archY: -28, length: 432, tipDriftX: -34, leafStep: 14, leafLen: 22, seed: 17.5 },
      { x0: 304, y0: 238, archX: -84, archY: -34, length: 482, tipDriftX: -28, leafStep: 14, leafLen: 23, seed: 18.1 },
      { x0: 344, y0: 202, archX: -72, archY: -38, length: 512, tipDriftX: -20, leafStep: 14, leafLen: 23, seed: 19.4 },
      { x0: 386, y0: 172, archX: -62, archY: -38, length: 530, tipDriftX: -16, leafStep: 14, leafLen: 23, seed: 20.8 },
    ],
  },
  {
    id: "mid-center-left",
    swayClass: "willow-sway-6",
    layer: "mid",
    strands: [
      { x0: 426, y0: 152, archX: -50, archY: -40, length: 518, tipDriftX: -12, leafStep: 14, leafLen: 23, seed: 21.2 },
      { x0: 462, y0: 140, archX: -34, archY: -38, length: 454, tipDriftX: -8, leafStep: 15, leafLen: 22, seed: 22.6 },
      { x0: 492, y0: 136, archX: -18, archY: -34, length: 368, tipDriftX: -5, leafStep: 15, leafLen: 21, seed: 23.1 },
      { x0: 518, y0: 138, archX: -4, archY: -28, length: 316, tipDriftX: -2, leafStep: 15, leafLen: 20, seed: 24.4 },
    ],
  },
  {
    id: "mid-center-right",
    swayClass: "willow-sway-7",
    layer: "mid",
    strands: [
      { x0: 536, y0: 142, archX: 16, archY: -32, length: 342, tipDriftX: 5, leafStep: 15, leafLen: 21, seed: 25.3 },
      { x0: 564, y0: 148, archX: 36, archY: -38, length: 444, tipDriftX: 9, leafStep: 15, leafLen: 22, seed: 26.7 },
      { x0: 598, y0: 162, archX: 54, archY: -38, length: 516, tipDriftX: 14, leafStep: 14, leafLen: 23, seed: 27.5 },
      { x0: 636, y0: 184, archX: 68, archY: -36, length: 528, tipDriftX: 18, leafStep: 14, leafLen: 23, seed: 28.2 },
    ],
  },
  {
    id: "mid-outer-right",
    swayClass: "willow-sway-8",
    layer: "mid",
    strands: [
      { x0: 672, y0: 212, archX: 78, archY: -32, length: 510, tipDriftX: 24, leafStep: 14, leafLen: 23, seed: 29.6 },
      { x0: 706, y0: 248, archX: 84, archY: -26, length: 472, tipDriftX: 28, leafStep: 14, leafLen: 22, seed: 30.4 },
      { x0: 736, y0: 292, archX: 90, archY: -20, length: 416, tipDriftX: 34, leafStep: 14, leafLen: 22, seed: 31.1 },
      { x0: 762, y0: 340, archX: 94, archY: -14, length: 342, tipDriftX: 40, leafStep: 15, leafLen: 20, seed: 32.8 },
    ],
  },

  // Layer 3: Foreground delicate moonlit whips catching soft evening silver along the veil
  {
    id: "front-left-veil",
    swayClass: "willow-sway-9",
    layer: "front",
    strands: [
      { x0: 284, y0: 266, archX: -94, archY: -28, length: 468, tipDriftX: -32, leafStep: 14, leafLen: 23, seed: 33.4 },
      { x0: 328, y0: 220, archX: -82, archY: -36, length: 518, tipDriftX: -24, leafStep: 14, leafLen: 24, seed: 34.9 },
      { x0: 374, y0: 184, archX: -66, archY: -38, length: 538, tipDriftX: -16, leafStep: 14, leafLen: 24, seed: 35.2 },
      { x0: 422, y0: 158, archX: -48, archY: -38, length: 480, tipDriftX: -11, leafStep: 15, leafLen: 23, seed: 36.7 },
      { x0: 468, y0: 146, archX: -28, archY: -34, length: 348, tipDriftX: -6, leafStep: 15, leafLen: 22, seed: 37.3 },
      { x0: 506, y0: 144, archX: -10, archY: -28, length: 274, tipDriftX: -3, leafStep: 15, leafLen: 20, seed: 38.5 },
    ],
  },
  {
    id: "front-right-veil",
    swayClass: "willow-sway-10",
    layer: "front",
    strands: [
      { x0: 540, y0: 148, archX: 18, archY: -30, length: 292, tipDriftX: 5, leafStep: 15, leafLen: 21, seed: 39.2 },
      { x0: 576, y0: 160, archX: 40, archY: -36, length: 394, tipDriftX: 10, leafStep: 15, leafLen: 22, seed: 40.6 },
      { x0: 618, y0: 180, archX: 60, archY: -38, length: 516, tipDriftX: 15, leafStep: 14, leafLen: 24, seed: 41.1 },
      { x0: 658, y0: 210, archX: 74, archY: -34, length: 526, tipDriftX: 22, leafStep: 14, leafLen: 24, seed: 42.4 },
      { x0: 696, y0: 248, archX: 82, archY: -28, length: 478, tipDriftX: 28, leafStep: 14, leafLen: 23, seed: 43.8 },
      { x0: 730, y0: 294, archX: 88, archY: -20, length: 402, tipDriftX: 34, leafStep: 15, leafLen: 22, seed: 44.3 },
    ],
  },
];

// Precompute static SVG path strings once at module load (zero runtime per-render cost).
const COMPILED_CURTAINS = WILLOW_CURTAINS.map((group) => ({
  ...group,
  ...buildCurtainPaths(group.strands),
}));

const BACK_CURTAINS = COMPILED_CURTAINS.filter((c) => c.layer === "back");
const MID_CURTAINS = COMPILED_CURTAINS.filter((c) => c.layer === "mid");
const FRONT_CURTAINS = COMPILED_CURTAINS.filter((c) => c.layer === "front");

export function ThresholdWillowBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="threshold-willow-layer pointer-events-none select-none"
    >
      {/* Full-bleed twilight sky gradient & horizon mist (zero viewport seam) */}
      <div className="threshold-dusk-atmosphere" />

      <svg
        viewBox="0 0 1000 840"
        preserveAspectRatio="xMidYMax meet"
        focusable="false"
        aria-hidden="true"
        className="threshold-willow-svg"
      >
        <defs>
          {/* Soft moonlit dusk glow behind canopy — fades completely to 0 before SVG edges */}
          <radialGradient id="threshold-dusk-halo" cx="50%" cy="46%" r="48%">
            <stop offset="0%" stopColor="#a7b7cc" stopOpacity="0.17" />
            <stop offset="38%" stopColor="#5e6d82" stopOpacity="0.085" />
            <stop offset="72%" stopColor="#1d2430" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#070709" stopOpacity="0" />
          </radialGradient>

          {/* Sculpted gnarled trunk depth gradient */}
          <linearGradient id="threshold-trunk-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#131820" />
            <stop offset="32%" stopColor="#202834" />
            <stop offset="68%" stopColor="#131820" />
            <stop offset="100%" stopColor="#0a0d12" />
          </linearGradient>

          {/* Subtle moonlight catch along the trunk's left bark contour */}
          <linearGradient id="threshold-bark-rim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#75859c" stopOpacity="0.34" />
            <stop offset="60%" stopColor="#505d70" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#252c38" stopOpacity="0.04" />
          </linearGradient>

          {/* Soft organic interior foliage shadow (no geometric dome edge) */}
          <radialGradient id="threshold-foliage-depth" cx="50%" cy="48%" r="50%">
            <stop offset="0%" stopColor="#11161f" stopOpacity="0.72" />
            <stop offset="65%" stopColor="#0f141c" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#0b0e14" stopOpacity="0" />
          </radialGradient>

          {/* Edge-faded earth shadow mound directly under the roots */}
          <radialGradient id="threshold-root-mound" cx="50%" cy="62%" r="50%">
            <stop offset="0%" stopColor="#090b0f" stopOpacity="0.98" />
            <stop offset="58%" stopColor="#0a0c11" stopOpacity="0.82" />
            <stop offset="86%" stopColor="#080a0e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#070709" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Quiet nocturnal halo behind the weeping crown */}
        <ellipse
          cx="500"
          cy="410"
          rx="455"
          ry="335"
          fill="url(#threshold-dusk-halo)"
        />

        {/* Soft irregular canopy-heart shadow (organic layered clusters, zero hard dome line) */}
        <g opacity="0.82">
          <ellipse cx="485" cy="238" rx="190" ry="118" fill="url(#threshold-foliage-depth)" />
          <ellipse cx="348" cy="284" rx="140" ry="102" fill="url(#threshold-foliage-depth)" />
          <ellipse cx="640" cy="288" rx="136" ry="98" fill="url(#threshold-foliage-depth)" />
        </g>

        {/* Layer 1: Deep background hanging curtains */}
        <g className="willow-layer-back">
          {BACK_CURTAINS.map((curtain) => (
            <g
              key={curtain.id}
              className={`willow-curtain ${curtain.swayClass}`}
            >
              <path
                d={curtain.stemsPath}
                fill="none"
                stroke="#151b24"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <path d={curtain.leavesPath} fill="#151c26" opacity="0.9" />
            </g>
          ))}
        </g>

        {/* Sculpted gnarled weeping willow trunk & interior arching limbs (glimpsed beneath the veil) */}
        <g className="willow-skeleton">
          {/* Grounded gnarled trunk with organic S-curve and smooth root flare into the bank */}
          <path
            d="M424,820 C454,794 470,756 475,702 C480,642 476,580 468,518 C462,472 454,436 438,396 L474,386 C486,420 495,442 507,442 C520,442 528,418 540,382 L572,392 C554,436 544,478 538,528 C532,588 534,648 542,706 C550,756 570,794 606,820 Z"
            fill="url(#threshold-trunk-grad)"
          />

          {/* Subtle bark contour & moonlight rim on the trunk */}
          <path
            d="M458,794 C474,752 480,692 480,622 C480,554 473,486 460,420"
            fill="none"
            stroke="url(#threshold-bark-rim)"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M494,764 C496,696 494,624 490,552 C488,512 486,476 484,442 M522,776 C520,702 522,630 526,560 C529,518 534,478 542,438"
            fill="none"
            stroke="#0a0d12"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.72"
          />

          {/* Interior spreading boughs — tucked organically beneath the cascading crown */}
          <path
            d="M466,448 C422,368 358,296 286,256 C252,238 222,256 200,302 C226,268 258,256 292,274 C354,306 408,376 450,466 Z"
            fill="#151b24"
          />
          <path
            d="M484,424 C456,330 412,244 352,202 C318,178 286,188 260,224 C290,198 322,194 354,218 C406,256 444,340 470,434 Z"
            fill="#171e28"
          />
          <path
            d="M506,426 C500,324 476,228 436,180 C412,152 384,154 360,182 C386,164 410,166 430,192 C464,236 486,330 492,430 Z"
            fill="#181f2a"
          />
          <path
            d="M518,426 C528,322 556,226 598,180 C624,152 652,158 676,188 C650,168 624,168 602,194 C564,238 540,330 532,430 Z"
            fill="#181f2a"
          />
          <path
            d="M540,448 C584,366 646,294 720,254 C754,236 784,258 806,306 C780,272 748,256 714,274 C652,308 598,378 554,468 Z"
            fill="#151a23"
          />
        </g>

        {/* Layer 2: Midground cascading weeping curtains */}
        <g className="willow-layer-mid">
          {MID_CURTAINS.map((curtain) => (
            <g
              key={curtain.id}
              className={`willow-curtain ${curtain.swayClass}`}
            >
              <path
                d={curtain.stemsPath}
                fill="none"
                stroke="#212a38"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <path d={curtain.leavesPath} fill="#212a38" opacity="0.93" />
            </g>
          ))}
        </g>

        {/* Layer 3: Foreground fine silver-dusk weeping whips */}
        <g className="willow-layer-front">
          {FRONT_CURTAINS.map((curtain) => (
            <g
              key={curtain.id}
              className={`willow-curtain ${curtain.swayClass}`}
            >
              <path
                d={curtain.stemsPath}
                fill="none"
                stroke="#334053"
                strokeWidth="1.15"
                strokeLinecap="round"
              />
              <path d={curtain.leavesPath} fill="#323f52" opacity="0.88" />
            </g>
          ))}
        </g>

        {/* Subtle tapered earth mound around the roots that blends seamlessly into the full-bleed bank */}
        <ellipse
          cx="512"
          cy="820"
          rx="320"
          ry="44"
          fill="url(#threshold-root-mound)"
        />
      </svg>

      {/* Full-bleed dusk ground bank across 100% viewport width (zero edge clipping) */}
      <div className="threshold-ground-bank" />

      {/* Soft nocturnal readability scrim behind the foreground Threshold text & input */}
      <div className="threshold-readability-vignette" />
    </div>
  );
}
