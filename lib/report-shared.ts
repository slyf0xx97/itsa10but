/** Small helpers shared by the Markdown prompt and the PDF report. Pure; nothing here leaves the browser. */
import type { Analysis, AtsStatus, Resume } from "./analysis-types.ts";

export type ReportInput = { analysis: Analysis; resumes: Resume[]; job: string; sample?: boolean };

/** The overall figure out of 10. Same calculation as the dashboard: match percent divided by 10, rounded, kept from 0 to 10. */
export const overallOf = (analysis: Analysis): number => {
  const match = Number.isFinite(analysis.matchPercent) ? analysis.matchPercent : 0;
  return Math.max(0, Math.min(10, Math.round(Math.max(0, Math.min(100, Math.round(match))) / 10)));
};

export const isSample = (input: ReportInput): boolean => Boolean(input.sample) || input.analysis.mode === "sample";

/** "Sample result", "Native scan" or "API boost, model". Never calls a live run a native scan. */
export function modeLabel(input: ReportInput): string {
  if (isSample(input)) return "Sample result";
  if (input.analysis.mode === "live") return input.analysis.run?.model ? `API boost, ${input.analysis.run.model}` : "API boost";
  return "Native scan";
}

export const ATS_WORD: Record<AtsStatus, string> = { pass: "Pass", warn: "To check", fail: "To fix" };

export const resumeTextOf = (resumes: Resume[]): string => resumes.map((r) => r.text.trim()).filter(Boolean).join("\n\n");

export const clamp100 = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0);
