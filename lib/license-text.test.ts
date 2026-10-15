import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LICENSE_TEXT } from "./license-text.ts";

test("the footer license text is identical to the LICENSE file", () => {
  const file = readFileSync(new URL("../LICENSE", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(LICENSE_TEXT, file);
  assert.match(LICENSE_TEXT, /^MIT License\n\nCopyright \(c\) 2026 Ghernie Encinas/);
});
