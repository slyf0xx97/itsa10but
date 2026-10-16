import { ImageResponse } from "next/og";

/** The link preview for shares and search cards: the page's own headline on its sky blue, drawn at build time. */
export const alt = "itsa10but: paste a tech job, add your résumé and see the quote behind every skill score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: "linear-gradient(180deg, #d9f0fb 0%, #9fd6ec 100%)", color: "#1f2430" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#167a66" }}>itsa10but?</div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05, marginTop: 24 }}>Your résumé is a 10!</div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05, color: "#e8912d" }}>But… find the “but”</div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 36, color: "#1b86a8" }}>Four readers show the quote behind every skill score.</div>
      </div>
    ),
    { ...size },
  );
}
