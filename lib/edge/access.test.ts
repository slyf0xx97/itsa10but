import assert from "node:assert/strict";
import test from "node:test";
import { verifyAccess, type AccessConfig, type AccessKey } from "./access.ts";

const config: AccessConfig = { team: "team.cloudflareaccess.com", aud: "app-aud", email: "owner@example.com" };
const NOW = 1_800_000_000_000;
const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

async function keyPair(kid: string) {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid } as AccessKey;
  return { jwk, privateKey: pair.privateKey };
}

async function token(privateKey: CryptoKey, kid: string, claims: Record<string, unknown>) {
  const body = enc({ alg: "RS256", kid }) + "." + enc({ aud: [config.aud], iss: "https://" + config.team, exp: NOW / 1000 + 600, email: config.email, ...claims });
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(body));
  return body + "." + Buffer.from(signature).toString("base64url");
}

test("a genuine token for the owner passes, whatever the email's case", async () => {
  const { jwk, privateKey } = await keyPair("k1");
  assert.deepEqual(await verifyAccess(await token(privateKey, "k1", {}), config, [jwk], NOW), { email: config.email });
  assert.ok(await verifyAccess(await token(privateKey, "k1", { email: "OWNER@example.com" }), config, [jwk], NOW));
});

test("a token is refused for the wrong app, team, email or time", async () => {
  const { jwk, privateKey } = await keyPair("k1");
  for (const claims of [{ aud: ["other"] }, { iss: "https://evil.cloudflareaccess.com" }, { email: "someone@example.com" }, { exp: NOW / 1000 - 1 }, { email: undefined }]) {
    assert.equal(await verifyAccess(await token(privateKey, "k1", claims), config, [jwk], NOW), null, JSON.stringify(claims));
  }
});

test("a token signed with another key, an unknown key id or a broken shape is refused", async () => {
  const mine = await keyPair("k1"), theirs = await keyPair("k1");
  assert.equal(await verifyAccess(await token(theirs.privateKey, "k1", {}), config, [mine.jwk], NOW), null);
  assert.equal(await verifyAccess(await token(mine.privateKey, "other", {}), config, [mine.jwk], NOW), null);
  for (const bad of ["", "a.b", "a.b.c", "not.a.token.at.all"]) assert.equal(await verifyAccess(bad, config, [mine.jwk], NOW), null, bad);
});
