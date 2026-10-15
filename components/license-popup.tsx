"use client";
import { useCallback, useState } from "react";
import { Scale } from "lucide-react";
import { Popup } from "@/components/popup";
import { LICENSE_TEXT } from "@/lib/license-text";

const REPO = "https://github.com/slyf0xx97/itsa10but";

/** The footer's "MIT License" button and its popup. Focus returns to the button when the popup closes (Popup handles that). */
export function LicensePopup() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className="ft-license" aria-haspopup="dialog" onClick={() => setOpen(true)}>MIT License</button>
    <Popup open={open} onClose={close} title="MIT License" icon={<Scale size={20} aria-hidden="true" />}>
      <div className="lic">
        <p className="lic-sum"><strong>You can use, copy, change and share this code. Keep the copyright notice. It comes as is, with no warranty.</strong></p>
        <pre className="lic-text" tabIndex={0} aria-label="Full license text">{LICENSE_TEXT}</pre>
        <p className="lic-note">The code is on <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a>. Logos, icons and fonts belong to their owners. Their sources are listed in <a href={REPO + "/blob/main/public/assets/logos/SOURCES.md"} target="_blank" rel="noopener noreferrer">SOURCES.md</a>.</p>
      </div>
    </Popup>
  </>;
}
