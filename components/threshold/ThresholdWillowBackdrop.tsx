/**
 * Decorative sunlit lakeside weeping willow backdrop for the Threshold.
 *
 * - Combines cohesive hand-painted watercolor/gouache literary storybook
 *   landscapes (composed separately for widescreen desktop and portrait mobile)
 *   with visibly alive, GPU-composited afternoon-breeze animations:
 *   - Two-tier nested swaying willow curtains (primary hanging branches plus
 *     phase-delayed trailing foliage tips & sunlit highlights) across 7 desktop
 *     and 5 mobile asynchronously phased groups while trunk/limbs stay stable.
 *   - Serene calm-lake shimmer ribbons & softly shifting reflection bands.
 *   - Gently shifting morning sunbeams, dappled clearing light, and multi-depth
 *     drifting pollen motes.
 * - Strictly decorative (`aria-hidden="true"`, `pointer-events-none`); never
 *   displays captions, tooltips, or text hints and never intercepts clicks or
 *   keyboard focus.
 * - Zero inline `style=""` attributes (strict nonce CSP compliant), zero
 *   animation libraries, zero React re-renders, and renders the complete static
 *   illustration under `prefers-reduced-motion: reduce`.
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
  tipClass: string;
  stemColor: string;
  leafColor: string;
  highlightColor: string;
  opacity: string;
  strands: readonly BreezeStrandSpec[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function evalCubic(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const u = 1 - t;
  return (
    u * u * u * p0 +
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t * p3
  );
}

/**
 * Splits each arching-and-cascading weeping willow whip into:
 * - Upper hanging section (attached to the primary swaying curtain group)
 * - Lower trailing tip & outer foliage cluster (nested inside a delayed
 *   secondary sway group so the tips whip & trail naturally behind the bough).
 */
function buildNestedBreezePaths(strands: readonly BreezeStrandSpec[]): {
  upperStemsPath: string;
  upperLeavesPath: string;
  upperHighlightPath: string;
  tipStemsPath: string;
  tipLeavesPath: string;
  tipHighlightPath: string;
} {
  const upperStems: string[] = [];
  const upperLeaves: string[] = [];
  const upperHighlights: string[] = [];
  const tipStems: string[] = [];
  const tipLeaves: string[] = [];
  const tipHighlights: string[] = [];

  for (const s of strands) {
    const c1x = s.x0 + s.archX * 0.72;
    const c1y = s.y0 + s.archY;
    const shoulderX = s.x0 + s.archX;
    const c2x = shoulderX + s.tipDriftX * 0.45;
    const c2y = s.y0 + s.length * 0.36;
    const x3 = shoulderX + s.tipDriftX;
    const y3 = s.y0 + s.length;

    // De Casteljau split at t = 0.48 so upper & lower segments join seamlessly
    const splitT = 0.48;
    const midX = evalCubic(splitT, s.x0, c1x, c2x, x3);
    const midY = evalCubic(splitT, s.y0, c1y, c2y, y3);
    const q1x = s.x0 + (c1x - s.x0) * splitT;
    const q1y = s.y0 + (c1y - s.y0) * splitT;
    const q2x = c1x + (c2x - c1x) * splitT;
    const q2y = c1y + (c2y - c1y) * splitT;
    const q3x = c2x + (x3 - c2x) * splitT;
    const q3y = c2y + (y3 - c2y) * splitT;
    const r1x = q1x + (q2x - q1x) * splitT;
    const r1y = q1y + (q2y - q1y) * splitT;
    const r2x = q2x + (q3x - q2x) * splitT;
    const r2y = q2y + (q3y - q2y) * splitT;

    upperStems.push(
      `M${round1(s.x0)},${round1(s.y0)}C${round1(q1x)},${round1(q1y)} ${round1(r1x)},${round1(r1y)} ${round1(midX)},${round1(midY)}`
    );
    tipStems.push(
      `M${round1(midX)},${round1(midY)}C${round1(r2x)},${round1(r2y)} ${round1(q3x)},${round1(q3y)} ${round1(x3)},${round1(y3)}`
    );

    const steps = Math.max(7, Math.floor(s.length / s.leafStep));
    for (let i = 1; i <= steps; i++) {
      const jitter = Math.sin(i * 2.17 + s.seed) * 0.24;
      const t = Math.min(0.985, Math.max(0.06, (i + jitter * 0.36) / (steps + 0.5)));

      const px = evalCubic(t, s.x0, c1x, c2x, x3);
      const py = evalCubic(t, s.y0, c1y, c2y, y3);

      const envelope =
        t < 0.16
          ? 0.62 + (t / 0.16) * 0.38
          : 1 - Math.pow((t - 0.16) / 0.84, 1.15) * 0.38;
      const len = s.leafLen * envelope * (1 + Math.sin(i * 3.11 + s.seed) * 0.2);
      const width = len * 0.21;

      const side = (i + Math.round(s.seed)) % 2 === 0 ? 1 : -1;
      const spread = 0.24 + Math.abs(Math.cos(i * 1.43 + s.seed)) * 0.24;
      const dx = side * len * spread;
      const dy = len * 0.96;

      const primaryLeaf = `M${round1(px)},${round1(py)}Q${round1(px + dx * 0.46 + side * width)},${round1(py + dy * 0.36)} ${round1(px + dx)},${round1(py + dy)}Q${round1(px + dx * 0.42 - side * width * 0.44)},${round1(py + dy * 0.6)} ${round1(px)},${round1(py)}`;

      const isTip = t >= splitT;
      const targetLeaves = isTip ? tipLeaves : upperLeaves;
      const targetHighlights = isTip ? tipHighlights : upperHighlights;

      // Alternate luminous sunlit highlight blades with rich base watercolor foliage
      if ((i + Math.floor(s.seed)) % 3 === 0) {
        targetHighlights.push(primaryLeaf);
      } else {
        targetLeaves.push(primaryLeaf);
      }

      // Companion opposite blade for lush weeping willow fullness
      if (t > 0.1 && t < 0.9 && (i + Math.floor(s.seed)) % 4 !== 0) {
        const opp = -side;
        const len2 = len * 0.82;
        const w2 = len2 * 0.2;
        const dx2 = opp * len2 * 0.26;
        const dy2 = len2 * 0.98;
        const py2 = py + 2.2;

        const companionLeaf = `M${round1(px)},${round1(py2)}Q${round1(px + dx2 * 0.45 + opp * w2)},${round1(py2 + dy2 * 0.38)} ${round1(px + dx2)},${round1(py2 + dy2)}Q${round1(px + dx2 * 0.4 - opp * w2 * 0.42)},${round1(py2 + dy2 * 0.6)} ${round1(px)},${round1(py2)}`;

        if ((i + Math.floor(s.seed)) % 5 === 0) {
          targetHighlights.push(companionLeaf);
        } else {
          targetLeaves.push(companionLeaf);
        }
      }
    }
  }

  return {
    upperStemsPath: upperStems.join(""),
    upperLeavesPath: upperLeaves.join(""),
    upperHighlightPath: upperHighlights.join(""),
    tipStemsPath: tipStems.join(""),
    tipLeavesPath: tipLeaves.join(""),
    tipHighlightPath: tipHighlights.join(""),
  };
}

/**
 * Seven independently phased desktop hanging willow curtain groups (21 whips)
 * aligned to the overhanging sunlit canopy of `threshold-garden-desktop.webp`
 * (1376x768 coordinate space, right-locked so trunk & main boughs stay stable).
 */
const DESKTOP_BREEZE_GROUPS: readonly BreezeGroupSpec[] = [
  {
    id: "desk-outer-lake-veil",
    swayClass: "willow-sway-1",
    tipClass: "willow-tip-1",
    stemColor: "#6d8f56",
    leafColor: "#7ea15e",
    highlightColor: "#c5d37d",
    opacity: "0.84",
    strands: [
      { x0: 634, y0: 214, archX: -58, archY: -12, length: 286, tipDriftX: -18, leafStep: 15, leafLen: 22, seed: 1.2 },
      { x0: 668, y0: 172, archX: -52, archY: -14, length: 342, tipDriftX: -14, leafStep: 15, leafLen: 24, seed: 2.4 },
      { x0: 702, y0: 138, archX: -42, archY: -16, length: 382, tipDriftX: -12, leafStep: 15, leafLen: 24, seed: 3.1 },
    ],
  },
  {
    id: "desk-sunlit-shoulder",
    swayClass: "willow-sway-2",
    tipClass: "willow-tip-2",
    stemColor: "#7c9b5b",
    leafColor: "#92b066",
    highlightColor: "#d3dc8a",
    opacity: "0.86",
    strands: [
      { x0: 742, y0: 122, archX: -36, archY: -14, length: 394, tipDriftX: -10, leafStep: 15, leafLen: 25, seed: 4.3 },
      { x0: 782, y0: 108, archX: -28, archY: -14, length: 404, tipDriftX: -8, leafStep: 15, leafLen: 25, seed: 5.5 },
      { x0: 822, y0: 102, archX: -22, archY: -12, length: 386, tipDriftX: -6, leafStep: 16, leafLen: 24, seed: 6.2 },
    ],
  },
  {
    id: "desk-clearing-arch",
    swayClass: "willow-sway-3",
    tipClass: "willow-tip-3",
    stemColor: "#6e9157",
    leafColor: "#85a662",
    highlightColor: "#ced984",
    opacity: "0.82",
    strands: [
      { x0: 866, y0: 104, archX: -18, archY: -12, length: 356, tipDriftX: -6, leafStep: 16, leafLen: 23, seed: 7.4 },
      { x0: 912, y0: 108, archX: -14, archY: -10, length: 326, tipDriftX: -4, leafStep: 16, leafLen: 23, seed: 8.6 },
      { x0: 954, y0: 118, archX: -10, archY: -10, length: 304, tipDriftX: -4, leafStep: 16, leafLen: 22, seed: 9.1 },
    ],
  },
  {
    id: "desk-high-crown-drape",
    swayClass: "willow-sway-4",
    tipClass: "willow-tip-4",
    stemColor: "#5c8150",
    leafColor: "#70965d",
    highlightColor: "#b8ca75",
    opacity: "0.78",
    strands: [
      { x0: 998, y0: 98, archX: -8, archY: -10, length: 312, tipDriftX: -2, leafStep: 16, leafLen: 22, seed: 10.3 },
      { x0: 1044, y0: 94, archX: 8, archY: -10, length: 292, tipDriftX: 4, leafStep: 16, leafLen: 22, seed: 11.7 },
      { x0: 1094, y0: 102, archX: 14, archY: -10, length: 282, tipDriftX: 6, leafStep: 16, leafLen: 22, seed: 12.2 },
    ],
  },
  {
    id: "desk-emerald-right",
    swayClass: "willow-sway-5",
    tipClass: "willow-tip-5",
    stemColor: "#4f7548",
    leafColor: "#608855",
    highlightColor: "#a2bc6d",
    opacity: "0.82",
    strands: [
      { x0: 1164, y0: 112, archX: 20, archY: -10, length: 328, tipDriftX: 8, leafStep: 15, leafLen: 23, seed: 13.5 },
      { x0: 1214, y0: 120, archX: 24, archY: -10, length: 344, tipDriftX: 10, leafStep: 15, leafLen: 23, seed: 14.8 },
      { x0: 1264, y0: 132, archX: 26, archY: -10, length: 326, tipDriftX: 12, leafStep: 15, leafLen: 23, seed: 15.1 },
    ],
  },
  {
    id: "desk-far-right-veil",
    swayClass: "willow-sway-6",
    tipClass: "willow-tip-6",
    stemColor: "#496d44",
    leafColor: "#5a8050",
    highlightColor: "#9ab569",
    opacity: "0.8",
    strands: [
      { x0: 1304, y0: 146, archX: 28, archY: -8, length: 318, tipDriftX: 14, leafStep: 16, leafLen: 22, seed: 16.4 },
      { x0: 1336, y0: 168, archX: 22, archY: -8, length: 288, tipDriftX: 10, leafStep: 16, leafLen: 21, seed: 17.7 },
    ],
  },
  {
    id: "desk-foreground-wisps",
    swayClass: "willow-sway-7",
    tipClass: "willow-tip-7",
    stemColor: "#89a560",
    leafColor: "#a3bc6e",
    highlightColor: "#dce493",
    opacity: "0.84",
    strands: [
      { x0: 618, y0: 266, archX: -48, archY: -8, length: 256, tipDriftX: -16, leafStep: 15, leafLen: 22, seed: 18.2 },
      { x0: 760, y0: 204, archX: -30, archY: -10, length: 324, tipDriftX: -10, leafStep: 15, leafLen: 23, seed: 19.6 },
      { x0: 888, y0: 188, archX: -16, archY: -8, length: 274, tipDriftX: -6, leafStep: 16, leafLen: 22, seed: 20.1 },
      { x0: 1240, y0: 196, archX: 22, archY: -8, length: 266, tipDriftX: 10, leafStep: 16, leafLen: 22, seed: 21.4 },
    ],
  },
];

/**
 * Five independently phased mobile hanging willow curtain groups (14 whips)
 * aligned to the lakeside willow canopy of `threshold-garden-mobile.webp`
 * (768x1376 coordinate space).
 */
const MOBILE_BREEZE_GROUPS: readonly BreezeGroupSpec[] = [
  {
    id: "mob-lake-overhang",
    swayClass: "willow-sway-1",
    tipClass: "willow-tip-1",
    stemColor: "#88a25f",
    leafColor: "#a1ba6c",
    highlightColor: "#d6df8c",
    opacity: "0.84",
    strands: [
      { x0: 280, y0: 774, archX: -38, archY: -10, length: 254, tipDriftX: -12, leafStep: 16, leafLen: 22, seed: 22.2 },
      { x0: 322, y0: 716, archX: -34, archY: -12, length: 312, tipDriftX: -10, leafStep: 16, leafLen: 23, seed: 23.5 },
      { x0: 364, y0: 668, archX: -28, archY: -14, length: 344, tipDriftX: -8, leafStep: 16, leafLen: 23, seed: 24.1 },
    ],
  },
  {
    id: "mob-sunlit-arch",
    swayClass: "willow-sway-2",
    tipClass: "willow-tip-2",
    stemColor: "#7c9b5d",
    leafColor: "#94b169",
    highlightColor: "#d2dc88",
    opacity: "0.82",
    strands: [
      { x0: 410, y0: 636, archX: -22, archY: -12, length: 342, tipDriftX: -6, leafStep: 16, leafLen: 23, seed: 25.4 },
      { x0: 454, y0: 616, archX: -16, archY: -12, length: 330, tipDriftX: -4, leafStep: 16, leafLen: 22, seed: 26.8 },
      { x0: 496, y0: 612, archX: -8, archY: -10, length: 312, tipDriftX: -2, leafStep: 16, leafLen: 22, seed: 27.3 },
    ],
  },
  {
    id: "mob-center-crown",
    swayClass: "willow-sway-3",
    tipClass: "willow-tip-3",
    stemColor: "#698d58",
    leafColor: "#7fa265",
    highlightColor: "#c2d27b",
    opacity: "0.78",
    strands: [
      { x0: 544, y0: 618, archX: 10, archY: -10, length: 306, tipDriftX: 4, leafStep: 16, leafLen: 22, seed: 28.6 },
      { x0: 588, y0: 634, archX: 16, archY: -10, length: 304, tipDriftX: 6, leafStep: 16, leafLen: 22, seed: 29.2 },
    ],
  },
  {
    id: "mob-right-drape",
    swayClass: "willow-sway-5",
    tipClass: "willow-tip-5",
    stemColor: "#587e51",
    leafColor: "#6d945f",
    highlightColor: "#adc473",
    opacity: "0.82",
    strands: [
      { x0: 636, y0: 658, archX: 22, archY: -10, length: 312, tipDriftX: 8, leafStep: 16, leafLen: 22, seed: 30.5 },
      { x0: 682, y0: 688, archX: 26, archY: -10, length: 292, tipDriftX: 10, leafStep: 16, leafLen: 22, seed: 31.1 },
      { x0: 718, y0: 734, archX: 24, archY: -8, length: 258, tipDriftX: 10, leafStep: 16, leafLen: 21, seed: 32.4 },
    ],
  },
  {
    id: "mob-outer-shimmer",
    swayClass: "willow-sway-7",
    tipClass: "willow-tip-7",
    stemColor: "#8ea863",
    leafColor: "#a8c171",
    highlightColor: "#dce494",
    opacity: "0.82",
    strands: [
      { x0: 306, y0: 790, archX: -32, archY: -8, length: 236, tipDriftX: -12, leafStep: 16, leafLen: 21, seed: 33.7 },
      { x0: 472, y0: 676, archX: -12, archY: -8, length: 268, tipDriftX: -4, leafStep: 16, leafLen: 21, seed: 34.2 },
      { x0: 660, y0: 742, archX: 22, archY: -8, length: 246, tipDriftX: 10, leafStep: 16, leafLen: 21, seed: 35.8 },
    ],
  },
];

const COMPILED_DESKTOP_BREEZE = DESKTOP_BREEZE_GROUPS.map((g) => ({
  ...g,
  ...buildNestedBreezePaths(g.strands),
}));

const COMPILED_MOBILE_BREEZE = MOBILE_BREEZE_GROUPS.map((g) => ({
  ...g,
  ...buildNestedBreezePaths(g.strands),
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

      {/* Calm mountain lake reflections & gently gliding sunlit water ripples */}
      <div className="threshold-lake-layer">
        <span className="threshold-lake-reflection threshold-lake-reflection-a" />
        <span className="threshold-lake-reflection threshold-lake-reflection-b" />
        <span className="threshold-lake-reflection threshold-lake-reflection-c" />
        <span className="threshold-lake-shimmer threshold-lake-shimmer-a" />
        <span className="threshold-lake-shimmer threshold-lake-shimmer-b" />
        <span className="threshold-lake-shimmer threshold-lake-shimmer-c" />
      </div>

      {/* Soft morning sunbeams & dappled canopy light shifting gently over the willow & clearing */}
      <div className="threshold-sunlight-veil">
        <div className="threshold-sunbeam threshold-sunbeam-a" />
        <div className="threshold-sunbeam threshold-sunbeam-b" />
        <div className="threshold-dapple-pool threshold-dapple-pool-a" />
        <div className="threshold-dapple-pool threshold-dapple-pool-b" />
      </div>

      {/* Visibly swaying two-tier hanging willow curtains — desktop alignment */}
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
              d={group.upperStemsPath}
              fill="none"
              stroke={group.stemColor}
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <path d={group.upperLeavesPath} fill={group.leafColor} />
            <path d={group.upperHighlightPath} fill={group.highlightColor} />

            {/* Nested trailing lower willow tips following the primary branch with gentle delay */}
            <g className={`willow-tip-cluster ${group.tipClass}`}>
              <path
                d={group.tipStemsPath}
                fill="none"
                stroke={group.stemColor}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d={group.tipLeavesPath} fill={group.leafColor} />
              <path d={group.tipHighlightPath} fill={group.highlightColor} />
            </g>
          </g>
        ))}
      </svg>

      {/* Visibly swaying two-tier hanging willow curtains — mobile alignment */}
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
              d={group.upperStemsPath}
              fill="none"
              stroke={group.stemColor}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path d={group.upperLeavesPath} fill={group.leafColor} />
            <path d={group.upperHighlightPath} fill={group.highlightColor} />

            {/* Nested trailing lower willow tips following the primary branch with gentle delay */}
            <g className={`willow-tip-cluster ${group.tipClass}`}>
              <path
                d={group.tipStemsPath}
                fill="none"
                stroke={group.stemColor}
                strokeWidth="1.45"
                strokeLinecap="round"
              />
              <path d={group.tipLeavesPath} fill={group.leafColor} />
              <path d={group.tipHighlightPath} fill={group.highlightColor} />
            </g>
          </g>
        ))}
      </svg>

      {/* Multi-depth sunlit pollen motes drifting slowly at varied speeds through the morning breeze */}
      <div className="threshold-pollen-layer">
        <span className="threshold-pollen-mote threshold-pollen-1" />
        <span className="threshold-pollen-mote threshold-pollen-2" />
        <span className="threshold-pollen-mote threshold-pollen-3" />
        <span className="threshold-pollen-mote threshold-pollen-4" />
        <span className="threshold-pollen-mote threshold-pollen-5" />
        <span className="threshold-pollen-mote threshold-pollen-6" />
        <span className="threshold-pollen-mote threshold-pollen-7" />
        <span className="threshold-pollen-mote threshold-pollen-8" />
        <span className="threshold-pollen-mote threshold-pollen-9" />
      </div>

      {/* Softly feathered morning-sky readability veil framing foreground typography */}
      <div className="threshold-readability-veil" />
    </div>
  );
}
