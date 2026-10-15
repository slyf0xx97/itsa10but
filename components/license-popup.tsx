"use client";
import { useCallback, useState } from "react";
import { Scale, FileText } from "lucide-react";
import { Popup } from "@/components/popup";
import { LICENSE_TEXT } from "@/lib/license-text";
import { LEGAL_CONTACT, LEGAL_SECTIONS } from "@/lib/legal-copy";

const REPO = "https://github.com/slyf0xx97/itsa10but";
const AUTHOR = "https://sg.linkedin.com/in/ghernie";

/** The footer's two matching buttons, "Legal" and "MIT License", each with its own popup: copyright, the disclaimer, trademarks, other sources and your data in the first, the MIT text in the second. Focus returns to the button when a popup closes (Popup handles that). */
export function LicensePopup() {
  const [open, setOpen] = useState<"legal" | "mit" | null>(null);
  const close = useCallback(() => setOpen(null), []);
  return <div className="ft-btns">
    <button type="button" className="ft-license" aria-haspopup="dialog" onClick={() => setOpen("legal")}><Scale size={18} aria-hidden="true" />Legal</button>
    <button type="button" className="ft-license" aria-haspopup="dialog" onClick={() => setOpen("mit")}><FileText size={18} aria-hidden="true" />MIT License</button>
    <Popup open={open === "legal"} onClose={close} title="Legal" icon={<Scale size={20} aria-hidden="true" />} wide>
      <div className="lic">
        {LEGAL_SECTIONS.map((section) => <section className="lic-sec" key={section.id} aria-labelledby={"lic-" + section.id}>
          <h3 id={"lic-" + section.id}>{section.title}</h3>
          {section.text?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.list && <ul>{section.list.map((item) => <li key={item}>{item}</li>)}</ul>}
        </section>)}
        <p className="lic-note">{LEGAL_CONTACT} You can reach Ghernie on <a href={AUTHOR} target="_blank" rel="noopener noreferrer">LinkedIn</a>. The code is on <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a>. Where each logo came from is listed in <a href={REPO + "/blob/main/public/assets/logos/SOURCES.md"} target="_blank" rel="noopener noreferrer">SOURCES.md</a>.</p>
      </div>
    </Popup>
    <Popup open={open === "mit"} onClose={close} title="MIT License" icon={<FileText size={20} aria-hidden="true" />} wide>
      <div className="lic">
        <p className="lic-sum"><strong>You can use, copy, change and share this code. Keep the copyright notice. It comes as is, with no warranty.</strong></p>
        <pre className="lic-text" tabIndex={0} aria-label="Full license text">{LICENSE_TEXT}</pre>
      </div>
    </Popup>
  </div>;
}
