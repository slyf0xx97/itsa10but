"use client";
import { KeyRound, RotateCcw, ScanSearch, TriangleAlert } from "lucide-react";

/** Shown in place of the results when an API boost run stops. Nothing from the native scan is slipped in: the visitor chooses to retry, fix the key or run the native scan. */
export function RunError({ message, onRetry, onKeys, onNative }: { message: string; onRetry: () => void; onKeys: () => void; onNative: () => void }) {
  return <div className="run-error" role="alert">
    <span className="run-error-icon" aria-hidden="true"><TriangleAlert size={26} /></span>
    <div className="run-error-text">
      <h3>API boost didn&apos;t finish</h3>
      <p>{message}</p>
      <p className="run-error-hint">Nothing was charged for a result you can&apos;t see. Check your key and model, or run the native scan, which needs no key.</p>
    </div>
    <div className="run-error-actions">
      <button type="button" className="btn primary small" onClick={onRetry}><RotateCcw size={16} aria-hidden="true" /> Try again</button>
      <button type="button" className="btn small" onClick={onKeys}><KeyRound size={16} aria-hidden="true" /> Open key settings</button>
      <button type="button" className="btn quiet small" onClick={onNative}><ScanSearch size={16} aria-hidden="true" /> Use native scan</button>
    </div>
  </div>;
}
