import { ShieldCheck, TriangleAlert } from "lucide-react";
import { WordTip } from "@/components/career/word-tip";
import type { InjectionMatch, PiiFinding } from "@/lib/safety";

export type SafetyPanelReport = { piiFound: PiiFinding[]; injectionFlags: InjectionMatch[] };

export function SafetyPanel({ report }: { report: SafetyPanelReport | null }) {
  return (
    <div className="panel safety-panel" aria-label="Safety check">
      <div className="panel-head safety-head">
        <div className="panel-icon"><ShieldCheck size={19} /></div>
        <h3>Safety check</h3>
      </div>
      {!report ? (
        <p className="safety-waiting">Masks contact details and looks for hidden instructions before the readers start.</p>
      ) : (
        <div className="safety-more">
          <p className="safety-sum">
            <b>{report.piiFound.reduce((sum, item) => sum + item.count, 0)}</b> details masked<br />
            <b>{report.injectionFlags.length}</b> hidden {report.injectionFlags.length === 1 ? "instruction" : "instructions"} found
          </p>
          <WordTip panel clickOnly buttonClass="safety-show-btn" title="What the safety check found" label="Show the safety check details"
            word={<><span>Show details</span><span aria-hidden="true">→</span></>}>
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
              <p className="safety-note">Runs first, in your browser, before any reader sees your text. The readers see the masked text only.</p>
            </div>
          </WordTip>
        </div>
      )}
    </div>
  );
}
