"use client";
import type { ReactNode } from "react";
import { Database, X } from "lucide-react";
import { WordTip } from "@/components/career/word-tip";

type Row = { icon: string; lead: string; text: ReactNode };

// Every line here is a fact also stated in AGENTS.md or the How it works lanes; keep them in step.
const stays: Row[] = [
  { icon: "🖥️", lead: "Native scan runs in this tab", text: "It makes no model call and sends nothing out." },
  { icon: "🧹", lead: "Your résumé is not saved", text: "It stays out of analytics, logs, URLs and browser storage." },
  { icon: "✅", lead: "Level up ticks", text: "Saved in this browser only." },
];
const leaves: Row[] = [
  { icon: "✉️", lead: "Masked résumé text goes to Anthropic", text: "Only when you switch API boost on. With an OpenRouter key it goes to OpenRouter first." },
  { icon: "⚠️", lead: "Not masked", text: "Names, employers and schools go as written." },
  { icon: "🔍", lead: "Role text shapes web searches", text: "The two web agents never see your résumé." },
  { icon: "🔑", lead: "Keys last one request", text: "Your key travels in a request header and is never stored or logged." },
  { icon: "🚦", lead: "Runs have caps", text: "Each agent has limits on tool calls and time. A refused or slow run falls back to the native scan." },
];

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return <section className="pv-group">
    <h4 className="pv-title">{title}</h4>
    <ul className="pv-list">{rows.map((row) => <li className="cl-item" key={row.lead}>
      <span className="cl-icon" aria-hidden="true">{row.icon}</span>
      <p className="cl-text"><strong className="cl-lead">{row.lead}</strong>{row.text}</p>
    </li>)}</ul>
  </section>;
}

/**
 * The lock button beside "Choose a file", with a database icon crossed out next to it (its tooltip says the app has no database, so nothing you add is stored). The lock opens a non-modal popover that holds
 * everything about what stays in the browser and what can leave.
 */
export function PrivacyTip() {
  return <span className="pv-pair">
    <WordTip panel word={<span aria-hidden="true">🔒</span>} label="Privacy and safety" title="Privacy and safety">
      <Group title="Stays in this tab" rows={stays} />
      <Group title="Leaves only if you switch API boost on" rows={leaves} />
    </WordTip>
    <WordTip title="No database" label="No database. Nothing you add is stored in this app." bare buttonClass="pv-nodb" tone="leaf"
      word={<span className="pv-nodb-mark" aria-hidden="true"><Database size={22} strokeWidth={2.2} /><X className="pv-nodb-x" size={14} strokeWidth={4.5} /></span>}>
      <span className="word-tip-line">No database. Nothing you add is stored in this app.</span>
    </WordTip>
  </span>;
}
