import test from "node:test";
import assert from "node:assert/strict";
import { COMPACT, DOT, WIDE, hitsDisc, layoutRadar, overlaps, type RadarSpec } from "./radar-layout.ts";

const NAMES = ["Communication", "Machine learning", "Incident response", "Role-specific evidence", "SQL", "Python", "Dashboards", "Data analysis"];
const skills = (count: number, evidence: number) => NAMES.slice(0, count).map((name) => ({ name, evidence }));

for (const [label, spec] of [["wide", WIDE], ["compact", COMPACT]] as [string, RadarSpec][]) {
  for (let count = 3; count <= 8; count++) {
    for (const evidence of [0, 50, 100]) {
      test(`${label} radar, ${count} skills at ${evidence}: chips stay inside, apart, and clear of dots and scores`, () => {
        const items = layoutRadar(skills(count, evidence), spec);
        items.forEach((item, i) => {
          const c = item.chip;
          assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.w <= spec.W && c.y + c.h <= spec.H, `${item.name} leaves the viewBox`);
          assert.ok(!overlaps(c, { x: item.dot[0] - DOT, y: item.dot[1] - DOT, w: DOT * 2, h: DOT * 2 }), `${item.name} chip covers its dot`);
          assert.ok(!hitsDisc(c, spec.W / 2, spec.H / 2, spec.R), `${item.name} chip sits on the rings`);
          assert.ok(!overlaps(c, item.score), `${item.name} chip covers its score`);
          items.slice(i + 1).forEach((other) => assert.ok(!overlaps(c, other.chip), `${item.name} overlaps ${other.name}`));
        });
      });
    }
  }
}
