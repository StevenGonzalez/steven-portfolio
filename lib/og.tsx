import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// The night palette from app/globals.css, so shared links look like the site.
const BG = "#091318";
const GLOW = "120, 220, 203";
const GOLD = "#e0b565";
const FG = "#e7e3d7";
const MUTED = "#93a4a3";
const LINE = "#20333a";
const PANEL = "#0e1c22";

type OgCardProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tags?: string[];
};

function clamp(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function renderOgCard({ eyebrow, title, subtitle, tags = [] }: OgCardProps) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          padding: "76px 84px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* The glow of the lantern tree, low in the corner the way it sits in the world. */}
        <div
          style={{
            position: "absolute",
            top: -240,
            left: -160,
            width: 760,
            height: 760,
            display: "flex",
            backgroundImage: `radial-gradient(circle at center, rgba(${GLOW}, 0.28), rgba(${GLOW}, 0) 68%)`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 9999,
              display: "flex",
              backgroundColor: GOLD,
              boxShadow: "0 0 30px 6px rgba(224, 181, 101, 0.6)",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: `rgba(${GLOW}, 0.95)`,
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 700,
              color: FG,
              lineHeight: 1.04,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            {clamp(title, 64)}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 31, color: MUTED, lineHeight: 1.4, maxWidth: 980 }}>
              {clamp(subtitle, 150)}
            </div>
          ) : null}
          {tags.length ? (
            <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
              {tags.slice(0, 5).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: FG,
                    border: `1px solid ${LINE}`,
                    backgroundColor: PANEL,
                    borderRadius: 9999,
                    padding: "8px 22px",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 30,
          }}
        >
          <div style={{ display: "flex", fontSize: 27, color: FG, fontWeight: 600 }}>
            Steven Gonzalez
          </div>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
            Senior Software Engineer
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
