import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyTurnstile } from "./turnstile.ts";

const reply = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test("with no secret set every request passes and Cloudflare is never called", async () => {
  let calls = 0;
  const spy = (async () => { calls += 1; return new Response("{}"); }) as unknown as typeof fetch;
  assert.equal(await verifyTurnstile(null, {}, "1.2.3.4", spy), true);
  assert.equal(calls, 0);
});

test("with a secret set a missing, oversized, refused or unreachable token fails", async () => {
  const env = { TURNSTILE_SECRET: "secret" };
  assert.equal(await verifyTurnstile(null, env, "v", reply({ success: true })), false);
  assert.equal(await verifyTurnstile("x".repeat(3000), env, "v", reply({ success: true })), false);
  assert.equal(await verifyTurnstile("tok", env, "v", reply({ success: false })), false);
  assert.equal(await verifyTurnstile("tok", env, "v", reply({}, 500)), false);
  assert.equal(await verifyTurnstile("tok", env, "v", (async () => { throw new Error("down"); }) as unknown as typeof fetch), false);
  assert.equal(await verifyTurnstile("tok", env, "v", reply({ success: true })), true);
});

test("the secret and token go in the form body, and an unknown visitor sends no address", async () => {
  const seen: string[] = [];
  const spy = (async (_url: string, init: RequestInit) => { seen.push(String(init.body)); return new Response(JSON.stringify({ success: true })); }) as unknown as typeof fetch;
  await verifyTurnstile("tok", { TURNSTILE_SECRET: "s" }, "unknown", spy);
  await verifyTurnstile("tok", { TURNSTILE_SECRET: "s" }, "9.9.9.9", spy);
  assert.equal(seen[0], "secret=s&response=tok");
  assert.equal(seen[1], "secret=s&response=tok&remoteip=9.9.9.9");
});
