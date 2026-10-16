import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The site's icon, drawn at build time for the tab icon, the home-screen icon and the header: a résumé page with a big orange 10 on it, and the four pixel
 * readers in its corners looking in at the number. The two readers on the right are mirrored so every one faces the page. Sprites come from the sheet in public/assets/agents,
 * the number from Pixelify Sans (SIL Open Font License).
 */
const asset = (path: string) => readFile(join(process.cwd(), "public", "assets", path));

const READERS = [
  { x: 0, y: 0, left: 0, top: 0, flip: false },
  { x: 1, y: 0, left: 1, top: 0, flip: true },
  { x: 0, y: 1, left: 0, top: 1, flip: false },
  { x: 1, y: 1, left: 1, top: 1, flip: true },
];

export async function brandIconAssets() {
  const [pixel, sheet] = await Promise.all([asset("fonts/PixelifySans-600.ttf"), asset("agents/pixel-team-v2.png")]);
  return { pixel, sheetUri: `data:image/png;base64,${sheet.toString("base64")}` };
}

/** The icon as an element for ImageResponse at `size` pixels square. Every measurement is a share of `size`, so one drawing serves every size. */
export function brandIcon(size: number, sheetUri: string) {
  const k = size / 512;
  const sprite = 176 * k;
  const edge = 6 * k;
  return (
    <div style={{ position: "relative", display: "flex", width: size, height: size, borderRadius: 112 * k, background: "linear-gradient(180deg, #cfeefb 0%, #8fd0ea 100%)", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 124 * k, top: 66 * k, display: "flex", flexDirection: "column", alignItems: "center", width: 264 * k, height: 380 * k, borderRadius: 22 * k, background: "#ffffff", border: `${edge}px solid #1f2430`, boxShadow: `0 ${10 * k}px 0 rgba(31,36,48,0.22)`, transform: "rotate(-2deg)" }}>
        {[150, 100, 120].map((w, i) => (
          <div key={i} style={{ display: "flex", width: w * k, height: 14 * k, borderRadius: 8 * k, background: i === 0 ? "#167a66" : "#c5d3da", marginTop: (i === 0 ? 34 : 12) * k }} />
        ))}
        <div style={{ display: "flex", fontFamily: "Pixelify", fontSize: 168 * k, lineHeight: 1, color: "#e8912d", marginTop: 16 * k }}>10</div>
        {[170, 130].map((w, i) => (
          <div key={i} style={{ display: "flex", width: w * k, height: 14 * k, borderRadius: 8 * k, background: "#c5d3da", marginTop: (i === 0 ? 10 : 12) * k }} />
        ))}
      </div>
      {READERS.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute", left: r.left ? size - sprite - 6 * k : 6 * k, top: r.top ? size - sprite - 6 * k : 6 * k, display: "flex", width: sprite, height: sprite,
            backgroundImage: `url(${sheetUri})`, backgroundSize: `${sprite * 2}px ${sprite * 2}px`, backgroundPosition: `${-r.x * sprite}px ${-r.y * sprite}px`, backgroundRepeat: "no-repeat",
            ...(r.flip ? { transform: "scaleX(-1)" } : {}),
          }}
        />
      ))}
    </div>
  );
}
