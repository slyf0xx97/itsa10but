/**
 * Hand-written PDF 1.4 report. No library: A4, Helvetica / Helvetica-Bold / Helvetica-Oblique with WinAnsiEncoding,
 * widths from the standard Helvetica AFM table, uncompressed content streams so tests can read the text.
 * Characters outside WinAnsi print as "?". Everything is built from the finished Analysis; nothing is sent anywhere.
 */
import type { Analysis } from "./analysis-types.ts";
import { atsVerdict } from "./dashboard-data.ts";
import { ATS_WORD, clamp100, isSample, modeLabel, overallOf, type ReportInput } from "./report-shared.ts";
import { proofOf, wantDots, wantOf } from "./skill-levels.ts";

// ---- Fonts and WinAnsi ----------------------------------------------------------------------------------------------

const REG = "!278 \"355 #556 $556 %889 &667 '191 (333 )333 *389 +584 ,278 -333 .278 /278 0556 1556 2556 3556 4556 5556 6556 7556 8556 9556 :278 ;278 <584 =584 >584 ?556 @1015 A667 B667 C722 D722 E667 F611 G778 H722 I278 J500 K667 L556 M833 N722 O778 P667 Q778 R722 S667 T611 U722 V667 W944 X667 Y667 Z611 [278 \\278 ]278 ^469 _556 `333 a556 b556 c500 d556 e556 f278 g556 h556 i222 j222 k500 l222 m833 n556 o556 p556 q556 r333 s500 t278 u556 v500 w722 x500 y500 z500 {334 |260 }334 ~584";
const BOLD = "!333 \"474 #556 $556 %889 &722 '238 (333 )333 *389 +584 ,278 -333 .278 /278 0556 1556 2556 3556 4556 5556 6556 7556 8556 9556 :333 ;333 <584 =584 >584 ?611 @975 A722 B722 C722 D722 E667 F611 G778 H722 I278 J556 K722 L611 M833 N722 O778 P667 Q778 R722 S667 T611 U722 V667 W944 X667 Y667 Z611 [333 \\278 ]333 ^584 _556 `333 a556 b611 c556 d611 e556 f333 g611 h611 i278 j278 k556 l278 m889 n611 o611 p611 q611 r389 s556 t333 u611 v556 w778 x556 y556 z500 {389 |280 }389 ~584";

function table(spec: string): Map<string, number> {
  const map = new Map<string, number>([[" ", 278]]);
  for (const item of spec.split(" ")) map.set(item[0], Number(item.slice(1)));
  // The space is a separator in the spec string, so it is added above; the quote item is the only one with a leading escape.
  return map;
}
const WIDTHS = { regular: table(REG), bold: table(BOLD) };

/** Unicode characters in WinAnsi's 0x80 to 0x9F block. 0xA0 to 0xFF match Latin-1. */
const WIN_SPECIAL: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89,
  "Š": 0x8A, "‹": 0x8B, "Œ": 0x8C, "Ž": 0x8E, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95,
  "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B, "œ": 0x9C, "ž": 0x9E, "Ÿ": 0x9F,
};
const SPECIAL_WIDTH: Record<string, [number, number]> = {
  "•": [350, 350], "‘": [222, 278], "’": [222, 278], "“": [333, 500], "”": [333, 500],
  "–": [556, 556], "—": [1000, 1000], "…": [1000, 1000], "€": [556, 556], "™": [1000, 1000],
  "ß": [611, 611], "Æ": [1000, 1000], "æ": [889, 889], "Ø": [778, 778], "ø": [611, 611],
  "©": [737, 737], "®": [737, 737], "°": [400, 400], "×": [584, 584], "÷": [584, 584], "±": [584, 584],
};

/** Replaces anything WinAnsi cannot show with "?", folds tabs and non-breaking spaces to a space and drops zero-width characters. */
export function sanitize(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) as number;
    if (code === 0x09 || code === 0xA0) out += " ";
    else if (code === 0x200B || code === 0x200C || code === 0x200D || code === 0xFEFF) continue;
    else if ((code >= 0x20 && code <= 0x7E) || (code >= 0xA1 && code <= 0xFF && code !== 0xAD) || ch in WIN_SPECIAL) out += ch;
    else out += "?";
  }
  return out;
}

/** WinAnsi byte for one sanitised character. */
export const winAnsiByte = (ch: string): number => WIN_SPECIAL[ch] ?? (ch.codePointAt(0) as number);

export type FontKey = "regular" | "bold" | "oblique";
const fontTable = (font: FontKey) => (font === "bold" ? WIDTHS.bold : WIDTHS.regular);

function charWidth(ch: string, font: FontKey): number {
  const bold = font === "bold";
  const direct = fontTable(font).get(ch);
  if (direct !== undefined) return direct;
  const special = SPECIAL_WIDTH[ch];
  if (special) return special[bold ? 1 : 0];
  const base = ch.normalize("NFD")[0];
  return (base !== ch ? fontTable(font).get(base) : undefined) ?? 556;
}

/** Width in points of already sanitised text. */
export function textWidth(text: string, font: FontKey, size: number): number {
  let sum = 0;
  for (const ch of text) sum += charWidth(ch, font);
  return (sum * size) / 1000;
}

/** Greedy word wrap on sanitised text; a word wider than the line is split by character. Never returns an empty list. */
export function wrapText(text: string, font: FontKey, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of sanitize(text).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/ +/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, font, size) <= maxWidth) { line = next; continue; }
      if (line) { lines.push(line); line = ""; }
      if (textWidth(word, font, size) <= maxWidth) { line = word; continue; }
      let chunk = "";
      for (const ch of word) {
        if (chunk && textWidth(chunk + ch, font, size) > maxWidth) { lines.push(chunk); chunk = ""; }
        chunk += ch;
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}

/** PDF literal string: ASCII only, with backslash, parentheses and every byte above 126 written as an escape. */
export function pdfString(text: string): string {
  let out = "(";
  for (const ch of sanitize(text)) {
    const byte = winAnsiByte(ch);
    if (ch === "\\" || ch === "(" || ch === ")") out += `\\${ch}`;
    else if (byte < 0x20 || byte > 0x7E) out += `\\${byte.toString(8).padStart(3, "0")}`;
    else out += ch;
  }
  return out + ")";
}

// ---- Layout ---------------------------------------------------------------------------------------------------------

const W = 595;
const H = 842;
const M = 48;
const CW = W - M * 2;
const BOTTOM = H - 64;
const INK = "#1f2430";
const TEAL = "#167a66";
const WATER = "#1b86a8";
const ORANGE = "#e8912d";
const CORAL = "#c93a25";
const SKY = "#d9f0fb";
const PALE = "#f3fafc";
const SOFT = "#3a4955";
const WHITE = "#ffffff";
const FONT_REF: Record<FontKey, string> = { regular: "F1", bold: "F2", oblique: "F3" };

const rgb = (hex: string) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3).replace(/\.?0+$/, "") || "0").join(" ");
const n = (value: number) => value.toFixed(2).replace(/\.?0+$/, "");

class Doc {
  pages: string[][] = [[]];
  y = M;
  private put(op: string) { this.pages[this.pages.length - 1].push(op); }
  newPage() { this.pages.push([]); this.y = M; }
  ensure(height: number) { if (this.y + height > BOTTOM) this.newPage(); }
  fill(x: number, top: number, w: number, h: number, color: string) { this.put(`${rgb(color)} rg ${n(x)} ${n(H - top - h)} ${n(w)} ${n(h)} re f`); }
  stroke(x: number, top: number, w: number, h: number, color: string, width = 1) { this.put(`${rgb(color)} RG ${n(width)} w ${n(x)} ${n(H - top - h)} ${n(w)} ${n(h)} re S`); }
  text(x: number, top: number, str: string, font: FontKey, size: number, color: string) {
    this.put(`BT /${FONT_REF[font]} ${n(size)} Tf ${rgb(color)} rg ${n(x)} ${n(H - top - size * 0.85)} Td ${pdfString(str)} Tj ET`);
  }
  /** Wrapped paragraph at the cursor; each line is kept whole and a new page starts when the next line would not fit. */
  para(str: string, o: { x?: number; width?: number; font?: FontKey; size?: number; color?: string; lead?: number; after?: number } = {}) {
    const { x = M, width = CW, font = "regular", size = 10, color = INK, lead = size + 4, after = 4 } = o;
    for (const line of wrapText(str, font, size, width)) { this.ensure(lead); this.text(x, this.y, line, font, size, color); this.y += lead; }
    this.y += after;
  }
  /** Marker plus wrapped text at an indent, kept together on one page. */
  item(marker: string, str: string, o: { x?: number; size?: number; indent?: number; color?: string } = {}) {
    const { x = M, size = 10, indent = 14, color = INK } = o;
    const lines = wrapText(str, "regular", size, CW - (x - M) - indent);
    const lead = size + 4;
    this.ensure(lead * Math.min(lines.length, 2));
    this.text(x, this.y, marker, "bold", size, color);
    for (const line of lines) { this.ensure(lead); this.text(x + indent, this.y, line, "regular", size, color); this.y += lead; }
    this.y += 2;
  }
  band(title: string, sub: string, color: string, textColor: string) {
    this.ensure(90);
    this.y += 8;
    this.fill(M, this.y, CW, 30, color);
    this.text(M + 12, this.y + 5, title, "bold", 14, textColor);
    const subW = textWidth(sanitize(sub), "regular", 9);
    this.text(M + CW - 12 - subW, this.y + 10, sub, "regular", 9, textColor);
    this.y += 38;
  }
  bar(x: number, top: number, w: number, h: number, fraction: number, color: string) {
    this.fill(x, top, w, h, SKY);
    this.fill(x, top, w * Math.max(0, Math.min(1, fraction)), h, color);
    this.stroke(x, top, w, h, WATER, 0.75);
  }
  segments(x: number, top: number, filled: number, total: number, color: string) {
    for (let i = 0; i < total; i += 1) {
      this.fill(x + i * 22, top, 18, 9, i < filled ? color : SKY);
      this.stroke(x + i * 22, top, 18, 9, WATER, 0.75);
    }
  }
  sub(title: string) { this.ensure(40); this.para(title, { font: "bold", size: 11, color: INK, after: 2 }); }
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dateText = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function modeLine(input: ReportInput): string {
  if (isSample(input)) return "Sample result. The résumé and the role are a made-up sample.";
  if (input.analysis.mode === "live") return `${modeLabel(input)}. AI agents read your résumé and the role.`;
  return "Native scan. Word matching, no AI.";
}

function header(doc: Doc, input: ReportInput, date: Date) {
  const { analysis } = input;
  const inner = CW - 28;
  const roleLines = wrapText(analysis.title, "bold", 13, inner);
  const modeLines = wrapText(modeLine(input), "regular", 10, inner);
  const height = 14 + 30 + roleLines.length * 17 + 4 + 14 + modeLines.length * 14 + 10 + 24 + 16 + 14;
  doc.fill(M, doc.y, CW, height, SKY);
  const x = M + 14;
  let y = doc.y + 14;
  doc.text(x, y, "Résumé report", "bold", 24, INK); y += 30;
  for (const line of roleLines) { doc.text(x, y, line, "bold", 13, TEAL); y += 17; }
  y += 4;
  doc.text(x, y, dateText(date), "regular", 10, SOFT); y += 14;
  for (const line of modeLines) { doc.text(x, y, line, "regular", 10, INK); y += 14; }
  y += 10;
  const overall = overallOf(analysis);
  const label = `${overall} out of 10`;
  doc.text(x, y, label, "bold", 18, INK);
  doc.bar(x + textWidth(label, "bold", 18) + 16, y + 4, 220, 14, overall / 10, TEAL);
  y += 24;
  doc.text(x, y, "Overall figure, from the proof in the text. It is not a hiring chance.", "regular", 9, SOFT);
  doc.y += height + 12;
}

function howToRead(doc: Doc, input: ReportInput) {
  const lines = [
    "Scores describe how much proof your text contains for each skill. They do not say whether anyone will hire you.",
    "Every quote is copied from your résumé. If nothing matched, the skill scores 0.",
    ...(!isSample(input) && input.analysis.mode !== "live" ? ["This was a native scan: it matched words and was not an AI reading."] : []),
    ...(isSample(input) ? ["This is a sample result for a made-up candidate."] : []),
  ];
  const wrapped = lines.map((l) => wrapText(l, "regular", 10, CW - 40));
  const height = 12 + 16 + wrapped.reduce((sum, w) => sum + w.length * 14 + 3, 0) + 6;
  doc.ensure(height);
  doc.fill(M, doc.y, CW, height, PALE);
  doc.stroke(M, doc.y, CW, height, WATER, 1);
  doc.text(M + 12, doc.y + 10, "How to read this", "bold", 11, INK);
  let y = doc.y + 30;
  for (const group of wrapped) { for (const line of group) { doc.text(M + 12, y, line, "regular", 10, INK); y += 14; } y += 3; }
  doc.y += height + 8;
}

const sorted = (analysis: Analysis) => [...analysis.skills].sort((a, b) => b.demand - a.demand);

function roleScout(doc: Doc, analysis: Analysis) {
  doc.band("Role Scout", "What the role asks for", WATER, WHITE);
  if (analysis.skills.length === 0) doc.para("No skills were found in the role text.");
  for (const skill of sorted(analysis)) {
    const want = wantOf(skill.demand);
    const nameLines = wrapText(skill.name, "bold", 10.5, 190);
    const rowH = Math.max(18, nameLines.length * 14 + 4);
    doc.ensure(rowH);
    nameLines.forEach((line, i) => doc.text(M, doc.y + i * 14, line, "bold", 10.5, INK));
    doc.text(M + 205, doc.y, `${want} priority`, "regular", 10, INK);
    doc.segments(M + 300, doc.y + 2, wantDots(want), 3, WATER);
    doc.y += rowH;
  }
  const company = analysis.company;
  if (!company) return;
  doc.y += 6;
  doc.sub(`Employer: ${company.name}`);
  if (company.about) doc.para(company.about);
  if (company.values.length) doc.para(`Values it publishes: ${company.values.map((v) => v.name).join(", ")}.`);
  company.expectations.forEach((e) => doc.item("•", e));
  company.showIt.forEach((e) => doc.item("•", `Show it: ${e}`));
  if (company.note) doc.para(company.note, { size: 9, color: SOFT });
  company.sources.forEach((s) => doc.para(`${s.label}: ${s.url}`, { size: 9, color: SOFT, after: 1 }));
}

function experienceFinder(doc: Doc, analysis: Analysis) {
  doc.band("Experience Finder", "Proof in your résumé", TEAL, WHITE);
  if (analysis.skills.length === 0) doc.para("No skills to check.");
  for (const skill of sorted(analysis)) {
    const proof = proofOf(skill.evidence);
    const quote = skill.resumeQuote?.quote ? clean(skill.resumeQuote.quote) : "";
    const quoteLines = wrapText(quote ? `“${quote}”` : "No matching quote, scores 0", "oblique", 9.5, CW - 14);
    const nameLines = wrapText(skill.name, "bold", 10.5, 190);
    const head = Math.max(18, nameLines.length * 14 + 4);
    doc.ensure(head + quoteLines.length * 13 + 8);
    nameLines.forEach((line, i) => doc.text(M, doc.y + i * 14, line, "bold", 10.5, INK));
    doc.text(M + 205, doc.y, `Proof: ${proof}`, "regular", 10, INK);
    doc.bar(M + 300, doc.y + 1, 150, 10, clamp100(skill.evidence) / 100, TEAL);
    doc.text(M + 458, doc.y, `${Math.round(clamp100(skill.evidence))}/100`, "regular", 9, SOFT);
    doc.y += head;
    for (const line of quoteLines) { doc.text(M + 14, doc.y, line, "oblique", 9.5, quote ? SOFT : CORAL); doc.y += 13; }
    doc.y += 8;
  }
}

function recruiter(doc: Doc, analysis: Analysis) {
  doc.band("Recruiter", "Screening read", ORANGE, INK);
  const { ats, review } = analysis;
  if (ats) {
    const verdict = atsVerdict(ats.score).word;
    doc.ensure(40);
    doc.text(M, doc.y, `${Math.round(ats.score)} out of 100`, "bold", 16, INK);
    doc.bar(M + 120, doc.y + 3, 200, 12, clamp100(ats.score) / 100, ORANGE);
    doc.text(M + 330, doc.y + 1, verdict, "bold", 11, INK);
    doc.y += 24;
    doc.para("An ATS-style check is a rule of thumb for how readable the text is to hiring software. It is not any employer's real system and not a hiring chance.", { size: 9, color: SOFT });
    for (const check of ats.checks) {
      const tipLines = wrapText(check.tip, "regular", 9.5, CW - 74);
      doc.ensure(16 + tipLines.length * 13);
      const color = check.status === "pass" ? TEAL : check.status === "warn" ? ORANGE : CORAL;
      doc.fill(M, doc.y + 1, 9, 9, color);
      doc.text(M + 15, doc.y, ATS_WORD[check.status], "bold", 10, INK);
      wrapText(check.label, "bold", 10, CW - 74).forEach((line, i) => { doc.text(M + 74, doc.y + i * 13, line, "bold", 10, INK); });
      doc.y += wrapText(check.label, "bold", 10, CW - 74).length * 13;
      for (const line of tipLines) { doc.ensure(13); doc.text(M + 74, doc.y, line, "regular", 9.5, SOFT); doc.y += 13; }
      doc.y += 4;
    }
    doc.sub("Keywords from the role found in your résumé");
    doc.para(ats.keywordsFound.join(", ") || "None found.");
    doc.sub("Keywords from the role missing from your résumé");
    doc.para(ats.keywordsMissing.join(", ") || "None missing.");
    if (ats.fixes.length) { doc.sub("Top fixes"); ats.fixes.forEach((f, i) => doc.item(`${i + 1}.`, f)); }
  } else doc.para("No ATS-style check was run for this result.");
  if (!review) return;
  if (review.skim.length) { doc.sub("What a recruiter notices in a quick read"); review.skim.forEach((s) => doc.item("•", s)); }
  if (review.strengths.length) { doc.sub("Strengths"); review.strengths.forEach((s) => doc.item("•", s)); }
  if (review.improvements.length) {
    doc.sub("Things to improve");
    review.improvements.forEach((it, i) => doc.item(`${i + 1}.`, `${it.title}. ${it.why}${it.quote ? ` Line: “${clean(it.quote)}”` : ""}${it.example ? ` Example: ${it.example}` : ""}`));
  }
  if (review.questions.length) { doc.sub("Questions a recruiter might ask"); review.questions.forEach((q) => doc.item("•", q)); }
}

function actionPlanner(doc: Doc, analysis: Analysis) {
  doc.band("Action Planner", "Tips to close the gaps", CORAL, WHITE);
  if (analysis.quests.length === 0) doc.para("No tips were produced.");
  analysis.quests.forEach((quest, i) => {
    doc.ensure(70);
    doc.para(`${i + 1}. ${quest.title}`, { font: "bold", size: 11, after: 1 });
    doc.para(`Skill: ${quest.skill}`, { size: 9, color: SOFT, after: 1 });
    doc.para(quest.task, { x: M + 14, width: CW - 14, after: 2 });
    doc.para(`Proof to show: ${quest.proof}`, { x: M + 14, width: CW - 14, color: SOFT, after: 2 });
    quest.steps?.forEach((step, k) => doc.item(`${k + 1}.`, step, { x: M + 14 }));
    if (quest.bullet) doc.para(`Résumé line to adapt: ${quest.bullet}`, { x: M + 14, width: CW - 14, font: "oblique", size: 9.5, after: 2 });
    quest.links?.forEach((link) => doc.para(`${link.title} (${link.kind}): ${link.url}`, { x: M + 14, width: CW - 14, size: 9, color: WATER, after: 1 }));
    doc.y += 8;
  });
  if (analysis.sources.length) {
    doc.sub("Sources");
    analysis.sources.forEach((s) => doc.para(`${s.title}: ${s.url}`, { size: 9, color: SOFT, after: 1 }));
  }
}

// ---- File assembly --------------------------------------------------------------------------------------------------

export type PdfInput = ReportInput & { date?: Date };

const FOOTER_NOTE = "Made with itsa10but in your browser. Scores show proof in text, not hiring chances.";

export function buildPdf(input: PdfInput): Uint8Array {
  const date = input.date ?? new Date();
  const doc = new Doc();
  header(doc, input, date);
  howToRead(doc, input);
  roleScout(doc, input.analysis);
  experienceFinder(doc, input.analysis);
  recruiter(doc, input.analysis);
  actionPlanner(doc, input.analysis);

  const total = doc.pages.length;
  const streams = doc.pages.map((ops, i) => {
    const foot = [
      `0.5 w ${rgb(WATER)} RG ${M} 62 m ${W - M} 62 l S`,
      `BT /F1 8 Tf ${rgb(SOFT)} rg ${M} 48 Td ${pdfString(FOOTER_NOTE)} Tj ET`,
    ];
    const page = `Page ${i + 1} of ${total}`;
    foot.push(`BT /F2 8 Tf ${rgb(INK)} rg ${n(W - M - textWidth(page, "bold", 8))} 48 Td ${pdfString(page)} Tj ET`);
    return [...ops, ...foot].join("\n");
  });

  const pad = (v: number, len: number) => String(v).padStart(len, "0");
  const stamp = `D:${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}${pad(date.getHours(), 2)}${pad(date.getMinutes(), 2)}${pad(date.getSeconds(), 2)}`;
  const kids = streams.map((_, i) => `${7 + i * 2} 0 R`).join(" ");
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${total} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>",
    `<< /Title ${pdfString("Résumé report")} /Creator ${pdfString("itsa10but")} /Producer ${pdfString("itsa10but")} /CreationDate (${stamp}) >>`,
  ];
  streams.forEach((stream, i) => {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${8 + i * 2} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${pad(offset, 10)} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 0xFF;
  return bytes;
}
