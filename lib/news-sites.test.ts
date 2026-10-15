import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { FETCH_HOSTS } from "./native-scraper.ts";
import { newsSiteGroups } from "./news-sites.ts";

const sites = newsSiteGroups.flatMap((group) => group.sites);

test("every site has an https link, a short line, a saved local logo and a unique name", () => {
  assert.equal(new Set(sites.map((site) => site.name)).size, sites.length);
  for (const site of sites) {
    assert.match(site.href, /^https:\/\/[^\s]+$/, site.name);
    assert.ok(site.what.length > 8 && site.what.length < 70, site.name);
    assert.ok(existsSync(new URL(`../public/assets/logos/${site.logo}.png`, import.meta.url)), site.logo);
    assert.ok(!/[–—·;]/.test(site.what + site.name), site.name);
  }
});

test("no site repeats a name, a host or a logo, and the tech feeds fill three even rows", () => {
  for (const key of ["name", "host", "logo"] as const) {
    const values = sites.map((site) => key === "host" ? new URL(site.href).hostname : site[key]);
    assert.equal(new Set(values).size, values.length, key);
  }
  const tech = newsSiteGroups.find((group) => group.id === "tech")?.sites ?? [];
  assert.ok(tech.length >= 12 && tech.length % 3 === 0, "tech feed count");
});

test("the In Refresh tag matches the hosts the feed reader reads", () => {
  const tagged = sites.filter((site) => site.inRefresh).map((site) => new URL(site.href).hostname);
  for (const host of tagged) assert.ok(FETCH_HOSTS.includes(host), host);
  for (const host of FETCH_HOSTS) assert.ok(tagged.includes(host), host);
});
