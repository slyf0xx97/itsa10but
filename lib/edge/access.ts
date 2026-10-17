/**
 * Checks the login token that Cloudflare Access puts in the Cf-Access-Jwt-Assertion header, so the admin page does not rely on Access alone. The Worker is also
 * reachable on its workers.dev address, which Access does not guard, and a request there carries no token. Pure: the public keys and the clock come in as arguments.
 */
export type AccessConfig = { team: string; aud: string; email: string };
export type AccessKey = JsonWebKey & { kid?: string };

const bytes = (value: string): Uint8Array<ArrayBuffer> => {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};
const json = (value: string): Record<string, unknown> | null => { try { return JSON.parse(new TextDecoder().decode(bytes(value))); } catch { return null; } };

/** The signed-in email when the token is genuine, for this app, for this team, unexpired and for the owner's address. Otherwise null. */
export async function verifyAccess(token: string, config: AccessConfig, keys: AccessKey[], nowMs: number): Promise<{ email: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = json(parts[0]), payload = json(parts[1]);
  if (!header || !payload || header.alg !== "RS256") return null;
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) return null;
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signed = new TextEncoder().encode(parts[0] + "." + parts[1]);
    if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, bytes(parts[2]), signed))) return null;
  } catch { return null; }
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const email = typeof payload.email === "string" ? payload.email : "";
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  if (!aud.includes(config.aud) || payload.iss !== "https://" + config.team || exp * 1000 <= nowMs) return null;
  return email.toLowerCase() === config.email.toLowerCase() ? { email } : null;
}
