import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToText, publicHttpsUrl, sgtDay, sgtHour } from "./html.ts";

test("only https links to a real public host pass", () => {
  assert.equal(publicHttpsUrl("https://example.com/careers#team"), "https://example.com/careers");
  for (const bad of ["http://example.com", "https://127.0.0.1/", "https://localhost/", "https://user:pw@example.com/", "https://example.com:8443/", "https://intranet.internal/", "https://[::1]/", "javascript:alert(1)", 42]) assert.equal(publicHttpsUrl(bad), null, String(bad));
});

test("html becomes readable text without scripts or tags", () => {
  const text = htmlToText("<html><head><title>Acme | Careers</title><style>p{}</style></head><body><script>x()</script><h1>Our values</h1><p>We ship &amp; learn.</p><ul><li>Own it</li><li>Be kind</li></ul></body></html>");
  assert.equal(text, "Acme | Careers\n\nOur values\nWe ship & learn.\nOwn it\nBe kind");
});

test("text is capped", () => assert.equal(htmlToText("<p>" + "a".repeat(100) + "</p>", 10).length, 10));

test("the day rolls over at midnight in Singapore", () => {
  assert.equal(sgtDay(Date.parse("2026-10-16T15:59:59Z")), "2026-10-16");
  assert.equal(sgtDay(Date.parse("2026-10-16T16:00:00Z")), "2026-10-17");
  assert.equal(sgtHour(Date.parse("2026-10-16T16:30:00Z")), "2026-10-17T00");
});

test("htmlToText prefers the main content and drops lines of settings data", () => {
  const prose = "We build tools people use every day. ".repeat(14);
  const html = `<html><head><title>Acme</title></head><body><nav>Menu Home Shop</nav><div>${'{"cookieName":"x","descStyle":"y","a":"b"} '.repeat(6)}</div><main><h1>Our values</h1><p>${prose}</p></main><footer>Legal</footer></body></html>`;
  const text = htmlToText(html);
  assert.match(text, /Our values/);
  assert.ok(!/Menu Home|cookieName|Legal/.test(text));
  assert.match(htmlToText("<p>He said &#34;hi&#34; &#x41;</p>"), /He said "hi" A/);
});
