/**
 * Decorative sunlit lakeside weeping willow backdrop for the Threshold.
 *
 * - Combines cohesive hand-painted watercolor/gouache literary storybook
 *   landscapes (composed separately for widescreen desktop and portrait mobile)
 *   with lightweight, GPU-composited living atmosphere overlays:
 *   translucent swaying willow fronds, subtle calm lake water shimmer,
 *   softly shifting morning sunlight, and sparingly placed pollen motes.
 * - Strictly decorative (`aria-hidden="true"`, `pointer-events-none`); never
 *   displays captions, tooltips, or text hints and never intercepts clicks or
 *   keyboard focus.
 * - Zero inline `style=""` attributes (strict nonce CSP compliant), zero
 *   animation libraries, and renders the complete static painting under
 *   `prefers-reduced-motion: reduce`.
 */

interface BreezeStrandSpec {
  x0: number;
  y0: number;
  archX: number;
  archY: number;
  length: number;
  tipDriftX: number;
  leafStep: number;
  leafLen: number;
  seed: number;
}

interface BreezeGroupSpec {
  id: string;
  swayClass: string;
  stemColor: string;
  leafColor: string;
  opacity: string;
  strands: readonly BreezeStrandSpec[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Generates compact SVG path strings for delicate watercolor-tinted hanging
 * willow tendrils aligned to the painted willow's sunlit outer canopy so the
 * cascading branches appear to sway softly in a spring morning breeze.
 */
function buildBreezePaths(strands: readonly BreezeStrandSpec[]): {
  stemsPath: string;
  leavesPath: string;
} {
  const stemSegments: string[] = [];
  const leafSegments: string[] = [];

  for (const s of strands) {
    const c1x = s.x0 + s.archX * 0.72;
    const c1y = s.y0 + s.archY;
    const shoulderX = s.x0 + s.archX;
    const c2x = shoulderX + s.tipDriftX * 0.45;
    const c2y = s.y0 + s.length * 0.36;
    const x3 = shoulderX + s.tipDriftX;
    const y3 = s.y0 + s.length;

    stemSegments.push(
      `M${round1(s.x0)},${round1(s.y0)}C${round1(c1x)},${round1(c1y)} ${round1(c2x)},${round1(c2y)} ${round1(x3)},${round1(y3)}`
    );

    const steps = Math.max(5, Math.floor(s.length / s.leafStep));
    for (let i = 1; i <= steps; i++) {
      const jitter = Math.sin(i * 2.17 + s.seed) * 0.25;
      const t = Math.min(0.98, Math.max(0.08, (i + jitter * 0.38) / (steps + 0.55)));
      const u = 1 - t;

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

      const envelope =
        t < 0.16
          ? 0.56 + (t / 0.16) * 0.44
          : 1 - Math.pow((t - 0.16) / 0.84, 1.2) * 0.45;
      const len = s.leafLen * envelope * (1 + Math.sin(i * 3.11 + s.seed) * 0.2);
      const width = len * 0.19;

      const side = (i + Math.round(s.seed)) % 2 === 0 ? 1 : -1;
      const spread = 0.22 + Math.abs(Math.cos(i * 1.43 + s.seed)) * 0.22;
      const dx = side * len * spread;
      const dy = len * 0.96;

      leafSegments.push(
        `M${round1(px)},${round1(py)}Q${round1(px + dx * 0.46 + side * width)},${round1(py + dy * 0.36)} ${round1(px + dx)},${round1(py + dy)}Q${round1(px + dx * 0.42 - side * width * 0.44)},${round1(py + dy * 0.6)} ${round1(px)},${round1(py)}`
      );

      if (t > 0.14 && t < 0.84 && (i + Math.floor(s.seed)) % 3 !== 0) {
        const opp = -side;
        const len2 = len * 0.78;
        const w2 = len2 * 0.18;
        const dx2 = opp * len2 * 0.24;
        const dy2 = len2 * 0.98;
        const py2 = py + 2.4;

        leafSegments.push(
          `M${round1(px)},${round1(py2)}Q${round1(px + dx2 * 0.45 + opp * w2)},${round1(py2 + dy2 * 0.38)} ${round1(px + dx2)},${round1(py2 + dy2)}Q${round1(px + dx2 * 0.4 - opp * w2 * 0.42)},${round1(py2 + dy2 * 0.6)} ${round1(px)},${round1(py2)}`
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
 * Desktop living-breeze hanging fronds aligned to the sunlit overhanging canopy
 * of `threshold-garden-desktop.webp` (1376x768 coordinate space, right-locked).
 */
const DESKTOP_BREEZE_GROUPS: readonly BreezeGroupSpec[] = [
  {
    id: "desk-lake-veil",
    swayClass: "willow-sway-1",
    stemColor: "#7ea062",
    leafColor: "#9cb96f",
    opacity: "0.42",
    strands: [
      { x0: 668, y0: 196, archX: -48, archY: -14, length: 304, tipDriftX: -14, leafStep: 18, leafLen: 21, seed: 1.4 },
      { x0: 718, y0: 146, archX: -36, archY: -16, length: 356, tipDriftX: -10, leafStep: 18, leafLen: 22, seed: 2.7 },
    ],
  },
  {
    id: "desk-clearing-arch",
    swayClass: "willow-sway-2",
    stemColor: "#8ea862",
    leafColor: "#b8c775",
    opacity: "0.44",
    strands: [
      { x0: 782, y0: 120, archX: -26, archY: -14, length: 368, tipDriftX: -8, leafStep: 18, leafLen: 22, seed: 3.5 },
      { x0: 848, y0: 112, archX: -18, archY: -12, length: 344, tipDriftX: -5, leafStep: 18, leafLen: 21, seed: 4.8 },
    ],
  },
  {
    id: "desk-inner-drape",
    swayClass: "willow-sway-3",
    stemColor: "#6d935c",
    leafColor: "#87ab69",
    opacity: "0.4",
    strands: [
      { x0: 942, y0: 108, archX: -12, archY: -12, length: 288, tipDriftX: -4, leafStep: 18, leafLen: 20, seed: 5.3 },
      { x0: 1018, y0: 102, archX: 10, archY: -10, length: 274, tipDriftX: 4, leafStep: 18, leafLen: 20, seed: 6.1 },
    ],
  },
  {
    id: "desk-outer-right",
    swayClass: "willow-sway-4",
    stemColor: "#5c8354",
    leafColor: "#709761",
    opacity: "0.42",
    strands: [
      { x0: 1214, y0: 124, archX: 22, archY: -12, length: 294, tipDriftX: 10, leafStep: 18, leafLen: 21, seed: 7.6 },
      { x0: 1292, y0: 148, archX: 26, archY: -10, length: 274, tipDriftX: 12, leafStep: 18, leafLen: 20, seed: 8.9 },
    ],
  },
  {
    id: "desk-sun-tip",
    swayClass: "willow-sway-5",
    stemColor: "#93ae68",
    leafColor: "#c0ce7c",
    opacity: "0.38",
    strands: [
      { x0: 632, y0: 256, archX: -36, archY: -10, length: 238, tipDriftX: -12, leafStep: 18, leafLen: 19, seed: 9.2 },
    ],
  },
];

/**
 * Mobile living-breeze hanging fronds aligned to the lakeside willow canopy
 * of `threshold-garden-mobile.webp` (768x1376 coordinate space).
 */
const MOBILE_BREEZE_GROUPS: readonly BreezeGroupSpec[] = [
  {
    id: "mob-lake-overhang",
    swayClass: "willow-sway-1",
    stemColor: "#93ab66",
    leafColor: "#bccb77",
    opacity: "0.44",
    strands: [
      { x0: 294, y0: 760, archX: -36, archY: -12, length: 244, tipDriftX: -10, leafStep: 18, leafLen: 21, seed: 11.2 },
      { x0: 356, y0: 688, archX: -28, archY: -14, length: 306, tipDriftX: -8, leafStep: 18, leafLen: 22, seed: 12.6 },
    ],
  },
  {
    id: "mob-clearing-veil",
    swayClass: "willow-sway-2",
    stemColor: "#86a463",
    leafColor: "#a8c173",
    opacity: "0.42",
    strands: [
      { x0: 446, y0: 626, archX: -16, archY: -14, length: 318, tipDriftX: -4, leafStep: 18, leafLen: 21, seed: 13.4 },
      { x0: 526, y0: 616, archX: 12, archY: -12, length: 292, tipDriftX: 4, leafStep: 18, leafLen: 21, seed: 14.8 },
    ],
  },
  {
    id: "mob-right-bough",
    swayClass: "willow-sway-3",
    stemColor: "#658b5b",
    leafColor: "#7ca269",
    opacity: "0.42",
    strands: [
      { x0: 656, y0: 676, archX: 24, archY: -12, length: 292, tipDriftX: 8, leafStep: 18, leafLen: 21, seed: 15.1 },
      { x0: 710, y0: 726, archX: 26, archY: -10, length: 256, tipDriftX: 10, leafStep: 18, leafLen: 20, seed: 16.5 },
    ],
  },
];

const COMPILED_DESKTOP_BREEZE = DESKTOP_BREEZE_GROUPS.map((g) => ({
  ...g,
  ...buildBreezePaths(g.strands),
}));

const COMPILED_MOBILE_BREEZE = MOBILE_BREEZE_GROUPS.map((g) => ({
  ...g,
  ...buildBreezePaths(g.strands),
}));

export function ThresholdWillowBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="threshold-garden-layer pointer-events-none select-none"
    >
      {/* Seamless luminous spring-morning sky continuation for tall mobile & ultra-wide screens */}
      <div className="threshold-storybook-sky" />

      {/* Hand-painted watercolor & gouache lakeside willow sanctuary (desktop & portrait compositions) */}
      <picture className="threshold-garden-picture">
        <source
          media="(min-width: 48rem)"
          srcSet="/images/threshold-garden-desktop.webp"
          type="image/webp"
        />
        <img
          src="/images/threshold-garden-mobile.webp"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          className="threshold-garden-artwork"
        />
      </picture>

      {/* Gentle morning water light shimmer across the calm mountain lake */}
      <div className="threshold-lake-layer">
        <span className="threshold-lake-shimmer threshold-lake-shimmer-a" />
        <span className="threshold-lake-shimmer threshold-lake-shimmer-b" />
        <span className="threshold-lake-shimmer threshold-lake-shimmer-c" />
      </div>

      {/* Soft morning sunbeams filtering gently through the willow branches */}
      <div className="threshold-sunlight-veil">
        <div className="threshold-sunbeam threshold-sunbeam-a" />
        <div className="threshold-sunbeam threshold-sunbeam-b" />
      </div>

      {/* Subtle translucent swaying willow fronds — desktop alignment */}
      <svg
        viewBox="0 0 1376 768"
        preserveAspectRatio="xMaxYMid slice"
        focusable="false"
        aria-hidden="true"
        className="threshold-breeze-svg threshold-breeze-desktop"
      >
        {COMPILED_DESKTOP_BREEZE.map((group) => (
          <g
            key={group.id}
            className={`willow-curtain ${group.swayClass}`}
            opacity={group.opacity}
          >
            <path
              d={group.stemsPath}
              fill="none"
              stroke={group.stemColor}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path d={group.leavesPath} fill={group.leafColor} />
          </g>
        ))}
      </svg>

      {/* Subtle translucent swaying willow fronds — mobile alignment */}
      <svg
        viewBox="0 0 768 1376"
        preserveAspectRatio="xMidYMax meet"
        focusable="false"
        aria-hidden="true"
        className="threshold-breeze-svg threshold-breeze-mobile"
      >
        {COMPILED_MOBILE_BREEZE.map((group) => (
          <g
            key={group.id}
            className={`willow-curtain ${group.swayClass}`}
            opacity={group.opacity}
          >
            <path
              d={group.stemsPath}
              fill="none"
              stroke={group.stemColor}
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path d={group.leavesPath} fill={group.leafColor} />
          </g>
        ))}
      </svg>

      {/* Sparingly placed sunlit pollen motes drifting slowly through the morning air */}
      <div className="threshold-pollen-layer">
        <span className="threshold-pollen-mote threshold-pollen-1" />
        <span className="threshold-pollen-mote threshold-pollen-2" />
        <span className="threshold-pollen-mote threshold-pollen-3" />
        <span className="threshold-pollen-mote threshold-pollen-4" />
        <span className="threshold-pollen-mote threshold-pollen-5" />
        <span className="threshold-pollen-mote threshold-pollen-6" />
      </div>

      {/* Softly feathered morning-sky readability veil framing foreground typography */}
      <div className="threshold-readability-veil" />
    </div>
  );
}
