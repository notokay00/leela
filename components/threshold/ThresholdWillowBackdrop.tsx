/**
 * Decorative sunlit fairy-tale weeping willow backdrop for the Threshold.
 *
 * - Combines cohesive hand-painted watercolor/gouache storybook artwork
 *   (purpose-composed separately for desktop landscape and mobile portrait)
 *   with lightweight, GPU-composited living afternoon-breeze overlays:
 *   translucent swaying willow fronds, softly shifting golden sunbeams, and
 *   sparingly placed drifting pollen motes.
 * - Strictly decorative (`aria-hidden="true"`, `pointer-events-none`); never
 *   displays captions, tooltips, or text hints and never intercepts clicks or
 *   keyboard focus.
 * - Zero inline `style=""` attributes (strict nonce CSP compliant), zero
 *   animation libraries, and renders the complete static illustration under
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
 * willow tendrils that layer gently along the painted willow's sunlit shoulders
 * so the hanging branches appear to sway naturally in a warm afternoon breeze.
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
 * Desktop living-breeze hanging fronds aligned to the sunlit outer cascading
 * veil of `threshold-garden-desktop.webp` (1376x768 coordinate space).
 */
const DESKTOP_BREEZE_GROUPS: readonly BreezeGroupSpec[] = [
  {
    id: "desk-sun-left",
    swayClass: "willow-sway-1",
    stemColor: "#8ea867",
    leafColor: "#a8c173",
    opacity: "0.46",
    strands: [
      { x0: 716, y0: 332, archX: -48, archY: -18, length: 288, tipDriftX: -14, leafStep: 17, leafLen: 21, seed: 1.4 },
      { x0: 758, y0: 274, archX: -36, archY: -20, length: 326, tipDriftX: -10, leafStep: 17, leafLen: 22, seed: 2.7 },
    ],
  },
  {
    id: "desk-gold-mid-left",
    swayClass: "willow-sway-2",
    stemColor: "#a4b868",
    leafColor: "#c8cf7d",
    opacity: "0.48",
    strands: [
      { x0: 816, y0: 230, archX: -28, archY: -22, length: 344, tipDriftX: -8, leafStep: 17, leafLen: 23, seed: 3.5 },
      { x0: 874, y0: 204, archX: -18, archY: -20, length: 328, tipDriftX: -5, leafStep: 18, leafLen: 22, seed: 4.8 },
    ],
  },
  {
    id: "desk-sage-crown",
    swayClass: "willow-sway-3",
    stemColor: "#6e945e",
    leafColor: "#7ea668",
    opacity: "0.42",
    strands: [
      { x0: 942, y0: 158, archX: -12, archY: -18, length: 298, tipDriftX: -4, leafStep: 18, leafLen: 21, seed: 5.3 },
      { x0: 1018, y0: 146, archX: 14, archY: -18, length: 288, tipDriftX: 6, leafStep: 18, leafLen: 21, seed: 6.1 },
    ],
  },
  {
    id: "desk-emerald-right",
    swayClass: "willow-sway-4",
    stemColor: "#5e8556",
    leafColor: "#6d9661",
    opacity: "0.44",
    strands: [
      { x0: 1174, y0: 248, archX: 28, archY: -16, length: 326, tipDriftX: 12, leafStep: 17, leafLen: 22, seed: 7.6 },
      { x0: 1236, y0: 292, archX: 34, archY: -14, length: 304, tipDriftX: 16, leafStep: 17, leafLen: 21, seed: 8.9 },
    ],
  },
  {
    id: "desk-outer-shimmer",
    swayClass: "willow-sway-5",
    stemColor: "#98b16a",
    leafColor: "#bdd07e",
    opacity: "0.42",
    strands: [
      { x0: 684, y0: 392, archX: -40, archY: -12, length: 244, tipDriftX: -16, leafStep: 17, leafLen: 20, seed: 9.2 },
      { x0: 1286, y0: 332, archX: 36, archY: -12, length: 256, tipDriftX: 18, leafStep: 17, leafLen: 20, seed: 10.4 },
    ],
  },
];

/**
 * Mobile living-breeze hanging fronds aligned to the sunlit cascading canopy
 * of `threshold-garden-mobile.webp` (768x1376 coordinate space).
 */
const MOBILE_BREEZE_GROUPS: readonly BreezeGroupSpec[] = [
  {
    id: "mob-sage-left",
    swayClass: "willow-sway-1",
    stemColor: "#6e9360",
    leafColor: "#7ea56b",
    opacity: "0.44",
    strands: [
      { x0: 196, y0: 716, archX: -38, archY: -14, length: 326, tipDriftX: -12, leafStep: 18, leafLen: 22, seed: 11.2 },
      { x0: 248, y0: 668, archX: -28, archY: -16, length: 360, tipDriftX: -8, leafStep: 18, leafLen: 23, seed: 12.6 },
    ],
  },
  {
    id: "mob-spring-mid",
    swayClass: "willow-sway-2",
    stemColor: "#89aa65",
    leafColor: "#a2be72",
    opacity: "0.42",
    strands: [
      { x0: 344, y0: 628, archX: -16, archY: -16, length: 318, tipDriftX: -4, leafStep: 18, leafLen: 22, seed: 13.4 },
      { x0: 454, y0: 632, archX: 18, archY: -16, length: 330, tipDriftX: 6, leafStep: 18, leafLen: 22, seed: 14.8 },
    ],
  },
  {
    id: "mob-gold-right",
    swayClass: "willow-sway-3",
    stemColor: "#a6b868",
    leafColor: "#cad27e",
    opacity: "0.48",
    strands: [
      { x0: 556, y0: 682, archX: 30, archY: -16, length: 368, tipDriftX: 10, leafStep: 18, leafLen: 23, seed: 15.1 },
      { x0: 608, y0: 738, archX: 38, archY: -14, length: 312, tipDriftX: 14, leafStep: 18, leafLen: 22, seed: 16.5 },
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
      {/* Seamless luminous pastel sky continuation for tall mobile & ultra-wide screens */}
      <div className="threshold-storybook-sky" />

      {/* Hand-painted watercolor & gouache storybook landscape (separate desktop & mobile compositions) */}
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

      {/* Soft afternoon sunbeams & dappled canopy light shifting gently */}
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
              strokeWidth="1.35"
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
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path d={group.leavesPath} fill={group.leafColor} />
          </g>
        ))}
      </svg>

      {/* Sparingly placed sunlit pollen motes drifting slowly through the warm afternoon air */}
      <div className="threshold-pollen-layer">
        <span className="threshold-pollen-mote threshold-pollen-1" />
        <span className="threshold-pollen-mote threshold-pollen-2" />
        <span className="threshold-pollen-mote threshold-pollen-3" />
        <span className="threshold-pollen-mote threshold-pollen-4" />
        <span className="threshold-pollen-mote threshold-pollen-5" />
        <span className="threshold-pollen-mote threshold-pollen-6" />
        <span className="threshold-pollen-mote threshold-pollen-7" />
      </div>

      {/* Gentle luminous sky veil behind foreground text for effortless contrast */}
      <div className="threshold-readability-veil" />
    </div>
  );
}
