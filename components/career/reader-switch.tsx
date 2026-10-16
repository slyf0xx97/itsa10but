"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Popup } from "@/components/popup";
import { RunModes } from "@/components/run-modes";
import { WordTip } from "@/components/career/word-tip";
import { keyProvider } from "@/lib/openrouter-models";
import { CUSTOM, CUSTOM_NOTE, RECOMMENDED, agentModelsToSend, isCustomModelId, modelLabel, modelOptions, modelToSend, recommendedOption, type AgentModels } from "@/lib/model-choice";
import { keyHint, leavesBrowser, modelHint } from "@/lib/provider-copy";
import { costOverview, costSentence } from "@/lib/run-cost";
import { KEY_FIELDS, KEY_HANDLING, MODEL_FIELD, MODE_OPTIONS, NO_OWN_KEY_REASON, RUN_LOCKED_REASON, SWITCH_LABEL, UNKNOWN_STATUS_REASON, switchStatus, type RunMode } from "@/lib/mode-copy";

/** `anthropic` holds the model key (Anthropic or OpenRouter). `model` is the picked option (recommended, a listed id or "custom") and `customModel` the typed id. Neither is a secret. */
export type VisitorKeyState = { anthropic: string; firecrawl: string; model?: string; customModel?: string; /** A model picked for single agents, from the gear on each reader card. */ agentModels?: AgentModels };

/** The model to send in the request body, or undefined for the recommended mix. Only a visitor's own key can choose one. */
export function chosenModel(keys: VisitorKeyState): string | undefined {
  const key = keys.anthropic.trim();
  return key ? modelToSend(keys.model, keys.customModel, keyProvider(key)) : undefined;
}
/** The picks for single agents to send, only those the key's provider can take, or undefined. */
export function chosenAgentModels(keys: VisitorKeyState): AgentModels | undefined {
  const key = keys.anthropic.trim();
  return key ? agentModelsToSend(keys.agentModels, keyProvider(key)) : undefined;
}
/** Request headers for a run: the model key goes in the header that matches its provider, the Firecrawl key in its own. Empty keys are left out. */
export function modelKeyHeaders(keys: VisitorKeyState): Record<string, string> {
  const headers: Record<string, string> = {};
  const model = keys.anthropic.trim();
  if (model) headers[{ anthropic: "x-anthropic-key", openrouter: "x-openrouter-key", gemini: "x-gemini-key" }[keyProvider(model)]] = model;
  const firecrawl = keys.firecrawl.trim();
  if (firecrawl) headers["x-firecrawl-key"] = firecrawl;
  return headers;
}

export type ModeStatus = { live: boolean; ownKey: boolean; reason?: string } | null;

/** Asks /api/mode what can run. The answer holds no key material. */
export function useModeStatus(): ModeStatus {
  const [status, setStatus] = useState<ModeStatus>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(BASE_PATH + "/api/mode", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<{ live?: boolean; ownKey?: boolean; reason?: string }>)
      .then((data) => setStatus({ live: data.live === true, ownKey: data.ownKey === true, reason: typeof data.reason === "string" ? data.reason : undefined }))
      .catch(() => { if (!controller.signal.aborted) setStatus({ live: false, ownKey: false, reason: UNKNOWN_STATUS_REASON }); });
    return () => controller.abort();
  }, []);
  return status;
}

/**
 * Header control labelled "Agent power": a toggle switch with both names always visible, one on each side of a pill track. "Native scan" (left,
 * the default) runs in the browser. "API boost" (right) runs Claude agents on the visitor's own key (Anthropic or OpenRouter, one field) and opens
 * a small non-modal panel for the keys. Under the look it is a radio group of two native radios, so screen readers and arrow keys work as usual.
 * A click on the track flips the switch. A status (dot, short title, "i" tooltip) says what will run. The "?" button opens a popup that explains both.
 * Keys live in the parent's React state only, never in storage.
 */
export function ReaderSwitch({ mode, onMode, keys, onKeys, status, disabled }: {
  mode: RunMode; onMode: (mode: RunMode) => void; keys: VisitorKeyState; onKeys: (keys: VisitorKeyState) => void; status: ModeStatus; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const closeHelp = useCallback(() => setHelp(false), []);
  const root = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  // Puts focus back on the picked option after the key panel closes.
  const focusChoice = useCallback(() => root.current?.querySelector<HTMLInputElement>("input.rs-input:checked")?.focus(), []);
  const ids = { panel: useId(), anthropic: useId(), firecrawl: useId(), reason: useId(), model: useId(), custom: useId() };

  const ownKeyOff = Boolean(status) && !status!.ownKey;
  // If Claude turns out to be unavailable on this host, the choice drops back to the native scan.
  useEffect(() => { if (ownKeyOff && mode === "live") { onMode("rules"); } }, [ownKeyOff, mode, onMode]);

  useEffect(() => { if (open) firstField.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); focusChoice(); } };
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, [open, focusChoice]);

  const on = mode === "live";
  const hasKey = keys.anthropic.trim() !== "";
  const hasAny = hasKey || keys.firecrawl.trim() !== "";
  const reason = ownKeyOff ? status?.reason ?? NO_OWN_KEY_REASON : disabled ? RUN_LOCKED_REASON : "";
  const labelId = ids.reason + "-label";
  // The model picker follows the key: Claude models for an Anthropic key, Gemini Lite models for a Gemini key, a longer list plus a custom id for OpenRouter.
  const provider = keyProvider(keys.anthropic.trim());
  const options = modelOptions(provider);
  const pick = keys.model === CUSTOM && provider === "openrouter" ? CUSTOM : options.some((option) => option.id === keys.model) ? keys.model! : RECOMMENDED;
  const pickedNote = pick === CUSTOM ? CUSTOM_NOTE : (pick === RECOMMENDED ? recommendedOption(provider) : options.find((option) => option.id === pick))?.note ?? "";
  // Copy names a provider only once a key says which one it is.
  const named = hasKey ? provider : undefined;
  const customText = (keys.customModel ?? "").trim();
  const customBad = pick === CUSTOM && customText !== "" && !isCustomModelId(customText);
  useEffect(() => { const show = () => setOpen(true); window.addEventListener("itsa10but:open-keys", show); return () => window.removeEventListener("itsa10but:open-keys", show); }, []);
  const pickMode = (next: RunMode) => { if (next === "live") { onMode("live"); setOpen(true); } else { onMode("rules"); setOpen(false); } };
  // The status says what will run. A site key counts as a key, and a model is only named when the visitor picked one.
  const picked = chosenModel(keys);
  const state = switchStatus(mode, { provider, entered: hasKey, siteKey: Boolean(status?.live), model: picked ? modelLabel(picked) : undefined });
  const choices: { mode: RunMode; short: string; more: string }[] = [{ mode: "rules", short: "Native", more: " scan" }, { mode: "live", short: "API boost", more: "" }];
  const locked = Boolean(disabled) || ownKeyOff;

  return <div className="reader-switch" ref={root} onBlur={(event) => { if (open && event.relatedTarget && !root.current?.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <div className="rs-main">
    <span id={labelId} className="rs-caption">{SWITCH_LABEL}</span>
    <div className="rs-row">
      <div className="rs-toggle" data-mode={mode} role="radiogroup" aria-labelledby={labelId} aria-describedby={reason ? ids.reason : undefined}>
        {choices.map((choice) => <label key={choice.mode} className={"rs-name rs-name-" + choice.mode} title={MODE_OPTIONS[choice.mode].hint}>
          <input type="radio" className="rs-input" name={ids.panel + "-mode"} checked={mode === choice.mode} disabled={locked}
            aria-controls={choice.mode === "live" && open ? ids.panel : undefined} onChange={() => pickMode(choice.mode)} onClick={() => { if (choice.mode === "live" && mode === "live" && !locked) setOpen((was) => !was); }} />
          <span>{choice.short}<span className="rs-more">{choice.more}</span></span>
        </label>)}
        {/* The track is a mouse and touch shortcut: it flips the switch. The radios above are what keyboards and screen readers use. */}
        <span className="rs-track" aria-hidden="true" onClick={() => { if (!locked) pickMode(on ? "rules" : "live"); }}><span className="rs-knob" /></span>
      </div>
      <button type="button" className="rs-tip-btn" aria-label="Two ways to run: native scan or API boost" aria-haspopup="dialog" onClick={() => setHelp(true)}>?</button>
    </div>
    </div>
    <div className="rs-line">
      {/* Title always shows. The detail is a tooltip on wide screens (the "i" button) and a second line on narrow ones, so only one of the two is ever on screen. */}
      <span className="rs-status" role="status" data-state={state.state}>
        <span className="rs-dot" aria-hidden="true" />
        <strong className="rs-title">{state.title}</strong>
        <span className="rs-tip"><WordTip title={SWITCH_LABEL} word={null} label="What this means" tone={state.state === "needs-key" ? "orange" : "teal"}>{state.detail}</WordTip></span>
        <span className="rs-detail">{state.detail}</span>
      </span>
      {on && !open &&<button type="button" className="rs-keys" disabled={disabled} aria-haspopup="dialog" onClick={() => setOpen(true)}>Keys</button>}
    </div>
    <Popup open={help} onClose={closeHelp} title="Two ways to run" wide><div className="run-modes"><RunModes safety provider={named} /></div></Popup>
    {reason && <p id={ids.reason} className="hint rs-reason">{reason}</p>}
    {open && on && <div id={ids.panel} className="rs-panel" role="dialog" aria-label="API boost settings">
      <h2>API boost</h2>
      <p className="hint rs-intro">API boost: four agents read your résumé one after another. Your key pays for the run. {hasKey ? costSentence(provider, picked, chosenAgentModels(keys)) : costOverview()}{status?.live ? " Leave the key empty to use this site’s key while it lasts." : ""}</p>

      <section className="rs-group" aria-labelledby={ids.panel + "-key"}>
        <h3 id={ids.panel + "-key"} className="rs-group-title"><span className="rs-step" aria-hidden="true">1</span>Your key</h3>
        <div className="rs-field">
          <label htmlFor={ids.anthropic}>{KEY_FIELDS.anthropic.label}</label>
          <input id={ids.anthropic} ref={firstField} type="password" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} data-1p-ignore="true"
            value={keys.anthropic} onChange={(event) => onKeys({ ...keys, anthropic: event.target.value })} aria-describedby={ids.anthropic + "-hint"} />
          <span id={ids.anthropic + "-hint"} className="hint">{keyHint(named)}</span>
        </div>
      </section>

      {hasKey && <section className="rs-group" aria-labelledby={ids.panel + "-model"}>
        <h3 id={ids.panel + "-model"} className="rs-group-title"><span className="rs-step" aria-hidden="true">2</span>Model</h3>
        <div className="rs-field">
          <label htmlFor={ids.model} className="sr-only">{MODEL_FIELD.label}</label>
          <select id={ids.model} value={pick} aria-describedby={ids.model + "-hint"} onChange={(event) => onKeys({ ...keys, model: event.target.value })}>
            <option value={RECOMMENDED}>{recommendedOption(provider).label}</option>
            {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            {provider === "openrouter" && <option value={CUSTOM}>{MODEL_FIELD.customLabel}</option>}
          </select>
          <span id={ids.model + "-hint"} className="hint" role="status">{pickedNote}{pick === CUSTOM ? "" : " " + modelHint(provider)}</span>
        </div>
        {pick === CUSTOM && <div className="rs-field">
          <label htmlFor={ids.custom}>{MODEL_FIELD.customLabel}</label>
          <input id={ids.custom} type="text" inputMode="url" maxLength={100} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="provider/model-name"
            value={keys.customModel ?? ""} onChange={(event) => onKeys({ ...keys, customModel: event.target.value })}
            aria-invalid={customBad} aria-describedby={ids.custom + "-hint" + (customBad ? " " + ids.custom + "-error" : "")} />
          <span id={ids.custom + "-hint"} className="hint">{MODEL_FIELD.customHint}</span>
          {customBad && <span id={ids.custom + "-error"} className="rs-error" role="alert">{MODEL_FIELD.customError}</span>}
        </div>}
      </section>}

      <section className="rs-group rs-optional" aria-labelledby={ids.panel + "-web"}>
        <h3 id={ids.panel + "-web"} className="rs-group-title">Optional: wider web search</h3>
        <div className="rs-field">
          <label htmlFor={ids.firecrawl}>{KEY_FIELDS.firecrawl.label}</label>
          <input id={ids.firecrawl} type="password" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} data-1p-ignore="true"
            value={keys.firecrawl} onChange={(event) => onKeys({ ...keys, firecrawl: event.target.value })} aria-describedby={ids.firecrawl + "-hint"} />
          <span id={ids.firecrawl + "-hint"} className="hint">{KEY_FIELDS.firecrawl.hint}</span>
        </div>
      </section>

      <p className="notice rs-disclosure">{leavesBrowser(named)}</p>
      <details className="rs-more">
        <summary>How your key is handled</summary>
        <p>{KEY_HANDLING}</p>
      </details>
      {!hasKey && !status?.live && <p className="hint" role="status">Paste an Anthropic, OpenRouter or Gemini key to run the agents. Without one, you get the native scan.</p>}
      <div className="rs-actions">
        <button type="button" className="btn primary small" onClick={() => { setOpen(false); focusChoice(); }}>Done</button>
        <button type="button" className="btn quiet small" disabled={!hasAny} onClick={() => { onKeys({ anthropic: "", firecrawl: "" }); firstField.current?.focus(); }}>Remove keys</button>
      </div>
    </div>}
  </div>;
}
