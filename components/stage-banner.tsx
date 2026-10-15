import type { StageScene } from "@/lib/journey";

/** One emoji per scene, shown at the start of the description line. */
const SCENE_ICON: Record<StageScene, string> = { camp: "📝", woods: "🔍", lookout: "🧭", summit: "🎯", training: "🚀", workshop: "🛠️" };

/** Header of a stage: a teal pill and the title on a small glass plate that sits on the stage's full-section scene (stages.css; data-scene is kept as a hook only).
 *  The pill reads "Stage n" when `n` is given, or `tab` for a section that is not a journey stage; with neither it is left out. `line` is optional too; without it no paragraph is rendered.
 *  Pass heading="p" where the content below already has its own h2. */
export function StageHeader({ n, tab, title, line, scene, titleId, heading = "h2" }: {
  n?: number; tab?: string; title: string; line?: string; scene: StageScene; titleId?: string; heading?: "h2" | "p";
}) {
  const Title = heading;
  const pill = tab ?? (n !== undefined ? "Stage " + n : undefined);
  return <div className="stage-header" data-scene={scene}>
    <div className="stage-plate">
      <div className="stage-top">
        {pill && <span className="stage-tab">{pill}</span>}
        <Title id={titleId} className="stage-title">{title}</Title>
      </div>
      {line && <p className="stage-line"><span className="stage-line-icon" aria-hidden="true">{SCENE_ICON[scene]}</span> <span>{line}</span></p>}
    </div>
  </div>;
}
