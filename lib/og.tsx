import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

type Accent = { rgb: string; hex: string };

// Mirrors the per-route accents in app/globals.css so shared links look on-brand.
export const ROUTE_ACCENTS: Record<string, Accent> = {
  home: { rgb: "129, 140, 248", hex: "#818cf8" },
  projects: { rgb: "16, 185, 129", hex: "#10b981" },
  insights: { rgb: "245, 158, 11", hex: "#f59e0b" },
  arcade: { rgb: "34, 211, 238", hex: "#22d3ee" },
};

type OgCardProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tags?: string[];
  accent: Accent;
};

function clamp(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function renderOgCard({ eyebrow, title, subtitle, tags = [], accent }: OgCardProps) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: "76px 84px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent glow — a nod to the site's cursor-lighting motif. */}
        <div
          style={{
            position: "absolute",
            top: -240,
            left: -160,
            width: 760,
            height: 760,
            display: "flex",
            backgroundImage: `radial-gradient(circle at center, rgba(${accent.rgb}, 0.40), rgba(${accent.rgb}, 0) 68%)`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 9999,
              display: "flex",
              backgroundColor: accent.hex,
              boxShadow: `0 0 30px 6px rgba(${accent.rgb}, 0.65)`,
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: `rgba(${accent.rgb}, 0.95)`,
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
              color: "#fafafa",
              lineHeight: 1.04,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            {clamp(title, 64)}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 31, color: "#a1a1aa", lineHeight: 1.4, maxWidth: 980 }}>
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
                    color: "#d4d4d8",
                    border: "1px solid #27272a",
                    backgroundColor: "#18181b",
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
            borderTop: "1px solid #27272a",
            paddingTop: 30,
          }}
        >
          <div style={{ display: "flex", fontSize: 27, color: "#fafafa", fontWeight: 600 }}>
            Steven Gonzalez
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#71717a" }}>
            Senior Software Engineer
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
