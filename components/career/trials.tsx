"use client";

/** The highlighter for a key word in a sentence. */

/** Wraps the first of `terms` found in `text` (case-insensitive, longest first) in the highlighter. */
export function Marked({ text, terms }: { text: string; terms: string[] }) {
  const term = terms.filter(Boolean).sort((a, b) => b.length - a.length).find((t) => text.toLowerCase().includes(t.toLowerCase()));
  if (!term) return <>{text}</>;
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  return <>{text.slice(0, at)}<span className="hl">{text.slice(at, at + term.length)}</span>{text.slice(at + term.length)}</>;
}
