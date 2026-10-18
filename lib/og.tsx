import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getInsightBySlug } from "./content";
import { SITE_NAME } from "./meta";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// The night palette from app/globals.css, so shared links look like the site.
const BG = "9, 19, 24";
const GLOW = "120, 220, 203";
const FG = "#e7e3d7";
const MUTED = "#93a4a3";

// The site's own typefaces and a still of the world at night. The image renderer cannot read woff2 or variable fonts,
// so lib/og-assets holds TTF instances of the weights the site uses. All of it is read once, when the cards are built.
const asset = (name: string) => readFileSync(path.join(process.cwd(), "lib", "og-assets", name));
const fonts = [
  { name: "Cormorant", data: asset("cormorant-500.ttf"), weight: 500 as const },
  { name: "Schibsted", data: asset("schibsted-400.ttf"), weight: 400 as const },
  { name: "Plex Mono", data: asset("plex-mono-500.ttf"), weight: 500 as const },
];
const night = `data:image/jpeg;base64,${asset("night.jpg").toString("base64")}`;

type OgCardProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tags?: string[];
};

function clamp(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  // End on a whole word, without a trailing comma or colon before the ellipsis.
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,:;]$/, "")}…`;
}

/** A link preview in the site's own look: the world at night, with the words on the dark sky to its left. */
export function renderOgCard({ eyebrow, title, subtitle, tags = [] }: OgCardProps) {
  return new ImageResponse(
    (
      <div style={{ height: "100%", width: "100%", display: "flex", backgroundColor: `rgb(${BG})`, position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- this renders to a PNG, not a page */}
        <img src={night} width={1200} height={630} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundImage: `linear-gradient(90deg, rgba(${BG}, 0.96) 0%, rgba(${BG}, 0.88) 42%, rgba(${BG}, 0) 78%)`,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 720,
            height: "100%",
            padding: "70px 0 64px 80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                display: "flex",
                backgroundColor: `rgb(${GLOW})`,
                boxShadow: `0 0 18px 4px rgba(${GLOW}, 0.6)`,
              }}
            />
            <div
              style={{
                fontFamily: "Plex Mono",
                fontSize: 20,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: `rgb(${GLOW})`,
              }}
            >
              {eyebrow}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontFamily: "Cormorant", fontSize: 76, lineHeight: 1, letterSpacing: -0.5, color: FG }}>
              {clamp(title, 64)}
            </div>
            {subtitle ? (
              <div style={{ fontFamily: "Schibsted", fontSize: 25, lineHeight: 1.45, color: MUTED, maxWidth: 600 }}>
                {clamp(subtitle, 120)}
              </div>
            ) : null}
            {tags.length ? (
              <div style={{ fontFamily: "Plex Mono", fontSize: 17, color: MUTED, letterSpacing: 0.5 }}>
                {tags.slice(0, 4).join(" / ")}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <div style={{ fontFamily: "Cormorant", fontSize: 34, color: FG }}>{SITE_NAME}</div>
            <div style={{ fontFamily: "Plex Mono", fontSize: 15, letterSpacing: 3, textTransform: "uppercase", color: MUTED }}>
              Software Engineer
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

/** What a card says in words, for whoever cannot see it. */
export function cardAlt(title: string) {
  return `${title} — ${SITE_NAME}`;
}

function insight(slug: string) {
  const post = getInsightBySlug(slug);
  if (!post) throw new Error(`No insight metadata for ${slug}`);
  return post;
}

/** The card for one article, and its alt text, from its entry in data/insights.ts. Each article's folder has an
 *  opengraph-image that calls these with its own slug, since the articles are separate routes rather than one dynamic
 *  one. */
export function renderInsightCard(slug: string) {
  const post = insight(slug);
  return renderOgCard({ eyebrow: post.category, title: post.title, subtitle: post.summary });
}

export function insightCardAlt(slug: string) {
  return cardAlt(insight(slug).title);
}
