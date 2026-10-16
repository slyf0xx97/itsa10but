import test from "node:test";
import assert from "node:assert/strict";
import { COMPACT, DOT, MAX_AXES, WIDE, hitsDisc, layoutRadar, overlaps, wrapName, type RadarSpec } from "./radar-layout.ts";

const NAMES = ["Communication", "Machine learning", "Incident response", "Role-specific evidence", "SQL", "Python", "Dashboards", "Data analysis", "Stakeholder management", "Cloud"];
const skills = (count: number, evidence: number) => NAMES.slice(0, count).map((name, i) => ({ name, evidence: i % 2 ? evidence : Math.min(100, evidence + 20) }));

for (const [label, spec] of [["wide", WIDE], ["compact", COMPACT]] as [string, RadarSpec][]) {
  for (let count = 3; count <= MAX_AXES; count++) {
    for (const evidence of [0, 50, 100]) {
      test(`${label} radar, ${count} skills at ${evidence}: chips are equal, inside, clear of the rings, apart, and mirrored left to right`, () => {
        const items = layoutRadar(skills(count, evidence), spec);
        const first = items[0].chip;
        items.forEach((item, i) => {
          const c = item.chip;
          assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.w <= spec.W && c.y + c.h <= spec.H, `${item.name} leaves the viewBox`);
          assert.ok(!overlaps(c, { x: item.dot[0] - DOT, y: item.dot[1] - DOT, w: DOT * 2, h: DOT * 2 }), `${item.name} chip covers its dot`);
          assert.ok(!hitsDisc(c, spec.W / 2, spec.H / 2, spec.R), `${item.name} chip sits on the rings`);
          assert.equal(c.w, first.w);
          assert.equal(c.h, first.h);
          items.slice(i + 1).forEach((other) => assert.ok(!overlaps(c, other.chip), `${item.name} overlaps ${other.name}`));
          // Axis i and axis n - i are mirror images of each other across the vertical middle line.
          const twin = items[(count - i) % count].chip;
          assert.ok(Math.abs(c.x + c.w / 2 - spec.W / 2 + (twin.x + twin.w / 2 - spec.W / 2)) < 0.001, `${item.name} is not mirrored`);
          assert.ok(Math.abs(c.y - twin.y) < 0.001, `${item.name} is not level with its mirror`);
        });
      });
    }
  }
}

test("long names wrap over two lines and a part that is still too long is cut with an ellipsis", () => {
  assert.deepEqual(wrapName("Machine learning", 8), ["Machine", "learning"]);
  assert.deepEqual(wrapName("SQL", 8), ["SQL"]);
  assert.ok(wrapName("Telecommunications", 8)[0].endsWith("…"));
  assert.ok(wrapName("Stakeholder management", 12).every((line) => line.length <= 14));
});
