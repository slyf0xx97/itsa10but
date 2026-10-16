import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_PASSAGE, splitPassages } from "./passages.ts";
import { verifyQuote } from "./rag.ts";

const flat = "Skills: Python, SQL • Built a Python image classifier with PyTorch, reaching 91% accuracy  Wrote SQL queries in PostgreSQL to join three datasets | Presented to a class of 40";

test("bullets, wide gaps and bars split a one-line résumé into separate passages", () => {
  const parts = splitPassages(flat);
  assert.equal(parts.length, 4);
  assert.ok(parts.includes("Built a Python image classifier with PyTorch, reaching 91% accuracy"));
});

test("a long run with no break is cut under the limit and every piece is found in the source", () => {
  const long = Array.from({ length: 40 }, (_, i) => `worked on item ${i} with Python`).join(", ");
  const parts = splitPassages(long);
  assert.ok(parts.length > 3);
  for (const part of parts) {
    assert.ok(part.length <= MAX_PASSAGE, String(part.length));
    assert.ok(verifyQuote(long, part));
  }
});
