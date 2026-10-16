import assert from "node:assert/strict";
import { test } from "node:test";
import { KEY_LABEL, PROVIDER_COMPANIES, keyHint, leavesBrowser, modelHint, privacyRow, recipient, sentThroughKey } from "./provider-copy.ts";

test("the recipient follows the key's provider, and OpenRouter says it passes the text on", () => {
  assert.equal(recipient("anthropic"), "Anthropic");
  assert.equal(recipient("gemini"), "Google");
  assert.match(recipient("openrouter"), /^OpenRouter, which passes it to the company behind the model/);
});

test("with no key entered the wording names the choices and never picks one", () => {
  const generic = [recipient(undefined), leavesBrowser(undefined), privacyRow(undefined).lead, privacyRow(undefined).text, sentThroughKey(undefined)].join(" ");
  assert.match(generic, /Anthropic, Google or OpenRouter/);
  assert.doesNotMatch(privacyRow(undefined).lead, /Anthropic/);
});

test("a chosen provider is the only company named in the privacy row", () => {
  assert.equal(privacyRow("gemini").lead, "Masked résumé text goes to Google");
  assert.doesNotMatch(privacyRow("gemini").lead + privacyRow("gemini").text, /Anthropic|OpenRouter/);
  assert.doesNotMatch(privacyRow("anthropic").lead + privacyRow("anthropic").text, /Google|OpenRouter/);
  assert.match(privacyRow("openrouter").text, /passes it to the company behind the model/);
});

test("the Gemini key hint warns about the free plan and the others do not", () => {
  assert.match(keyHint("gemini"), /Free Gemini keys allow only a few requests a minute/);
  assert.doesNotMatch(keyHint("anthropic"), /Free Gemini/);
  assert.match(keyHint(undefined), /AIza or AQ\./);
  assert.match(KEY_LABEL, /Anthropic, OpenRouter or Gemini/);
});

test("the model hint names the Lite models for Gemini and stays short for Anthropic", () => {
  assert.match(modelHint("gemini"), /Lite/);
  assert.equal(modelHint("anthropic"), "All four agents use the model you pick.");
  assert.match(modelHint("openrouter"), /Bigger models cost more/);
});

test("the trademark list covers every company a key can send text to", () => {
  assert.deepEqual([...PROVIDER_COMPANIES].sort(), ["Anthropic", "Google", "OpenRouter"]);
});

test("none of the wording has dashes, semicolons or middle dots", () => {
  const text = [leavesBrowser("anthropic"), leavesBrowser("openrouter"), leavesBrowser(undefined), privacyRow("gemini").text, keyHint("gemini"), modelHint("gemini")].join(" ");
  assert.doesNotMatch(text, /[—–;·]/);
});
