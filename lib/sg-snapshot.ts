/**
 * Verified static snapshot behind the Singapore hiring signals card and the MCP tool
 * get_itsa10but_sg_signals. Every figure names its source, the year it describes and a link.
 * Nothing here is estimated: a figure that could not be tied to a named page is left out.
 * Checked on 15 Oct 2026. To update, replace figures and sources together.
 */
export const SNAPSHOT_CHECKED = "15 Oct 2026";

export type SnapshotSourceId = "imda26" | "imda26pdf" | "imda25" | "indeed" | "pwc" | "mom" | "jobsskills" | "st";
export type SnapshotSource = { id: SnapshotSourceId; publisher: string; title: string; published: string; url: string };

export const snapshotSources: Record<SnapshotSourceId, SnapshotSource> = {
  imda26: { id: "imda26", publisher: "IMDA", title: "Singapore Digital Economy Report 2026", published: "5 Oct 2026", url: "https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/sgde-ar-2026" },
  imda26pdf: { id: "imda26pdf", publisher: "IMDA", title: "Singapore Digital Economy Report 2026 (PDF), page 24, note 13", published: "5 Oct 2026", url: "https://www.imda.gov.sg/assets/8e4d9951-bc53-4612-80ba-77ee4feaa6da.pdf" },
  imda25: { id: "imda25", publisher: "IMDA", title: "Singapore Digital Economy Report 2025", published: "6 Oct 2025", url: "https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/factsheets/2025/ar-sgde-2025" },
  indeed: { id: "indeed", publisher: "Indeed, via The Business Times", title: "Singapore job postings hit 7-month high as AI demand surges: jobs site Indeed", published: "11 Mar 2026", url: "https://www.businesstimes.com.sg/singapore/singapore-job-postings-hit-7-month-high-ai-demand-surges-jobs-site-indeed" },
  pwc: { id: "pwc", publisher: "PwC Singapore", title: "AI roles command wage premiums across sectors in Singapore (AI Jobs Barometer)", published: "15 Jun 2026", url: "https://www.mynewsdesk.com/sg/pwc-singapore/pressreleases/ai-roles-command-wage-premiums-across-sectors-in-singapore-starting-at-32-percent-underscoring-ai-as-a-key-driver-of-talent-value-pwcs-ai-job-barometer-3454090" },
  mom: { id: "mom", publisher: "MOM", title: "Job Vacancies 2025", published: "20 Mar 2026", url: "https://www.mom.gov.sg/newsroom/press-releases/2026/0320-job-vacancies-report-2025" },
  jobsskills: { id: "jobsskills", publisher: "Jobs-Skills Portal (SWDA)", title: "Skills Insights 2026", published: "2026 edition", url: "https://jobsandskills.swda.gov.sg/insights/tae-conference" },
  st: { id: "st", publisher: "The Straits Times", title: "AI salaries in Singapore rise as demand for talent grows", published: "10 Jun 2026", url: "https://www.straitstimes.com/singapore/ai-salaries-in-singapore-rise-as-demand-for-talent-grows-phd-not-always-required" },
};

/** Share of Singapore tech job postings that name the skill (IMDA's analysis of Lightcast data). */
export type SkillShare = {
  name: string;
  /** Percent of tech postings in `year`. */
  share: number;
  year: number;
  /** Percentage points gained since `since`, from the same IMDA series. */
  gain: number;
  since: number;
  source: SnapshotSourceId;
  /** A newer figure for the same skill from a later report. */
  newer?: { share: number; year: number; source: SnapshotSourceId };
};

export const skillShares: SkillShare[] = [
  { name: "Python", share: 24, year: 2024, gain: 9, since: 2019, source: "imda25" },
  { name: "SQL", share: 20, year: 2024, gain: 5, since: 2019, source: "imda25" },
  { name: "AWS", share: 16.6, year: 2024, gain: 6.7, since: 2019, source: "imda25" },
  { name: "AI skills", share: 14, year: 2024, gain: 3, since: 2019, source: "imda25", newer: { share: 16.7, year: 2025, source: "imda26" } },
  { name: "Azure", share: 13.4, year: 2024, gain: 8.6, since: 2019, source: "imda25" },
];

/** What IMDA counts as "AI skills". Quoted from note 13 on page 24 of the 2026 report (the 2025 report has a close match in note 20 on page 26). */
export const aiSkillsDefinition = {
  /** Plain-words version of IMDA's note. The examples are IMDA's own list. */
  text: "IMDA counts specialised skills for building, deploying and managing AI systems, such as machine learning, natural language processing, neural networks, computer vision and robotics.",
  examples: ["machine learning", "natural language processing", "neural networks", "computer vision", "robotics"],
  source: "imda26pdf" as SnapshotSourceId,
};

export type Signal = { figure: string; text: string; source: SnapshotSourceId; period: string };

export const signals: Signal[] = [
  { figure: "23%", text: "of all Singapore job postings on Indeed mentioned AI, up from 12% a year earlier. About two in three data and analytics postings did.", source: "indeed", period: "Jan 2026" },
  { figure: "23.5%", text: "of Singapore firms used AI, up from 14.7%. Of surveyed workers, 85.7% said they used AI tools at work.", source: "imda26", period: "Firms 2025, workers 2026" },
  { figure: "222,200", text: "tech workers, up 3.8%. The median resident tech wage was S$8,000 a month, against S$5,000 for all jobs.", source: "imda26", period: "2025" },
  { figure: "82%", text: "of AI-related Singapore postings were for AI user roles, and the rest for AI developer roles. PwC read about 1.6 million postings. It found a wage premium for AI skills of 32% or more.", source: "pwc", period: "2025 postings" },
  { figure: "15 to 25%", text: "pay rise for AI roles over the past year, says recruiter Robert Walters. All full-time wages rose 4.9% in 2025.", source: "st", period: "Jun 2026" },
  { figure: "5 of 5", text: "of the fastest-growing IT and data skills in 2025 were generative AI skills, such as model evaluation and responsible AI.", source: "jobsskills", period: "2025 postings" },
];

/** Roles the MOM source names as among the most sought after. */
export const roleSource: SnapshotSourceId = "mom";
export const roleSourceNote = "MOM names these among the roles with strong hiring demand. There were 1.58 vacancies for every job seeker in December 2025.";
export const roleNames = ["Software developers", "Systems analysts", "Data scientists", "AI/ML engineers"];

/** Plain-text export used by the MCP tool. */
export function snapshotForMcp() {
  const src = (id: SnapshotSourceId) => snapshotSources[id];
  return {
    checked: SNAPSHOT_CHECKED,
    skills: skillShares.map((s) => ({
      skill: s.name, sharePercent: s.share, year: s.year, gainPercentagePoints: s.gain, since: s.since,
      ...(s.newer ? { newer: { sharePercent: s.newer.share, year: s.newer.year, source: src(s.newer.source) } } : {}),
      source: src(s.source),
    })),
    aiSkillsDefinition: { text: aiSkillsDefinition.text, examples: aiSkillsDefinition.examples, source: src(aiSkillsDefinition.source) },
    signals: signals.map((s) => ({ figure: s.figure, meaning: s.text, period: s.period, source: src(s.source) })),
    inDemandRoles: { roles: roleNames, source: src(roleSource), note: roleSourceNote },
  };
}
