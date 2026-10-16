import type { LiveRunInfo } from "./analysis-types.ts";
import type { ModelProvider } from "./model-choice.ts";
import { KEY_LABEL, PROVIDER_LABEL, keyHint } from "./provider-copy.ts";

/** Mode wording in one place. Keyed by the mode that actually ran, so a native scan result never mentions Claude and an API boost result never says "native scan". */
export type RunMode = "rules" | "live";

export const MODE_NOTE: Record<RunMode, string> = {
  rules: "Native scan: the readers match words and check quotes in your browser. Your résumé stays in this tab. Only the role text is also read by Cloudflare AI, and no API key is needed.",
  live: "API boost: four agents read your résumé. Every quote below was checked against your text.",
};

/** The note above the readers for an API boost result: "recommended mix" or the model the visitor picked, never a model we assumed, and, when web search was off, that it was. */
export function liveRunNote(run?: LiveRunInfo): string {
  if (!run) return MODE_NOTE.live;
  const web = run.web ? "" : " Web search was off for this run. Role Scout and Action Planner skipped the web, so expect no live market note, company details or course links.";
  return `API boost, ${run.model}: four agents read your résumé. Every quote below was checked against your text.${web}`;
}

export const RESULT_TAG: Record<RunMode, { reading: string; sample: string; result: string }> = {
  rules: { reading: "Reading", sample: "Sample", result: "Your result" },
  live: { reading: "Reading", sample: "Sample", result: "Your result" },
};

export const MODE_OPTIONS: Record<RunMode, { label: string; hint: string }> = {
  rules: { label: "Native scan, no API key", hint: "Matches words and checks quotes in your browser. Your résumé stays here. Cloudflare AI also reads the role text. No key needed." },
  live: { label: "API boost, AI agents", hint: "Four agents read your résumé in turn, using your own API key (Anthropic, OpenRouter or Gemini). You can pick the model." },
};

/** Shorter state text for the header pill. MODE_OPTIONS keeps the full wording for everywhere else. */
export const MODE_SHORT: Record<RunMode, string> = { rules: "Native scan", live: "API boost" };

export const SWITCH_LABEL = "Agent power";
/** What the header status shows beside the toggle. `state` picks the dot: "native" and "on" are filled, "needs-key" is an empty ring. */
export type SwitchStatus = { state: "native" | "on" | "needs-key"; title: string; detail: string };

/** The two-part status next to the toggle switch: a short title for the header and a plain detail line (tooltip on wide screens, shown under the title on phones).
 *  It says what will run, so a model is only named when the visitor picked one, and Claude is never named here. */
export function switchStatus(mode: RunMode, key: { provider: ModelProvider; entered: boolean; siteKey: boolean; model?: string }): SwitchStatus {
  if (mode === "rules") return { state: "native", title: "Native scan, no key used", detail: "Your four agents run on simple rules, so they're less powerful. Switch to API boost for the full version." };
  if (key.entered) {
    const who = PROVIDER_LABEL[key.provider];
    return { state: "on", title: "API boost is on", detail: `Your ${who} key powers the four agents.${key.model ? ` Model: ${key.model}.` : ""}` };
  }
  if (key.siteKey) return { state: "on", title: "API boost is on", detail: "This site's key powers the four agents." };
  return { state: "needs-key", title: "Add your API key", detail: "A key lets your four agents think with a real AI model." };
}

export const KEY_HANDLING =
  "Your keys stay in this tab and are never saved in your browser or cookies. Each run sends them over HTTPS to this site's server, which never stores or logs them. Closing the tab clears them.";

export const KEY_FIELDS = {
  anthropic: { label: KEY_LABEL, hint: keyHint(undefined) },
  firecrawl: { label: "Optional: Firecrawl key", hint: "The site already looks up company pages for you. Your own key adds wider web search for role and course details, using your Firecrawl credits." },
};

export const MODEL_FIELD = {
  label: "Model",
  customLabel: "Custom model id",
  customHint: "Use provider/model-name, for example openai/gpt-5.6-terra.",
  customError: "Use provider/model-name with letters, digits, dots, dashes, underscores or a colon.",
};

export const UNKNOWN_STATUS_REASON = "API boost could not be checked right now.";
export const RUN_LOCKED_REASON = "This choice is locked while a check is running.";
export const NO_OWN_KEY_REASON = "API boost isn't available on this site.";
