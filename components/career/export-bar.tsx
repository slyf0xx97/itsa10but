"use client";
import { useEffect, useState } from "react";
import { Check, Copy, FileDown, FileText } from "lucide-react";
import type { Analysis, Resume } from "@/lib/analysis-types";

type Props = { analysis: Analysis; resumes: Resume[]; job: string; sample?: boolean; ready: boolean };
type Kind = "pdf" | "md";
type Preview = { pdf: string; md: string };

const TIPS: Record<Kind, string> = {
  pdf: "A report you can keep or share. It is built in this tab and sent nowhere.",
  md: "A prompt to paste into ChatGPT, Claude or Gemini. It rewrites your résumé from these findings. It is built in this tab and sent nowhere.",
};

/**
 * Stage 3's partner panel: the two downloads, each with a live preview of the file. The PDF shows in a frame and the Markdown prompt as text.
 * Both files are built in the browser from the finished result, once per result, and the buttons save those same files.
 */
export function ExportBar({ analysis, resumes, job, sample = false, ready }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const isSample = sample || analysis.mode === "sample";

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let url = "";
    (async () => {
      const input = { analysis, resumes, job, sample: isSample };
      const pdf = (await import("@/lib/report-pdf")).buildPdf(input) as BlobPart;
      const md = (await import("@/lib/report-md")).buildPromptMarkdown(input);
      if (!alive) return;
      url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
      setPreview({ pdf: url, md });
    })().catch(() => { if (alive) setPreview(null); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [ready, analysis, resumes, job, isSample]);

  const shown = ready ? preview : null;

  function save(kind: Kind) {
    if (!shown) return;
    const href = kind === "pdf" ? shown.pdf : URL.createObjectURL(new Blob([shown.md], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `itsa10but-${kind === "pdf" ? "report" : "ai-prompt"}${isSample ? "-sample" : ""}.${kind}`;
    document.body.append(link);
    link.click();
    link.remove();
    if (kind === "md") setTimeout(() => URL.revokeObjectURL(href), 0);
  }

  /** Puts the whole prompt on the clipboard. With no clipboard (an insecure page, a blocked permission) the button says so and the text stays on screen to select by hand. */
  async function copyPrompt() {
    if (!shown) return;
    try { await navigator.clipboard.writeText(shown.md); setCopy("copied"); } catch { setCopy("failed"); }
    setTimeout(() => setCopy("idle"), 2000);
  }

  const button = (kind: Kind, label: string, icon: React.ReactNode, primary: boolean) => (
    <span className="ex-tip-host">
      <button type="button" className={"btn small " + (primary ? "primary" : "quiet")} disabled={!shown} aria-describedby={`ex-tip-${kind}`} onClick={() => save(kind)}>{icon}{label}</button>
      <span className="ex-tip" id={`ex-tip-${kind}`} role="tooltip">{TIPS[kind]}</span>
    </span>
  );

  return (
    <section className="stage" id="export" aria-labelledby="export-title">
      <div className="stage-header"><div className="stage-plate">
        <h2 className="stage-title" id="export-title">Take it with you</h2>
        <p className="stage-line"><span className="stage-line-icon" aria-hidden="true">📄</span>A PDF report and a prompt for your own AI.</p>
      </div></div>
      <div className="stage-body">
        <div className="ex-grid">
          <div className="ex-card">
            <div className="ex-head"><h3>PDF report</h3>{button("pdf", "Download PDF report", <FileDown aria-hidden="true" size={18} />, true)}</div>
            <div className="ex-view">{shown
              ? <iframe className="ex-frame" title="Preview of the PDF report" src={shown.pdf + "#toolbar=0&navpanes=0&view=FitH"} />
              : <p className="ex-empty">{ready ? "Building the preview…" : "The report appears here when the readers finish."}</p>}</div>
          </div>
          <div className="ex-card">
            <div className="ex-head"><h3>AI prompt (.md)</h3>
              <div className="ex-actions">
                {button("md", "Download AI prompt", <FileText aria-hidden="true" size={18} />, false)}
                <button type="button" className="btn small quiet ex-copy" disabled={!shown} onClick={() => void copyPrompt()}>
                  {copy === "copied" ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
                  {copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed, select the text" : "Copy AI prompt"}
                  <span className="sr-only" role="status">{copy === "copied" ? "Prompt copied to the clipboard." : ""}</span>
                </button>
              </div>
            </div>
            <div className="ex-view">{shown
              ? <pre className="ex-md" tabIndex={0} aria-label="Preview of the Markdown prompt">{shown.md}</pre>
              : <p className="ex-empty">{ready ? "Building the preview…" : "The prompt appears here when the readers finish."}</p>}</div>
            <ol className="cl-list ex-steps" aria-label="How to use the prompt">
              <li className="cl-item"><span className="cl-icon" aria-hidden="true">1</span><p className="cl-text"><strong className="cl-lead">Paste</strong>into your AI LLM.</p></li>
              <li className="cl-item"><span className="cl-icon" aria-hidden="true">2</span><p className="cl-text"><strong className="cl-lead">Verify</strong>it, or run the new résumé through itsa10but again!</p></li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
