import type { ReactNode } from "react";

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
 * Keep the safety items in line with LEAVES_BROWSER and KEY_HANDLING in lib/mode-copy.ts.
 */
export function RunModes({ safety = false }: { safety?: boolean }) {
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
          <Item icon="🔎" lead="Matches text to skills" text="Built-in word matching. No AI model is used." />
          <Item icon="💻" lead="Runs in your browser tab" text="Your résumé is read and scored here and sent nowhere." />
          <Item icon="🆓" lead="No API key" text="There is nothing to sign up for." />
        </ul>
      </article>
      <article className="hiw-tile" data-tile="claude">
        <div className="hiw-tile-head">
          <span className="cl-icon" aria-hidden="true">🤖</span>
          <h3>API boost</h3>
          <span className="hiw-tag">Optional</span>
        </div>
        <ul className="cl-list">
          <Item icon="🧠" lead="Four agents read it" text="The recommended mix by default. You can pick the model. Every quote is checked against your text." />
          <Item icon="☁️" lead="Sent through your key" text="Masked résumé text goes to Anthropic, or to OpenRouter and then the model's maker if you use an OpenRouter key." />
          <Item icon="🔑" lead="Your own key" text="Pick API boost in Agent power and enter it there. It is never stored. A Firecrawl key is optional and widens web search." />
        </ul>
      </article>
    </div>

    {safety && <article className="hiw-tile hiw-safety">
      <div className="hiw-tile-head">
        <span className="cl-icon" aria-hidden="true">🛡️</span>
        <h3>Safety</h3>
      </div>
      <ul className="cl-list">
        <Item icon="🔑" lead="Your key stays out of storage" text="It travels in a header for one request and is never stored or logged." />
        <Item icon="1️⃣" lead="One model key at a time" text="Anthropic or OpenRouter, in a single field. The model you pick is checked on the server." />
        <Item icon="🎭" lead="Contact details are masked" text="In API boost they are masked before the text leaves your browser. Names, employers and schools are not. In the native scan nothing leaves the tab." />
        <Item icon="⏱️" lead="Caps on every agent" text="Each agent has limits on tool calls and time. Web pages are read as data and never as instructions." />
        <Item icon="✅" lead="Quotes are checked" text="A quote that is not in your text scores 0." />
        <Item icon="🛟" lead="A failed run falls back" text="A refused, slow or failed run drops back to the native scan, with a notice." />
      </ul>
    </article>}
  </>;
}
