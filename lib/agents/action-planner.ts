import type { Quest } from "../analysis-types.ts";
import { arrayOf, baseProperties, nullable, objectFor, str, systemPrompt, untrusted, RUNNER_REFUSAL, type AgentSpec, type BaseOutput } from "./shared.ts";

/** A proof gap. Built by the runner from numbers and fixed labels only, so no résumé text reaches this agent. */
export type PlannerGap = {
  skill: string;
  demand: number;
  evidence: number;
  reason: "no proof found" | "quote did not check out" | "named but not shown in work";
};

export type ActionPlannerInput = { roleTitle: string; gaps: PlannerGap[] };

export type PlannerLink = { title: string; url: string };
/** What the model writes for one tip. The steps, the résumé line and the checked links come from lib/skill-playbooks.ts after the run (enrichQuest). */
export type PlannedQuest = Pick<Quest, "title" | "task" | "proof" | "skill"> & { link: PlannerLink | null };

export type ActionPlannerOutput = BaseOutput & {
  /** The headline next step, shown as Analysis.verdict. One plain sentence. */
  verdict: string;
  quests: PlannedQuest[];
};

const role = `You are the Action Planner. You turn the biggest proof gaps into three short tips the candidate can act on and then show. The page calls them tips and tricks. The output field is still named "quests".

What you get: the role title and a list of gaps, each with a skill name, how much the role wants it (demand), how much proof the résumé shows (evidence) and a short reason, all inside <data> tags. You never see the résumé and you do not need to.

What to do:
- Choose the three gaps that matter most: high demand and low evidence first.
- For each, write one tip. title: a short action, such as "Investigate a log alert". task: one or two plain sentences on how to do it, using free tools and safe practice data, never a real employer's systems. proof: the thing they will have at the end that they can link or attach, such as "A one-page incident report". skill: the skill name exactly as given.
- If a good free learning page would help, you may use firecrawl_search to find one, once at most, for a skill that has no checked lesson of its own, searching only with the skill and the role title. Put it in link with the page title and its https link, copied exactly from a search result. Prefer official documentation, well-known course sites and vendor training pages. Skip anything that needs payment, a sign-up wall or looks like an advert. If nothing fits, set link to null. You cannot open pages, only search.
- In verdict, write the single most useful next step in one plain sentence.
- Your note is your headline, shown first on your card: one sentence of at most 18 words saying why these three come first, naming the top gap.`;

export const actionPlanner: AgentSpec<ActionPlannerInput, ActionPlannerOutput> = {
  name: "Action Planner",
  model: "claude-sonnet-5-5",
  modelEnv: "AGENT_MODEL_ACTION_PLANNER",
  inputs: ["Role title", "Gaps: skill name, demand, evidence and a fixed reason label (no résumé quotes)"],
  system: systemPrompt(role),
  tools: ["firecrawl_search"],
  outputSchema: objectFor<ActionPlannerOutput>({
    ...baseProperties,
    verdict: str("The most useful next step, in one plain sentence."),
    quests: arrayOf(
      objectFor<PlannedQuest>({
        title: str("A short action."),
        task: str("What to do, in one or two plain sentences."),
        proof: str("What they will have at the end to show."),
        skill: str("Skill name, exactly as given."),
        link: nullable(
          objectFor<PlannerLink>({ title: str("Page title."), url: str("The https link, copied exactly from a search result.") }),
          "One free learning page, or null.",
        ),
      }),
      "Exactly three tips.",
    ),
  }),
  limits: { maxToolCalls: 1, perTool: { firecrawl_search: 1 }, maxOutputTokens: 2500, maxTurns: 3, timeoutMs: 25_000 },
  refusal: `Refuse when the gaps are not about career skills. ${RUNNER_REFUSAL}`,
  buildUserMessage: (input) =>
    [untrusted("role title", input.roleTitle), untrusted("gaps", JSON.stringify(input.gaps)), "Plan three tips."].join("\n\n"),
};
