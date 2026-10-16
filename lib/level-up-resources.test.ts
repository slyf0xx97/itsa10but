import test from "node:test";
import assert from "node:assert/strict";
import { elevateGroups } from "./level-up-resources.ts";

const resources = elevateGroups.flatMap((group) => group.resources);

test("every resource has an https link, a short plain line and a unique id, name and link", () => {
  for (const key of ["id", "name", "url"] as const) assert.equal(new Set(resources.map((resource) => resource[key])).size, resources.length, key);
  for (const resource of resources) {
    assert.match(resource.url, /^https:\/\/\S+$/, resource.id);
    assert.ok(resource.tag.length >= 3 && resource.tag.length <= 32, resource.id);
    assert.ok(resource.detail.length >= 12 && resource.detail.length <= 110, resource.id);
    assert.ok(!/[–—·;]/.test(resource.name + resource.tag + resource.detail), resource.id);
  }
});

test("every group has a lead line and enough cards to fill several rows", () => {
  assert.ok(elevateGroups.length >= 8, "tabs");
  for (const group of elevateGroups) {
    assert.ok(group.description.length > 20 && group.description.length < 200, group.title);
    assert.ok(group.resources.length >= 4, group.title);
  }
  assert.ok(resources.length >= 60, "resource count");
});

test("the ids from the first version are all still here, because ticks are stored by id", () => {
  const first = ["cliftonstrengths", "myskillsfuture-assessments", "careers-skills-passport", "onet-interest-profiler", "critical-core-skills", "aws-cloud-practitioner", "microsoft-learn", "github-skills", "cs50", "kaggle-learn",
    "resume-builder", "technical-writing", "github-profile", "github-pages", "canva-resumes", "devto", "linkedin-jobs", "himalayas", "jobicy", "mycareersfuture", "jobstreet", "wsg",
    "reddit-cscareerquestions", "reddit-resumes", "reddit-learnprogramming", "reddit-cybersecurity", "reddit-asksingapore", "hacker-news", "roadmap-sh", "levels-fyi", "interviewing-io", "interview-warmup", "indeed-career-guide", "skillsfuture-credit"];
  const ids = new Set(resources.map((resource) => resource.id));
  for (const id of first) assert.ok(ids.has(id), id);
});

test("the Certifications tab opens with Credly and keeps only 10 to 12 well-known exams", () => {
  const group = elevateGroups.find((g) => g.title === "Certifications");
  assert.ok(group);
  assert.equal(group.resources[0].id, "credly");
  assert.equal(group.resources[0].url, "https://www.credly.com/");
  const exams = group.resources.filter((r) => r.id.startsWith("cert-"));
  assert.ok(exams.length >= 10 && exams.length <= 12, String(exams.length));
  assert.equal(exams.length + 1, group.resources.length);
});
