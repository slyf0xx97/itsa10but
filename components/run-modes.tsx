import type { ReactNode } from "react";
import { sentThroughKey, type ChosenProvider } from "@/lib/provider-copy";

// Text in `**double stars**` is rendered in bold. Colour highlights are kept for a single phrase at most.
export function hl(text: string): ReactNode {
  return text.split("**").map((part, index) => (index % 2 ? <b key={index}>{part}</b> : part));
}

export function Item({ icon, lead, text }: { icon: string; lead: ReactNode; text: string }) {
  return <li className="cl-item">
    <span className="cl-icon" aria-hidden="true">{icon}</span>
    <p className="cl-text"><strong className="cl-lead">{lead}</strong>{hl(text)}</p>
  </li>;
}

/**
 * The two ways to run, as a lead line and two tiles. Shared by "How it works" and the Agent power popup. Renders a fragment so the parent controls the layout.
 * `safety` adds the Safety tile; only the popup opened by the "?" next to the Agent power control passes it.
 * `provider` is the provider of the key the visitor entered, if any: the copy names who receives the text only once a key says which company that is.
 * Keep the safety items in line with leavesBrowser (lib/provider-copy.ts) and KEY_HANDLING (lib/mode-copy.ts).
 */
export function RunModes({ safety = false, provider }: { safety?: boolean; provider?: ChosenProvider }) {
  return <>
    <div className="hiw-opening">
      <p className="hiw-lead">Two ways to run: a free scan in your browser or AI agents on your own key.</p>
      <p className="hiw-sub">Both give you a radar, skills and tips and tricks. <span className="hl">Every quote is checked</span> against your text.</p>
    </div>

    <div className="hiw-choice">
      <article className="hiw-tile" data-tile="native">
        <div className="hiw-tile-head">
          <span className="cl-icon" aria-hidden="true">🧭</span>
          <h3>Native scan</h3>
          <span className="hiw-tag">Default</span>
        </div>
        <ul className="cl-list">
          <Item icon="🔎" lead="Matches text to skills" text="Word matching scores your résumé in your browser. A small Cloudflare AI model also reads the role text, but never your résumé." />
          <Item icon="💻" lead="Stays in your browser tab" text="Your résumé is read and scored here and sent nowhere." />
          <Item icon="🆓" lead="Needs no key" text="There is nothing to sign up for." />
        </ul>
      </article>
      <article className="hiw-tile" data-tile="claude">
        <div className="hiw-tile-head">
          <span className="cl-icon" aria-hidden="true">🤖</span>
          <h3>API boost</h3>
          <span className="hiw-tag">Optional</span>
        </div>
        <ul className="cl-list">
          <Item icon="🧠" lead="Four agents read it" text="You choose the model, for all four agents or for each one. Every quote is checked against your text." />
          <Item icon="☁️" lead="Sent through your key" text={sentThroughKey(provider)} />
          <Item icon="🔑" lead="Uses your own key" text="Enter it in Agent power. It is never stored. A Firecrawl key is optional and widens web search." />
        </ul>
      </article>
    </div>

    {safety && <article className="hiw-tile hiw-safety">
      <div className="hiw-tile-head">
        <span className="cl-icon" aria-hidden="true">🛡️</span>
        <h3>Safety</h3>
      </div>
      <ul className="cl-list">
        <Item icon="🔑" lead="Keys are not stored" text="Your key travels in a header for one request and is never stored or logged." />
        <Item icon="1️⃣" lead="One model key at a time" text="Anthropic, OpenRouter or Gemini, in a single field. The server checks the model you pick." />
        <Item icon="🎭" lead="Contact details are masked" text="In API boost, emails, phone numbers and addresses are masked before the text leaves your browser. Names, employers and schools are not. In the native scan your résumé never leaves the tab." />
        <Item icon="⏱️" lead="Every agent has limits" text="Each agent has caps on tool calls and time, and web pages are read as data, never as instructions." />
        <Item icon="✅" lead="Quotes are checked" text="A quote that is not in your text scores 0." />
        <Item icon="🛟" lead="A failed run falls back" text="A refused, slow or failed run drops back to the native scan, with a notice." />
      </ul>
    </article>}
  </>;
}
