import assert from "node:assert/strict";
import { test } from "node:test";
import { formsOf, termSource } from "./word-forms.ts";

const matches = (term: string, text: string) => new RegExp(`(?:^|[^a-z0-9])${termSource(term)}(?=$|[^a-z0-9])`, "i").test(text);

test("plain words take plurals and -ing/-ed, and spelling variants match each other", () => {
  assert.equal(matches("dashboard", "Built three dashboards for finance."), true);
  assert.equal(matches("report", "Reporting weekly to the board"), true);
  assert.equal(matches("test", "Tested the release and wrote tests"), true);
  assert.equal(matches("visualisation", "Strong data visualization skills"), true);
  assert.equal(matches("visualization", "Created visualisations in Tableau"), true);
  assert.equal(matches("data analysis", "Ran several data analyses of churn"), true);
  assert.equal(matches("vulnerability", "Fixed 12 vulnerabilities"), true);
  assert.equal(matches("pull request", "Reviewed 40 pull requests"), true);
});

test("tool and product names stay exact", () => {
  assert.equal(matches("spark", "The idea sparked interest"), false);
  assert.equal(matches("spark", "Wrote Spark jobs"), true);
  assert.equal(matches("java", "Wrote javas"), false);
  assert.equal(matches("java", "Wrote Java services"), true);
  assert.equal(matches("python", "Pythons are snakes"), false);
});

test("a widened term is still a whole word, and unrelated words do not match", () => {
  assert.equal(matches("test", "The contest was long"), false);
  assert.equal(matches("test", "latest news"), false);
  assert.equal(matches("report", "Reporter at the paper"), false);
});

test("forms include the term itself, and special endings are handled", () => {
  assert.ok(formsOf("dashboard").includes("dashboard"));
  assert.ok(formsOf("analysis").includes("analyses"));
  assert.ok(formsOf("vulnerability").includes("vulnerabilities"));
  assert.ok(formsOf("visualisation").includes("visualization"));
});
