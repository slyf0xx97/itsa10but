import type { CompanyCulture, CompanyValue } from "./analysis-types.ts";

/**
 * A short, checked list of well-known employers and the values they publish.
 * Every entry was read from the company's own page on `checkedOn`. The value names are the company's own;
 * every meaning and expectation line is our wording, not copied text. Add a company only after reading its official page.
 * Companies without a page that lists values (Apple, Shopee/Sea, Cisco, Salesforce) were not added. UOB was left out because its values page could not be read.
 */
type Entry = {
  id: string;
  name: string;
  /** Matched whole-word, any case. */
  aliases: string[];
  /** Matched whole-word and case-sensitive, for names that are also ordinary words ("Grab", "Meta"). */
  exact?: string[];
  values: CompanyValue[];
  expectations: string[];
  sources: { label: string; url: string }[];
  checkedOn: string;
};

const CHECKED = "2026-10-14";
const v = (name: string, meaning: string): CompanyValue => ({ name, meaning });

export const COMPANIES: Entry[] = [
  {
    id: "amazon",
    name: "Amazon (AWS)",
    aliases: ["amazon web services", "amazon.com", "amazon", "aws"],
    values: [
      v("Customer Obsession", "Start with what the customer needs and work backwards from it."),
      v("Ownership", "Act like an owner of the whole company, beyond your own team."),
      v("Invent and Simplify", "Come up with new ideas and keep finding simpler ways to do things."),
      v("Are Right, A Lot", "Use good judgment and seek other views to test your own beliefs."),
      v("Learn and Be Curious", "Keep learning and explore new possibilities."),
      v("Hire and Develop the Best", "Raise the bar with every hire and coach people to grow."),
      v("Insist on the Highest Standards", "Hold work to very high standards and fix problems for good."),
      v("Think Big", "Set a bold direction and look for new ways to serve customers."),
      v("Bias for Action", "Move quickly, since many decisions can be reversed."),
      v("Frugality", "Get more done with less, because limits push people to invent."),
      v("Earn Trust", "Listen well, speak candidly, treat people respectfully and own your mistakes."),
      v("Dive Deep", "Stay close to the details and check them when numbers and stories differ."),
      v("Have Backbone; Disagree and Commit", "Challenge decisions respectfully, then commit fully once one is made."),
      v("Deliver Results", "Hit the key goals with good quality and on time, despite setbacks."),
      v("Strive to be Earth’s Best Employer", "Build a safer, fairer, more supportive workplace where people can grow."),
      v("Success and Scale Bring Broad Responsibility", "Think about the wider effects of what you build and leave things better."),
    ],
    expectations: ["Take ownership beyond your own team.", "Keep learning and stay curious.", "Raise the bar and fix problems so they stay fixed.", "Disagree openly, then commit once a decision is made."],
    sources: [{ label: "Amazon Leadership Principles", url: "https://www.amazon.jobs/content/en/our-workplace/leadership-principles" }],
    checkedOn: CHECKED,
  },
  {
    id: "google",
    name: "Google",
    aliases: ["google", "alphabet inc"],
    values: [
      v("Focus on the user and all else will follow", "Design for the user before internal goals."),
      v("It’s best to do one thing really, really well", "Pick one thing and keep improving it until it is excellent."),
      v("Fast is better than slow", "Treat speed as part of quality."),
      v("Democracy on the web works", "Good results come from the collective effort of many people."),
      v("You don’t need to be at your desk to need an answer", "Make help available wherever people are, including on their phones."),
      v("You can make money without doing evil", "Earn revenue without breaking the user’s trust."),
      v("There’s always more information out there", "Keep looking for information that nobody has covered yet."),
      v("The need for information crosses all borders", "Build for people everywhere, in many languages and formats."),
      v("You can be serious without a suit", "Take the work seriously while keeping the culture casual and fun."),
      v("Great just isn’t good enough", "Treat being great as a starting point and set stretch goals."),
    ],
    expectations: ["Put the user first in what you build.", "Aim high and keep improving what already works.", "Value speed and simple design.", "Take pride in team results as well as your own."],
    sources: [{ label: "Google: Ten things we know to be true", url: "https://about.google/company-info/philosophy/" }],
    checkedOn: CHECKED,
  },
  {
    id: "microsoft",
    name: "Microsoft",
    aliases: ["microsoft"],
    values: [
      v("Respect", "Treat other people’s thoughts, feelings and backgrounds as important as your own."),
      v("Integrity", "Be honest, ethical and trustworthy."),
      v("Accountability", "Take full responsibility for your decisions, actions and results."),
      v("Growth mindset", "Treat ability as something people can grow."),
      v("Customer obsessed", "Listen to customers with a beginner’s mind and solve their real problems."),
      v("One Microsoft", "Work across teams as one company."),
      v("Diverse and inclusive", "Make room for different people and ideas."),
      v("Making a difference", "Aim for work that has a positive effect beyond the company."),
    ],
    expectations: ["Be honest and own your results.", "Keep learning and treat setbacks as growth.", "Work across team lines.", "Start from the customer’s real problem."],
    sources: [
      { label: "Microsoft: Our mission and values", url: "https://www.microsoft.com/en-us/about/corporate-values" },
      { label: "Microsoft Careers: Culture", url: "https://careers.microsoft.com/v2/global/en/life-at-microsoft/culture.html" },
    ],
    checkedOn: CHECKED,
  },
  {
    id: "meta",
    name: "Meta",
    aliases: ["meta platforms", "meta (facebook)"],
    exact: ["Meta"],
    values: [
      v("Move fast", "Act with urgency and remove barriers to speed up top priorities."),
      v("Build awesome things", "Ship things that inspire people."),
      v("Be direct and respect your colleagues", "Be straightforward in hard talks, and stay respectful when giving feedback."),
      v("Focus on long-term impact", "Take on the hardest problems even if results take years."),
      v("Live in the future", "Build the future of work and be an early user of new products."),
      v("Meta, Metamates, me", "Look after the company, the mission and your teammates."),
    ],
    expectations: ["Work with urgency on the top priorities.", "Give and take direct feedback.", "Think about impact over years.", "Be thoughtful about risk and open to change."],
    sources: [{ label: "Meta Careers: Culture", url: "https://www.metacareers.com/culture/" }],
    checkedOn: CHECKED,
  },
  {
    id: "grab",
    name: "Grab",
    aliases: ["grab holdings"],
    exact: ["Grab"],
    values: [
      v("Heart", "Put users and communities first."),
      v("Hunger", "Build fast, test early and try bold ideas."),
      v("Honour", "Own your words, decisions and actions, and hold each other accountable."),
      v("Humility", "Coach instead of criticise, and aim to improve a little each day."),
    ],
    expectations: ["Put the user first.", "Build, test and learn quickly.", "Follow through on what you commit to.", "Give feedback as a coach."],
    sources: [
      { label: "Grab: Our mission and the 4Hs", url: "https://www.grab.com/sg/about/mission/" },
      { label: "Grab Careers", url: "https://www.grab.com/careers" },
    ],
    checkedOn: CHECKED,
  },
  {
    id: "dbs",
    name: "DBS",
    aliases: ["dbs bank", "dbs group"],
    exact: ["DBS"],
    values: [
      v("Purpose-driven", "Aim for impact beyond banking, for people and businesses."),
      v("Relationship-led", "Build lasting relationships and work as a team."),
      v("Innovative", "Embrace change and challenge the status quo for customers."),
      v("Decisive", "Think, act and own what you decide."),
      v("E!", "Enjoy the work and celebrate together as a team."),
    ],
    expectations: ["Treat colleagues and partners with respect.", "Be ready to do things differently.", "Take the decision and own the result.", "Care about the customer’s experience."],
    sources: [
      { label: "DBS Values (PRIDE!)", url: "https://www.dbs.com/suppliers/dbs-values.page" },
      { label: "DBS Careers: Culture", url: "https://www.dbs.com/careers/life-at-dbs/culture.page" },
    ],
    checkedOn: CHECKED,
  },
  {
    id: "govtech",
    name: "GovTech Singapore",
    aliases: ["govtech singapore", "government technology agency"],
    exact: ["GovTech"],
    values: [
      v("Ownership", "Step forward on problems and take responsibility for solving them."),
      v("Candour & Openness", "Speak honestly, listen openly and challenge ideas constructively."),
      v("Learning & Growth", "Stay curious, learn from success and failure, and help others grow."),
      v("One GovTech", "Work across teams as one organisation with a shared mission."),
    ],
    expectations: ["Act when you see a problem.", "Speak up and share what you know.", "Keep building your skills.", "Work across teams toward one mission."],
    sources: [{ label: "GovTech Singapore: Who we are", url: "https://www.tech.gov.sg/about-us/who-we-are/" }],
    checkedOn: CHECKED,
  },
  {
    id: "stripe",
    name: "Stripe",
    aliases: [],
    exact: ["Stripe"],
    values: [
      v("Users first", "Work backwards from what users need."),
      v("Create with craft and beauty", "Care about the quality and finish of what you make."),
      v("Move with urgency and focus", "Move fast on what matters most and invest in future speed."),
      v("Collaborate egolessly", "Work as one team: share information, share credit, learn from mistakes."),
      v("Stay curious", "Keep learning how businesses and the world work."),
      v("Obsess over talent", "Help hire the best and push for excellent work everywhere."),
    ],
    expectations: ["Think rigorously and question assumptions.", "Be ready to work outside your own domain.", "Adapt quickly as the work changes.", "Work with urgency while keeping standards high."],
    sources: [{ label: "Stripe Careers: Compatibility", url: "https://stripe.com/careers/compatibility" }],
    checkedOn: CHECKED,
  },
  {
    id: "atlassian",
    name: "Atlassian",
    aliases: ["atlassian"],
    values: [
      v("Open company, no bullshit", "Share information openly and speak your mind with care."),
      v("Build with heart and balance", "Think carefully, then act with passion and urgency."),
      v("Don’t #@!% the customer", "Put the customer’s point of view first."),
      v("Play, as a team", "Put the team first, and don’t take yourself too seriously."),
      v("Be the change you seek", "Have the courage to start improvements yourself."),
    ],
    expectations: ["Share information by default.", "Consider the customer’s view first.", "Start improvements yourself.", "Put the team before your own credit."],
    sources: [{ label: "Atlassian: Core values", url: "https://www.atlassian.com/company/values" }],
    checkedOn: CHECKED,
  },
  {
    id: "singtel",
    name: "Singtel",
    aliases: ["singtel", "singapore telecommunications"],
    values: [
      v("Cultivate a growth mindset", "Keep learning and treat setbacks as practice."),
      v("Operate with integrity", "Act honestly and keep to the rules when no one checks."),
      v("Make customers first", "Start from what the customer needs."),
      v("Maximise teamwork", "Work with other teams to get a better result."),
      v("Innovate with a challenger spirit", "Try new ways to do things instead of following habit."),
      v("Take ownership", "Own your work and its results."),
    ],
    expectations: ["Show what you learnt from a project.", "Put the customer's need first.", "Work across teams.", "Own the result of your work."],
    sources: [{ label: "Singtel Sustainability Report 2024: Sustainability approach", url: "https://cdn.aws.singtel.com/sustainabilityreport/SR2024/download/downloads/Singtel-Group-SR2024-Sustainability-Approach.pdf" }],
    checkedOn: CHECKED,
  },
  {
    id: "ncs",
    name: "NCS",
    aliases: ["ncs group"],
    exact: ["NCS"],
    values: [
      v("We are curious", "Aspire to build the future together with clients."),
      v("We pursue and celebrate", "Make extraordinary results happen and mark them."),
      v("Respect and trust", "Build outcomes that work for both sides."),
      v("We deliver on our commitments", "Keep promises to clients and to colleagues."),
      v("We build team NCS", "Bring different strengths together into one team."),
    ],
    expectations: ["Show curiosity with a project you built.", "Keep your commitments to a team or client.", "Work with people who have different strengths."],
    sources: [{ label: "NCS: About us", url: "https://www.ncs.co/en-sg/about-us/" }],
    checkedOn: CHECKED,
  },
  {
    id: "ocbc",
    name: "OCBC",
    aliases: ["ocbc", "oversea-chinese banking"],
    values: [
      v("Lasting value", "Build long-term value, balancing careful risk with bold moves."),
      v("Integrity", "Do the right thing even when no one is watching."),
      v("Forward-looking", "Stay curious and ahead of changing needs."),
      v("Respect", "Treat everyone with empathy and humility."),
      v("Responsibility", "Own your decisions and what follows from them."),
    ],
    expectations: ["Show you finish what you start.", "Explain a decision you owned.", "Show curiosity about new tools."],
    sources: [{ label: "OCBC: Purpose, Values & Ambition", url: "https://www.ocbc.com/group/about-us/purpose-values-and-ambition.page" }],
    checkedOn: CHECKED,
  },
  {
    id: "stengg",
    name: "ST Engineering",
    aliases: ["st engineering", "singapore technologies engineering"],
    values: [
      v("Integrity", "Be honest, trustworthy and responsible."),
      v("Value Creation", "Add value in everything you do."),
      v("Courage", "Take small and large steps to improve things."),
      v("Commitment", "Stay driven to reach shared goals."),
      v("Compassion", "Care for people while you work toward success."),
    ],
    expectations: ["Show a project where you added value.", "Show you stuck to a goal.", "Show you spoke up to improve something."],
    sources: [{ label: "ST Engineering: Corporate Purpose, Aspiration and Values", url: "https://www.stengg.com/en/about-us/corporate-purpose-aspiration-and-values/" }],
    checkedOn: CHECKED,
  },
  {
    id: "netflix",
    name: "Netflix",
    aliases: ["netflix"],
    values: [
      v("Selflessness", "Stay humble when searching for the best idea."),
      v("Judgment", "Pick long-term fixes over short-term ones."),
      v("Candor", "Give and take feedback willingly."),
      v("Creativity", "Welcome new ideas."),
      v("Courage", "Be open about what you don't know to find the truth."),
      v("Inclusion", "Notice your own biases and work against them."),
      v("Curiosity", "Learn fast and with enthusiasm."),
      v("Resilience", "Adapt quickly when things change."),
    ],
    expectations: ["Show you took feedback and changed your work.", "Explain a long-term choice you made.", "Show how you adapted when plans changed."],
    sources: [{ label: "Netflix Jobs: Culture", url: "https://jobs.netflix.com/culture" }],
    checkedOn: CHECKED,
  },
];

/* ---- Detection ---- */

// A word after the name that shows a tool or an ordinary phrase, not the employer.
const TOOL_WORD = /^\s+(?:tags?|descriptions?|data|analysis|keywords?|titles?|learning|programming|models?|information|api|apis|integrations?|payments?|checkout|webhooks?|billing|sdk|analytics|ads|sheets|docs|excel|office|word|powerpoint|outlook|windows|ec2|s3|lambda|console|check|checks|jira|confluence|bitbucket|trello|tools?|admin)\b/i;
const BEFORE = /\b(?:about|join|joining|at|work for|working for|welcome to|here at)\s+(?:the\s+)?$/i;
const AFTER = /^(?:\s*,?\s+(?:inc|llc|ltd|pte|corp)\b|[’']s\b|\s+(?:is|are|was|has|offers|careers|team|teams|culture|values|leadership)\b)/i;
const HEADER = 120;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Positions where the entry is named as an employer: in the first line of the posting, or after "at/about/join", or before "is/team/values". */
function employerHits(text: string, entry: Entry): number[] {
  const found: number[] = [];
  const scan = (names: string[], flags: string) => {
    for (const name of names) {
      const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, flags);
      for (const match of text.matchAll(pattern)) {
        const index = match.index ?? 0;
        const after = text.slice(index + name.length, index + name.length + 40);
        if (TOOL_WORD.test(after)) continue;
        const inHeader = index < HEADER && (flags.includes("i") || !/^\s+[a-z]/.test(after));
        if (inHeader || BEFORE.test(text.slice(Math.max(0, index - 24), index)) || AFTER.test(after)) found.push(index);
      }
    }
  };
  scan(entry.aliases, "giu");
  scan(entry.exact ?? [], "gu");
  return found;
}

/**
 * Conservative: a name counts only when the posting uses it as the employer, so "experience with AWS", "meta description"
 * or "Stripe API" match nothing. When two companies score the same, or none stands out, there is no answer: a wrong
 * company is worse than none.
 */
export function detectCompany(jobText: string): CompanyCulture | undefined {
  const scored = COMPANIES.map((entry) => {
    const hits = employerHits(jobText, entry);
    return { entry, score: hits.length + (hits.some((index) => index < HEADER) ? 2 : 0) };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length || (scored[1] && scored[1].score === scored[0].score)) return undefined;
  const { entry } = scored[0];
  return {
    name: entry.name,
    values: entry.values.map((value) => ({ ...value })),
    expectations: [...entry.expectations],
    showIt: showItTips(entry.values),
    sources: entry.sources.map((source) => ({ ...source })),
    origin: "built-in",
    note: `From the company's own page, checked ${entry.checkedOn}.`,
  };
}

/* ---- Tips for showing the values ---- */

// Themes matched against a value's name and our gloss, so web-found values get tips too. First match per value wins.
const THEMES: { test: RegExp; tip: string }[] = [
  { test: /\bown(?:s|ed|er|ers|ership)?\b|accountab|responsib|decisive|backbone/, tip: "Show a time you owned a problem end to end." },
  { test: /customer|\busers?\b|heart|client/, tip: "Describe a choice you made by starting from what the user needed." },
  { test: /learn|curious|growth mindset|insatiable/, tip: "Share something you taught yourself and what you built with it." },
  { test: /\bfast\b|speed|urgen|\baction\b|quick|hunger|move/, tip: "Show how you shipped something quickly and what you left out." },
  { test: /standard|quality|craft|great\b|excellen|rigor|deliver|result|awesome|\bbest\b/, tip: "Give a number or result that shows the quality of your work." },
  { test: /simpl|invent|innovat|new ideas|creat/, tip: "Pick a project where you built something new or made it simpler." },
  { test: /candid|candour|candor|direct|\bopen|honest|integrity|trust|humil|honou?r|respect/, tip: "Tell a story where you spoke up honestly or admitted a mistake." },
  { test: /\bteam|collaborat|one microsoft|one govtech|egoless|play|relationship|together/, tip: "Describe how you worked with others and what you did for the team." },
  { test: /long[- ]term|think big|bold|future|vision|impact/, tip: "Explain a project where you chose long-term payoff over a quick win." },
  { test: /\bdetails?\b|\bdata\b|judgment|rigorous|check/, tip: "Show how you checked the details or the data before you decided." },
  { test: /diverse|inclusi|belong|backgrounds/, tip: "Mention working with people from different backgrounds or views." },
  { test: /\bchange\b|improve|challenge/, tip: "Show a change you started without being asked." },
];

/** Up to three short tips on showing these values in a résumé or interview. Rules only: no model, no free text. */
export function showItTips(values: CompanyValue[]): string[] {
  const tips: string[] = [];
  for (const value of values) {
    const text = `${value.name} ${value.meaning}`.toLowerCase();
    const theme = THEMES.find((item) => item.test.test(text) && !tips.includes(item.tip));
    if (theme) tips.push(theme.tip);
    if (tips.length === 3) break;
  }
  return tips;
}
