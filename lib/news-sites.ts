/**
 * Sites listed in the "Latest news and sources" popup on the Singapore hiring signals card.
 * Each one was opened or searched on 15 Oct 2026. Logo files are saved once in public/assets/logos (origins in SOURCES.md there).
 * `inRefresh` marks the sites our own feed reader reads when you press Refresh news (see FEEDS in lib/native-scraper.ts).
 * Descriptions say only what the site is. No pricing or results are claimed.
 */
export type NewsSite = { name: string; what: string; href: string; logo: string; inRefresh?: boolean };
export type NewsSiteGroup = { id: string; title: string; icon: "dashboard" | "scroll" | "search" | "ml" | "book"; sites: NewsSite[] };

export const newsSiteGroups: NewsSiteGroup[] = [
  { id: "gov", title: "Singapore government and labour data", icon: "dashboard", sites: [
    { name: "IMDA", what: "Digital economy reports and tech workforce figures", href: "https://www.imda.gov.sg/", logo: "imda" },
    { name: "MOM", what: "Job vacancy and labour market reports", href: "https://www.mom.gov.sg/", logo: "mom", inRefresh: true },
    { name: "SkillsFuture Singapore", what: "Skills frameworks, programmes and funding", href: "https://www.skillsfuture.gov.sg/", logo: "skillsfuture" },
    { name: "Jobs-Skills Portal", what: "Skills insights and in-demand roles", href: "https://jobsandskills.swda.gov.sg/", logo: "jobs-skills-portal" },
    { name: "MyCareersFuture", what: "The government job portal", href: "https://www.mycareersfuture.gov.sg/", logo: "mycareersfuture" },
    { name: "Singapore Department of Statistics", what: "National statistics and data tables", href: "https://www.singstat.gov.sg/", logo: "singstat" },
  ] },
  { id: "news", title: "Singapore news", icon: "scroll", sites: [
    { name: "The Straits Times", what: "Singapore's English daily, with business and tech sections", href: "https://www.straitstimes.com/", logo: "straits-times", inRefresh: true },
    { name: "CNA", what: "Singapore and Asia news, including business", href: "https://www.channelnewsasia.com/", logo: "cna", inRefresh: true },
    { name: "The Business Times", what: "Business and finance news", href: "https://www.businesstimes.com.sg/", logo: "business-times", inRefresh: true },
    { name: "Tech in Asia", what: "Startup and tech news from Southeast Asia", href: "https://www.techinasia.com/", logo: "tech-in-asia" },
    { name: "Vulcan Post", what: "Singapore startup, jobs and workplace stories", href: "https://vulcanpost.com/", logo: "vulcan-post", inRefresh: true },
    { name: "e27", what: "Southeast Asia startup and tech news", href: "https://e27.co/", logo: "e27", inRefresh: true },
  ] },
  { id: "jobs", title: "Job boards and salary data", icon: "search", sites: [
    { name: "Jobstreet", what: "Singapore job board with salary pages", href: "https://sg.jobstreet.com/", logo: "jobstreet" },
    { name: "LinkedIn Jobs", what: "Job postings and company pages", href: "https://www.linkedin.com/jobs/", logo: "linkedin" },
    { name: "Indeed Hiring Lab", what: "Indeed's research on job postings and wages", href: "https://hiringlab.indeed.com/", logo: "indeed-hiring-lab", inRefresh: true },
    { name: "Glassdoor Singapore", what: "Company reviews and pay reports from employees", href: "https://www.glassdoor.sg/", logo: "glassdoor" },
    { name: "Levels.fyi", what: "Pay data for tech roles", href: "https://www.levels.fyi/", logo: "levels-fyi" },
  ] },
  { id: "tech", title: "Tech and AI news feeds", icon: "ml", sites: [
    { name: "TLDR", what: "A short daily newsletter on tech news", href: "https://tldr.tech/", logo: "tldr" },
    { name: "Hacker News", what: "A link board from the tech community", href: "https://news.ycombinator.com/", logo: "hacker-news" },
    { name: "The Pragmatic Engineer", what: "A newsletter on software engineering and tech jobs", href: "https://newsletter.pragmaticengineer.com/", logo: "pragmatic-engineer" },
    { name: "Import AI", what: "A weekly newsletter on AI research", href: "https://importai.substack.com/", logo: "import-ai" },
    { name: "Ben's Bites", what: "An AI news and tools newsletter", href: "https://www.bensbites.com/", logo: "bens-bites" },
    { name: "The Batch", what: "An AI newsletter from DeepLearning.AI", href: "https://www.deeplearning.ai/the-batch/", logo: "the-batch" },
    { name: "Latent Space", what: "A newsletter and podcast on AI engineering", href: "https://www.latent.space/", logo: "latent-space" },
    { name: "Ahead of AI", what: "Sebastian Raschka's newsletter on AI research", href: "https://magazine.sebastianraschka.com/", logo: "ahead-of-ai" },
    { name: "Simon Willison's Weblog", what: "Notes on AI tools and software", href: "https://simonwillison.net/", logo: "simon-willison" },
    { name: "Hugging Face Blog", what: "Posts on open models and machine learning", href: "https://huggingface.co/blog", logo: "hugging-face" },
    { name: "The Verge AI", what: "AI news and reviews from The Verge", href: "https://www.theverge.com/ai-artificial-intelligence", logo: "the-verge" },
    { name: "MIT Technology Review AI", what: "AI coverage from MIT Technology Review", href: "https://www.technologyreview.com/topic/artificial-intelligence/", logo: "mit-technology-review" },
  ] },
  { id: "learn", title: "Learning", icon: "book", sites: [
    { name: "SkillsFuture Credit courses", what: "The MySkillsFuture course directory", href: "https://www.myskillsfuture.gov.sg/", logo: "myskillsfuture" },
    { name: "Coursera", what: "Online courses from universities and companies", href: "https://www.coursera.org/", logo: "coursera" },
    { name: "edX", what: "Online courses from universities", href: "https://www.edx.org/", logo: "edx" },
    { name: "freeCodeCamp", what: "Free coding lessons and projects", href: "https://www.freecodecamp.org/", logo: "freecodecamp" },
  ] },
];
