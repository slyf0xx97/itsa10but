"use client";
import { useId } from "react";
import { Settings } from "lucide-react";
import { Popup } from "@/components/popup";
import { specModelOf } from "@/lib/agent-prompts";
import type { ModelSettings } from "@/lib/agent-model";
import { DEFAULT_MODELS, modelLabel, modelOptions, type AgentName } from "@/lib/model-choice";
import { PROVIDER_LABEL } from "@/lib/provider-copy";

/**
 * The model setting for one agent, opened from the gear on its card. A dropdown lists the models the visitor's key can use, plus "Default", which follows the pick for
 * all four agents (from the API boost panel) or else the key's own default. Without a key there is nothing to choose from, and the popup says how to get one.
 */
export function AgentModelSettings({ name, settings, onClose }: { name: AgentName; settings: ModelSettings; onClose: () => void }) {
  const field = useId();
  const { provider } = settings;
  const options = provider ? modelOptions(provider) : [];
  const own = settings.picks[name];
  const value = own && options.some((option) => option.id === own) ? own : "";
  const defaultId = provider ? settings.all ?? DEFAULT_MODELS[provider] ?? specModelOf(name) : undefined;
  const note = value ? options.find((option) => option.id === value)?.note : provider ? (settings.all ? "The model you picked for all four agents." : `The default for your ${PROVIDER_LABEL[provider]} key.`) : "";
  return <Popup open onClose={onClose} title={`${name}: model`} icon={<Settings size={20} aria-hidden="true" />}>
    {provider ? <>
      <p className="dp-desc">Pick the model {name} uses in API boost. The other agents keep their own. Your {PROVIDER_LABEL[provider]} key pays for it.</p>
      <div className="rs-field">
        <label htmlFor={field}>Model for {name}</label>
        <select id={field} value={value} aria-describedby={field + "-hint"} onChange={(event) => settings.onPick(name, event.target.value || undefined)}>
          <option value="">Default: {defaultId ? modelLabel(defaultId) : "the key's default"}</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <span id={field + "-hint"} className="hint" role="status">{note}</span>
      </div>
    </> : <p className="dp-desc">API boost needs your own key before a model can be chosen. Open Agent power in the header, pick API boost and add a key. The native scan uses no model.</p>}
    <div className="rs-actions">
      <button type="button" className="btn primary small" onClick={onClose}>Done</button>
    </div>
  </Popup>;
}
