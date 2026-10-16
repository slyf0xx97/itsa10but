import { test } from "node:test";
import assert from "node:assert/strict";
import { aiPicks, cleanSnapshot, sgDate } from "./snapshot.ts";

test("a date is shown in Singapore time", () => {
  assert.equal(sgDate("2026-10-15T18:30:00Z"), "16 Oct 2026");
  assert.equal(sgDate("nope"), "");
});

test("picks keep https links with titles, drop repeats, and cap the count", () => {
  const news = [
    { title: "Lab releases new model", snippet: "Text", url: "https://www.example.com/a", date: "1 day ago" },
    { title: "Lab releases new model", snippet: "Text", url: "https://www.example.com/a" },
    { title: "Plain http", url: "http://example.com/b" },
    { title: "", url: "https://example.com/c" },
    { title: "A study finds things", url: "https://news.example.org/d" },
  ];
  const picks = aiPicks({ data: { news } }, 2);
  assert.deepEqual(picks.map((p) => [p.kind, p.publisher]), [["Model", "example.com"], ["Finding", "news.example.org"]]);
  assert.deepEqual(aiPicks(null), []);
});

test("a stored snapshot without a real date is rejected", () => {
  assert.equal(cleanSnapshot({ checked: "x", ai: [] }), null);
  assert.equal(cleanSnapshot({ checked: "2026-10-15T18:30:00Z", ai: [] })?.checked, "2026-10-15T18:30:00Z");
});

test("a Markdown snippet becomes plain text without the repeated headline", () => {
  const raw = "# Big model: Built for hard problems The model launches [today](https://x.example/a) at an [introductory price](https://x.example/p) [1](https://x.example/1) and **runs** on `chips`. " + "More words ".repeat(40);
  const [pick] = aiPicks({ data: { news: [{ title: "Big model: Built for hard problems", snippet: raw, url: "https://x.example/n" }] } });
  assert.ok(pick.text.startsWith("The model launches today at an introductory price and runs on chips."));
  assert.ok(!/[#*`\[\]()]/.test(pick.text) && pick.text.length <= 201 && pick.text.endsWith("…"));
});
