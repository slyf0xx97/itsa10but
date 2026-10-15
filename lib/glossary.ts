import type { TipTone } from "../components/career/word-tip.tsx";
import type { PixelIconName } from "../components/career/pixel-icons.tsx";

/** Plain-word explanations for the jargon on the page. Shown by <Term> as a tooltip. */
export type TermId = "ats" | "proof" | "gap" | "match" | "weak-proof" | "quest" | "native-scan" | "api-boost" | "expected" | "good" | "extra" | "keyword"
  | "itsa10but" | "how-it-helps" | "rank" | "role-wants" | "you-show" | "covered" | "add-proof" | "missing" | "proof-score" | "best-proof" | "biggest-gap" | "radar";

/** An optional labelled block under the lines: a small icon, a label and a few short points. */
export type TermSection = { label: string; icon?: PixelIconName; items: string[] };
export type TermEntry = { word: string; title: string; lines: string[]; sections?: TermSection[]; icon?: PixelIconName; tone?: TipTone; source?: { label: string; href: string } };

export const GLOSSARY: Record<TermId, TermEntry> = {
  itsa10but: {
    word: "itsa10but",
    title: "Why this name?",
    icon: "book", tone: "teal",
    lines: [
      "“It's a 10, but…” is an internet joke format from 2022. Someone gets a perfect 10, then a flaw follows.",
      "Here your résumé looks like a 10 and the readers show you the “but”.",
    ],
    source: { label: "Know Your Meme", href: "https://knowyourmeme.com/memes/shes-a-10-but-hes-a-10-but" },
  },
  "how-it-helps": {
    word: "show you how to improve it",
    title: "How itsa10but works for you",
    icon: "compass",
    lines: ["itsa10but scans your résumé and builds you a plan. The edits are yours to make."],
    sections: [
      { label: "What it does", icon: "search", items: [
        "Scans your résumé against the role.",
        "Breaks down your skill gaps, with the quote behind each score.",
        "Runs an ATS-style check and gives wording feedback.",
        "Gives you tips, tricks and links to free resources.",
      ] },
      { label: "What it doesn't do", icon: "cross", items: ["It won't rewrite your résumé or fix it for you."] },
      { label: "Your part", icon: "checklist", items: ["You make the changes.", "The action plan has tips and tricks, plus links to free resources to help you do it."] },
    ],
  },
  ats: {
    word: "ATS",
    title: "Hiring software (ATS)",
    icon: "clipboard", tone: "water",
    lines: [
      "ATS stands for applicant tracking system. Many employers use one to collect and filter résumés. It reads your résumé as plain text, so odd layouts, tables and images can scramble it.",
      "Our score is a rough check made with our own rules. It doesn't copy any employer's system and doesn't show your hiring chance.",
    ],
  },
  proof: {
    word: "Proof",
    title: "Proof",
    icon: "docsearch", tone: "leaf",
    lines: ["A line in your résumé that backs a skill with something specific: a tool, a project or a result.", "We check that the line appears word for word in your text."],
  },
  gap: {
    word: "Gap",
    title: "Gap",
    icon: "incident", tone: "coral",
    lines: ["The role asks for this more than your résumé shows it."],
  },
  match: {
    word: "Match",
    title: "Match",
    icon: "dashboard", tone: "teal",
    lines: ["How much of what the role asks for your résumé shows proof of, as a percent.", "Each skill's proof is weighted by how much the role asks for it, then averaged. It doesn't show your hiring chance."],
  },
  "weak-proof": {
    word: "Weak proof",
    title: "Weak proof",
    icon: "docsearch", tone: "orange",
    lines: ["The skill is named or listed, but no project or result backs it up."],
  },
  quest: {
    word: "Tips and tricks",
    title: "Tips and tricks",
    icon: "scroll", tone: "lime",
    lines: ["Short tips that close a gap. Each one ends with something you can show, plus lessons and recent articles on the skill."],
  },
  "native-scan": {
    word: "Native scan",
    title: "Native scan",
    icon: "gear", tone: "teal",
    lines: ["The default. It matches words and checks quotes in your browser. No key needed."],
  },
  "api-boost": {
    word: "API boost",
    title: "API boost",
    icon: "plug", tone: "orange",
    lines: ["Optional. Four agents read your résumé using your own API key."],
  },
  expected: {
    word: "Expected",
    title: "Expected",
    icon: "signals", tone: "coral",
    lines: ["The role asks for it strongly. The posting says it is required or repeats it.", "Show these first."],
  },
  good: {
    word: "Good to have",
    title: "Good to have",
    icon: "signals", tone: "orange",
    lines: ["The role asks for it moderately. The posting names it, without stressing it.", "Add these if you have room."],
  },
  extra: {
    word: "Extra",
    title: "Extra",
    icon: "signals", tone: "water",
    lines: ["The posting mentions it lightly.", "List it only if it's true."],
  },
  rank: {
    word: "Ranked",
    title: "How the skills are ranked",
    icon: "signals", tone: "teal",
    lines: ["Skills the role asks for most come first. Skills with the same ask keep the order they appear in the posting.", "Each row then shows what your résumé proves for that skill."],
  },
  "role-wants": {
    word: "Role wants",
    title: "Role wants",
    icon: "binoculars", tone: "water",
    lines: ["How strongly the posting asks for the skill: High, Medium or Low.", "The native scan reads a skill as High when it is named and stated as a requirement or repeated, and Medium when it is named once. API boost judges from the posting."],
  },
  "you-show": {
    word: "You show",
    title: "You show",
    icon: "docsearch", tone: "leaf",
    lines: ["How much proof your résumé gives for the skill: Strong, Some, Weak or None.", "The native scan adds points for a line that names the skill, shows a project or action, gives a number, states an outcome or adds a second supporting line. A line only counts if it's quoted from your text."],
  },
  covered: {
    word: "Covered",
    title: "Covered",
    icon: "clipboard", tone: "leaf",
    lines: ["Your proof is strong enough for how much the role asks. High needs Strong, Medium needs Some, Low needs Weak."],
  },
  "add-proof": {
    word: "Add proof",
    title: "Add proof",
    icon: "docsearch", tone: "orange",
    lines: ["Your résumé touches the skill, but the proof is lighter than the role asks for. One clearer example would close it."],
  },
  missing: {
    word: "Missing",
    title: "Missing",
    icon: "incident", tone: "coral",
    lines: ["The role asks for it and nothing in your résumé matches. It scores 0 until you add a line that shows it."],
  },
  "proof-score": {
    word: "Proof",
    title: "Proof steps",
    icon: "docsearch", tone: "leaf",
    lines: ["Five checks decide a skill's proof: it is named, used in real work, has a number, shows a result and shows up a second time. The radar says how many you pass, like 3/5.", "A skill with no quote from your résumé passes none. This measures proof in your text and doesn't predict hiring."],
  },
  "best-proof": {
    word: "Best proof",
    title: "Best proof",
    icon: "clipboard", tone: "leaf",
    lines: ["The skills your résumé backs up best, with how many of the 5 proof steps each one passes. Zero means nothing in your text matched."],
  },
  "biggest-gap": {
    word: "Biggest gap",
    title: "Biggest gap",
    icon: "incident", tone: "coral",
    lines: ["The skills where your proof falls furthest short of what the role asks for, and the next step that would close each one."],
  },
  radar: {
    word: "Skills radar",
    title: "How to read the radar",
    icon: "compass", tone: "teal",
    lines: ["Each corner is one skill the role asks for. The further the shaded shape reaches toward a corner, the more proof steps your résumé passes for it, from 0 in the middle to 5 at the edge.", "Green dots have proof (2 or more steps). Coral dots are gaps."],
  },
  keyword: {
    word: "Keywords",
    title: "Keywords",
    icon: "search", tone: "water",
    lines: ["Words or phrases the posting uses that a reader or an ATS may look for in your résumé."],
  },
};
