/**
 * Hand-written fictional résumé and job pairs for measuring the native scan. Every person, school and employer is made up.
 * The gold labels say what a careful human reader would conclude, not what the scanner does today, so a failing case is a real finding.
 * Skill names are catalog names (lib/catalog.ts). A skill the résumé only names, or names in order to deny, goes in resumeMentionsOnly.
 */
export type EvalCase = {
  id: string;
  category: string;
  /** More than one entry tests multi-résumé input. They are scanned as resume-1.txt, resume-2.txt and so on. */
  resumes: string[];
  job: string;
  resumeShows: string[];
  resumeMentionsOnly: string[];
  jobWants: string[];
  notes: string;
};

// Long filler for the length cases. It avoids every catalog term on purpose.
const retailDay = (i: number) => `Day ${i + 1}: served customers at the front counter, restocked the shelves and counted the till at close.`;
const boiler = (i: number) => `Benefit ${i + 1}: we offer flexible hours, a friendly office, paid leave, a learning budget and free lunch on Fridays.`;

const raw: EvalCase[] = [
  // ---- synonyms and tool names ----
  {
    id: "syn-1", category: "synonyms",
    resumes: [`Priya Nair, Backend Developer
Experience
Built a Django service that processed 12,000 orders a day and cut checkout errors by 18% for an online grocer.
Wrote BigQuery queries to track weekly revenue and shared the numbers with the finance team every Monday.
Provisioned staging environments with Terraform and reviewed pull requests on GitLab for a team of six.
Projects
Flask app that tracks library books for a local school, deployed to a small virtual machine and used by 40 students.
Education
BSc Computer Science, Riverton University.
Skills: Django, Flask, BigQuery, Terraform, Postgres, GitLab`],
    job: `Backend Engineer, Logistics Platform
You will build and maintain services in Python using Django, query our warehouse in BigQuery, and manage infrastructure as code with Terraform on Google Cloud. Our team reviews every change through GitLab merge requests and pull requests, and ships small releases every week. You should be comfortable owning a service from design to production. Experience with Postgres is useful. We value clear, kind code review.`,
    resumeShows: ["Python", "SQL", "Cloud", "Git"], resumeMentionsOnly: [], jobWants: ["Python", "SQL", "Cloud", "Git"],
    notes: "Django means Python, BigQuery means SQL, Terraform means Cloud. The word Python never appears in the résumé.",
  },
  {
    id: "syn-2", category: "synonyms",
    resumes: [`Marcus Thompson, Junior Analyst
Built Looker dashboards for the sales team that replaced a weekly slide deck made by hand.
Wrote BigQuery queries joining orders and customers to find churn by region, which helped cut churn by 6%.
Cleaned messy exports before every analysis, removing duplicate rows and fixing date formats in 40 files.
Volunteer: kept donor lists for a food bank in Google Sheets with pivot tables, tracking 400 donors and their gifts.
Education: BA Economics, Harbour College.`],
    job: `Data Analyst, Retail
Build dashboards in Looker or Tableau, write SQL on BigQuery every day, and clean data that arrives from different shops. Excel or Google Sheets is used for quick checks. You will explain your findings to the sales team in plain language and keep the numbers honest. Weekly business reviews with managers. A calm, careful approach matters more than speed.`,
    resumeShows: ["Dashboards", "SQL", "Data analysis", "Excel"], resumeMentionsOnly: [], jobWants: ["Dashboards", "SQL", "Data analysis", "Excel", "Communication"],
    notes: "Looker means Dashboards, BigQuery means SQL. Cleaning data is Data analysis with no catalog term. Google Sheets plus pivot tables is Excel. Explaining findings is Communication with no catalog term in the job.",
  },
  {
    id: "syn-3", category: "synonyms",
    resumes: [`Daniel Okafor, Platform Engineer
Built a deployment pipeline on Azure that shipped 30 releases a month and cut rollback time from 40 minutes to 5.
Containerised 14 services with Docker and ran them on Kubernetes, adding autoscaling that saved 22% on compute.
Wrote Bash scripts on Ubuntu servers to rotate logs and patch hosts, replacing a manual checklist.
Moved a legacy monitoring stack to Grafana and cut alert noise by half.
Education: Diploma in Information Technology, Lakeside Polytechnic.
Skills: Azure, Docker, Kubernetes, Ubuntu, Bash, Grafana`],
    job: `Platform Engineer, Online Marketplace
Run our services on Azure, containerise them with Docker, and keep the Linux fleet patched. You will build Grafana boards for the support team and improve our deployment pipeline. We are a small team that values calm releases over fast ones. Experience with shell scripting is expected.`,
    resumeShows: ["Cloud", "Linux", "Dashboards"], resumeMentionsOnly: [], jobWants: ["Cloud", "Linux", "Dashboards"],
    notes: "Docker and Kubernetes in a plain DevOps context are not MLOps. The catalog files both terms under MLOps, so this should show a false positive.",
  },
  {
    id: "syn-4", category: "synonyms",
    resumes: [`Aisha Rahman, Data Science Graduate
Trained a random forest and an XGBoost model on 80,000 loan records, improving recall on defaults from 61% to 74%.
Used pandas and scikit-learn in Jupyter notebooks for feature engineering and cross-validation.
Built a small PyTorch image classifier for plant leaves that reached 91% accuracy on a held-out set.
Ran an A/B test for a student society newsletter and explained the confidence interval to the committee.
Education: MSc Data Science, Northgate University.
Skills: scikit-learn, PyTorch, XGBoost`],
    job: `Applied Scientist, Credit Risk
Build machine learning models such as XGBoost and random forest in Python, and test every change with an A/B test before release. You will work with a small risk team and review results weekly. Experience with neural networks is a plus.`,
    resumeShows: ["Python", "Machine learning", "Deep learning", "Statistics"], resumeMentionsOnly: [], jobWants: ["Machine learning", "Python", "Statistics", "Deep learning"],
    notes: "Library names carry the skills: pandas and scikit-learn mean Python, PyTorch means Deep learning.",
  },
  {
    id: "syn-5", category: "synonyms",
    resumes: [`Lena Fischer, Frontend Developer
Rebuilt a booking form in Next.js and TypeScript, cutting drop-off by 12% across 9,000 monthly visitors.
Managed state with Redux and added Cypress end-to-end tests that caught 15 regressions before release.
Consumed a GraphQL endpoint and handled loading and error states for a travel start-up.
Led accessibility fixes, bringing the checkout flow to WCAG AA.
Education: BA Digital Media, Fenwick College.`],
    job: `Frontend Engineer, Travel Start-up
You build interfaces in React and TypeScript, work with GraphQL and REST endpoints, and write Cypress tests for the flows you ship. Accessibility counts as part of done. We are a team of nine and release most days. You will pair often and explain trade-offs kindly.`,
    resumeShows: ["JavaScript", "React", "Testing", "APIs"], resumeMentionsOnly: [], jobWants: ["JavaScript", "React", "APIs", "Testing"],
    notes: "Next.js and Redux mean React, TypeScript means JavaScript, Cypress means Testing, GraphQL means APIs.",
  },
  {
    id: "syn-6", category: "synonyms",
    resumes: [`Tomas Varga, SOC Analyst (Tier 1)
Monitored alerts in Splunk during night shifts and escalated 25 confirmed cases a month to the senior team.
Investigated phishing emails, checked headers and blocked sender domains, cutting repeat cases by 30%.
Captured traffic with Wireshark to confirm a suspected data leak and wrote down the timeline for the lead.
Studied the OWASP Top 10 and fixed three flaws in a practice web app.
Certifications: Cisco CCNA, vendor-neutral security entry exam.`],
    job: `Security Operations Analyst
Triage alerts in a SIEM such as Splunk or Sentinel and support incident response from first alert to closure. You need a working grasp of TCP, DNS and common web flaws from the OWASP list. Shift work is required, including some weekends, and you will hand over cleanly to the next shift.`,
    resumeShows: ["SIEM", "Incident response", "Networking", "Security fundamentals"], resumeMentionsOnly: [], jobWants: ["SIEM", "Incident response", "Networking", "Security fundamentals"],
    notes: "Splunk means SIEM. Investigating phishing is Incident response. Wireshark and CCNA mean Networking.",
  },

  // ---- word forms ----
  {
    id: "forms-1", category: "word forms",
    resumes: [`Hannah Lee, Marketing Analyst
Analysed customer data from three campaigns and found that email beat paid social by 2.4 times on cost per signup.
Visualised the weekly results in dashboards that the team opened every Monday morning.
Wrote PostgreSQL queries to pull orders and refunds, and automated the Friday export.
Trained two new hires to read the figures and ask better questions of them.
Education: BBA Marketing, Eastbay University.`],
    job: `Marketing Analyst
Analyse customer data, build dashboards and write PostgreSQL queries to answer campaign questions. Weekly reporting to the head of marketing. You will work closely with the paid and email teams and keep a simple log of what was learned each month.`,
    resumeShows: ["Data analysis", "Dashboards", "SQL"], resumeMentionsOnly: [], jobWants: ["Data analysis", "Dashboards", "SQL", "Reporting"],
    notes: "Plural dashboards, analysed, visualised and PostgreSQL are all word forms of catalog terms (dashboard, sql, postgres).",
  },
  {
    id: "forms-2", category: "word forms",
    resumes: [`Rohan Mehta, Software Engineer
Wrote unit tests and integration tests for the payments module, lifting coverage from 54% to 88%.
Built internal APIs for the warehouse team and documented every endpoint with worked examples.
Automated regression checks that run on each merge and caught 20 defects in the first quarter.
Reduced the average response time of the orders service by 35% through caching.
Education: BEng Software Engineering, Cedar Valley University.`],
    job: `Software Engineer, Warehouse Systems
Write unit tests and integration tests, design APIs and endpoints for the warehouse team, and maintain the checks that run on every merge. We ship every week and keep changes small. You will own a service end to end.`,
    resumeShows: ["Testing", "APIs"], resumeMentionsOnly: [], jobWants: ["Testing", "APIs"],
    notes: "Unit tests, integration tests, APIs and endpoints are plurals. The matcher needs a word boundary after the term, so plurals miss.",
  },
  {
    id: "forms-3", category: "word forms",
    resumes: [`Nur Aisyah, Business Analyst
Presented findings to senior stakeholders every month and agreed next steps in the room.
Wrote reports on procurement spending that led to a 9% saving on office supplies.
Explained the data and its limits to non-technical teams during short workshops.
Mentored an intern through a six-week project and gave weekly feedback.
Education: BSc Business, Marina Bay College.
Volunteer: treasurer of a hiking club, keeping the books for 60 members.`],
    job: `Business Analyst, Procurement
Present results to stakeholders each month and produce a written report for leadership. You will work with the finance team and suppliers, and help the buyers see where money is going. Calm, clear explanations matter here.`,
    resumeShows: ["Communication", "Reporting"], resumeMentionsOnly: [], jobWants: ["Communication", "Reporting"],
    notes: "Presented, stakeholders and reports are word forms. Only the base forms present, stakeholder and report are catalog terms.",
  },

  // ---- negation ----
  {
    id: "neg-1", category: "negation",
    resumes: [`Wei Jie Tan, Computer Science Student
I built a library management app in Java with a simple Swing interface and wrote a unit test suite for the borrowing rules.
I have no experience with Python yet, but I am working through an introductory course this month.
Led a team of four in a hackathon, planning tasks on a Kanban board and demoing the result to the judges.
Tutored first-year students in programming basics for two semesters.
Education: BSc Computer Science (year 3), Eastgate University.`],
    job: `Graduate Developer
Build Java services, write a unit test for each change, and work in an Agile team. Python is a bonus. We run a friendly graduate programme with a mentor for every new starter and a review every six weeks.`,
    resumeShows: ["Java", "Testing", "Agile"], resumeMentionsOnly: ["Python"], jobWants: ["Java", "Testing", "Agile", "Python"],
    notes: "The résumé says it has no Python experience, in a sentence of its own.",
  },
  {
    id: "neg-2", category: "negation",
    resumes: [`Carlos Mendes, Systems Administrator
Maintained 40 Ubuntu servers, wrote Bash scripts for backups and cut restore time from 3 hours to 45 minutes.
I am not familiar with Kubernetes and have never used Docker in production, though I would like to learn both.
I have not deployed anything on AWS, because our servers run on site in the office.
Handled daily user requests and fixed printer and VPN problems for 120 staff.
Education: Diploma in IT Systems, Harbour Institute.`],
    job: `Systems Administrator
Look after Linux servers, automate chores with Bash and support staff on VPN and firewall questions. Some AWS knowledge is useful as we are moving a few services out of the office next year. Good manners with non-technical colleagues are a must.`,
    resumeShows: ["Linux", "Networking"], resumeMentionsOnly: ["MLOps", "Cloud"], jobWants: ["Linux", "Networking", "Cloud"],
    notes: "Kubernetes, Docker and AWS are named only to deny experience. Docker and Kubernetes land on MLOps in the catalog.",
  },
  {
    id: "neg-3", category: "negation",
    resumes: [`Fatima Zahra, Biology Graduate
I have no formal training in machine learning, so I taught myself by building a spam classifier with scikit-learn in a Jupyter notebook.
It reached 96% accuracy on a public dataset of 5,000 messages, and I wrote up the method in a short blog post.
I have never used SQL, but I cleaned lab data in spreadsheets for two years and caught 80 entry mistakes.
Education: BSc Biology, Westbrook University.`],
    job: `Junior Machine Learning Engineer
Build and evaluate machine learning models in Python, and pull training data with SQL. We hire for curiosity and will teach the rest. You will join a team of five and review each other's work every week.`,
    resumeShows: ["Machine learning", "Python", "Excel"], resumeMentionsOnly: ["SQL"], jobWants: ["Machine learning", "Python", "SQL"],
    notes: "No formal training in machine learning is followed by real ML work, so a negation filter that blanks the whole sentence would wrongly drop it. SQL is denied.",
  },
  {
    id: "neg-4", category: "negation",
    resumes: [`Samira Khan, Career Changer
Built three small websites for local shops in plain JavaScript, including a booking form that took 60 bookings in its first month.
I am currently learning React but have not built anything with it yet.
I have only watched tutorials on Power BI and Tableau, and I have no real dashboards to show.
Previously a school administrator for six years, managing timetables for 800 pupils.`],
    job: `Junior Web Developer, Education Start-up
Build features in JavaScript and React, and a small Tableau dashboard for teachers. We will train you on the dashboard tools. You will join a team that visits schools once a term and listens to teachers.`,
    resumeShows: ["JavaScript"], resumeMentionsOnly: ["React", "Dashboards"], jobWants: ["JavaScript", "React", "Dashboards"],
    notes: "Learning but not shipped, and tutorials only. Both are mentions, not proof.",
  },

  // ---- near-miss words ----
  {
    id: "near-1", category: "near-miss words",
    resumes: [`Mateo Silva, Web Developer
Built a single-page booking app in JavaScript and TypeScript with Vue, serving 5,000 monthly users.
Migrated an old jQuery site to modern ECMAScript modules, shrinking the bundle by 38%.
Wrote Node.js scripts to resize images on upload, saving the team 3 hours a week.
Education: Associate degree in Web Development, Pinecrest College.
Skills: JavaScript, TypeScript, Vue, Node.js`],
    job: `Web Developer
Build Vue interfaces in JavaScript and TypeScript, and small Node.js services behind them. You will work with a designer and ship every week. A portfolio of live work is more useful to us than a long list of tools.`,
    resumeShows: ["JavaScript"], resumeMentionsOnly: [], jobWants: ["JavaScript"],
    notes: "JavaScript must not match Java. This should pass today.",
  },
  {
    id: "near-2", category: "near-miss words",
    resumes: [`Chloe Brandt, Sales Associate
I excel in teamwork and customer service, and my managers often asked me to train new staff.
Hit 112% of my monthly sales target for eight months in a row at a busy electronics store.
Resolved over 30 customer complaints a month and kept a 4.8 satisfaction score.
Opened and closed the store, balancing the till to the cent.
Education: High school diploma, Parkview Secondary School.
Interests: running, board games and baking for the staff room.`],
    job: `Sales Coordinator
We want someone who can excel in a fast, friendly team and keep customers happy. Track daily targets, handle returns and support the store manager. No technical skills are required and full training is given on the till system.`,
    resumeShows: [], resumeMentionsOnly: [], jobWants: [],
    notes: "Excel the verb is not Excel the tool. Nothing in either text is on the catalog.",
  },
  {
    id: "near-excel-tool", category: "near-miss words",
    resumes: [`Ibrahim Yusuf, Finance Assistant
Built monthly budget forecasts in Excel using formulas, charts and conditional formatting for a team of 12 managers.
Cut the month-end close by two days by replacing copy and paste with linked sheets.
Checked 300 supplier invoices a month against purchase orders and flagged 14 mismatches.
Education: Diploma in Accounting, Brookfield Institute.`],
    job: `Finance Assistant
Strong Excel skills (formulas, charts and clean layouts) are needed for the month-end close. You will check invoices, keep the ledger tidy and help the finance manager. Accuracy matters more than speed.`,
    resumeShows: ["Excel"], resumeMentionsOnly: [], jobWants: ["Excel"],
    notes: "The bare word Excel names the tool. The catalog only lists longer phrases such as microsoft excel and excel spreadsheet, so this should miss on both sides.",
  },
  {
    id: "near-3", category: "near-miss words",
    resumes: [`Grace Obi, IT Support Technician
React to monitoring alerts within 15 minutes and keep a log of what was fixed and why.
Wrote Bash one-liners to reset accounts and clear disk space on Linux laptops.
Supported 150 staff across two offices, closing 90% of tickets on the first reply.
Trained colleagues to react calmly when a laptop is lost or a password leaks.
Education: Certificate in IT Support, Greenfield College.`],
    job: `IT Support Technician
Respond to staff requests quickly and react calmly when things break. You will look after Linux laptops and write small Bash scripts for repeat jobs. Friendly service is the whole job.`,
    resumeShows: ["Linux"], resumeMentionsOnly: [], jobWants: ["Linux"],
    notes: "React to alerts is a verb, not the React library.",
  },
  {
    id: "near-4", category: "near-miss words",
    resumes: [`Jonas Weber, Data Science Student
At present I am in the final year of my degree and looking for an internship.
Built a Python script that scrapes public weather data and plots monthly trends, which I published on GitHub.
Completed a project predicting bike rentals with pandas and a scikit-learn model, then compared three settings.
Education: BSc Data Science (expected next June), Alder University.`],
    job: `Junior Data Scientist
Build small machine learning models in Python and keep your code on GitHub. We care about clean, readable work and plain explanations in code comments. You will join a team of six.`,
    resumeShows: ["Python", "Git", "Machine learning"], resumeMentionsOnly: [], jobWants: ["Python", "Machine learning", "Git"],
    notes: "At present means right now. It is not the Communication verb present.",
  },
  {
    id: "near-5", category: "near-miss words",
    resumes: [`Mei Ling Chua, Policy Analyst
I present findings to the board each quarter and answer questions from people outside the field.
Ran two storytelling workshops that helped researchers turn dense tables into plain messages.
Built an Excel spreadsheet model of housing costs with pivot tables and shared it with 12 councils.
Led a literature review of 60 studies on transport pricing.
Education: MA Public Policy, Larch University.`],
    job: `Policy Analyst
Present evidence to ministers and local councils in short, clear briefings. You will keep a spreadsheet model up to date, using Excel spreadsheet formulas and pivot tables, and read a lot of research.`,
    resumeShows: ["Communication", "Excel"], resumeMentionsOnly: [], jobWants: ["Communication", "Excel"],
    notes: "Present findings is Communication. This should pass today.",
  },
  {
    id: "near-6", category: "near-miss words",
    resumes: [`Oscar Lindqvist, Junior Developer
I worked with the rest of the team on a parking app and reported to the lead engineer each Friday.
Built a Python script that renames photos by date and ran it on 3,000 files.
Joined a professional network of local developers and attended monthly meetups.
Enjoy writing code in my spare time, and I read a lot of technical blogs.
Education: BSc Computer Science, Birchwood University.`],
    job: `Junior Developer
Write Python scripts for the operations team. You will report to the lead engineer and work with the rest of the platform team, and you will be asked to explain your choices in code review.`,
    resumeShows: ["Python"], resumeMentionsOnly: [], jobWants: ["Python"],
    notes: "rest of the team is not REST, network of developers is not Networking, report to is not Reporting, writing code is not Reporting.",
  },
  {
    id: "near-7", category: "near-miss words",
    resumes: [`Elena Petrova, Backend Developer
Designed a MongoDB document store for product reviews, handling 2 million documents with reads under 100 ms.
Chose NoSQL because the reviews vary in shape, and built a Flask service on top of it with caching that cut database load by 40%.
Shipped weekly using trunk-based development with short-lived branches in Git.
Education: BSc Informatics, Willow Hill University.`],
    job: `Backend Developer
Build Python services with Flask on top of a NoSQL store such as MongoDB, and keep every change in Git with short branches. You will join a small, calm team.`,
    resumeShows: ["Python", "Git"], resumeMentionsOnly: [], jobWants: ["Python", "Git"],
    notes: "NoSQL is not SQL. This should pass today.",
  },

  // ---- keyword stuffing versus real projects ----
  {
    id: "stuff-1", category: "stuffed vs real",
    resumes: [`Jordan Blake
Objective: looking for a role in AI and data.
Skills: Python, SQL, Tableau, AWS, Docker, Kubernetes, React, Machine Learning, TensorFlow, Git, Agile, Scrum, Linux, Java, Excel
Experience: shop assistant, Corner Mart, 2023 to present. Stocked shelves and served customers.
Education: high school diploma, Maple Grove Secondary School.
Interests: gaming, football and music.
Summary: hard-working, fast learner and team player who is passionate about technology and keen to grow into a new career.
References on request.`],
    job: `Junior ML Engineer
Build machine learning models in Python with TensorFlow, pull data with SQL, package models in Docker and deploy to AWS. Use Git for everything. You will join a team of five and ship a first small model in your second month.`,
    resumeShows: [], resumeMentionsOnly: ["Python", "SQL", "Dashboards", "Cloud", "MLOps", "React", "Machine learning", "Deep learning", "Git", "Agile", "Linux", "Java", "Excel"],
    jobWants: ["Machine learning", "Python", "Deep learning", "SQL", "MLOps", "Cloud", "Git"],
    notes: "A skills list with no project behind it. Every skill is a mention and none is proof. 2023 to present is also a near miss for Communication.",
  },
  {
    id: "stuff-2", category: "stuffed vs real",
    resumes: [`Core competencies
Developed strong skills in Python, SQL, Tableau, AWS and Docker.
Implemented best practices in Git, Agile and Scrum.
Experience
Cashier at a petrol station for two years, handling payments and closing the till.
Volunteer at a community garden on weekends.
Education: Certificate III in Business, Southport TAFE.
Summary: a motivated learner with a positive attitude who works well under pressure and enjoys solving problems.`],
    job: `Data Analyst Trainee
Use SQL and Tableau to answer questions from the operations team, and learn Python on the job. A degree is not required. We will pair you with an analyst for the first three months.`,
    resumeShows: [], resumeMentionsOnly: ["Python", "SQL", "Dashboards", "Cloud", "MLOps", "Git", "Agile"], jobWants: ["SQL", "Dashboards", "Python", "Data analysis"],
    notes: "Action verbs (developed, implemented) sit in a keyword line. The scanner may read them as proof.",
  },
  {
    id: "stuff-3", category: "stuffed vs real",
    resumes: [`Nadia Rossi, Data Analyst
Built a Python pipeline with pandas that cleaned 3 million sales records each night, cutting weekly prep from 4 hours to 20 minutes.
Created Tableau dashboards for regional managers, which increased use of the weekly figures by 60%.
Wrote SQL queries against a Postgres warehouse to find the 12 stores losing money; closing two saved 1.1 million.
Kept all code in Git with pull requests and reviewed two teammates' changes each sprint.
Education: BSc Statistics, Meridian University.`],
    job: `Data Analyst, Retail Chain
Own the analysis of sales and store performance. Use Python and SQL daily, build Tableau dashboards, and keep your work in Git. You will help managers decide which stores to grow.`,
    resumeShows: ["Python", "Dashboards", "SQL", "Git", "Data analysis"], resumeMentionsOnly: [], jobWants: ["Python", "SQL", "Dashboards", "Git", "Data analysis"],
    notes: "A strong, real résumé with numbers. This is the best case the scanner should handle well.",
  },
  {
    id: "stuff-4", category: "stuffed vs real",
    resumes: [`Kenji Watanabe, Data Engineer
Built an Airflow pipeline in Python that loads 2 million rows nightly from three vendors into a warehouse on GCP, cutting delivery time by 40%.
Modelled the data with dbt and wrote SQL tests that blocked bad loads, preventing 9 broken dashboards in a quarter.
Documented the pipeline and ran a handover session for two new engineers.
Education: BEng Information Engineering, Coastal University.`],
    job: `Data Engineer
Build and run data pipelines with Airflow and dbt in Python and SQL on GCP. You will keep loads on time, add checks that stop bad data and hand pipelines over with clear notes. We run a small on-call rota and pay for it.`,
    resumeShows: ["Data engineering", "Python", "Cloud", "SQL"], resumeMentionsOnly: [], jobWants: ["Data engineering", "Python", "SQL", "Cloud"],
    notes: "GCP means Cloud. Real project work with numbers.",
  },

  // ---- off-catalog and non-tech roles ----
  {
    id: "off-1", category: "non-tech roles",
    resumes: [`Amara Johnson, Registered Nurse
Cared for up to 12 patients per shift on a surgical ward, with a 98% medication accuracy audit score.
Strong communication with patients' families, explaining care plans in plain words.
Trained six new graduate nurses on ward routines and safe handover.
Coordinated with doctors and physiotherapists to plan discharge for 40 patients a month.
Education: Bachelor of Nursing, Fairhaven University.`],
    job: `Staff Nurse, Surgical Ward
Care for post-operative patients, give medication safely and keep clear communication with patients and families. Night shifts are part of the rota. We offer a paid preceptor year for new graduates and support for further study.`,
    resumeShows: ["Communication"], resumeMentionsOnly: [], jobWants: ["Communication"],
    notes: "A non-tech role. Only Communication is on the catalog.",
  },
  {
    id: "off-2", category: "non-tech roles",
    resumes: [`Luca Bianchi, Sous Chef
Ran the pastry section of a 90-seat restaurant, producing 200 covers on a Saturday night.
Cut food waste by 25% by changing prep quantities and reusing trimmings in staff meals.
Trained four junior chefs and wrote the allergen checklist used by the whole kitchen.
Won a regional young chef award for a seasonal tasting menu.
Education: Diploma in Culinary Arts, Harbour Hospitality School.`],
    job: `Head Chef, Neighbourhood Bistro
Lead a kitchen of six, design a seasonal menu, control costs and keep the kitchen safe and clean. You will order from local farms and bakers and teach the team. Five days a week, evenings and weekends included.`,
    resumeShows: [], resumeMentionsOnly: [], jobWants: [],
    notes: "Nothing on the catalog. The scanner should fall back to the placeholder skill.",
  },
  {
    id: "off-3", category: "non-tech roles",
    resumes: [`Zoe Martin, Retail Supervisor
Supervised eight staff in a fashion store and raised weekly sales by 14% through new window displays.
Tracked stock in a spreadsheet and reordered best sellers, cutting out-of-stock days by half.
Ran the store's social media account and grew followers from 800 to 3,100 in six months.
Education: Certificate in Retail Management, Eastfield College.`],
    job: `Marketing Coordinator
Plan social media posts, run small campaigns and track results in an Excel spreadsheet. You will work with the owner and a freelance photographer. No degree needed, but a good eye and steady habits are.`,
    resumeShows: ["Excel"], resumeMentionsOnly: [], jobWants: ["Excel"],
    notes: "A spreadsheet is the only catalog skill. The résumé says spreadsheet and the job says Excel spreadsheet.",
  },
  {
    id: "off-4", category: "non-tech roles",
    resumes: [`Hamid Rahimi, Site Supervisor
Supervised a crew of 18 on a six-storey apartment build, finishing two weeks early.
Wrote weekly site reports covering progress, safety and delays, and agreed fixes with the architect.
Cut material waste by 12% by reordering deliveries around the pour schedule.
Held daily safety briefings and recorded zero lost-time injuries for 14 months.
Education: Diploma in Building Construction, Redstone Institute.`],
    job: `Site Supervisor, Residential Build
Lead the crew day to day, prepare weekly progress reports and run the morning safety briefing. You will deal with the architect and the council inspector. Early starts, outdoor work and steel-capped boots.`,
    resumeShows: ["Reporting"], resumeMentionsOnly: [], jobWants: ["Reporting"],
    notes: "Reports in the plural misses the report term on both sides.",
  },

  // ---- multi-résumé input ----
  {
    id: "multi-1", category: "multi-résumé",
    resumes: [
      `Sana Iqbal, Graduate Analyst
Analysed retail footfall data with pandas and presented the three biggest patterns to store managers.
Built a Python script that merges weekly CSV files and flags missing days, saving 2 hours of manual checks.
Education: BSc Mathematics, Kingsford University.`,
      `Sana Iqbal, Volunteer Work
Created a Power BI dashboard for a food bank showing weekly parcel numbers by district.
Wrote SQL queries in SQLite to match donor records and remove 300 duplicates.
Organised a team of 10 volunteers using a Kanban board.`,
    ],
    job: `Analyst, Retail Insights
Python and SQL every day, Power BI dashboards for store managers, and data analysis of footfall and sales. Present findings to the managers clearly. You will work in an Agile team of seven.`,
    resumeShows: ["Python", "Data analysis", "Communication", "Dashboards", "SQL", "Agile"], resumeMentionsOnly: [], jobWants: ["Python", "SQL", "Dashboards", "Data analysis", "Communication", "Agile"],
    notes: "Evidence is spread across two files. The quote labels must point at the right one.",
  },
  {
    id: "multi-2", category: "multi-résumé",
    resumes: [
      `Pavel Novak, Software Developer
Built a Spring Boot service in Java that handled 300 requests per second for a ticketing site.
Added an integration test suite that ran on every build and caught 12 faults before release.
Education: BSc Software Engineering, Danube University.`,
      `Pavel Novak, Software Developer (older version)
Built a Spring Boot service in Java that handled 300 requests per second for a ticketing site.
Built an Android app in Kotlin with 10,000 downloads.
Education: BSc Software Engineering, Danube University.`,
    ],
    job: `Java Developer
Build Spring Boot services in Java, and welcome Kotlin where it helps. Write an integration test for each feature. You will join a team of eight and share code reviews.`,
    resumeShows: ["Java", "Testing"], resumeMentionsOnly: [], jobWants: ["Java", "Testing"],
    notes: "The same bullet appears in both files. Duplicate passages must not earn the second-passage points.",
  },
  {
    id: "multi-3", category: "multi-résumé",
    resumes: [
      `Imani Okoro, Junior Developer
Built a Python tool that reads supplier invoices and loads totals into a SQL database, saving the accounts team 6 hours a week.
Added a Flask page so staff can search past invoices, used by 25 colleagues.
Education: BSc Computing, Stonebridge University.`,
      `Cover letter
Dear hiring team, I am excited to apply for the Cloud Engineer role. I have never used Terraform and I am new to AWS, but I have a strong record of learning quickly. My Python and SQL work shows I can pick up new tools. I would welcome the chance to be mentored.`,
    ],
    job: `Cloud Engineer, Graduate Track
Automate cloud deployments on AWS with Terraform, write Python tools and query SQL tables for checks. We will teach the cloud parts. You will join a team of six with a named mentor.`,
    resumeShows: ["Python", "SQL"], resumeMentionsOnly: ["Cloud"], jobWants: ["Cloud", "Python", "SQL"],
    notes: "The second file is a cover letter that denies Terraform and AWS experience.",
  },

  // ---- very short and very long ----
  {
    id: "length-short", category: "very short or long",
    resumes: [`Python developer, 2 years of Django experience. Built REST services.`],
    job: `Python developer needed. Django and SQL.`,
    resumeShows: ["Python", "APIs"], resumeMentionsOnly: [], jobWants: ["Python", "SQL"],
    notes: "One line each. REST services is APIs.",
  },
  {
    id: "length-long-resume", category: "very short or long",
    resumes: [[
      "Ava Lindgren, Cashier and Part-time Cloud Learner",
      ...Array.from({ length: 40 }, (_, i) => retailDay(i)),
      "Last year I built Terraform modules for a small AWS account and wrote a Python script that shuts down idle servers, cutting the monthly bill by 30%.",
    ].join("\n")],
    job: `Cloud Engineer
Run workloads on AWS with Terraform and automate chores in Python. You will join a small team and learn quickly. We pair new starters with a mentor and review work together every Friday.`,
    resumeShows: ["Cloud", "Python"], resumeMentionsOnly: [], jobWants: ["Cloud", "Python"],
    notes: "Around 900 words, with the only relevant lines at the very end.",
  },
  {
    id: "length-long-job", category: "very short or long",
    resumes: [`Leo Marchetti, Graduate Developer
Built a Python tool that loads customer records into a SQL database and checks them nightly, which cut manual checks by 5 hours a week.
Wrote queries for a weekly summary that managers use in meetings.
Education: BSc Computer Science, Ashford University.`],
    job: [
      "Full-stack Engineer. In this role you will use Python for automation, SQL for reports, Tableau dashboards for managers, AWS for hosting, Git for every change, Agile ceremonies, React for the front end, Java for older services and Linux for deployment.",
      ...Array.from({ length: 30 }, (_, i) => boiler(i)),
    ].join("\n"),
    resumeShows: ["Python", "SQL"], resumeMentionsOnly: [], jobWants: ["Python", "SQL", "Dashboards", "Cloud", "Git", "Agile", "React", "Java", "Linux"],
    notes: "Nine skills asked for in one sentence, then a long block of benefits. previewAnalysis keeps only six, so some gold skills will be cut by the limit.",
  },
  {
    id: "length-pdf", category: "very short or long",
    resumes: [`Aditi Rao   Sales Operations Associate   • Built Python scripts with pandas that clean monthly sales files and cut prep from 3 hours to 25 minutes.   • Wrote SQL queries on MySQL to answer weekly questions from the sales team.   • Made Metabase dashboards that managers check every morning.   • Kept the scripts in Git with a pull request for each change.   Education   BCom Business Analytics, Silverton University   Skills   Python  SQL  Git  Metabase   Interests   cycling and cooking`],
    job: `Sales Operations Associate
Use Python and SQL every day, build Metabase dashboards and keep scripts in Git. You will work with the sales team and answer their questions each week. A tidy, careful hand is key.`,
    resumeShows: ["Python", "SQL", "Dashboards", "Git"], resumeMentionsOnly: [], jobWants: ["Python", "SQL", "Dashboards", "Git"],
    notes: "Text pasted from a PDF with no line breaks, only bullets and runs of spaces.",
  },

  // ---- skills only in the job ----
  {
    id: "jobonly-1", category: "job-only skills",
    resumes: [`Ethan Cole, Frontend Developer
Built a checkout flow in React and TypeScript that raised completed orders by 9% for a furniture retailer.
Created reusable components and a design kit used by four product teams.
Fixed 30 accessibility issues found in an external audit and re-ran the checks.
Education: BA Interaction Design, Northfield College.`],
    job: `Cloud Engineer
Run our services on AWS with Terraform and look after the Linux hosts they sit on. You will write Bash for repeat jobs and join an on-call rota. We value steady, careful change over clever tricks.`,
    resumeShows: ["JavaScript", "React"], resumeMentionsOnly: [], jobWants: ["Cloud", "Linux"],
    notes: "The role asks for skills the résumé lacks. Cloud and Linux should show demand with zero proof.",
  },
  {
    id: "jobonly-2", category: "job-only skills",
    resumes: [`Dev Patel, Computer Science Student
Wrote Python scripts that parse web server logs and count failed logins, which I used on my home lab.
Installed Ubuntu on two old laptops, set up SSH and cron jobs with Bash, and wrote a short guide for my housemates.
Captain of the university chess club; organised a 40-player tournament.
Education: BSc Computer Science (year 2), Highmoor University.`],
    job: `Security Analyst, Graduate
Triage alerts in Splunk, take part in incident response, learn TCP and DNS troubleshooting and keep Linux hosts in good order. You will be taught the SIEM from scratch. Shifts include some nights.`,
    resumeShows: ["Python", "Linux"], resumeMentionsOnly: [], jobWants: ["SIEM", "Incident response", "Networking", "Linux"],
    notes: "Most of the posting is not in the résumé.",
  },
  {
    id: "jobonly-3", category: "job-only skills",
    resumes: [`Priscilla Ang, Marketing Coordinator
Built pivot tables in Excel spreadsheets to compare campaign results across six channels, which led to moving 20% of spend to email.
Organised newsletters for 15,000 subscribers and increased the open rate from 21% to 29%.
Coordinated with agencies and printers to deliver three events on budget.
Education: BA Media Studies, Seaview University.`],
    job: `Product Analyst
Write SQL, design each A/B test and read the confidence interval, and build Looker dashboards. Product analytics is the core of the job. You will sit with the product team and answer their questions each week.`,
    resumeShows: ["Excel"], resumeMentionsOnly: [], jobWants: ["SQL", "Statistics", "Dashboards", "Data analysis"],
    notes: "The only overlap between the two texts is spreadsheet work, which the role does not ask for.",
  },
  {
    id: "jobonly-4", category: "job-only skills",
    resumes: [`Yusuf Demir, Data Analyst
Wrote SQL against MySQL to answer 40 ad hoc questions a month from sales and support.
Built a Metabase dashboard of ticket volume and response time that managers check each morning.
Cleaned and merged spreadsheets from three regions, replacing a day of copy and paste each month.
Education: BSc Business Information Systems, Delta Valley University.`],
    job: `Data Engineer
Build ETL pipelines with Airflow and Spark in Python and SQL on AWS. You will own loads that feed the finance dashboards. A small team, a quiet office and a lot of trust.`,
    resumeShows: ["SQL", "Dashboards", "Data analysis", "Excel"], resumeMentionsOnly: [], jobWants: ["Data engineering", "Python", "SQL", "Cloud", "Dashboards"],
    notes: "An analyst applying for an engineer role. Data engineering, Python and Cloud are job-only.",
  },

  // ---- typical full-stack examples ----
  {
    id: "typ-1", category: "typical",
    resumes: [`Ravi Shankar, ML Intern
Trained a PyTorch model that classified support tickets with 87% accuracy and presented the results to the product team.
Used Python, pandas and Jupyter to clean 120,000 ticket records, fixing labels that were wrong in 6% of rows.
Containerised the model with Docker and served it through a small REST API, cutting response time to 80 ms.
Kept experiments in Git and tracked runs with MLflow.
Education: MSc Artificial Intelligence, Redwood University.`],
    job: `Machine Learning Engineer
Train and evaluate machine learning models in Python with PyTorch. Deploy them with Docker on AWS and serve them through an API. Keep code in Git and explain results to stakeholders.`,
    resumeShows: ["Deep learning", "Machine learning", "Python", "Data analysis", "MLOps", "APIs", "Git", "Communication"], resumeMentionsOnly: [],
    jobWants: ["Machine learning", "Python", "Deep learning", "MLOps", "Cloud", "APIs", "Git", "Communication"],
    notes: "Eight skills are asked for, so some gold skills will be cut by the top-six limit.",
  },
  {
    id: "typ-2", category: "typical",
    resumes: [`Maria Santos, QA Engineer
Built a Selenium and Cypress suite covering 120 user flows, which cut manual regression from two days to three hours.
Ran sprint planning and daily stand-ups with a Scrum team of eight, and tracked bugs in Jira.
Added Playwright checks to the pipeline so each pull request is verified before merge.
Mentored two junior testers and wrote the team's bug triage guide.
Education: BSc Information Systems, Southern Cross University.`],
    job: `QA Automation Engineer
Own test automation with Selenium or Playwright, work in an Agile Scrum team and keep checks in the CI/CD pipeline. Jira is our tracker. You will help developers find faults early and kindly.`,
    resumeShows: ["Testing", "Agile", "Git"], resumeMentionsOnly: [], jobWants: ["Testing", "Agile", "Git"],
    notes: "Bug triage is not security Incident response.",
  },
  {
    id: "typ-3", category: "typical",
    resumes: [`Hana Kim, UX Designer
Ran user research with 14 participants for a banking app and turned the findings into three redesigned flows in Figma.
Built clickable prototypes and wireframes that the engineering team estimated in one sprint.
Cut sign-up drop-off by 17% after a usability test of the new onboarding screens.
Facilitated weekly design critiques and shared decisions with product managers.
Education: BDes Visual Design, Lakeview Institute.`],
    job: `UX Designer, Mobile Banking
Lead user research, produce wireframes and Figma prototypes, and run usability tests with real customers. You will work with engineers in a Scrum team and share what you learn each sprint.`,
    resumeShows: ["UX design"], resumeMentionsOnly: [], jobWants: ["UX design", "Agile"],
    notes: "A design role. Scrum in the job is Agile. The résumé shows sprint work but never names Scrum.",
  },
];

// Real résumés and postings end with lines that name no skill (languages, interests, how to apply). The hand-written cases above keep to the
// lines that matter, so these closing lines top up any case that falls short of the agreed word range. None of them contains a catalog term.
const resumePad = [
  "Languages: English (native), Mandarin (conversational).",
  "Interests: hiking, board games and helping at a community library on weekends.",
  "Awards: dean's list for two semesters and first place in a regional quiz.",
  "Additional: full driving licence, available to start within one month, references on request.",
];
const jobPad = [
  "We welcome applicants from every background and will adjust the process for any need you tell us about.",
  "The role is based in a bright office with hybrid working after the first three months and a yearly learning budget.",
  "Hours are nine to half past five with a proper lunch break, and applications close at the end of the month.",
];
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const topUp = (text: string, floor: number, pad: string[], start: number) => {
  let out = text;
  for (let i = 0; words(out) < floor && i < pad.length; i++) out += `
${pad[(start + i) % pad.length]}`;
  return out;
};

export const cases: EvalCase[] = raw.map((item, n) => {
  if (item.category === "very short or long") return item;
  const otherWords = words(item.resumes.slice(1).join(" "));
  const first = topUp(item.resumes[0], 80 - otherWords, resumePad, n);
  return { ...item, resumes: [first, ...item.resumes.slice(1)], job: topUp(item.job, 60, jobPad, n) };
});
