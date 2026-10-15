"use client";
import { BASE_PATH } from "@/lib/base-path";
import { useCallback, useState } from "react";
import Image from "next/image";
import { Check, ExternalLink, X } from "lucide-react";
import { Term } from "@/components/career/term";
import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";
import { Popup } from "@/components/popup";

// ok: true is a "do", false is a "skip". why is an optional second line.
type Tip = { ok: boolean; text: string; why?: string };

const groups: { title: string; icon: PixelIconName; tips: Tip[] }[] = [
  { title: "Layout", icon: "dashboard", tips: [
    { ok: true, text: "Keep it to one page." },
    { ok: true, text: "Use a plain, single-column layout." },
    { ok: false, text: "Skip tables, text boxes and images." },
  ] },
  { title: "Content", icon: "scroll", tips: [
    { ok: true, text: "Use the standard headings: Experience, Projects, Skills, Education." },
    { ok: true, text: "Name the tools you used.", why: "Readers match skills to the words on the page." },
    { ok: true, text: "Say what you built and what came of it.", why: "A result is the line a reader can quote." },
    { ok: true, text: "Keep dates and numbers.", why: "Plain figures give a reader something to check." },
  ] },
  { title: "Files and ATS", icon: "search", tips: [
    { ok: true, text: "Save a PDF or DOCX with selectable text." },
    { ok: true, text: "Reuse the exact words the posting uses." },
    { ok: true, text: "Spell an acronym out once, like Security Information and Event Management (SIEM)." },
  ] },
];

// Third-party sites, named only for what they are. No pricing or results are claimed. Logo files are saved once in public/assets/logos (see SOURCES.md there).
const sites = [
  { name: "Resume.io", what: "Résumé builder and templates", href: "https://resume.io", logo: "resume-io" },
  { name: "Reactive Resume", what: "Open-source résumé builder", href: "https://rxresu.me", logo: "reactive-resume" },
  { name: "FlowCV", what: "Simple résumé builder", href: "https://flowcv.com", logo: "flowcv" },
  { name: "Overleaf CV templates", what: "LaTeX CV templates", href: "https://www.overleaf.com/latex/templates/tagged/cv", logo: "overleaf" },
  { name: "Jobscan", what: "Checks a résumé against a posting", href: "https://www.jobscan.co", logo: "jobscan" },
];

/** A button beside the résumé drop zone that opens the format guide in the shared Popup: grouped do and skip tips, then the useful sites as logo cards. */
export function ResumeTips() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className="btn quiet rt-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <PixelIcon name="report" size={18} />
      <span className="rt-long">How to format your résumé for tech</span>
      <span className="rt-short">Résumé format tips</span>
    </button>
    <Popup open={open} onClose={close} title="How to format your résumé for tech" icon={<PixelIcon name="report" size={22} />} wide>
      {open && <div className="rt">
        <div className="rt-groups">{groups.map((group) => <section className="rt-group" key={group.title}>
          <h3 className="rt-title"><PixelIcon name={group.icon} size={20} />{group.title}</h3>
          {group.title === "Files and ATS" && <p className="rt-intro">An <Term id="ats">ATS</Term> reads your résumé as plain text, so a fancy layout can scramble it. Use the posting&apos;s own words.</p>}
          <ul className="rt-tips">{group.tips.map((tip) => <li key={tip.text} className={tip.ok ? "is-do" : "is-skip"}>
            <span className="rt-mark" aria-hidden="true">{tip.ok ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}</span>
            <span><span className="sr-only">{tip.ok ? "Do: " : "Skip: "}</span>{tip.text}{tip.why && <small>{tip.why}</small>}</span>
          </li>)}</ul>
        </section>)}</div>
        <section className="rt-sites" aria-labelledby="rt-sites-title">
          <h3 className="rt-title" id="rt-sites-title">Useful sites</h3>
          <ul className="rt-grid">{sites.map((site) => <li key={site.name}>
            <a href={site.href} target="_blank" rel="noopener noreferrer">
              <span className="rt-logo"><Image src={BASE_PATH + "/assets/logos/" + site.logo + ".png"} width={40} height={40} alt="" unoptimized /></span>
              <span className="rt-site-text"><strong>{site.name}</strong><span>{site.what}</span></span>
              <ExternalLink size={16} aria-hidden="true" focusable="false" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>)}</ul>
        </section>
      </div>}
    </Popup>
  </>;
}
