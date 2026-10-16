/**
 * Splits résumé or role text into short passages a quote can come from. PDF text often has no line breaks and few full stops, so it also splits at
 * bullet marks, runs of spaces and " | ", then cuts anything still over MAX_PASSAGE at the last comma, semicolon or space that fits.
 * Every passage is a slice of the original text, so a quote taken from one is still found word for word in the source.
 */
export const MAX_PASSAGE = 220;
const MIN_PASSAGE = 3;

const BREAKS = /\r?\n|[•◦▪▫●■□‣⁃∙·]|\s{2,}|\s[|¦]\s|(?<=[.!?])\s+/;

function cutLong(piece: string): string[] {
  const out: string[] = [];
  let rest = piece;
  while (rest.length > MAX_PASSAGE) {
    const window = rest.slice(0, MAX_PASSAGE + 1);
    let at = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": ")) + 1;
    if (at < MAX_PASSAGE * 0.5) at = window.lastIndexOf(" ");
    if (at <= 0) at = MAX_PASSAGE;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function splitPassages(text: string): string[] {
  return text.split(BREAKS).map((part) => part.trim()).filter((part) => part.length >= MIN_PASSAGE).flatMap(cutLong);
}
