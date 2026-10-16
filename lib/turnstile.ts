/**
 * Cloudflare Turnstile, the free bot check. With TURNSTILE_SECRET unset (local dev, or before the widget exists) every request passes.
 * Once it is set, a request needs a fresh token from the page's invisible widget in the x-turnstile-token header.
 * The token is checked once with Cloudflare and never stored or logged.
 */
export const TURNSTILE_HEADER = "x-turnstile-token";
const VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | null, env: Record<string, string | undefined>, visitor?: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET?.trim();
  if (!secret) return true;
  if (!token || token.length > 2048) return false;
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (visitor && visitor !== "unknown") form.set("remoteip", visitor);
    const response = await fetchImpl(VERIFY, { method: "POST", body: form, signal: AbortSignal.timeout(5000), cache: "no-store" });
    return response.ok && (await response.json() as { success?: unknown }).success === true;
  } catch {
    return false;
  }
}
