"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A modal popup on the native <dialog> element, so Escape, focus trapping and the backdrop come from the browser.
 * It never changes the height of the page: content scrolls inside the panel. Click the backdrop, press Escape or use the Close button to dismiss.
 * Focus returns to whatever opened it. Pass `title` for the visible heading (it also labels the dialog).
 */
export function Popup({ open, onClose, title, icon, children, wide = false }: { open: boolean; onClose: () => void; title: string; icon?: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const done = () => {
      onClose();
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
    dialog.addEventListener("close", done);
    return () => dialog.removeEventListener("close", done);
  }, [onClose]);

  return <dialog
    ref={ref}
    className={"pop" + (wide ? " pop-wide" : "")}
    aria-labelledby={titleId}
    onClick={(event) => { if (event.target === ref.current) onClose(); }}
  >
    <div className="pop-card">
      <header className="pop-head">
        {icon ? <span className="pop-icon" aria-hidden="true">{icon}</span> : null}
        <h2 id={titleId} className="pop-title">{title}</h2>
        <button type="button" className="pop-close" onClick={onClose} aria-label="Close">Close <span aria-hidden="true">✕</span></button>
      </header>
      <div className="pop-body">{children}</div>
    </div>
  </dialog>;
}
