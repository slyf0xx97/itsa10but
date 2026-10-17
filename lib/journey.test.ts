import assert from "node:assert/strict";
import test from "node:test";
import { LEVEL_UP_TITLE, NAV_ITEMS, SECTION_IDS, STAGES, TABS, activeStage, activeTab, trailProgress, type StageRect } from "./journey.ts";

test("four stops with unique ids and numbers 1 to 4, ending at Level up", () => {
  assert.equal(STAGES.length, 4);
  assert.equal(new Set(STAGES.map((stage) => stage.id)).size, 4);
  assert.deepEqual(STAGES.map((stage) => stage.number), [1, 2, 3, 4]);
  assert.ok(!STAGES.some((stage) => stage.id === "quests")); // the quests live inside stage 2
  assert.ok(!STAGES.some((stage) => stage.id === "how-it-works")); // a link beside the logo only
  assert.equal(STAGES[STAGES.length - 2].id, "radar");
  assert.equal(STAGES[STAGES.length - 1].id, "level-up");
});

test("trail labels read as a first-time visitor's steps and match the header tabs", () => {
  assert.deepEqual(STAGES.map((stage) => stage.label), ["Add role & résumé", "Résumé analysis", "Your skills radar", "Level up"]);
  assert.equal(STAGES[0].title, "Add your role and résumé");
  assert.equal(STAGES[3].title, "Level Up Your Résumé with Free / Open-Source Websites & Tools");
  assert.equal(STAGES[3].title, LEVEL_UP_TITLE);
  assert.ok(STAGES.every((stage) => stage.label.length <= 17)); // they sit under small trail nodes
  assert.deepEqual(TABS.map((tab) => tab.label), ["Analyse Résumé", "Level Up Your Résumé with Free / Open-Source Websites & Tools", "News & Figures"]);
  assert.deepEqual(TABS.map((tab) => tab.sections), [["check", "readers", "radar"], ["level-up"], ["figures"]]);
});

const VH = 1000; // band is 150..850
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, a + " vs " + b);
/** Stacked: stage i spans [start + i*h, start + (i+1)*h). */
const stacked = (start: number, h = 900): StageRect[] => STAGES.map((_, i) => ({ top: start + i * h, bottom: start + (i + 1) * h }));
/** A layout with stage 1 alone, then 2|3 side by side (shared tops), then 4 alone. */
const pairs = (start: number, h = 900): StageRect[] => [
  { top: start, bottom: start + h }, // 1
  { top: start + h, bottom: start + 2 * h }, // 2
  { top: start + h, bottom: start + 2 * h }, // 3 (beside 2)
  { top: start + 2 * h, bottom: start + 3 * h }, // 4
];

test("before stage 1: no active stage, progress 0", () => {
  assert.equal(activeStage(stacked(900), VH), -1); // stage 1 starts below the band (850)
  assert.equal(trailProgress(stacked(1000), VH), 0);
  assert.equal(trailProgress(stacked(1200), VH), 0);
});

test("past the last stop: Level up stays active, progress 1", () => {
  const rects = stacked(-6000);
  assert.equal(activeStage(rects, VH), 3);
  assert.equal(trailProgress(rects, VH), 1);
});

test("stacked stages: the one filling the band wins", () => {
  assert.equal(activeStage(stacked(0), VH), 0);
  assert.equal(activeStage(stacked(-900), VH), 1);
  assert.equal(activeStage(stacked(-1300), VH), 1); // stage 2 spans -400..500 (350 in band), stage 3 spans 500..1400 (350 in band) -> tie -> lower
  assert.equal(activeStage(stacked(-1400), VH), 2);
});

test("side by side stages sharing a top: tie goes to the lower index, progress sits between them", () => {
  const rects = pairs(0).map((rect) => ({ top: rect.top - 900, bottom: rect.bottom - 900 })); // row 2 (stages 2 and 3) fills the screen
  assert.equal(activeStage(rects, VH), 1);
  // viewport shows stages 2 and 3 for 900px each, and 100px of 4 -> (1*900 + 2*900 + 3*100) / 1900 / 3
  near(trailProgress(rects, VH), (900 + 1800 + 300) / 1900 / 3);
});

test("two stages equally on screen put the party exactly in the middle of both nodes", () => {
  const rects: StageRect[] = [
    { top: -2000, bottom: -1000 }, { top: 0, bottom: 1000 }, { top: 0, bottom: 1000 }, { top: 1000, bottom: 2000 },
  ];
  near(trailProgress(rects, VH), 1.5 / 3);
});

test("a bigger visible share pulls the progress toward that stage", () => {
  const a = trailProgress([{ top: 0, bottom: 300 }, { top: 300, bottom: 1500 }, ...stacked(5000).slice(2)], VH);
  const b = trailProgress([{ top: 0, bottom: 800 }, { top: 800, bottom: 1500 }, ...stacked(5000).slice(2)], VH);
  assert.ok(a > b);
  assert.ok(a > 0.15 && a < 0.3);
});

test("activeStage in a gap between stages falls back to the last stage reached", () => {
  const rects: StageRect[] = [{ top: -900, bottom: -50 }, { top: 900, bottom: 1800 }, ...stacked(3000).slice(2)];
  assert.equal(activeStage(rects, VH), 0);
  near(trailProgress(rects, VH), 1 / 3); // only stage 2 has any pixels on screen (100px), so all the weight is on index 1
});

test("trailProgress copes with empty, single and zero-height input", () => {
  assert.equal(trailProgress([], VH), 0);
  assert.equal(trailProgress([{ top: 0, bottom: 500 }], VH), 0);
  assert.equal(activeStage([], VH), -1);
  const flat = STAGES.map(() => ({ top: 400, bottom: 400 }));
  assert.ok(Number.isFinite(trailProgress(flat, VH)));
  assert.equal(activeStage(flat, VH), 3);
});

test("the party is at the flag once Level up reaches 70% of the screen, and stays there", () => {
  const levelTop = 1000;
  const base = trailProgress(pairs(levelTop - 1800), VH); // Level up still below the screen
  assert.ok(base < 1);
  const at = (top: number) => { const rects = pairs(top - 1800); return trailProgress(rects, VH, rects[3]); };
  near(at(1000), base); // below the screen: unchanged
  near(at(700), 1);
  near(at(600), 1);
  near(at(-4000), 1);
  const half = at(850);
  assert.ok(half > base && half < 1);
  assert.equal(trailProgress([], VH, { top: 0, bottom: 100 }), 0);
});

test("scrolling down never moves the party back, from before stage 1 to the end of the page", () => {
  let previous = -1;
  for (let scroll = 0; scroll <= 4000; scroll += 10) {
    const rects = pairs(1000 - scroll);
    const p = trailProgress(rects, VH, rects[3]);
    assert.ok(p >= previous - 1e-9 && p >= 0 && p <= 1, "scroll " + scroll + ": " + p + " after " + previous);
    previous = p;
  }
  assert.equal(previous, 1);
});

test("section ids are the four stages, the figures board, then How it works", () => {
  assert.deepEqual(SECTION_IDS, [...STAGES.map((stage) => stage.id), "figures", "how-it-works"]);
});

const five = (start: number, h = 900): StageRect[] => SECTION_IDS.map((_, i) => ({ top: start + i * h, bottom: start + (i + 1) * h }));

test("activeTab: none over the hero, the first three stages are Analyse Résumé, Level up and the figures board each get a tab, past the end is How it works", () => {
  const label = (rects: StageRect[]) => NAV_ITEMS[activeTab(rects, VH)].label;
  assert.equal(activeTab(five(900), VH), -1);
  assert.equal(label(five(0)), "Analyse Résumé"); // check
  assert.equal(label(five(-900)), "Analyse Résumé"); // readers
  assert.equal(label(five(-1800)), "Analyse Résumé"); // radar
  assert.equal(label(five(-2700)), LEVEL_UP_TITLE);
  assert.equal(label(five(-3600)), "News & Figures");
  assert.equal(label(five(-4500)), "How it works");
  assert.equal(label(five(-7000)), "How it works");
  assert.equal(activeTab(five(-4500), VH), TABS.length); // How it works sits right after the tabs
});

test("Level up stays the trail stop while How it works is on screen", () => {
  const rects = five(-4200); // How it works fills most of the band, Level up is far above it
  assert.equal(activeStage(rects.slice(0, 4), VH), 3);
  assert.equal(NAV_ITEMS[activeTab(rects, VH)].label, "How it works");
  assert.equal(trailProgress(rects.slice(0, 4), VH, rects[3]), 1);
});
