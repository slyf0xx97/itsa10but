import { PixelIcon, type PixelIconName } from "@/components/career/pixel-icons";

export type ElevateResource = { id: string; name: string; tag: string; detail: string; url: string };
export type ElevateGroup = { title: string; icon: PixelIconName; description: string; resources: ElevateResource[] };

/** Data source for LevelUpChecklist. `id` matches the cover file in /assets/covers/. */
export const elevateGroups: ElevateGroup[] = [
  {
    title: "Know yourself", icon: "compass",
    description: "Name your strengths and interests. The results give you things to talk about in interviews. They don't decide your potential.",
    resources: [
      { id: "cliftonstrengths", name: "Gallup CliftonStrengths 34", tag: "Strengths", detail: "See your top themes and get guidance on your top 10. This report is paid.", url: "https://www.gallup.com/cliftonstrengths/en/403127/cliftonstrengths-34-report.aspx" },
      { id: "myskillsfuture-assessments", name: "MySkillsFuture assessments", tag: "Interests", detail: "Check your career interests, skills confidence and work values.", url: "https://www.myskillsfuture.gov.sg/content/portal/en/assessment/landing.html" },
      { id: "careers-skills-passport", name: "Careers & Skills Passport", tag: "Verified record", detail: "Review verified skills and qualifications in one place.", url: "https://www.myskillsfuture.gov.sg/csp" },
      { id: "onet-interest-profiler", name: "O*NET Interest Profiler", tag: "Career ideas", detail: "Find activities you enjoy and roles that fit them.", url: "https://www.mynextmove.org/explore/ip" },
    ],
  },
  {
    title: "Build useful skills", icon: "book",
    description: "Choose one skill you can practise and show through a small project. Your tips and tricks name the skills to start with.",
    resources: [
      { id: "critical-core-skills", name: "SkillsFuture Critical Core Skills", tag: "Transferable skills", detail: "A Singapore framework for thinking and working with others.", url: "https://www.skillsfuture.gov.sg/skills-framework/criticalcoreskills" },
      { id: "aws-cloud-practitioner", name: "AWS Cloud Practitioner", tag: "Cloud", detail: "Learn the basics of cloud services, security and pricing.", url: "https://aws.amazon.com/training/learn-about/cloud-practitioner/" },
      { id: "microsoft-learn", name: "Microsoft Learn", tag: "Tech learning", detail: "Short paths for cloud, data, security and development.", url: "https://learn.microsoft.com/en-us/training/" },
      { id: "github-skills", name: "GitHub Skills", tag: "Project proof", detail: "Practise workflows, then publish work others can see.", url: "https://skills.github.com/" },
      { id: "cs50", name: "Harvard CS50x", tag: "Free course", detail: "A free online introduction to computer science, taught in lectures with weekly problem sets.", url: "https://cs50.harvard.edu/x/" },
      { id: "kaggle-learn", name: "Kaggle Learn", tag: "Data skills", detail: "Short hands-on lessons in Python, SQL and machine learning.", url: "https://www.kaggle.com/learn" },
    ],
  },
  {
    title: "Present your work", icon: "scroll",
    description: "Make it easy to see what you built and where the proof is.",
    resources: [
      { id: "resume-builder", name: "Resume.io", tag: "Résumé builder", detail: "Draft a readable résumé. Check export terms before paying.", url: "https://resume.io/resume-builder" },
      { id: "technical-writing", name: "Google Technical Writing", tag: "Clear writing", detail: "Explain technical work so a new reader can follow it.", url: "https://developers.google.com/tech-writing" },
      { id: "github-profile", name: "GitHub profile", tag: "Portfolio", detail: "Pin your best projects with setup notes and results.", url: "https://docs.github.com/en/account-and-profile/how-tos/profile-customization/customizing-your-profile" },
      { id: "github-pages", name: "GitHub Pages", tag: "Portfolio site", detail: "Publish a simple site for your projects straight from a GitHub repository.", url: "https://pages.github.com/" },
      { id: "canva-resumes", name: "Canva résumé templates", tag: "Résumé design", detail: "Start from a layout and edit it. Check export and plan terms before relying on it.", url: "https://www.canva.com/resumes/templates/" },
      { id: "devto", name: "DEV Community", tag: "Write it up", detail: "Publish short posts about what you built and what you learned.", url: "https://dev.to/" },
    ],
  },
  {
    title: "Find a real role", icon: "search",
    description: "Use current postings to decide which proof to build next. Check every original listing.",
    resources: [
      { id: "linkedin-jobs", name: "LinkedIn Jobs", tag: "Broader search", detail: "Search local and remote roles, then bring a posting back here.", url: "https://www.linkedin.com/jobs/" },
      { id: "himalayas", name: "Himalayas", tag: "Remote jobs", detail: "Browse remote roles with location and timezone rules.", url: "https://himalayas.app/jobs" },
      { id: "jobicy", name: "Jobicy", tag: "Remote jobs", detail: "Browse remote postings and open the original listing.", url: "https://jobicy.com/" },
      { id: "mycareersfuture", name: "MyCareersFuture", tag: "Singapore jobs", detail: "The Singapore government job portal. Search current openings by role and skill.", url: "https://www.mycareersfuture.gov.sg/" },
      { id: "jobstreet", name: "JobStreet Singapore", tag: "Singapore jobs", detail: "Browse Singapore job listings and compare what employers ask for.", url: "https://sg.jobstreet.com/" },
      { id: "wsg", name: "Workforce Singapore", tag: "Career support", detail: "Read about the career support and job-matching programmes from this Singapore government agency.", url: "https://www.wsg.gov.sg/" },
    ],
  },
  {
    title: "Ask people", icon: "plug",
    description: "Read what others in the field ask and answer. These are public forums, so opinions vary: check anything important elsewhere.",
    resources: [
      { id: "reddit-cscareerquestions", name: "r/cscareerquestions", tag: "Reddit, tech careers", detail: "Questions and stories about tech jobs, interviews and offers.", url: "https://www.reddit.com/r/cscareerquestions/" },
      { id: "reddit-resumes", name: "r/resumes", tag: "Reddit, résumé feedback", detail: "People post résumés and get critiques. Read a few before posting yours.", url: "https://www.reddit.com/r/resumes/" },
      { id: "reddit-learnprogramming", name: "r/learnprogramming", tag: "Reddit, learning", detail: "Beginner questions, study plans and project ideas for new programmers.", url: "https://www.reddit.com/r/learnprogramming/" },
      { id: "reddit-cybersecurity", name: "r/cybersecurity", tag: "Reddit, security", detail: "News and career questions from people who work in security.", url: "https://www.reddit.com/r/cybersecurity/" },
      { id: "reddit-asksingapore", name: "r/askSingapore", tag: "Reddit, Singapore", detail: "Local questions about work, study and daily life in Singapore.", url: "https://www.reddit.com/r/askSingapore/" },
      { id: "hacker-news", name: "Hacker News", tag: "Tech news and talk", detail: "Links and discussion on software, startups and technology.", url: "https://news.ycombinator.com/" },
    ],
  },
  {
    title: "Prepare and read", icon: "book",
    description: "Practise interviews, check pay ranges and read guides before you apply.",
    resources: [
      { id: "roadmap-sh", name: "roadmap.sh", tag: "Learning paths", detail: "Step-by-step roadmaps for developer roles and skills.", url: "https://roadmap.sh/" },
      { id: "levels-fyi", name: "Levels.fyi", tag: "Pay and levels", detail: "See reported pay and job levels at tech companies.", url: "https://www.levels.fyi/" },
      { id: "interviewing-io", name: "interviewing.io", tag: "Practice interviews", detail: "Practise technical interviews and read interview guides.", url: "https://interviewing.io/" },
      { id: "interview-warmup", name: "Google Interview Warmup", tag: "Practice interviews", detail: "Answer common interview questions out loud and see your answer transcribed.", url: "https://grow.google/certificates/interview-warmup/" },
      { id: "indeed-career-guide", name: "Indeed Career Guide", tag: "Articles", detail: "Articles on résumés, cover letters, interviews and job searching.", url: "https://www.indeed.com/career-advice" },
      { id: "skillsfuture-credit", name: "SkillsFuture Credit", tag: "Funding", detail: "Government credit towards approved courses in Singapore. Check who qualifies.", url: "https://www.skillsfuture.gov.sg/credit" },
    ],
  },
];

export function ElevateSection() {
  return <div id="elevate">
    {elevateGroups.map((group) => <div className="elevate-group" key={group.title}>
      <h4><span className="tool-badge" aria-hidden="true"><PixelIcon name={group.icon} size={18} /></span>{group.title}</h4><p>{group.description}</p>
      <div className="elevate-grid">{group.resources.map((resource) => <a className="elevate-card" key={resource.name} href={resource.url} target="_blank" rel="noreferrer"><small>{resource.tag}</small><strong>{resource.name}</strong><p>{resource.detail}</p></a>)}</div>
    </div>)}
  </div>;
}
