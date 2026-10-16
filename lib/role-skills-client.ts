import { BASE_PATH } from "./base-path.ts";
import { ROLE_MIN, pickSkills } from "./edge/role-skills.ts";
import { turnstileHeaders } from "./turnstile-client.ts";

/**
 * Asks the site for skills the role text names that the catalog lacks (a Cloudflare Workers AI read of the role text only).
 * It waits at most 6 seconds. Any failure, refusal or empty answer gives [], and the scan goes on with its text rules.
 * Names are checked against the text again here, so nothing the model says can add a skill the role doesn't contain.
 */
export async function readRoleSkills(job: string, options: { token?: string; signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<string[]> {
  const text = job.trim();
  if (text.length < ROLE_MIN) return [];
  try {
    const timeout = AbortSignal.timeout(6000);
    const response = await (options.fetchImpl ?? fetch)(BASE_PATH + "/api/role-skills", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...turnstileHeaders(options.token) },
      body: JSON.stringify({ job: text }),
      cache: "no-store", credentials: "omit",
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
    if (!response.ok) return [];
    return pickSkills(((await response.json()) as { skills?: unknown }).skills, text);
  } catch {
    return [];
  }
}
