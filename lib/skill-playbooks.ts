import type { LinkKind, Quest, QuestKind, QuestLink, Skill } from "./analysis-types.ts";
import { catalog, hasTerm, type SkillSeed } from "./preview-analysis.ts";

/**
 * A hand-written playbook for every skill in the catalog: one project to build, in three short steps, a résumé line to adapt, and links that were opened and checked on 15 Oct 2026.
 * The native scan turns a playbook into a tip (see questFor). Nothing here is fetched live, and no tip carries a time estimate.
 */
export type Playbook = {
  skill: string;
  /** What to name in a résumé line, for example "scikit-learn". */
  tool: string;
  /** Examples of the number to put on a line that already shows the work. */
  metric: string;
  build: { title: string; task: string; steps: [string, string, string]; bullet: string };
  links: QuestLink[];
};

const link = (kind: LinkKind, title: string, url: string): QuestLink => ({ kind, title, url });

export const playbooks: Playbook[] = [
  {
    skill: "Python", tool: "Python", metric: "files processed, rows cleaned or minutes saved",
    build: {
      title: "Automate one boring task with a Python script",
      task: "Pick a task you repeat and make a Python script do it in one command.",
      steps: ["Pick a task you repeat, like renaming files or tidying a sheet.", "Write a script that does it in one command.", "Put it on GitHub with a README showing before and after."],
      bullet: "Wrote a Python script that [does what] for [who], cutting [task] from [before] to [after].",
    },
    links: [link("Docs", "The Python Tutorial", "https://docs.python.org/3/tutorial/"), link("Guide", "Automate the Boring Stuff with Python", "https://automatetheboringstuff.com/"), link("Course", "freeCodeCamp: Scientific Computing with Python", "https://www.freecodecamp.org/learn/scientific-computing-with-python/")],
  },
  {
    skill: "SQL", tool: "SQL", metric: "rows queried, tables joined or questions answered",
    build: {
      title: "Answer three questions with SQL",
      task: "Answer three real questions about a small dataset using SQL queries.",
      steps: ["Load a sample database, such as Chinook, into SQLite.", "Write three queries that answer real questions.", "Save the queries and answers in a README on GitHub."],
      bullet: "Wrote SQL queries (joins and grouping) on [dataset] to answer [n] questions about [topic].",
    },
    links: [link("Practice", "SQLBolt", "https://sqlbolt.com/"), link("Docs", "SQLite Tutorial", "https://www.sqlitetutorial.net/"), link("Docs", "PostgreSQL tutorial", "https://www.postgresql.org/docs/current/tutorial.html"), link("Dataset", "Chinook sample database", "https://github.com/lerocha/chinook-database")],
  },
  {
    skill: "Data analysis", tool: "pandas and a notebook", metric: "rows analysed, charts made or the decision it informed",
    build: {
      title: "Analyse a public dataset and write a one-page brief",
      task: "Pick a public dataset, find three things in it and write them up.",
      steps: ["Pick a Kaggle or data.gov.sg dataset and one question.", "Clean it and make two or three charts in a notebook.", "Write a one-page brief with your three findings."],
      bullet: "Analysed [dataset] with pandas and found [n] insights on [topic], written up in a one-page brief.",
    },
    links: [link("Course", "Kaggle: Pandas", "https://www.kaggle.com/learn/pandas"), link("Course", "Kaggle: Data Cleaning", "https://www.kaggle.com/learn/data-cleaning"), link("Dataset", "data.gov.sg", "https://data.gov.sg/")],
  },
  {
    skill: "Dashboards", tool: "Tableau Public or Looker Studio", metric: "charts built, users, or the decision it supports",
    build: {
      title: "Build a one-page dashboard for one decision",
      task: "Build a dashboard with a clear decision it supports, and publish it.",
      steps: ["Pick one decision and a public dataset for it.", "Build three charts for it in Tableau Public or Looker Studio.", "Publish it and add two lines on who would use it."],
      bullet: "Built a dashboard in [tool] on [dataset] that helps [who] decide [what], with [n] views.",
    },
    links: [link("Tool", "Tableau Public", "https://public.tableau.com/"), link("Tool", "Looker Studio", "https://lookerstudio.google.com/"), link("Course", "Power BI guided learning", "https://learn.microsoft.com/en-us/power-bi/guided-learning/")],
  },
  {
    skill: "Machine learning", tool: "scikit-learn", metric: "accuracy, error or the size of the test set",
    build: {
      title: "Train a baseline model and report how well it works",
      task: "Train and evaluate a simple model on a public dataset.",
      steps: ["Pick a public dataset, like Titanic, and split train and test.", "Train a simple model with scikit-learn and report one metric.", "Write a short model card: data, metric, where it fails."],
      bullet: "Trained a [model] on [dataset] with scikit-learn and reached [metric] on a held-out test set.",
    },
    links: [link("Docs", "scikit-learn: Getting started", "https://scikit-learn.org/stable/getting_started.html"), link("Course", "Google Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course"), link("Video", "StatQuest", "https://www.youtube.com/@statquest"), link("Dataset", "Kaggle: Titanic", "https://www.kaggle.com/c/titanic")],
  },
  {
    skill: "Deep learning", tool: "PyTorch", metric: "points of accuracy over a baseline, or training time",
    build: {
      title: "Train a small neural network and compare it with a baseline",
      task: "Train a small neural network on a public dataset and compare it with a simple baseline.",
      steps: ["Train a simple baseline on a small dataset, like digits.", "Train a small neural network in PyTorch and plot the curve.", "Compare both on the same test set and note what you learned."],
      bullet: "Trained a neural network in PyTorch on [dataset] and beat a simple baseline by [n] points.",
    },
    links: [link("Docs", "PyTorch tutorials", "https://docs.pytorch.org/tutorials/"), link("Course", "fast.ai", "https://course.fast.ai/"), link("Video", "3Blue1Brown", "https://www.youtube.com/@3blue1brown")],
  },
  {
    skill: "MLOps", tool: "Docker and FastAPI", metric: "requests served, image size or deploy steps",
    build: {
      title: "Serve a model from a container with an API",
      task: "Package a trained model in a container and serve it through a small API.",
      steps: ["Train a small model and save it to a file.", "Wrap it in a FastAPI app and a Dockerfile.", "Deploy it free, for example on Hugging Face Spaces, with a README."],
      bullet: "Packaged a [model] in Docker and served it through a FastAPI endpoint, deployed on [where].",
    },
    links: [link("Docs", "Docker: Get started", "https://docs.docker.com/get-started/"), link("Docs", "FastAPI tutorial", "https://fastapi.tiangolo.com/tutorial/"), link("Guide", "MLOps.org", "https://ml-ops.org/"), link("Tool", "Hugging Face Spaces", "https://huggingface.co/docs/hub/spaces")],
  },
  {
    skill: "Communication", tool: "slides and a short recording", metric: "audience size or the decision that followed",
    build: {
      title: "Explain one technical result to a non-technical person",
      task: "Present one technical finding so a non-technical audience can act on it.",
      steps: ["Write one project result in two plain sentences.", "Make three slides: question, finding, next step.", "Record yourself presenting it and keep the link."],
      bullet: "Presented [result] to [audience] in [n] slides, which led to [decision or feedback].",
    },
    links: [link("Guide", "Toastmasters resources", "https://www.toastmasters.org/resources"), link("Course", "Google Technical Writing", "https://developers.google.com/tech-writing")],
  },
  {
    skill: "JavaScript", tool: "JavaScript", metric: "users, load time or features shipped",
    build: {
      title: "Ship one small web feature",
      task: "Build one small web feature with clear user value and put it online.",
      steps: ["Pick a small feature, like a filter or a saved form.", "Build it in plain JavaScript and handle a bad input.", "Deploy it free on GitHub Pages and link the code."],
      bullet: "Built [feature] in JavaScript and deployed it on [where], used by [who].",
    },
    links: [link("Docs", "MDN JavaScript Guide", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"), link("Course", "javascript.info", "https://javascript.info/"), link("Course", "The Odin Project", "https://www.theodinproject.com/")],
  },
  {
    skill: "React", tool: "React", metric: "components built or an accessibility score",
    build: {
      title: "Build one accessible page from a design brief",
      task: "Build one accessible interface from a short design brief.",
      steps: ["Pick a free design brief, for example on Frontend Mentor.", "Build it in React with real buttons and keyboard support.", "Deploy it and run an accessibility check."],
      bullet: "Built [page] in React from a design brief, with keyboard support and a [score] accessibility check.",
    },
    links: [link("Docs", "react.dev: Learn React", "https://react.dev/learn"), link("Practice", "Frontend Mentor", "https://www.frontendmentor.io/"), link("Course", "web.dev: Learn Accessibility", "https://web.dev/learn/accessibility")],
  },
  {
    skill: "APIs", tool: "a public API", metric: "endpoints used or error cases handled",
    build: {
      title: "Call a public API and handle errors and empty results",
      task: "Use a public API in a small project and handle the empty and error cases.",
      steps: ["Pick a free public API and read how it checks who you are.", "Show its data, with a message for empty and error results.", "Put the code and a README with a screenshot on GitHub."],
      bullet: "Integrated the [name] API with [n] endpoints, handling empty and error responses.",
    },
    links: [link("Guide", "RESTful API tutorial", "https://restfulapi.net/"), link("Docs", "Postman Learning Center", "https://learning.postman.com/"), link("Dataset", "Public APIs list", "https://github.com/public-apis/public-apis")],
  },
  {
    skill: "Testing", tool: "a test framework", metric: "tests written or coverage",
    build: {
      title: "Add tests to a real feature",
      task: "Add meaningful tests around a feature you already built.",
      steps: ["Pick a small feature you already built.", "Write tests for the normal case, an edge case and a failure.", "Run them in GitHub Actions and note the result."],
      bullet: "Added [n] automated tests to [feature] with [framework], catching [what].",
    },
    links: [link("Docs", "Testing Library", "https://testing-library.com/docs/"), link("Docs", "pytest", "https://docs.pytest.org/"), link("Tool", "Playwright", "https://playwright.dev/")],
  },
  {
    skill: "Networking", tool: "Wireshark", metric: "packets captured or protocols explained",
    build: {
      title: "Capture traffic in a safe lab and explain it",
      task: "Read a packet capture in a safe lab and explain what happened.",
      steps: ["Open one of Wireshark's sample capture files.", "Follow one conversation and note each protocol you see.", "Write a short annotated walkthrough with screenshots."],
      bullet: "Analysed packet captures in Wireshark, tracing [protocol] traffic and explaining [what happened].",
    },
    links: [link("Docs", "Wireshark documentation", "https://www.wireshark.org/docs/"), link("Dataset", "Wireshark sample captures", "https://wiki.wireshark.org/SampleCaptures"), link("Course", "Cisco Networking Academy", "https://www.netacad.com/")],
  },
  {
    skill: "Linux", tool: "Bash", metric: "tasks automated or minutes saved",
    build: {
      title: "Automate one admin task with a shell script",
      task: "Automate one repeatable Linux task and write down how it works.",
      steps: ["Pick a chore, like backing up a folder or checking disk space.", "Write a Bash script for it and schedule it with cron.", "Add a short runbook: what it does and how to undo it."],
      bullet: "Automated [task] with a Bash script and cron on Linux, saving [time].",
    },
    links: [link("Guide", "The Linux Command Line (free book)", "https://linuxcommand.org/tlcl.php"), link("Practice", "OverTheWire: Bandit", "https://overthewire.org/wargames/bandit/"), link("Course", "Introduction to Linux", "https://training.linuxfoundation.org/training/introduction-to-linux/")],
  },
  {
    skill: "SIEM", tool: "Splunk", metric: "events searched, alerts triaged or detections written",
    build: {
      title: "Investigate a simulated alert in a SIEM lab",
      task: "Investigate a safe, simulated alert in a SIEM lab and write down the timeline.",
      steps: ["Set up a free Splunk or Security Onion lab with sample data.", "Follow one suspicious event from first sign to cause.", "Write the timeline with screenshots of your searches."],
      bullet: "Investigated a simulated alert in [SIEM] across [n] events and wrote a timeline of the attack.",
    },
    links: [link("Course", "Splunk training", "https://www.splunk.com/en_us/training.html"), link("Dataset", "Boss of the SOC dataset", "https://github.com/splunk/botsv3"), link("Tool", "Security Onion", "https://securityonionsolutions.com/")],
  },
  {
    skill: "Incident response", tool: "an incident report", metric: "steps documented or time to contain",
    build: {
      title: "Work a simulated incident from alert to report",
      task: "Work a simulated incident from the first alert to a written report.",
      steps: ["Pick a free lab or scenario with a realistic alert.", "Triage it, contain it and note each decision.", "Write a report: timeline, cause and what you would change."],
      bullet: "Handled a simulated [incident type] from triage to report, documenting [n] steps and the fix.",
    },
    links: [link("Guide", "CISA: Incident response playbooks", "https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks"), link("Docs", "NIST incident response guide", "https://csrc.nist.gov/pubs/sp/800/61/r3/final"), link("Practice", "CyberDefenders", "https://cyberdefenders.org/")],
  },
  {
    skill: "Cloud", tool: "AWS or Google Cloud", metric: "services used, uptime or cost per month",
    build: {
      title: "Deploy a small service with basic access controls",
      task: "Deploy a small service on a cloud provider and limit who can reach it.",
      steps: ["Pick a free tier from AWS or Google Cloud.", "Deploy a small web app or API and limit who can reach it.", "Draw the architecture on one page and name each service."],
      bullet: "Deployed [app] on [cloud] using [n] services with least-privilege access, at [cost] a month.",
    },
    links: [link("Course", "AWS Skill Builder", "https://skillbuilder.aws/"), link("Course", "Google Skills", "https://www.skills.google/"), link("Practice", "Cloud Resume Challenge", "https://cloudresumechallenge.dev/")],
  },
  {
    skill: "Reporting", tool: "a one-page report", metric: "readers or the decision it supported",
    build: {
      title: "Write a one-page report from one project",
      task: "Write a concise report from one project, with links to the evidence.",
      steps: ["Pick one project and list three things a reader must know.", "Write them as one page: title, evidence and a next step.", "Link your evidence, such as a repository, at the end."],
      bullet: "Wrote a one-page report on [project] that [reader] used to decide [what].",
    },
    links: [link("Course", "Google Technical Writing", "https://developers.google.com/tech-writing"), link("Guide", "Write the Docs: Guide", "https://www.writethedocs.org/guide/"), link("Course", "Coursera: Technical Writing", "https://www.coursera.org/learn/technical-writing")],
  },
];

/** The playbook for a skill name. A catalog name matches exactly (any case); a free name such as "PyTorch" matches the catalog skill that lists it as a term. */
export function playbookFor(name: string): Playbook | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return undefined;
  const direct = playbooks.find((book) => book.skill.toLowerCase() === wanted);
  if (direct) return direct;
  const seed: SkillSeed | undefined = catalog.find((item) => item.terms.some((term) => hasTerm(name, term)));
  return seed && playbooks.find((book) => book.skill === seed.name);
}

/** Which kind of tip fits a skill, from the rules the résumé failed: nothing shown, a mention with no project, or a project with no result. */
export function tipKind(skill: Pick<Skill, "evidence" | "resumeQuote" | "breakdown">): QuestKind {
  if (!skill.resumeQuote || skill.evidence <= 0) return "build";
  const missing = skill.breakdown?.missing ?? [];
  if (missing.includes("Used in a project or work action") || skill.evidence < 45) return "show";
  return "measure";
}

/** The tip for a skill and a kind, built from its playbook. Undefined when the skill has no playbook. */
export function questFor(name: string, kind: QuestKind): Quest | undefined {
  const book = playbookFor(name);
  if (!book) return undefined;
  const base = { skill: book.skill, kind, links: book.links };
  if (kind === "build") return { ...base, title: book.build.title, task: book.build.task, proof: "A link a reader can open, with a short write-up", steps: [...book.build.steps], bullet: book.build.bullet };
  if (kind === "show") return {
    ...base, title: `Turn your ${book.skill} mention into a project line`,
    task: `Your résumé names ${book.skill} but doesn't show it in use. Pick the work where you used ${book.tool} and write it as one line.`,
    proof: "A project line with a link to the work",
    steps: [`Pick the work where you used ${book.tool}. A class project counts.`, "Write what you built and with what, starting with a verb.", "Link the code, report or demo next to it."],
    bullet: `Built [what] with ${book.tool} that [did what] for [who].`,
  };
  return {
    ...base, title: `Add a number to your ${book.skill} line`,
    task: `Your ${book.skill} line shows the work but not the result. Add one number a reader can check.`,
    proof: "The same line, with a number",
    steps: [`Find your ${book.skill} line in your résumé.`, `Add one number, such as ${book.metric}.`, "If you can, say what changed because of it."],
    bullet: `[Verb] ${book.tool} to [do what], [number: ${book.metric}].`,
  };
}

/** Fills the steps, résumé line and links of a tip that has none (a tip from API boost), when its skill matches a playbook. The tip's own title, task and proof stay. */
export function enrichQuest(quest: Quest): Quest {
  if (quest.steps && quest.links) return quest;
  const book = playbookFor(quest.skill);
  if (!book) return quest;
  return { ...quest, steps: quest.steps ?? [...book.build.steps], bullet: quest.bullet ?? book.build.bullet, links: quest.links ?? book.links, kind: quest.kind ?? "build" };
}
