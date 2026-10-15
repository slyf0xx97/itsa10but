/** Quiet background drawings for the three quick-fact tiles. Pure decoration (aria-hidden), no animation; the tile's CSS sets the colour and fades them. */
const props = { className: "so-art", viewBox: "0 0 120 90", "aria-hidden": true, focusable: false } as const;

/** Best proof: a sunlit peak with a flag and a check badge. */
export function BestArt() {
  return <svg {...props}>
    <circle cx="30" cy="26" r="13" className="a-sun" />
    <path d="M2 86 L44 38 L66 62 L82 44 L118 86 Z" className="a-hill" />
    <path d="M44 38 L52 47 L38 47 Z" className="a-snow" />
    <path d="M44 38 V22" className="a-line" />
    <path d="M44 22 H58 L54 27 L58 32 H44 Z" className="a-flag" />
    <circle cx="98" cy="26" r="13" className="a-badge" />
    <path d="M91 26 L96 31 L105 20" className="a-tick" />
  </svg>;
}

/** Biggest gap: two cliffs, a bridge that stops short, and a dashed outline where the missing plank goes. */
export function GapArt() {
  return <svg {...props}>
    <path d="M0 50 H40 V90 H0 Z" className="a-cliff" />
    <path d="M80 50 H120 V90 H80 Z" className="a-cliff" />
    <path d="M40 50 H56 M40 58 H56" className="a-plank" />
    <path d="M64 50 H80 M64 58 H80" className="a-plank" />
    <rect x="57" y="46" width="6" height="16" rx="1.5" className="a-hole" />
    <path d="M44 66 V80 M76 66 V80" className="a-line" />
  </svg>;
}

/** Match: two puzzle halves with the knob and the notch nearly meeting. */
export function MatchArt() {
  return <svg {...props}>
    <path d="M8 20 H56 V36 A9 9 0 0 1 56 54 V70 H8 Z" className="a-half one" />
    <path d="M68 20 H116 V70 H68 V54 A9 9 0 0 0 68 36 Z" className="a-half two" />
  </svg>;
}

/** The Match gauge: a half circle whose filled share is the percent (0 to 100). */
export function Gauge({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, pct));
  return <svg className="so-gauge" viewBox="0 0 100 56" aria-hidden="true" focusable="false">
    <path d="M8 50 A42 42 0 0 1 92 50" pathLength={100} className="g-track" />
    <path d="M8 50 A42 42 0 0 1 92 50" pathLength={100} className="g-fill" strokeDasharray={`${v} 100`} />
  </svg>;
}
