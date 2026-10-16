import type { ModelProvider } from "./model-choice.ts";

/**
 * Every sentence that names who receives the visitor's text lives here and follows the provider in use, so nothing on the page says "Anthropic" unless the
 * visitor's own key is an Anthropic key. `undefined` means no model key has been entered yet: the wording then names the choices, not one of them.
 */
export type ChosenProvider = ModelProvider | undefined;

/** The name used in the status line: "Your Gemini key powers the four agents." */
export const PROVIDER_LABEL: Record<ModelProvider, string> = { anthropic: "Anthropic", openrouter: "OpenRouter", gemini: "Gemini" };
/** The company that receives the text. */
const COMPANY: Record<ModelProvider, string> = { anthropic: "Anthropic", openrouter: "OpenRouter", gemini: "Google" };

/** Every company a visitor's key can send text to, for the trademark list. Add a provider here and it shows up in the legal notice. */
export const PROVIDER_COMPANIES: readonly string[] = [...new Set(Object.values(COMPANY))];

/** Who gets the masked résumé text. OpenRouter passes it on to the company behind the model that was picked. */
export function recipient(provider: ChosenProvider): string {
  if (!provider) return "the AI company whose key you add (Anthropic, Google or OpenRouter)";
  return provider === "openrouter" ? "OpenRouter, which passes it to the company behind the model you pick" : COMPANY[provider];
}

/** Shown whenever the agents are selected. Accurate for a visitor key and for this site's key. */
export const leavesBrowser = (provider: ChosenProvider) =>
  `With contact details masked, your résumé text goes to ${recipient(provider)}. Names, employers and schools are not masked. The role text can also shape the agents' web searches.`;

/** The privacy popover's line for API boost. */
export function privacyRow(provider: ChosenProvider): { lead: string; text: string } {
  return {
    lead: provider ? `Masked résumé text goes to ${COMPANY[provider]}` : "Masked résumé text goes to the AI company you pick",
    text: "Only when you switch API boost on." + (provider === "openrouter" ? " OpenRouter passes it to the company behind the model." : provider ? "" : " That is Anthropic, Google or OpenRouter, whichever key you add."),
  };
}

/** The run-modes tile: what "Sent through your key" says. */
export const sentThroughKey = (provider: ChosenProvider) => `Masked résumé text goes to ${recipient(provider)}.`;

/** The single key field's label and hint. The free Gemini plan allows far fewer requests than four agents make, so a Gemini key says so. */
export const KEY_LABEL = "API key (Anthropic, OpenRouter or Gemini)";
export function keyHint(provider: ChosenProvider): string {
  const start = "Starts with sk-ant- (Anthropic), sk-or- (OpenRouter) or AIza or AQ. (Google Gemini). Charges go to your account.";
  return provider === "gemini" ? start + " Free Gemini keys allow only a few requests a minute, so a run may fall back to the native scan. A key with billing on works best." : start;
}

/** Under the model picker. */
export function modelHint(provider: ChosenProvider): string {
  if (provider === "openrouter") return "All four agents use the model you pick. Bigger models cost more and run slower. A run that takes too long falls back to the native scan.";
  if (provider === "gemini") return "All four agents use the model you pick. Only the Lite models are offered, to keep the cost down.";
  return "All four agents use the model you pick.";
}
