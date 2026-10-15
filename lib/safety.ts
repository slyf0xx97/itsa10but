import type { Resume } from "./analysis-types";

export type PiiCategory = "email" | "phone" | "address" | "nric";

export type PiiFinding = { category: PiiCategory; count: number; label: string };

export type InjectionMatch = { pattern: string; label: string; snippet: string };

export type SafetyReport = {
  maskedResumes: Resume[];
  maskedJob: string;
  piiFound: PiiFinding[];
  injectionFlags: InjectionMatch[];
  stored: false;
};

type PiiRule = { category: PiiCategory; label: string; pattern: RegExp; placeholder: string };

// Singapore-leaning patterns: NRIC/FIN format and local address shapes, plus
// generic email/phone matches that also catch international variants.
const PII_RULES: PiiRule[] = [
  { category: "email", label: "Email address", pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, placeholder: "[masked-email]" },
  { category: "nric", label: "NRIC or FIN-style ID", pattern: /\b[STFGM]\d{7}[A-Z]\b/gi, placeholder: "[masked-id]" },
  { category: "address", label: "Street or unit address", pattern: /\b\d+[A-Za-z]?\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s(?:Street|Road|Avenue|Lane|Drive|Close|Walk|Way|Place|Crescent|Boulevard)\b|#\d{1,3}-\d{1,4}[A-Za-z]?|\bSingapore\s\d{6}\b/g, placeholder: "[masked-address]" },
  { category: "phone", label: "Phone number", pattern: /(?:\+\d{1,3}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?\d{3,4}[\s-]?\d{3,4}\b/g, placeholder: "[masked-phone]" },
];

function maskText(text: string): { masked: string; findings: PiiFinding[] } {
  let masked = text;
  const findings: PiiFinding[] = [];
  for (const rule of PII_RULES) {
    const matches = masked.match(rule.pattern);
    if (!matches || matches.length === 0) continue;
    masked = masked.replace(rule.pattern, rule.placeholder);
    findings.push({ category: rule.category, count: matches.length, label: rule.label });
  }
  return { masked, findings };
}

type InjectionRule = { id: string; label: string; pattern: RegExp };

const INJECTION_RULES: InjectionRule[] = [
  { id: "ignore-instructions", label: "Tells the reader to ignore prior instructions", pattern: /\b(?:ignore|disregard)\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions|rules|prompts|context)\b/i },
  { id: "role-override", label: "Tries to assign the reader a new role or mode", pattern: /\b(?:you are now|act as (?:an?|the)|new instructions?:|developer mode|system prompt)\b/i },
  { id: "reveal-prompt", label: "Asks the reader to reveal hidden instructions", pattern: /\b(?:reveal|print|show)\s+(?:your|the)\s+(?:system prompt|instructions|prompt)\b/i },
  { id: "hidden-characters", label: "Contains invisible formatting characters often used to hide text", pattern: /[​-‏‪-‮]/ },
  { id: "encoded-payload", label: "Contains a long encoded block that could carry hidden text", pattern: /[A-Za-z0-9+/]{80,}={0,2}/ },
];

function scanInjection(text: string): InjectionMatch[] {
  const flags: InjectionMatch[] = [];
  for (const rule of INJECTION_RULES) {
    const match = rule.pattern.exec(text);
    if (!match) continue;
    const start = Math.max(0, match.index - 30);
    const end = Math.min(text.length, match.index + match[0].length + 30);
    flags.push({ pattern: rule.id, label: rule.label, snippet: `…${text.slice(start, end).trim()}…` });
  }
  return flags;
}

/**
 * Masks personal data out of every résumé and the job text before any
 * analysis runs, and flags job text that looks like a prompt-injection
 * attempt. Nothing from this call is persisted; the report is returned to
 * the caller for display and otherwise discarded.
 */
export function runSafetyCheck(resumes: Resume[], job: string): SafetyReport {
  const piiFound: PiiFinding[] = [];
  const maskedResumes = resumes.map((resume) => {
    const { masked, findings } = maskText(resume.text);
    for (const finding of findings) piiFound.push(finding);
    return { ...resume, text: masked };
  });
  const { masked: maskedJob, findings: jobFindings } = maskText(job);
  for (const finding of jobFindings) piiFound.push(finding);

  const mergedPii = Object.values(
    piiFound.reduce<Record<PiiCategory, PiiFinding>>((acc, finding) => {
      const existing = acc[finding.category];
      acc[finding.category] = existing ? { ...existing, count: existing.count + finding.count } : finding;
      return acc;
    }, {} as Record<PiiCategory, PiiFinding>),
  );

  const injectionFlags = [...scanInjection(job), ...resumes.flatMap((resume) => scanInjection(resume.text))];

  return { maskedResumes, maskedJob, piiFound: mergedPii, injectionFlags, stored: false };
}
