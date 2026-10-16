import assert from "node:assert/strict";
import { test } from "node:test";
import { elevateGroups } from "./level-up-resources.ts";
import { courseSearchUrl, learnTarget } from "./skill-learn.ts";

const ids = new Set(elevateGroups.flatMap((group) => group.resources.map((resource) => resource.id)));

test("a skill Level up covers goes to that resource, in its own group", () => {
  const sql = learnTarget("SQL");
  assert.equal(sql.kind, "level-up");
  if (sql.kind === "level-up") {
    assert.equal(sql.resourceId, "sqlbolt");
    assert.ok(elevateGroups[sql.groupIndex].resources.some((resource) => resource.id === "sqlbolt"));
  }
  assert.equal(learnTarget("Machine learning").kind, "level-up");
  assert.equal(learnTarget("Network security").kind, "level-up");
});

test("every skill name that matches a rule resolves to a resource that really exists", () => {
  for (const name of ["SQL", "Python", "Deep learning", "MLOps", "Cloud", "AWS", "Azure", "Linux", "SIEM", "Networking", "Git", "Data analysis", "Dashboards", "Communication", "Reporting", "Docker", "React"]) {
    const target = learnTarget(name);
    if (target.kind === "level-up") assert.ok(ids.has(target.resourceId), name);
  }
});

test("a skill with no resource opens an outside page: the skill's own site, or a course search with the name encoded", () => {
  const unknown = learnTarget("Basket weaving & <script>");
  assert.equal(unknown.kind, "external");
  if (unknown.kind === "external") {
    assert.match(unknown.url, /^https:\/\/www\.google\.com\/search\?q=learn%20Basket%20weaving/);
    assert.ok(!/[<>]/.test(unknown.url));
  }
  assert.equal(courseSearchUrl("  x  "), "https://www.google.com/search?q=learn%20x%20free%20beginner%20course");
});
