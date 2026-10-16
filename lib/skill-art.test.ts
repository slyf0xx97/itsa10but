import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { catalog } from "./preview-analysis.ts";
import { LOGO_CAPTION, officialUrl, skillArt } from "./skill-art.ts";

const onDisk = (file: string) => existsSync(new URL(`../public/tool-logos/${file}`, import.meta.url));

test("Python returns the python logo", () => {
  assert.deepEqual(skillArt("Python"), { logos: ["python-original.svg"], icon: "api" });
});

test("SQL shows postgresql as an example and Cloud shows three logos", () => {
  assert.deepEqual(skillArt("SQL").logos, ["postgresql-original.svg"]);
  assert.equal(skillArt("Cloud").logos.length, 3);
});

test("SIEM, Networking and Incident response get drawn icons, no vendor logo", () => {
  for (const name of ["SIEM", "Networking", "Incident response"]) assert.equal(skillArt(name).logos.length, 0);
  assert.equal(skillArt("SIEM").icon, "siem");
  assert.equal(skillArt("Networking").icon, "network");
  assert.equal(skillArt("Incident response").icon, "incident");
});

test("every catalogue skill returns a logo or an icon", () => {
  for (const { name } of catalog) {
    const result = skillArt(name);
    assert.ok(result.logos.length > 0 || result.icon, name);
  }
});

test("lookup is case-insensitive", () => {
  assert.deepEqual(skillArt("  pYtHoN "), skillArt("Python"));
});

test("unknown names get a neutral compass", () => {
  assert.deepEqual(skillArt("Underwater basket weaving"), { logos: [], icon: "compass" });
});

test("literal product names match, near misses do not", () => {
  assert.deepEqual(skillArt("TypeScript").logos, ["typescript-original.svg"]);
  assert.deepEqual(skillArt("Docker").logos, ["docker-original.svg"]);
  assert.equal(skillArt("Docker swarm tuning").logos.length, 0);
});

test("every logo it returns exists in public/tool-logos", () => {
  for (const name of [...catalog.map((s) => s.name), "TypeScript", "Docker", "Git", "Kubernetes"]) {
    for (const file of skillArt(name).logos) assert.ok(onDisk(file), `${name}: ${file}`);
  }
});

test("a missing logo file falls back to the drawn icon", () => {
  assert.deepEqual(skillArt("Cloud", (file) => file !== "azure-original.svg").logos, []);
  assert.equal(skillArt("Cloud", () => false).icon, "cloud");
});

const ALLOWED_HOSTS = new Set([
  "www.python.org", "react.dev", "www.kernel.org", "www.typescriptlang.org", "www.docker.com", "kubernetes.io",
  "developer.mozilla.org", "www.postgresql.org", "aws.amazon.com", "github.com", "jestjs.io", "pandas.pydata.org",
  "scikit-learn.org", "pytorch.org", "ml-ops.org", "csrc.nist.gov", "www.nngroup.com", "developers.google.com", "www.plainlanguage.gov",
  "support.microsoft.com", "dev.java", "airflow.apache.org", "seeing-theory.brown.edu", "agilemanifesto.org", "owasp.org",
]);
const linked = [...catalog.map((s) => s.name), "TypeScript", "Docker", "Git", "Kubernetes"];

test("every catalogue skill and known product has an https link on the allowlist", () => {
  for (const name of linked) {
    const link = officialUrl(name);
    assert.ok(link, name);
    const url = new URL(link.url);
    assert.equal(url.protocol, "https:", name);
    assert.ok(ALLOWED_HOSTS.has(url.hostname), `${name}: ${url.hostname}`);
    assert.ok(link.kind === "official" || link.kind === "reference", name);
  }
});

test("product skills are official, example tools and concepts are reference", () => {
  for (const name of ["Python", "React", "Linux", "TypeScript", "Docker", "Kubernetes"]) assert.equal(officialUrl(name)?.kind, "official", name);
  for (const name of ["JavaScript", "SQL", "Cloud", "Git", "Testing", "Data analysis", "Machine learning", "Deep learning", "MLOps", "APIs", "Networking", "SIEM", "Incident response", "Dashboards", "Communication", "Reporting", "Excel", "Java", "Data engineering", "Statistics", "UX design", "Agile", "Security fundamentals"]) {
    assert.equal(officialUrl(name)?.kind, "reference", name);
  }
  assert.equal(officialUrl("Cloud")?.url, "https://aws.amazon.com/");
  assert.equal(officialUrl("Git")?.url, "https://github.com/");
});

test("unknown, near-miss and prototype names get no link; lookup ignores case", () => {
  for (const name of ["Underwater basket weaving", "Docker swarm tuning", "constructor", "__proto__", "", "javascript:alert(1)"]) assert.equal(officialUrl(name), null, name);
  assert.deepEqual(officialUrl("  pYtHoN "), officialUrl("Python"));
});

test("constants", () => {
  assert.equal(LOGO_CAPTION, "Logos show common example tools. They don't mean you've used them.");
});

test("no skill is ever drawn as the old star: names outside the catalogue get an icon that fits, or a compass", async () => {
  const { iconFor, skillArt } = await import("./skill-art.ts");
  assert.equal(iconFor("SQL queries"), "data");
  assert.equal(iconFor("Stakeholder management"), "communication");
  assert.equal(iconFor("Cloud infrastructure"), "cloud");
  assert.equal(iconFor("Basket weaving"), "compass");
  for (const name of ["Python", "Terraform", "Basket weaving", "Incident triage", "Docker", "React"]) assert.notEqual(skillArt(name).icon, "fallback", name);
});
