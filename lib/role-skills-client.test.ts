import assert from "node:assert/strict";
import { test } from "node:test";
import { readRoleSkills } from "./role-skills-client.ts";

const job = "We run Kafka and Python pipelines. Experience with Snowflake is a plus.";
const reply = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test("names the server returns are kept only when the role text spells them out", async () => {
  assert.deepEqual(await readRoleSkills(job, { fetchImpl: reply({ skills: ["Kafka", "Pulsar", "Snowflake", "Python"] }) }), ["Kafka", "Snowflake"]);
});

test("a short role, a refusal, bad JSON or a network error gives an empty list and never throws", async () => {
  assert.deepEqual(await readRoleSkills("too short", { fetchImpl: reply({ skills: ["Kafka"] }) }), []);
  assert.deepEqual(await readRoleSkills(job, { fetchImpl: reply({ skills: ["Kafka"] }, 403) }), []);
  assert.deepEqual(await readRoleSkills(job, { fetchImpl: (async () => new Response("not json")) as unknown as typeof fetch }), []);
  assert.deepEqual(await readRoleSkills(job, { fetchImpl: (async () => { throw new Error("offline"); }) as unknown as typeof fetch }), []);
});

test("the role text is the only thing in the body, and a token travels in a header", async () => {
  let seen: { body: string; headers: Record<string, string> } | undefined;
  const spy = (async (_url: string, init: RequestInit) => { seen = { body: String(init.body), headers: init.headers as Record<string, string> }; return new Response(JSON.stringify({ skills: [] })); }) as unknown as typeof fetch;
  await readRoleSkills(job, { fetchImpl: spy, token: "tok" });
  assert.deepEqual(JSON.parse(seen!.body), { job });
  assert.equal(seen!.headers["x-turnstile-token"], "tok");
});
