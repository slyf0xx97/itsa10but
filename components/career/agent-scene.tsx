import { PixelAgent, type SpriteKind } from "@/components/career/reader-cards";

export type Mood = "walk" | "look" | "sit" | "sleep";

/** What each reader does while it waits: Scout paces, Finder looks around with a question mark, Recruiter sits on a bench, Planner dozes. */
export const READER_MOODS: { kind: SpriteKind; mood: Mood }[] = [
  { kind: "scout", mood: "walk" }, { kind: "finder", mood: "look" }, { kind: "recruiter", mood: "sit" }, { kind: "coach", mood: "sleep" },
];

/** One reader on a short dashed ground line, doing its waiting behaviour (styles: app/dashboard.css, `.dg-scene`). Decorative only. */
export function AgentScene({ kind, mood }: { kind: SpriteKind; mood: Mood }) {
  return <div className={"dg-scene " + mood} aria-hidden="true">
    <span className="dg-who"><PixelAgent kind={kind} small /></span>
    <span className="dg-prop" />
  </div>;
}

/** The four readers side by side, each doing its own thing. Fills the space under the radar so it never looks empty. */
export function AgentCamp() {
  return <div className="camp">
    <div className="camp-row">{READER_MOODS.map((reader) => <AgentScene key={reader.kind} kind={reader.kind} mood={reader.mood} />)}</div>
  </div>;
}
