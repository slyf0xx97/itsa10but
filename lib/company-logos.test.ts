import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { companyLogoFile } from "./company-logos.ts";
import { COMPANIES } from "./company-culture.ts";

// Employers whose own site gave no usable icon file show a letter instead, so a missing logo is allowed. A logo that is listed must be on disk.
test("every listed employer logo is on disk", () => {
  for (const company of COMPANIES) {
    const file = companyLogoFile(company.name);
    if (!file) continue;
    assert.ok(existsSync(new URL(`../public/assets/logos/${file}`, import.meta.url)), `${company.name}: ${file}`);
  }
});

test("an unknown employer or a prototype name has no logo", () => {
  for (const name of ["Some Startup Pte Ltd", "", "constructor", "__proto__", "toString"]) assert.equal(companyLogoFile(name), null, name);
});
