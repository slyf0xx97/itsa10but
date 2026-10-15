import { ShieldCheck, TriangleAlert } from "lucide-react";
import type { InjectionMatch, PiiFinding } from "@/lib/safety";

export type SafetyPanelReport = { piiFound: PiiFinding[]; injectionFlags: InjectionMatch[] };

export function SafetyPanel({ report }: { report: SafetyPanelReport | null }) {
  return (
    <div className="panel safety-panel" aria-label="Safety check">
      <div className="panel-head">
        <div className="panel-icon"><ShieldCheck size={19} /></div>
        <div><h3>Safety check</h3><p>Runs first, before any reader sees your text.</p></div>
        <span className="simulation-tag">IN YOUR BROWSER</span>
      </div>
      {!report ? (
        <p className="safety-waiting">Masks contact details and looks for hidden instructions before the readers start.</p>
      ) : (
        <div className="safety-grid">
          <div className="safety-block">
            <span className="eyebrow">MASKED BEFORE ANALYSIS</span>
            {report.piiFound.length === 0 ? (
              <p className="safety-clear">No email, phone number, address or NRIC/FIN-style ID found.</p>
            ) : (
              <ul className="safety-pii">
                {report.piiFound.map((item) => (
                  <li key={item.category}><span className="status-pill">{item.label}</span><span>{item.count} found, replaced with a placeholder</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="safety-block">
            <span className="eyebrow">CHECK FOR HIDDEN INSTRUCTIONS</span>
            {report.injectionFlags.length === 0 ? (
              <p className="safety-clear">No hidden instructions found in your text.</p>
            ) : (
              <ul className="safety-injection">
                {report.injectionFlags.map((flag, index) => (
                  <li key={flag.pattern + index}>
                    <span className="status-pill missing"><TriangleAlert size={12} /> {flag.label}</span>
                    <code>{flag.snippet}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="safety-note">The readers see the masked text only.</p>
        </div>
      )}
    </div>
  );
}
