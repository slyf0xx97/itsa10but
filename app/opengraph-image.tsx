import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brandIcon } from "@/lib/brand-icon";

/**
 * The link preview for shares and search cards, drawn at build time from the site's own art: the camp scene as the backdrop, the headline on a frosted plate
 * (Pixelify Sans, the site's heading font) and the four pixel readers standing on the grass. The two font files and the sprite sheet are read from public/assets.
 * Pixelify Sans and Atkinson Hyperlegible are both under the SIL Open Font License.
 */
export const alt = "itsa10but: an open-source résumé reviewer that uses multi-agentic AI to analyse your résumé against a real job and show you how to improve it";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = (path: string) => readFile(join(process.cwd(), "public", "assets", path));
const dataUri = (type: string, bytes: Buffer) => `data:${type};base64,${bytes.toString("base64")}`;

const INK = "#1f2430";
const TEAL = "#167a66";
const ORANGE = "#e8912d";
const READERS = [
  { name: "Role Scout", x: 0, y: 0, tint: "#bfeaf5" },
  { name: "Experience Finder", x: 1, y: 0, tint: "#c9f1dc" },
  { name: "Recruiter", x: 0, y: 1, tint: "#fcd3cc" },
  { name: "Action Planner", x: 1, y: 1, tint: "#fde9a8" },
];
const SPRITE = 170;

export default async function Image() {
  const [pixel, read, scene, sheet] = await Promise.all([asset("fonts/PixelifySans-600.ttf"), asset("fonts/AtkinsonHyperlegible-700.ttf"), asset("scenes/bg-camp.svg"), asset("agents/pixel-team-v2.png")]);
  const sceneUri = dataUri("image/svg+xml", scene);
  const sheetUri = dataUri("image/png", sheet);

  return new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", fontFamily: "Atkinson", color: INK }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn into the preview image, not rendered on a page */}
        <img src={sceneUri} width={1200} height={630} alt="" style={{ position: "absolute", left: 0, top: 0 }} />

        <div style={{ position: "absolute", left: 56, top: 34, display: "flex", flexDirection: "column", width: 840, padding: "20px 36px 22px", borderRadius: 32, background: "rgba(255,255,255,0.88)", border: "4px solid #ffffff", boxShadow: "0 10px 0 rgba(31,36,48,0.18)" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {brandIcon(64, sheetUri)}
            <div style={{ display: "flex", marginLeft: 14, fontFamily: "Pixelify", fontSize: 38, color: TEAL }}>itsa10but?</div>
          </div>
          <div style={{ display: "flex", marginTop: 10, fontFamily: "Pixelify", fontSize: 70, lineHeight: 1.05 }}>Your résumé is a 10!</div>
          <div style={{ display: "flex", fontFamily: "Pixelify", fontSize: 70, lineHeight: 1.05 }}>
            <span style={{ color: ORANGE }}>But…</span>
            <span style={{ marginLeft: 20 }}>it’s a…?</span>
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 27, lineHeight: 1.25, color: "#2b5f73" }}>An open-source résumé reviewer using multi-agentic AI. Made for tech and tech-adjacent roles.</div>
        </div>

        {/* Three small facts, top right, as stickers. */}
        <div style={{ position: "absolute", right: 60, top: 60, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {["Free", "Open source", "No sign-up"].map((label, i) => (
            <div key={label} style={{ display: "flex", marginBottom: 14, padding: "8px 24px", borderRadius: 999, background: i === 0 ? TEAL : i === 1 ? ORANGE : "#2b8fb3", color: "#fff", fontSize: 30, border: "3px solid #fff", transform: `rotate(${i === 1 ? 3 : -3}deg)` }}>{label}</div>
          ))}
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, display: "flex", justifyContent: "center" }}>
          {READERS.map((reader) => (
            <div key={reader.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 24px" }}>
              <div style={{ display: "flex", width: SPRITE, height: SPRITE, borderRadius: 40, background: reader.tint, border: "4px solid #ffffff", boxShadow: "0 8px 0 rgba(31,36,48,0.2)", overflow: "hidden" }}>
                <div style={{ display: "flex", width: SPRITE, height: SPRITE, backgroundImage: `url(${sheetUri})`, backgroundSize: `${SPRITE * 2}px ${SPRITE * 2}px`, backgroundPosition: `${-reader.x * SPRITE}px ${-reader.y * SPRITE}px`, backgroundRepeat: "no-repeat" }} />
              </div>
              <div style={{ display: "flex", marginTop: 12, padding: "3px 16px", borderRadius: 999, background: "rgba(255,255,255,0.92)", fontSize: 24 }}>{reader.name}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pixelify", data: pixel, weight: 600, style: "normal" },
        { name: "Atkinson", data: read, weight: 700, style: "normal" },
      ],
    },
  );
}
