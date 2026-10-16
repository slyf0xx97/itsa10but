import { TURNSTILE_HEADER } from "./turnstile.ts";

/**
 * Gets a fresh token from Cloudflare Turnstile's invisible widget, or undefined when no site key is set or the check can't run.
 * Each call makes its own short-lived widget, because a token works once. Never throws.
 */
type Turnstile = { render(host: HTMLElement, options: Record<string, unknown>): string; remove(id: string): void };
declare global { interface Window { turnstile?: Turnstile } }

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let script: Promise<void> | null = null;
const loadScript = () => (script ??= new Promise<void>((resolve, reject) => {
  const tag = document.createElement("script");
  tag.src = SCRIPT; tag.async = true;
  tag.onload = () => resolve();
  tag.onerror = () => { script = null; reject(new Error("Turnstile did not load.")); };
  document.head.appendChild(tag);
}));

export async function turnstileToken(siteKey: string | undefined = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY): Promise<string | undefined> {
  if (!siteKey || typeof document === "undefined") return undefined;
  try {
    await loadScript();
    return await new Promise<string | undefined>((resolve) => {
      const host = document.createElement("div");
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
      let id = "";
      const finish = (token?: string) => { window.clearTimeout(timer); try { if (id) window.turnstile?.remove(id); } catch { /* already gone */ } host.remove(); resolve(token); };
      const timer = window.setTimeout(() => finish(undefined), 8000);
      id = window.turnstile!.render(host, { sitekey: siteKey, callback: (token: string) => finish(token), "error-callback": () => finish(undefined), "timeout-callback": () => finish(undefined) });
    });
  } catch {
    return undefined;
  }
}

/** The request header that carries a token, or nothing when there is none. */
export const turnstileHeaders = (token: string | undefined): Record<string, string> => (token ? { [TURNSTILE_HEADER]: token } : {});
