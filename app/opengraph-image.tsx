import { ImageResponse } from "next/og";

// The OG card is identical for every request, so prerender it at build time.
// Without this the root layout's `force-dynamic` would propagate here and make
// Next render the PNG (and load the satori WASM) on every crawler hit.
export const dynamic = "force-static";

export const alt = "CraftCV - ATS-Ready CV Generator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand palette, mirrored from app/page.tsx / globals.css.
const BG = "#050508";
const CYAN = "#00f0ff";
const MAGENTA = "#ff00aa";
const LIME = "#b8ff00";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          padding: "64px 72px",
          color: "#fafafa",
        }}
      >
        {/* Cyan bloom from the top edge. A radial-gradient renders in satori as
            an ellipse with a visible hard edge, so fade a linear one instead. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 340,
            display: "flex",
            backgroundImage:
              "linear-gradient(180deg, rgba(0, 240, 255, 0.13) 0%, rgba(0, 240, 255, 0) 100%)",
          }}
        />

        {/* Decorative frame: satori has no repeating-linear-gradient, so the
            retro grid is approximated with a few positioned rules. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            display: "flex",
            backgroundImage: `linear-gradient(90deg, ${CYAN} 0%, ${MAGENTA} 100%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 120,
            right: -60,
            width: 220,
            height: 220,
            border: `1px solid rgba(255, 0, 170, 0.25)`,
            transform: "rotate(45deg)",
          }}
        />
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            border: `1px solid rgba(0, 240, 255, 0.4)`,
            backgroundColor: "rgba(0, 240, 255, 0.06)",
            color: CYAN,
            padding: "10px 18px",
            fontSize: 22,
            letterSpacing: 1,
          }}
        >
          ATS ENGINE v2 — DETERMINISTIC RULES
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, color: "#f4f4f5" }}>
            Build your
          </div>
          <div style={{ display: "flex", fontSize: 92, color: CYAN }}>
            professional CV
          </div>
          <div
            style={{ display: "flex", fontSize: 58, color: "#a1a1aa" }}
          >
            in minutes
          </div>
        </div>

        {/* Terminal-style value props + wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontSize: 26, color: "#a1a1aa" }}>
              <span style={{ color: CYAN, marginRight: 12 }}>$</span>
              no login required
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#a1a1aa" }}>
              <span style={{ color: MAGENTA, marginRight: 12 }}>$</span>
              local-first privacy
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#a1a1aa" }}>
              <span style={{ color: LIME, marginRight: 12 }}>$</span>
              ATS-optimized output
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 44, color: "#fafafa" }}>
            CraftCV
          </div>
        </div>
      </div>
    ),
    size,
  );
}
