/** The four stages of the page, top to bottom. One source of truth for the banners and the journey bar. The stages end at Level up, the peak of the bar. "How it works" follows as an unnumbered section and is only a link beside the logo. */
export type StageScene = "camp" | "woods" | "lookout" | "summit" | "training" | "workshop"; // "workshop" is the How it works section
export type JourneyStage = { id: string; number: number; label: string; title: string; line: string; scene: StageScene };

/** The full name of the second header tab and the heading of the Level up panel. The trail node keeps the short label "Level up". */
export const LEVEL_UP_TITLE = "Level Up Your Résumé with Free / Open-Source Websites & Tools";

export const STAGES: readonly JourneyStage[] = [
  { id: "check", number: 1, label: "Add role & résumé", title: "Add your role and résumé", line: "Paste the job you want, then add your résumé.", scene: "camp" },
  { id: "readers", number: 2, label: "Résumé analysis", title: "The readers investigate", line: "Four readers check your résumé against the role.", scene: "woods" },
  { id: "radar", number: 3, label: "Your skills radar", title: "Your Skills Radar", line: "", scene: "lookout" },
  { id: "level-up", number: 4, label: "Level up", title: LEVEL_UP_TITLE, line: "", scene: "training" },
];

/** The main header tabs and the section ids each one covers. Analyse Résumé covers three stages. News & Figures is the board under Level up (not a trail stop). */
export const TABS = [
  { label: "Analyse Résumé", sections: ["check", "readers", "radar"] },
  { label: LEVEL_UP_TITLE, sections: ["level-up"] },
  { label: "News & Figures", sections: ["figures"] },
] as const;
/** "How it works" is not a tab: it is a small link beside the logo, with its own section after the four stages. */
export const HOW_IT_WORKS = { label: "How it works", sections: ["how-it-works"] } as const;
/** Everything the header can mark as in view: the tabs, then How it works. `activeTab` returns an index into this. */
export const NAV_ITEMS = [...TABS, HOW_IT_WORKS] as const;
/** Section ids in page order: the four stages, then How it works (not a trail stop). The header measures these. */
export const SECTION_IDS: readonly string[] = NAV_ITEMS.flatMap((item) => item.sections);

/** A stage's viewport rectangle (getBoundingClientRect top and bottom). Stages may sit side by side or stacked. */
export type StageRect = { top: number; bottom: number };

/** The band of the viewport, as shares of its height, in which a stage counts as "the one you are on". */
export const BAND = { from: 0.15, to: 0.85 } as const;

const overlap = (rect: StageRect, from: number, to: number) => Math.max(0, Math.min(rect.bottom, to) - Math.max(rect.top, from));

/** The stage with the most height inside the band; a tie goes to the lower index. When none is in the band: -1 if stage 1 is still below it, otherwise the last stage already reached. */
export function activeStage(rects: StageRect[], viewportHeight: number): number {
  const from = viewportHeight * BAND.from, to = viewportHeight * BAND.to;
  let best = -1, bestHeight = 0;
  rects.forEach((rect, index) => {
    const height = overlap(rect, from, to);
    if (height > bestHeight) { best = index; bestHeight = height; }
  });
  if (best >= 0) return best;
  let reached = -1;
  rects.forEach((rect, index) => { if (rect.top <= to) reached = index; });
  return reached;
}

/** Index into NAV_ITEMS for the section in view (the tabs first, then How it works), or -1 above Check. `rects` are in SECTION_IDS order. */
export function activeTab(rects: StageRect[], viewportHeight: number): number {
  const section = activeStage(rects, viewportHeight);
  return section < 0 ? -1 : NAV_ITEMS.findIndex((item) => (item.sections as readonly string[]).includes(SECTION_IDS[section]));
}

/** Where the "Level up" section's top edge, as a share of the viewport height, ends the climb: at or above it the party stands at the flag. */
export const FINISH_AT = 0.7;

/** 0..1 along the stages (stage i sits at i / (n - 1)): the average stage index weighted by how much of each stage is on screen. Two stages side by side put the party between their nodes.
 *  `finish` (optional) is the rect of the "Level up" section. As its top rises from the bottom edge of the viewport to FINISH_AT of the height, the result is pulled to 1 and stays there, so the party is at the flag by the time you reach it. Both parts only grow when you scroll down, so the party never steps back. */
export function trailProgress(rects: StageRect[], viewportHeight: number, finish?: StageRect): number {
  const base = stageProgress(rects, viewportHeight);
  if (!finish || rects.length < 2 || viewportHeight <= 0) return base;
  const pull = Math.min(1, Math.max(0, (viewportHeight - finish.top) / (viewportHeight * (1 - FINISH_AT))));
  return base + (1 - base) * pull;
}

function stageProgress(rects: StageRect[], viewportHeight: number): number {
  const last = rects.length - 1;
  if (last < 1) return 0;
  let sum = 0, weights = 0;
  rects.forEach((rect, index) => { const w = overlap(rect, 0, viewportHeight); sum += index * w; weights += w; });
  if (weights > 0) return sum / weights / last;
  // nothing on screen: above stage 1 -> 0, below the last -> 1, in a gap -> halfway between the neighbours
  const passed = rects.filter((rect) => rect.bottom <= 0).length;
  if (passed === 0) return 0;
  if (passed >= rects.length) return 1;
  return (passed - 0.5) / last;
}
