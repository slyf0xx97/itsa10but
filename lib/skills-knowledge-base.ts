export type LearningLink = { title: string; url: string };
export type SkillKbEntry = { skill: string; summary: string; links: LearningLink[] };

/**
 * A small, hand-picked local knowledge base: one entry per skill in the
 * preview-analysis catalog, each with public, freely available learning
 * links. Nothing here is fetched live.
 */
export const skillsKnowledgeBase: SkillKbEntry[] = [
  { skill: "Python", summary: "A general-purpose language used for scripting, data work and automation.", links: [{ title: "The Python Tutorial", url: "https://docs.python.org/3/tutorial/" }, { title: "freeCodeCamp Python course", url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/" }] },
  { skill: "SQL", summary: "The query language for relational databases.", links: [{ title: "SQLite tutorial", url: "https://www.sqlitetutorial.net/" }, { title: "Mode SQL tutorial", url: "https://mode.com/sql-tutorial/" }] },
  { skill: "Data analysis", summary: "Turning a raw dataset into findings someone can act on.", links: [{ title: "Kaggle: Pandas", url: "https://www.kaggle.com/learn/pandas" }, { title: "Kaggle: Data Cleaning", url: "https://www.kaggle.com/learn/data-cleaning" }] },
  { skill: "Dashboards", summary: "Visual summaries built to support one decision at a time.", links: [{ title: "Tableau Public resources", url: "https://public.tableau.com/en-us/s/resources" }, { title: "Power BI guided learning", url: "https://learn.microsoft.com/en-us/power-bi/guided-learning/" }] },
  { skill: "Machine learning", summary: "Training and evaluating models that predict from data.", links: [{ title: "scikit-learn tutorials", url: "https://scikit-learn.org/stable/tutorial/index.html" }, { title: "Google's Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course" }] },
  { skill: "Deep learning", summary: "Training neural networks, and checking them against a simple baseline.", links: [{ title: "PyTorch tutorials", url: "https://docs.pytorch.org/tutorials/" }, { title: "TensorFlow tutorials", url: "https://www.tensorflow.org/tutorials" }] },
  { skill: "MLOps", summary: "Packaging a trained model, serving it, and watching how it behaves after release.", links: [{ title: "MLOps.org", url: "https://ml-ops.org/" }, { title: "Docker get started", url: "https://docs.docker.com/get-started/" }] },
  { skill: "Communication", summary: "Explaining a technical finding so a non-technical audience can use it.", links: [{ title: "Toastmasters resources", url: "https://www.toastmasters.org/resources" }] },
  { skill: "JavaScript", summary: "The scripting language that runs in every browser and in Node.", links: [{ title: "MDN JavaScript guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" }] },
  { skill: "React", summary: "A library for building interactive user interfaces from components.", links: [{ title: "react.dev: Learn React", url: "https://react.dev/learn" }] },
  { skill: "APIs", summary: "Reading and writing data through a service's defined interface.", links: [{ title: "RESTful API design basics", url: "https://restfulapi.net/" }] },
  { skill: "Testing", summary: "Writing checks that catch a regression before a user does.", links: [{ title: "Testing Library docs", url: "https://testing-library.com/docs/" }] },
  { skill: "Networking", summary: "How data moves between machines, and how to read that traffic.", links: [{ title: "Wireshark documentation", url: "https://www.wireshark.org/docs/" }] },
  { skill: "Linux", summary: "Operating a Linux system from the command line.", links: [{ title: "Linux Journey", url: "https://linuxjourney.com/" }] },
  { skill: "SIEM", summary: "Collecting and correlating security logs to spot an incident.", links: [{ title: "Splunk free training", url: "https://www.splunk.com/en_us/training.html" }] },
  { skill: "Incident response", summary: "Working an alert from first triage to a closed, documented case.", links: [{ title: "SANS incident response resources", url: "https://www.sans.org/incident-response/" }] },
  { skill: "Cloud", summary: "Deploying and securing a service on a cloud provider.", links: [{ title: "AWS Skill Builder", url: "https://aws.amazon.com/training/" }] },
  { skill: "Reporting", summary: "Writing up a technical project so someone else can trust the result.", links: [{ title: "Coursera: Technical Writing", url: "https://www.coursera.org/learn/technical-writing" }] },
];

export function getKbEntry(skillName: string): SkillKbEntry | undefined {
  return skillsKnowledgeBase.find((entry) => entry.skill.toLowerCase() === skillName.toLowerCase());
}
