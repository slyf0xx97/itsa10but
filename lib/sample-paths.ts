import { sampleJob, sampleResume } from "./analysis-types.ts";

// Every candidate below is fictional. The UI labels these as samples.
export const samplePaths = [
  {
    id: "ml",
    icon: "ml",
    interest: "Working with data",
    label: "AI / ML Engineer",
    searchTerm: "machine learning engineer",
    summary: "Train and check models, then explain what they can and cannot do.",
    job: sampleJob,
    resume: sampleResume,
  },
  {
    id: "frontend",
    icon: "frontend",
    interest: "Building products",
    label: "Frontend Developer",
    searchTerm: "frontend developer",
    summary: "Build usable interfaces, connect APIs, and test the experience.",
    job: "Frontend Developer: Build accessible React and TypeScript interfaces, integrate REST APIs, add automated testing, and work with designers to improve the user experience. You will ship small features each sprint, review code with teammates, and explain trade-offs to product owners. Experience with a component library and keyboard accessibility is a plus.",
    resume: "Sam Lee | Computer science student\nProjects: Built a React campus events app with TypeScript and a REST API. Improved keyboard navigation and wrote setup notes in GitHub.\nProjects: Made a JavaScript quiz game for a hackathon and presented the demo to a panel of judges.\nSkills: JavaScript, React, Git, UI design.",
  },
  {
    id: "data",
    icon: "data",
    interest: "Working with data",
    label: "Junior Data Analyst",
    searchTerm: "data analyst",
    summary: "Turn messy data into clear answers and useful dashboards.",
    job: "Junior Data Analyst: Use SQL and Python to clean datasets, build dashboards in Power BI, explain patterns, and present findings to stakeholders. You will answer questions from the operations team, keep a short weekly report, and check data quality before anything is published.",
    resume: "Mira Lim | Information systems student\nProjects: Used Python and pandas to clean transport data and built a dashboard for a course project.\nProjects: Presented three findings to classmates and wrote a one-page report on bus waiting times.\nSkills: Python, Excel, data visualization, communication.",
  },
  {
    id: "cloud",
    icon: "cloud",
    interest: "Cloud & infrastructure",
    label: "Cloud Support Associate",
    searchTerm: "cloud support",
    summary: "Keep services running, troubleshoot issues, and explain fixes.",
    job: "Cloud Support Associate: Support AWS cloud services, investigate Linux and networking issues, use scripts to automate routine tasks, and document customer solutions. You will answer support tickets, reproduce problems, and write clear documentation so the next person can fix it faster.",
    resume: "Nadia Rahman | IT student\nProjects: Configured a Linux web server in a home lab and wrote a Python script to check uptime.\nProjects: Documented troubleshooting steps and a simple network diagram for a shared lab router.\nSkills: Linux, Python, networking.",
  },
  {
    id: "qa",
    icon: "qa",
    interest: "Quality & testing",
    label: "Junior QA Engineer",
    searchTerm: "QA engineer",
    summary: "Find bugs before users do, and write tests that keep them away.",
    job: "Junior QA Engineer: Plan and run testing for web features, write unit test and integration test cases, check REST API responses, use SQL to confirm data is saved correctly, and write clear bug reports. You will work with developers every day, so clear communication matters as much as finding the bug.",
    resume: "Priya Nair | Software engineering student\nProjects: Wrote unit tests in JavaScript with Jest for a to-do web app and raised coverage on the checkout logic.\nProjects: Ran exploratory testing on a classmate's booking site and filed 14 bug reports with steps to reproduce.\nProjects: Wrote a test plan and documentation for a final-year project.\nSkills: JavaScript, testing, Git, bug reporting.",
  },
  {
    id: "backend",
    icon: "backend",
    interest: "Building products",
    label: "Backend Developer (Python)",
    searchTerm: "backend developer",
    summary: "Design the services and data behind an app, and keep them reliable.",
    job: "Backend Developer (Python): Build and maintain REST API endpoints in Python, design PostgreSQL tables and write SQL queries, deploy services on AWS cloud, and cover your code with unit tests. You will join code reviews, read logs when something breaks, and write short documentation for other teams.",
    resume: "Daniel Ong | Computer engineering student\nProjects: Built a Python Flask REST API for a student marketplace with endpoints for listings, users and orders.\nProjects: Designed a PostgreSQL schema and wrote SQL queries for search and order history.\nProjects: Deployed the API on a Linux virtual machine and wrote a README with setup steps.\nSkills: Python, SQL, Linux, Git.",
  },
  {
    id: "security",
    icon: "security",
    interest: "Security & systems",
    label: "Junior SOC Analyst",
    searchTerm: "SOC analyst",
    summary: "Investigate alerts, explain what happened, and document the response.",
    job: "Junior SOC Analyst. Monitor security alerts and investigate suspicious activity. Use SIEM tools to triage incidents, analyse logs, document incident timelines, and communicate findings. Familiarity with networking, Linux and Python preferred.",
    resume: "Jordan Koh | Cybersecurity student\nProjects: Built a Python log parser that identifies repeated failed login attempts. Configured a Linux home lab and documented network traffic with Wireshark.\nSkills: Python, Linux, networking, Wireshark, technical writing.",
  },
  {
    id: "network",
    icon: "network",
    interest: "Security & systems",
    label: "Junior Network Engineer",
    searchTerm: "network engineer",
    summary: "Keep traffic moving, trace faults, and document how the network fits together.",
    job: "Junior Network Engineer: Configure and troubleshoot switches and routers, monitor networking links, read packet captures in Wireshark, check TCP behaviour when connections fail, write Linux shell scripts for routine checks, and document network changes. Basic cloud networking on AWS is helpful.",
    resume: "Marcus Chua | Network technology student\nProjects: Built a home lab with two VLANs on a managed switch and traced a DNS fault with Wireshark.\nProjects: Wrote a Linux bash script that pings key hosts and logs failures to a file.\nProjects: Drew a network diagram and wrote documentation for the campus lab.\nSkills: Networking, Linux, Wireshark, documentation.",
  },
] as const;

export type SamplePath = (typeof samplePaths)[number];

export const jobLinkHosts = ["www.mycareersfuture.gov.sg", "www.linkedin.com", "sg.jobstreet.com"] as const;
export type SampleJobLink = { site: string; label: string; url: string };

/** Static search links for one sample. The term comes from our own list, never from a user or a model. */
export function sampleJobLinks(path: Pick<SamplePath, "searchTerm">): SampleJobLink[] {
  const term = encodeURIComponent(path.searchTerm);
  const slug = path.searchTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [
    { site: "MyCareersFuture", label: "MyCareersFuture", url: `https://www.mycareersfuture.gov.sg/search?search=${term}&sortBy=new_posting_date` },
    { site: "LinkedIn", label: "LinkedIn Jobs", url: `https://www.linkedin.com/jobs/search/?keywords=${term}&location=Singapore&sortBy=DD` },
    { site: "JobStreet", label: "JobStreet Singapore", url: `https://sg.jobstreet.com/${encodeURIComponent(slug)}-jobs` },
  ];
}
